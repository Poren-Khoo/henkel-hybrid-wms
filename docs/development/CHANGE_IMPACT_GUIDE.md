# Change Impact Guide

This document helps you understand: **"If I want to change X, what else do I need to update?"**

---

## Quick Reference Matrix

### When Adding a New Feature

| Change Type | Files to Update | Node-RED Changes |
|-------------|-----------------|------------------|
| **New page** | Module pages folder + App.jsx routes | None (if using existing topics) |
| **New action button** | Page component + domain Service | Add function node for Action topic |
| **New status** | Validator + Service + Page | Update relevant function nodes |
| **New field on entity** | Service normalizer + Page + (optionally Validator) | Update global DB structure |
| **New business rule** | Validator + BUSINESS_RULES.md | Update function node validation |
| **New MQTT topic** | MQTT_CONTRACT.md + Page + Context subscriptions | Add MQTT In/Out nodes + function |

---

## Scenario 1: Add a New Button Action

**Example**: "Add a 'Cancel Order' button to the outbound detail page"

### Step 1: Update Validator (if needed)
```
File: src/domain/outbound/OutboundOrderValidator.js
```
Add validation for when cancel is allowed:
```javascript
static validateCancelAction(orderId, currentStatus) {
  if (!this.isPendingApproval(currentStatus) && !this.isReleased(currentStatus)) {
    throw new OutboundOrderValidationError('Cannot cancel order in status: ' + currentStatus);
  }
}
```

### Step 2: Update Service
```
File: src/domain/outbound/OutboundOrderService.js
```
Add MQTT payload builder:
```javascript
static buildCancelCommand(orderId, reason) {
  return {
    dn_no: orderId,
    action: 'CANCEL',
    reason: reason,
    timestamp: Date.now()
  };
}
```

### Step 3: Update Page
```
File: src/modules/outbound/pages/OutboundOrderDetail.jsx
```
Add the button and handler.

### Step 4: Add Node-RED Handler
```
Location: Node-RED → Outbound Actions group
```
1. Add MQTT In node: `Henkelv2/Shanghai/Logistics/Outbound/Action/Cancel_Order`
2. Add Function node: Update order status in global
3. Add MQTT Out node: Republish State topic

### Step 5: Update Documentation
```
Files: docs/MQTT_CONTRACT.md, docs/WORKFLOWS.md
```
Document the new action topic and status transition.

---

## Scenario 2: Add a New Field to an Entity

**Example**: "Add 'priority' field to outbound orders"

### Step 1: Update Service Normalizer
```
File: src/domain/outbound/OutboundOrderService.js
```
In `normalizeOrder()`, add the new field:
```javascript
static normalizeOrder(rawData, source) {
  return {
    // ... existing fields ...
    priority: rawData.priority || rawData.prio || 'NORMAL',
  };
}
```

### Step 2: Update Page to Display
```
File: src/modules/outbound/pages/OutboundOrders.jsx
```
Add column to table or badge to card.

### Step 3: (If editable) Update Create Form
```
File: src/modules/outbound/pages/OutboundOrderCreate.jsx
```
Add form field for priority.

### Step 4: Update Validator (if validation needed)
```
File: src/domain/outbound/OutboundOrderValidator.js
```
Add to `collectCreateErrors()` if required field.

### Step 5: Node-RED Changes
```
Location: Node-RED → relevant function nodes
```
Ensure the field is stored in the global DB and included in state payloads.

---

## Scenario 3: Change a Workflow Status

**Example**: "Add 'QUALITY_HOLD' status between PICKING and PACKING"

> [!CAUTION]
> Status changes affect multiple files. Test thoroughly!

### Files to Update

| Layer | File | What to Change |
|-------|------|----------------|
| Validator | `OutboundOrderValidator.js` | Add to `VALID_STATUSES`, update `VALID_TRANSITIONS` |
| Service | `OutboundOrderService.js` | Update `getProgressSteps()`, `calculateProgressPercentage()` |
| Page | `OutboundOrders.jsx` | Update tab filters if needed |
| Page | `OutboundOrderDetail.jsx` | Add action buttons for new status |
| Docs | `docs/WORKFLOWS.md` | Update state machine diagram |
| Docs | `docs/MQTT_CONTRACT.md` | Document any new action topics |
| Node-RED | Action handlers | Add logic to transition to/from new status |

---

## Scenario 4: Add a New Module

**Example**: "Add a Returns module"

### Step 1: Create Module Structure
```
src/modules/returns/
├── pages/
│   ├── ReturnsList.jsx
│   └── ReturnDetail.jsx
```

### Step 2: Create Domain Layer
```
src/domain/returns/
├── ReturnsValidator.js
└── ReturnsService.js
```

### Step 3: Add Routes
```
File: src/App.jsx
```
Add route entries for new pages.

### Step 4: Add Navigation
```
File: src/components/Sidebar.jsx (or similar)
```

### Step 5: Create Node-RED Group
1. Create new group "Internal: Returns"
2. Add State topic: `.../Returns/State/Returns_List`
3. Add Action topics as needed

### Step 6: Update Documentation
```
Files: docs/UI_PAGES.md, docs/MQTT_CONTRACT.md, docs/DOMAIN_MODEL.md
```

---

## Scenario 5: Fix a Bug in Business Logic

### Diagnostic Steps

1. **Identify the layer** where the bug occurs:
   - UI display issue → Page component
   - Validation wrong → Validator
   - Wrong data sent → Service
   - Backend processing wrong → Node-RED function

2. **Check the data flow**:
   - Open browser DevTools → Network → look at MQTT messages
   - In Node-RED → add Debug nodes to see intermediate values

3. **Trace the topic**:
   - What State topic shows wrong data?
   - What Action topic triggered the change?
   - What function node processed that action?

### Common Bug Locations

| Symptom | Likely Cause | Check These |
|---------|--------------|-------------|
| Button doesn't appear | Validator `isXxx()` returning wrong value | `Validator.isPendingApproval()` etc. |
| Data not updating | MQTT topic mismatch | Topic strings in Page vs Node-RED |
| Form validation fails | Validator logic | `collectCreateErrors()` |
| Wrong data displayed | Service normalizer | `normalizeOrder()` |
| Action has no effect | Node-RED not processing | Check MQTT In topic, function logic |

---

## Frontend-Backend Topic Mapping

Use this table to find the corresponding Node-RED location for any frontend feature:

| Frontend Page | State Topic | Node-RED Group |
|---------------|-------------|----------------|
| `/outbound/orders` | `Costing/State/DN_Workflow_DB` | "Outbound Actions" group |
| `/outbound/dn-approval` | `Costing/State/DN_Workflow_DB` | "Outbound Actions" group |
| `/inbound/receiving` | `Internal/Ops/State/Inbound_Plan` | "Internal Inbound → Receipt" |
| `/inbound/putaway` | `Internal/Ops/State/Task_Queue` | "Internal: Putaway Engine" |
| `/inbound/exceptions` | `Internal/Ops/State/Exceptions` | "Internal: Exception Management" |
| `/quality/inspection` | `Internal/Quality/State/Inspection_Queue` | "Internal: Quality Control v2" |
| `/quality/decisions` | `Internal/Quality/State/Decision_Queue` | "Internal: Quality Control v2" |
| `/production/orders` | `Production/State/Order_List` | "Internal: Production" |
| `/production/reservations` | `Production/State/Reservation_List` | "Production Logic (FEFO)" |
| `/production/picking` | `Production/State/Picking_Tasks` | "Picking Execution Engine" |
| `/inventory/list` | `Internal/Ops/State/Inventory_Level` | Multiple (any inventory modifier) |
| `/master/materials` | `MasterData/State/Materials` | "Master Data Management" |
| `/governance/audit-log` | `Exceptions/State/Audit_Log` | "Governance: Audit Log Engine" |

---

## Checklist: Before Pushing Any Change

- [ ] **Validator updated** if business rules changed
- [ ] **Service updated** if MQTT payloads changed
- [ ] **Page updated** if UI needs to reflect changes
- [ ] **Node-RED updated** if backend logic changed
- [ ] **MQTT_CONTRACT.md** updated if topics changed
- [ ] **WORKFLOWS.md** updated if status transitions changed
- [ ] **Tested in browser** - verify MQTT messages in console
- [ ] **Tested end-to-end** - action → state update → UI refresh

---

## Debugging Tips

### 1. See MQTT Messages in Browser
Add to a page component:
```javascript
useEffect(() => {
  console.log('Current data:', data.raw);
}, [data.raw]);
```

### 2. Debug Node-RED Flows
- Add Debug nodes after function nodes
- Check the debug panel (right sidebar) for message contents
- Use `node.warn("message")` in function nodes for logging

### 3. Check Topic Subscriptions
In UNSContext, verify your page's topics are in the subscription list.

### 4. Validate Payloads
Log what you're sending before publish:
```javascript
const payload = OutboundOrderService.buildApproveCommand(id);
console.log('Publishing:', payload);
publish(topic, payload);
```
