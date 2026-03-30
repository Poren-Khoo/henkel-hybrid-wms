# QC Module Refactor Brief
*For: Cursor Composer / AI Agent*
*Project: Henkel WMS — React + Node-RED + MQTT/UNS Architecture*

---

## Context: What This System Is

This is an enterprise WMS (Warehouse Management System) built with:
- **Frontend**: React + Vite, Tailwind CSS, shadcn/ui components
- **Backend**: Node-RED with global variables as in-memory database
- **Message bus**: MQTT (EMQX broker)
- **Pattern**: UNS (Unified Namespace) — frontend subscribes to State topics, publishes to Action topics

**Core UNS rule**: Frontend never stores business data. It only renders whatever arrives from MQTT State topics. All state lives in Node-RED globals.

---

## The QC Domain — What It Is In Real Life

Quality Control in a chemical distribution warehouse works like this:

When goods are received from a supplier, they go into a **quarantine zone** first. They cannot be used or shipped until QC clears them.

A QC technician physically walks to the quarantine zone, takes a sample from each lot (batch), brings it to the lab, runs tests (viscosity, pH, purity, etc.), and records results.

A QC manager then reviews the lab results and makes a final decision:
- **RELEASE** → goods are cleared, inventory status becomes AVAILABLE, putaway can proceed
- **BLOCK** → goods are rejected, moved to blocked/reject zone
- **REWORK** → goods need reprocessing before re-inspection

**Key concept — LOT level QC:**
One line item on an order can have multiple lots. Example: ordered 200 units, received in two shipments:
- LOT-A: 80 units, batch "LOT-2026-001"
- LOT-B: 120 units, batch "LOT-2026-002"

Each lot is inspected independently. LOT-A might pass, LOT-B might fail. QC decisions are always at the **lot/batch level**, never at the order level.

**QC is an independent department**, not a sub-step of inbound. It receives work FROM inbound, production, and returns — but the QC pages belong to QC, not to any other module.

---

## Current State — What Exists and What's Wrong

### What exists in the frontend:

**QASamples.jsx** — Lab technician page
- Subscribes to: `Henkelv2/Shanghai/Logistics/Internal/Quality/State/Inspection_Queue`
- Publishes to: `Henkelv2/Shanghai/Logistics/Internal/Quality/Action/Submit_Result`
- Shows a table of items waiting for lab testing
- Has a modal to record lab results (viscosity, pH, purity) with PASS/FAIL
- **Problem**: The data unwrapping may not match the actual Node-RED payload structure

**QADecisions.jsx** — Manager decision page
- Subscribes to: `Henkelv2/Shanghai/Logistics/Internal/Quality/State/Decision_Queue`
- Publishes to: `Henkelv2/Shanghai/Logistics/Internal/Quality/Action/Execute_Disposition`
- Shows items waiting for manager approval after lab results submitted
- Has RELEASE / BLOCK decision modal with reason codes
- **Problem**: Topic name mismatch — Node-RED publishes to `Decision_Queue` but the page subscribes to `Disposition_Queue` (different name). This is why the page is empty.

**QCDisposition.jsx** — Separate disposition page
- **This page should be DELETED**
- Disposition (scrap/return/rework) is part of the manager's decision in QADecisions, not a separate step
- It subscribes to `Disposition_Queue` which doesn't exist in Node-RED

### What exists in Node-RED backend:

**func_gen_qc_task** — triggered when a receipt is posted
- Subscribes to: `Action/Post_Goods_Receipt`
- Creates one QC task per received line
- Saves to global `qc_queue`
- Publishes to: `Quality/State/Inspection_Queue`
- Each task has: `sample_id`, `batch_id`, `sku`, `desc`, `supplier`, `qty`, `arrival_time`, `status: "PENDING_SAMPLING"`, `required_tests`, `location`

**Stage 1: Process Lab Result** — triggered when technician submits
- Subscribes to: `Quality/Action/Submit_Result`
- Expected payload: `{ batch_id, result: "PASS"|"FAIL", lab_data: {...}, technician }`
- Removes item from `qc_queue`
- Adds to `decision_queue` with status `PENDING_APPROVAL`
- Publishes to: `Quality/State/Inspection_Queue` AND `Quality/State/Decision_Queue`

**Stage 2: Execute Decision** — triggered when manager decides
- Subscribes to: `Quality/Action/Execute_Disposition`
- Expected payload: `{ batch_id, action: "RELEASE"|"BLOCK"|"REWORK", reason, manager }`
- Updates inventory status in `internal_stock_list`
- If RELEASE → inventory status = AVAILABLE
- If BLOCK → inventory status = BLOCKED, location = REJECT-CAGE
- If REWORK → inventory status = REWORK

---

## The Correct Flow (End to End)

```
1. Worker posts receipt in Receiving.jsx
   → Node-RED creates QC task in qc_queue
   → Publishes to Quality/State/Inspection_Queue

2. QC Technician opens QASamples.jsx
   → Sees items in Inspection_Queue
   → Clicks "Record Results" on a sample
   → Fills in: viscosity, pH, purity, PASS or FAIL
   → Publishes to Quality/Action/Submit_Result with:
     { batch_id, result, lab_data, technician }

3. Node-RED Stage 1 processes it:
   → Removes from qc_queue
   → Adds to decision_queue with lab data
   → Item disappears from QASamples
   → Item appears in QADecisions

4. QC Manager opens QADecisions.jsx
   → Sees items with lab results in Decision_Queue
   → Clicks "Decide" on an item
   → Selects RELEASE or BLOCK, adds reason
   → Publishes to Quality/Action/Execute_Disposition with:
     { batch_id, action: "RELEASE"|"BLOCK"|"REWORK", reason, manager }

5. Node-RED Stage 2 processes it:
   → Updates inventory record status
   → If RELEASE: inventory becomes AVAILABLE, putaway task becomes active
   → If BLOCK: inventory becomes BLOCKED
   → Item disappears from QADecisions
```

---

## MQTT Topics — Complete List for QC Module

| Topic | Direction | Purpose |
|---|---|---|
| `Henkelv2/Shanghai/Logistics/Internal/Quality/State/Inspection_Queue` | Subscribe | Items waiting for lab testing |
| `Henkelv2/Shanghai/Logistics/Internal/Quality/State/Decision_Queue` | Subscribe | Items waiting for manager decision |
| `Henkelv2/Shanghai/Logistics/Internal/Quality/Action/Submit_Result` | Publish | Technician submits lab result |
| `Henkelv2/Shanghai/Logistics/Internal/Quality/Action/Execute_Disposition` | Publish | Manager releases or blocks |

**All four topics must be in UNSContext GLOBAL_SUBSCRIPTIONS.**

---

## Data Shapes — What Node-RED Sends

### Inspection_Queue payload (what QASamples reads):
```javascript
{
  version: "1.0",
  topics: [{
    path: "...State/Inspection_Queue",
    type: "state",
    value: {
      items: [
        {
          sample_id: "SMP-12345",
          batch_id: "LOT-2026-001",   // the lot number
          sku: "ADH-001",
          desc: "Epoxy Adhesive",
          supplier: "BASF Chemical",
          qty: 1000,
          arrival_time: 1234567890,
          status: "PENDING_SAMPLING",
          required_tests: ["Viscosity", "pH Level", "Purity", "Visual Check"],
          location: "DOCK-IN-01"      // where to find the sample physically
        }
      ]
    }
  }]
}
```

To read this in React:
```javascript
const rawData = data.raw[TOPIC_QC_QUEUE]
// data.raw stores the value object directly, so:
const items = rawData?.items ?? (Array.isArray(rawData) ? rawData : [])
```

### Decision_Queue payload (what QADecisions reads):
```javascript
{
  version: "1.0",
  topics: [{
    path: "...State/Decision_Queue",
    type: "state",
    value: {
      items: [
        {
          sample_id: "SMP-12345",
          batch_id: "LOT-2026-001",
          sku: "ADH-001",
          desc: "Epoxy Adhesive",
          supplier: "BASF Chemical",
          qty: 1000,
          lab_result: "PASS",         // added by Stage 1
          lab_data: { viscosity: "2000", ph: "7.2", purity: "99.8%" },
          tested_by: "Selene Morgan",
          tested_at: 1234567890,
          status: "PENDING_APPROVAL"
        }
      ]
    }
  }]
}
```

### Submit_Result payload (what QASamples publishes):
```javascript
{
  batch_id: "LOT-2026-001",
  result: "PASS",    // or "FAIL"
  lab_data: {
    viscosity: "2000",
    ph: "7.2",
    purity: "99.8%",
    tested_at: Date.now()
  },
  technician: "CurrentUser"
}
```

### Execute_Disposition payload (what QADecisions publishes):
```javascript
{
  batch_id: "LOT-2026-001",
  action: "RELEASE",    // or "BLOCK" or "REWORK"
  reason: "Meets All Specifications",
  manager: "CurrentUser"
}
```

---

## What Needs To Be Fixed

### Fix 1 — QADecisions.jsx topic name is wrong
**Current**: subscribes to `Quality/State/Disposition_Queue`
**Correct**: must subscribe to `Quality/State/Decision_Queue`
This is why QADecisions always shows empty. The topic name is wrong.

### Fix 2 — Data unwrapping in both pages
Both pages need to unwrap the payload correctly.
Node-RED wraps data as `{ version, topics: [{ value: { items: [...] } }] }`.
UNSContext stores `data.raw[topic] = the value object` (already unwrapped one level).
So in the component: `const items = rawData?.items ?? []`

### Fix 3 — QADecisions payload sends wrong field name
**Current**: `action: action` where action is `"RELEASE"` or `"BLOCK"`
**Node-RED expects**: `action: "RELEASE"` or `action: "BLOCK"` ← this is already correct
But the decision variable maps `PASS → RELEASE` and `FAIL → BLOCK`.
Keep this mapping but make sure `reason` and `notes` are also sent in the payload.

### Fix 4 — Delete QCDisposition.jsx
This page is wrong. Disposition is handled inside QADecisions when the manager selects BLOCK. Remove it from the router and nav.

### Fix 5 — Add source_type to QC tasks in Node-RED
In `func_gen_qc_task`, add `source_type: 'INBOUND'` to each task object so future production/returns QC tasks can be distinguished.

### Fix 6 — Verify all 4 QC topics are in UNSContext GLOBAL_SUBSCRIPTIONS
Check `src/context/UNSContext.jsx` for the GLOBAL_SUBSCRIPTIONS array and confirm all 4 topics above are listed.

---

## Files To Touch

| File | What to do |
|---|---|
| `src/modules/quality/pages/QASamples.jsx` | Fix data unwrapping. Keep logic, fix topic + payload reading |
| `src/modules/quality/pages/QADecisions.jsx` | Fix topic name (Disposition_Queue → Decision_Queue). Fix data unwrapping. Add reason/notes to payload |
| `src/modules/quality/pages/QCDisposition.jsx` | DELETE this file |
| `src/context/UNSContext.jsx` | Verify all 4 QC topics are in GLOBAL_SUBSCRIPTIONS |
| Node-RED `func_gen_qc_task` | Add `source_type: 'INBOUND'` to task object |

---

## What NOT To Change

- Do not change the Node-RED Stage 1 or Stage 2 function logic — it is correct
- Do not change the MQTT topic names in Node-RED — only fix the frontend to match
- Do not merge QASamples and QADecisions into one page — they serve different roles (technician vs manager)
- Do not add new Node-RED flows for QC — the existing ones are sufficient

---

## Definition of Done

After these fixes, the following end-to-end test should work:

1. Post a receipt in Receiving.jsx or via 扫码收货 modal in InboundOrders.jsx
2. Open QASamples — the received lot appears in the table
3. Click Record Results, enter viscosity/pH/purity, select PASS, submit
4. QASamples table — item disappears
5. Open QADecisions — same item appears with Lab: PASS badge
6. Click Decide, select RELEASE, confirm
7. QADecisions table — item disappears
8. Check Inventory — the inventory record for that lot should now have status AVAILABLE
