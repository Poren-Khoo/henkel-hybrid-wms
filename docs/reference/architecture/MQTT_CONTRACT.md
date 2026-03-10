# MQTT API Contract (UNS Standard)

This document defines the complete MQTT communication contract following the **Unified Namespace (UNS)** standard for IIoT platforms.

---

## 1. UNS Architecture Overview

### 1.1 What is UNS?

Unified Namespace (UNS) is an industrial data integration method centered around MQTT. Its objectives are:

- **Semantic Clarity & Readability**: Through simple standards, data is given clear meaning
- **Single Source of Truth**: Unified access to all data sources within the organization
- **Event-Driven Architecture**: Publish/subscribe mechanisms replace polling for real-time performance

### 1.2 System Architecture

```
React Frontend
    ↓
UNSProvider (Global MQTT Context - Singleton)
    ↓ WSS Connection
MQTT Broker (Tier0 Platform)
    ↓
Node-RED Backend (Flows process Actions, publish State)
```

**Key Files:**

- `src/context/UNSContext.jsx` - Global MQTT connection manager
- `src/mqttConfig.js` - Broker connection configuration
- `src/hooks/useUNS.js` - Per-component MQTT hook (legacy)

### 1.3 Connection Configuration

```javascript
// src/mqttConfig.js
export const MQTT_URL = "wss://tier0-edge-demo.tier0.app:8084/mqtt";

export const MQTT_OPTIONS = {
  clientId: "henkel_web_" + Math.random().toString(16).substr(2, 8),
  username: "",
  password: "",
  clean: true,
  reconnectPeriod: 1000,
  connectTimeout: 30 * 1000,
};
```

---

## 2. UNS Topic Standard

### 2.1 Topic Types (ONLY 3 ALLOWED)


| Type      | Purpose                 | Direction          | Example                      |
| --------- | ----------------------- | ------------------ | ---------------------------- |
| `State`   | System current state    | Backend → Frontend | `.../State/Inventory_Level`  |
| `Action`  | Triggers system actions | Frontend → Backend | `.../Action/Confirm_Putaway` |
| `Metrics` | Time-series data        | Devices → System   | `.../Metrics/Temperature`    |


**Critical Rule**: Topic type MUST be in the **second-to-last level** of the topic path.

### 2.2 Topic Naming Convention

**Pattern:**

```
{Version}/{Site}/{Function}/{Module}/{Submodule}/State|Action|Metrics/{Entity}
```

**Current Implementation:**

```
Henkelv2/Shanghai/Logistics/{Module}/{Submodule}/State|Action/{Entity}
```


| Segment   | Value                                                 | Description                         |
| --------- | ----------------------------------------------------- | ----------------------------------- |
| Version   | `Henkelv2`                                            | Schema version / project identifier |
| Site      | `Shanghai`                                            | Geographic location                 |
| Function  | `Logistics`                                           | Business domain                     |
| Module    | `Internal`, `External`, `MasterData`, `Costing`, etc. | Functional area                     |
| Submodule | `Ops`, `Quality`, `Integration`, etc.                 | Sub-category                        |
| Type      | `State`, `Action`, `Metrics`                          | **Must be second-to-last**          |
| Entity    | `Task_Queue`, `Confirm_Putaway`, etc.                 | Specific data/action                |


### 2.3 Topic Naming Rules

1. **Maximum 7 levels** for performance and maintainability
2. **Use human-readable abbreviations** (English preferred)
3. **Topic type explicitly indicated** in second-to-last level
4. **Avoid topic explosion** - For frequent entity IDs, record them in payload, not topic path
5. **Use underscores** for multi-word names: `Task_Queue`, `DN_Workflow_DB`

---

## 3. UNS Message Format

### 3.1 Standard Envelope (Tier0 Platform)

All messages use the UNS envelope format:

```json
{
  "version": "v1",
  "topics": [
    {
      "path": "Henkelv2/Shanghai/Logistics/Internal/Ops/State/Task_Queue",
      "type": "state",
      "value": {
        // Actual data payload here
      }
    }
  ]
}
```

**Required Fields:**


| Field            | Type   | Description                                 |
| ---------------- | ------ | ------------------------------------------- |
| `version`        | string | Schema version (e.g., "v1")                 |
| `topics`         | array  | Array of topic objects                      |
| `topics[].path`  | string | Full UNS topic path                         |
| `topics[].type`  | string | Topic type: "state", "action", or "metrics" |
| `topics[].value` | any    | Actual data payload                         |


**Optional Fields:**


| Field                  | Type   | Description                   |
| ---------------------- | ------ | ----------------------------- |
| `topics[].estMps`      | number | Estimated messages per second |
| `topics[].description` | string | Human-readable description    |
| `topics[].template`    | object | Example payload structure     |


### 3.2 Frontend Envelope Unwrapping

The `UNSContext.jsx` handles envelope unwrapping automatically:

```javascript
// Handle Tier0 envelope structure: { version: "v1", topics: [{ value: ... }] }
let cleanValue = parsed;

if (parsed.topics && Array.isArray(parsed.topics) && parsed.topics.length > 0) {
  if (parsed.topics[0].value !== undefined) {
    cleanValue = parsed.topics[0].value;
  } else {
    cleanValue = parsed.topics[0];
  }
}
```

### 3.3 Action Message Payload

When frontend publishes to Action topics, include:

```json
{
  "operator": "user_id",
  "timestamp": 1706500000000,
  // ... action-specific fields
}
```

**Note**: The Tier0 platform will wrap this in the UNS envelope when storing/forwarding.

---

## 4. Complete Topic Registry

### 4.1 State Topics (Subscribe)

#### Internal Operations (`Internal/Ops`)


| Topic                                                            | Entity     | Description               | State Payload Schema                 |
| ---------------------------------------------------------------- | ---------- | ------------------------- | ------------------------------------ |
| `Henkelv2/Shanghai/Logistics/Internal/Ops/State/Task_Queue`      | Tasks      | Putaway, pick, move tasks | -                                    |
| `Henkelv2/Shanghai/Logistics/Internal/Ops/State/Inbound_Plan`    | ASNs       | Inbound orders/ASN list   | `{ asns: InboundPlanRecord[] }`      |
| `Henkelv2/Shanghai/Logistics/Internal/Ops/State/Inventory_Level` | Inventory  | Real-time stock levels    | `{ stock_items: InventoryItem[] }`   |
| `Henkelv2/Shanghai/Logistics/Internal/Ops/State/Exceptions`      | Exceptions | Internal exception queue  | -                                    |


#### Quality (`Internal/Quality`)


| Topic                                                                  | Entity       | Description                 |
| ---------------------------------------------------------------------- | ------------ | --------------------------- |
| `Henkelv2/Shanghai/Logistics/Internal/Quality/State/Inspection_Queue`  | Samples      | QC inspection queue         |
| `Henkelv2/Shanghai/Logistics/Internal/Quality/State/Decision_Queue`    | Decisions    | QA approval queue           |
| `Henkelv2/Shanghai/Logistics/Internal/Quality/State/Disposition_Queue` | Dispositions | Disposition execution queue |
| `Henkelv2/Shanghai/Logistics/Internal/Quality/State/Trace_Result`      | Trace        | Traceability query results  |


#### Master Data (`MasterData`)


| Topic                                                           | Entity     | Description              |
| --------------------------------------------------------------- | ---------- | ------------------------ |
| `Henkelv2/Shanghai/Logistics/MasterData/State/Materials`        | Materials  | Material master data     |
| `Henkelv2/Shanghai/Logistics/MasterData/State/Locations`        | Locations  | Location master data     |
| `Henkelv2/Shanghai/Logistics/MasterData/State/Containers`       | Containers | Container/HU master data |
| `Henkelv2/Shanghai/Logistics/MasterData/State/Warehouses`       | Warehouses | Warehouse master data    |
| `Henkelv2/Shanghai/Logistics/MasterData/State/BusinessPartners` | Partners   | Customer/supplier data   |
| `Henkelv2/Shanghai/Logistics/MasterData/State/Workers`          | Workers    | Worker/operator data     |
| `Henkelv2/Shanghai/Logistics/MasterData/State/Rate_Cards`       | Rates      | Costing rate cards       |


#### Outbound (`Outbound`)


| Topic                                                      | Entity     | Description            |
| ---------------------------------------------------------- | ---------- | ---------------------- |
| `Henkelv2/Shanghai/Logistics/Outbound/State/Shipment_List` | Shipments  | Outbound shipment list |
| `Henkelv2/Shanghai/Logistics/Outbound/State/Picking_Queue` | Pick Tasks | Outbound picking queue |


#### Costing & Finance (`Costing`, `Finance`)


| Topic                                                        | Entity  | Description                        | State Payload Schema              |
| ------------------------------------------------------------ | ------- | ---------------------------------- | --------------------------------- |
| `Henkelv2/Shanghai/Logistics/Costing/State/DN_Workflow_DB`   | Orders  | Outbound order database with costs | `{ items: DNRecord[] }`           |
| `Henkelv2/Shanghai/Logistics/Costing/State/Financial_Trends` | Trends  | Financial trend data               | -                                 |
| `Henkelv2/Shanghai/Logistics/Costing/State/Bill_Generated`   | Bills   | Generated billing data             | -                                 |
| `Henkelv2/Shanghai/Logistics/Finance/State/Monthly_Billing`  | Monthly | Monthly billing records            | -                                 |


#### External/3PL (`External/Integration`)


| Topic                                                                | Entity | Description     |
| -------------------------------------------------------------------- | ------ | --------------- |
| `Henkelv2/Shanghai/Logistics/External/Integration/State/Sync_Status` | Sync   | 3PL sync status |


#### Production (`Production`)


| Topic                                                           | Entity       | Description               |
| --------------------------------------------------------------- | ------------ | ------------------------- |
| `Henkelv2/Shanghai/Logistics/Production/State/Order_List`       | Prod Orders  | Production order schedule |
| `Henkelv2/Shanghai/Logistics/Production/State/Reservation_List` | Reservations | Material reservations     |
| `Henkelv2/Shanghai/Logistics/Production/State/Picking_Tasks`    | Prod Picks   | Production picking tasks  |


#### Exceptions & Governance (`Exceptions`)


| Topic                                                       | Entity   | Description         |
| ----------------------------------------------------------- | -------- | ------------------- |
| `Henkelv2/Shanghai/Logistics/Exceptions/State/Dispute_List` | Disputes | 3PL dispute queue   |
| `Henkelv2/Shanghai/Logistics/Exceptions/State/Audit_Log`    | Audit    | Audit trail entries |


### 4.2 Action Topics (Publish)

#### Internal Operations (`Internal/Ops`)


| Topic                                                                 | Action            | Payload          |
| --------------------------------------------------------------------- | ----------------- | ---------------- |
| `Henkelv2/Shanghai/Logistics/Internal/Ops/Action/Create_Inbound_Plan` | Create ASN        | See schema below |
| `Henkelv2/Shanghai/Logistics/Internal/Ops/Action/Post_Goods_Receipt`  | Confirm Receipt   | See schema below |
| `Henkelv2/Shanghai/Logistics/Internal/Ops/Action/Confirm_Putaway`     | Confirm Putaway   | See schema below |
| `Henkelv2/Shanghai/Logistics/Internal/Ops/Action/Report_Exception`    | Report Exception  | See schema below |
| `Henkelv2/Shanghai/Logistics/Internal/Ops/Action/Resolve_Exception`   | Resolve Exception | See schema below |


#### Quality (`Internal/Quality`)


| Topic                                                                     | Action              | Payload          |
| ------------------------------------------------------------------------- | ------------------- | ---------------- |
| `Henkelv2/Shanghai/Logistics/Internal/Quality/Action/Submit_Result`       | Submit QC Result    | See schema below |
| `Henkelv2/Shanghai/Logistics/Internal/Quality/Action/Execute_Disposition` | Execute Disposition | See schema below |


#### Outbound (`Outbound`)


| Topic                                                               | Action                | Payload          |
| ------------------------------------------------------------------- | --------------------- | ---------------- |
| `Henkelv2/Shanghai/Logistics/Outbound/Action/Create_Order`          | Create Order          | See schema below |
| `Henkelv2/Shanghai/Logistics/Outbound/Action/Create_Shipment`       | Create Shipment       | See schema below |
| `Henkelv2/Shanghai/Logistics/Outbound/Action/Confirm_Pick`          | Confirm Pick          | See schema below |
| `Henkelv2/Shanghai/Logistics/Outbound/Action/Confirm_Outbound_Pick` | Confirm Dispatch Pick | See schema below |
| `Henkelv2/Shanghai/Logistics/Outbound/Action/Confirm_Pack`          | Confirm Pack          | See schema below |
| `Henkelv2/Shanghai/Logistics/Outbound/Action/Confirm_Ship`          | Confirm Ship          | See schema below |
| `Henkelv2/Shanghai/Logistics/Outbound/Action/Report_Short_Pick`     | Report Short Pick     | See schema below |


#### Costing (`Costing`)


| Topic                                                   | Action             | Payload          |
| ------------------------------------------------------- | ------------------ | ---------------- |
| `Henkelv2/Shanghai/Logistics/Costing/Action/Review_DN`  | Approve/Reject DN  | See schema below |
| `Henkelv2/Shanghai/Logistics/Costing/Action/Submit_VAS` | Submit VAS Pricing | See schema below |


#### External (`External/Integration`)


| Topic                                                                   | Action             | Payload          |
| ----------------------------------------------------------------------- | ------------------ | ---------------- |
| `Henkelv2/Shanghai/Logistics/External/Integration/Action/Update_Status` | Update Sync Status | See schema below |


#### Master Data (`MasterData`)


| Topic                                                           | Action          | Payload          |
| --------------------------------------------------------------- | --------------- | ---------------- |
| `Henkelv2/Shanghai/Logistics/MasterData/Action/Update_Worker`   | Update Worker   | See schema below |
| `Henkelv2/Shanghai/Logistics/MasterData/Action/Update_Material` | Update Material | See schema below |
| `Henkelv2/Shanghai/Logistics/MasterData/Action/Update_Location` | Update Location | See schema below |


---

## 5. Action Payload Schemas

### 5.1 Standard Action Fields

Every action payload SHOULD include:

```json
{
  "operator": "user_id",       // Who is performing the action
  "timestamp": 1706500000000   // Unix timestamp in milliseconds
}
```

### 5.2 Outbound Order Actions

#### Create Order

**Topic**: `Henkelv2/Shanghai/Logistics/Outbound/Action/Create_Order`

```json
{
  "type": "SALES_ORDER",
  "warehouse": "WH01",
  "customer": "CUST001",
  "requested_date": "2026-01-30",
  "lines": [
    { "code": "MAT-001", "qty": 100 }
  ],
  "operator": "user123",
  "timestamp": 1706500000000
}
```


| Field            | Type   | Required        | Validation                    |
| ---------------- | ------ | --------------- | ----------------------------- |
| `type`           | enum   | Yes             | `SALES_ORDER`, `TRANSFER_OUT` |
| `warehouse`      | string | Yes             | Valid warehouse code          |
| `customer`       | string | If SALES_ORDER  | Valid partner code            |
| `destination`    | string | If TRANSFER_OUT | Valid warehouse code          |
| `requested_date` | string | Yes             | ISO date (YYYY-MM-DD)         |
| `lines[]`        | array  | Yes             | Min 1 item                    |
| `lines[].code`   | string | Yes             | Valid material code           |
| `lines[].qty`    | number | Yes             | > 0                           |


#### Review DN (Approve/Reject)

**Topic**: `Henkelv2/Shanghai/Logistics/Costing/Action/Review_DN`

```json
{
  "dn_no": "DN-2026-0001",
  "action": "APPROVE",
  "operator": "manager123",
  "timestamp": 1706500000000
}
```

For rejection, include reason:

```json
{
  "dn_no": "DN-2026-0001",
  "action": "REJECT",
  "reason": "Insufficient inventory",
  "operator": "manager123",
  "timestamp": 1706500000000
}
```

#### Confirm Ship

**Topic**: `Henkelv2/Shanghai/Logistics/Outbound/Action/Confirm_Ship`

```json
{
  "shipment_id": "SHP-2026-0001",
  "carrier": "DHL",
  "tracking_number": "1234567890",
  "operator": "shipper123",
  "timestamp": 1706500000000
}
```

### 5.3 Inbound Actions

#### Create Inbound Plan (ASN)

**Topic**: `Henkelv2/Shanghai/Logistics/Internal/Ops/Action/Create_Inbound_Plan`

```json
{
  "type": "PO",
  "supplier": "SUP001",
  "warehouse": "WH01",
  "eta": "2026-01-30",
  "lines": [
    { "code": "MAT-001", "qty": 500 }
  ],
  "businessType": "Purchase Receipt",
  "operator": "user123",
  "timestamp": 1706500000000
}
```

#### Post Goods Receipt

**Topic**: `Henkelv2/Shanghai/Logistics/Internal/Ops/Action/Post_Goods_Receipt`

```json
{
  "asn_id": "ASN-2026-0001",
  "received_lines": [
    {
      "code": "MAT-001",
      "qty_received": 480,
      "hu_id": "HU-12345",
      "lot": "LOT2026001",
      "expiry_date": "2027-01-30"
    }
  ],
  "dock_door": "DOCK-01",
  "operator": "receiver123",
  "timestamp": 1706500000000
}
```

#### Confirm Putaway

**Topic**: `Henkelv2/Shanghai/Logistics/Internal/Ops/Action/Confirm_Putaway`

```json
{
  "task_id": "TSK-2026-0001",
  "hu": "HU-12345",
  "target_bin": "A-01-02-03",
  "operator": "forklift123",
  "timestamp": 1706500000000
}
```

### 5.4 Exception Actions

#### Report Exception

**Topic**: `Henkelv2/Shanghai/Logistics/Internal/Ops/Action/Report_Exception`

```json
{
  "type": "SHORT_PICK",
  "source_document": "DN-2026-0001",
  "source_task": "TSK-2026-0002",
  "description": "Expected 100 units at A-01-02-03, found only 80",
  "expected_qty": 100,
  "actual_qty": 80,
  "location": "A-01-02-03",
  "material_code": "MAT-001",
  "reason_code": "INVENTORY_MISMATCH",
  "operator": "picker123",
  "timestamp": 1706500000000
}
```

#### Resolve Exception

**Topic**: `Henkelv2/Shanghai/Logistics/Internal/Ops/Action/Resolve_Exception`

```json
{
  "exception_id": "EX-2026-0001",
  "action": "ACCEPT",
  "resolution": "Adjusted inventory and reallocated from alternate location",
  "note": "Variance logged for investigation",
  "resolver": "supervisor123",
  "timestamp": 1706500000000
}
```


| Action      | Description                |
| ----------- | -------------------------- |
| `ACCEPT`    | Accept the exception as-is |
| `REJECT`    | Reject/return goods        |
| `WRITE_OFF` | Write off the variance     |
| `RECOUNT`   | Trigger recount            |
| `RETURN`    | Return to vendor/source    |


### 5.5 Quality Actions

#### Submit QC Result

**Topic**: `Henkelv2/Shanghai/Logistics/Internal/Quality/Action/Submit_Result`

```json
{
  "sample_id": "SMP-2026-0001",
  "result": "PASS",
  "results": {
    "visual": "OK",
    "dimension": "OK",
    "weight": 100.5
  },
  "notes": "All parameters within spec",
  "inspector": "qc_inspector123",
  "timestamp": 1706500000000
}
```

#### Execute Disposition

**Topic**: `Henkelv2/Shanghai/Logistics/Internal/Quality/Action/Execute_Disposition`

```json
{
  "lot_id": "LOT-2026-0001",
  "decision": "RELEASE",
  "disposition_type": "RELEASE_TO_STOCK",
  "notes": "QA approved for use",
  "approver": "qa_manager123",
  "timestamp": 1706500000000
}
```


| Decision      | Description                           |
| ------------- | ------------------------------------- |
| `RELEASE`     | Release to available stock            |
| `REJECT`      | Reject lot                            |
| `CONDITIONAL` | Conditional release with restrictions |
| `RTV`         | Return to vendor                      |
| `SCRAP`       | Scrap/dispose                         |
| `REWORK`      | Send for rework                       |
| `DOWNGRADE`   | Downgrade to lower grade              |


---

## 6. Error Handling

### 6.1 MQTT vs REST: Key Differences


| Aspect           | REST API         | MQTT (UNS)                     |
| ---------------- | ---------------- | ------------------------------ |
| Error Codes      | HTTP 200/400/500 | **No built-in codes**          |
| Timeout          | Protocol handles | **Must implement client-side** |
| Request/Response | Synchronous      | **Asynchronous**               |
| Inspection       | Chrome DevTools  | Binary (use MQTT Explorer)     |


### 6.2 Error Handling Strategy

Since MQTT has no built-in error mechanism:

1. **Backend publishes State updates** - Success is indicated by updated State topic
2. **Timeout handling** - Frontend sets timeout, shows error if no State update
3. **Validation before publish** - Use domain validators to catch errors client-side

```javascript
// Example: Timeout pattern (to be implemented)
const handleAction = async () => {
  const previousState = data.raw[TOPIC_STATE];
  
  publish(TOPIC_ACTION, payload);
  
  // Wait for state update (timeout after 5 seconds)
  const timeout = setTimeout(() => {
    if (data.raw[TOPIC_STATE] === previousState) {
      setError('Action timed out - no response from backend');
    }
  }, 5000);
};
```

### 6.3 Business Error Codes (Application Level)

For validation errors caught by domain validators:


| Code      | Domain    | Message                   |
| --------- | --------- | ------------------------- |
| `OUT_001` | Outbound  | Order not found           |
| `OUT_002` | Outbound  | Invalid status transition |
| `OUT_003` | Outbound  | Missing required field    |
| `INB_001` | Inbound   | ASN not found             |
| `INB_002` | Inbound   | Material not in master    |
| `INB_003` | Inbound   | Lot required              |
| `TSK_001` | Task      | Task not found            |
| `TSK_002` | Task      | Task already completed    |
| `EXC_001` | Exception | Reason code required      |


---

## 7. Frontend Implementation Pattern

### 7.1 Page Component Pattern

```javascript
import { useGlobalUNS } from '@/context/UNSContext';
import { EntityValidator } from '@/domain/{module}/{Entity}Validator';
import { EntityService } from '@/domain/{module}/{Entity}Service';
import UNSConnectionInfo from '@/components/UNSConnectionInfo';

// Define topics at top of file
const TOPIC_STATE = "Henkelv2/Shanghai/Logistics/{Module}/{Submodule}/State/{Entity}";
const TOPIC_ACTION = "Henkelv2/Shanghai/Logistics/{Module}/{Submodule}/Action/{Action_Name}";

export default function MyPage() {
  const { data, publish, status } = useGlobalUNS();
  
  // 1. Unwrap UNS envelope and normalize data
  const items = useMemo(() => {
    const rawData = data.raw[TOPIC_STATE];
    
    // Handle both direct array and object with items
    const list = Array.isArray(rawData) 
      ? rawData 
      : rawData?.items || rawData?.queue || [];
    
    return list.map(item => EntityService.normalize(item));
  }, [data.raw]);
  
  // 2. Publish actions with validation
  const handleAction = () => {
    try {
      // Validate using domain validator
      EntityValidator.validate(formData);
      
      // Build payload using domain service
      const payload = EntityService.buildCommand(formData);
      
      // Publish to action topic
      publish(TOPIC_ACTION, payload);
      
    } catch (error) {
      // Handle validation error
      setError(error.message);
    }
  };
  
  return (
    <PageContainer>
      <UNSConnectionInfo topic={TOPIC_STATE} />
      {/* Page content */}
    </PageContainer>
  );
}
```

### 7.2 UNS Envelope Handling

The `UNSContext.jsx` automatically unwraps the Tier0 envelope, but components should still handle data structure variations:

```javascript
// Pattern for safely accessing data
const items = useMemo(() => {
  const rawData = data.raw[TOPIC_STATE];
  
  // Handle UNS envelope (already unwrapped by context)
  // Handle different data structures
  if (Array.isArray(rawData)) return rawData;
  if (rawData?.items) return rawData.items;
  if (rawData?.queue) return rawData.queue;
  if (rawData?.asns) return rawData.asns;
  
  return [];
}, [data.raw]);
```

---

## 8. Debugging

### 8.1 MQTT Explorer

Download: [https://mqtt-explorer.com/](https://mqtt-explorer.com/)

Use to:

- Subscribe to all topics
- View message payloads (including UNS envelope)
- Publish test messages
- Monitor real-time traffic

### 8.2 Browser Console

The UNSContext logs all MQTT activity:

- `📤 Global Publish to {topic}` - Outgoing actions
- `📨 [MasterData] Received on topic:` - Incoming state
- `🔔 {Entity} RAW/CLEAN:` - Debug logging for specific entities

### 8.3 UNSConnectionInfo Component

Add to any page to show connection status:

```jsx
import UNSConnectionInfo from '@/components/UNSConnectionInfo';

<UNSConnectionInfo topic={TOPIC_STATE} />
```

---

## 9. UNS Standard Compliance Checklist

When creating new topics, verify:

- Topic type (`State`, `Action`, `Metrics`) is in **second-to-last** position
- Entity/action name is in **last** position
- Topic depth is ≤ 7 levels
- Names use underscores for multi-word: `Task_Queue`
- Entity IDs are in **payload**, not topic path
- Message uses UNS envelope format (backend responsibility)
- Action payloads include `operator` and `timestamp`

---

## 10. Topic Usage Index

This index shows which frontend files use each topic. **This is the single source of truth.**

### 10.1 Global Subscriptions (UNSContext.jsx)

The following topics are subscribed globally at app startup in `src/context/UNSContext.jsx`:


| Category   | Topic                                          | Description               |
| ---------- | ---------------------------------------------- | ------------------------- |
| External   | `.../External/Integration/State/Sync_Status`   | 3PL sync status           |
| Costing    | `.../Costing/State/DN_Workflow_DB`             | Order database with costs |
| Costing    | `.../Costing/State/Financial_Trends`           | Chart data                |
| Costing    | `.../Costing/State/Bill_Generated`             | Calculator result         |
| Finance    | `.../Finance/State/Monthly_Billing`            | Reconciliation data       |
| Master     | `.../MasterData/State/Rate_Cards`              | Rate cards                |
| Master     | `.../MasterData/State/Materials`               | Materials                 |
| Master     | `.../MasterData/State/Locations`               | Locations                 |
| Master     | `.../MasterData/State/Containers`              | Containers                |
| Master     | `.../MasterData/State/Warehouses`              | Warehouses                |
| Master     | `.../MasterData/State/BusinessPartners`        | Partners                  |
| Master     | `.../MasterData/State/Workers`                 | Workers                   |
| Internal   | `.../Internal/Ops/State/Inventory_Level`       | Stock levels              |
| Internal   | `.../Internal/Ops/State/Task_Queue`            | Putaway tasks             |
| Internal   | `.../Internal/Ops/State/Inbound_Plan`          | ASN list                  |
| Internal   | `.../Internal/Ops/State/Exceptions`            | Exception queue           |
| Quality    | `.../Internal/Quality/State/Disposition_Queue` | QC disposition            |
| Quality    | `.../Internal/Quality/State/Decision_Queue`    | QA approval               |
| Quality    | `.../Internal/Quality/State/Inspection_Queue`  | QC inspection             |
| Quality    | `.../Internal/Quality/State/Trace_Result`      | Traceability              |
| Production | `.../Production/State/Order_List`              | Production orders         |
| Production | `.../Production/State/Reservation_List`        | Reservations              |
| Production | `.../Production/State/Picking_Tasks`           | Production picks          |
| Exceptions | `.../Exceptions/State/Dispute_List`            | 3PL disputes              |
| Exceptions | `.../Exceptions/State/Audit_Log`               | Audit trail               |


### 10.2 Page-Level Action Topics

Topics defined locally in page files for **publishing** actions:

#### Outbound Module (`src/modules/outbound/pages/`)


| File                       | Topic Constant        | Full Topic                                      |
| -------------------------- | --------------------- | ----------------------------------------------- |
| `OutboundOrders.jsx`       | `TOPIC_ACTION_REVIEW` | `.../Costing/Action/Review_DN`                  |
| `OutboundOrders.jsx`       | `TOPIC_UPDATE_ACTION` | `.../External/Integration/Action/Update_Status` |
| `OutboundOrders.jsx`       | `TOPIC_CREATE_ACTION` | `.../Outbound/Action/Create_Order`              |
| `OutboundOrderCreate.jsx`  | `TOPIC_CREATE_ACTION` | `.../Outbound/Action/Create_Order`              |
| `DnApproval.jsx`           | `TOPIC_ACTION`        | `.../Costing/Action/Review_DN`                  |
| `DnOperatorQueue.jsx`      | `TOPIC_ACTION`        | `.../Costing/Action/Submit_VAS`                 |
| `DispatchOrders.jsx`       | `TOPIC_ACTION_CREATE` | `.../Outbound/Action/Create_Shipment`           |
| `DispatchPicking.jsx`      | `TOPIC_ACTION_PICK`   | `.../Outbound/Action/Confirm_Outbound_Pick`     |
| `DispatchPacking.jsx`      | `TOPIC_ACTION_PACK`   | `.../Outbound/Action/Confirm_Pack`              |
| `ShipmentConfirmation.jsx` | `TOPIC_ACTION_SHIP`   | `.../Outbound/Action/Confirm_Ship`              |
| `PickingTask.jsx`          | `TOPIC_ACTION_PICK`   | `.../Outbound/Action/Confirm_Pick`              |
| `PickingTask.jsx`          | `TOPIC_EXCEPTION`     | `.../Outbound/Action/Report_Short_Pick`         |
| `OutboundDN.jsx`           | `TOPIC_UPDATE_ACTION` | `.../External/Integration/Action/Update_Status` |


#### Inbound Module (`src/modules/inbound/pages/`)


| File              | Topic Constant           | Full Topic                                 |
| ----------------- | ------------------------ | ------------------------------------------ |
| `PutawayMove.jsx` | `TOPIC_ACTION_CONFIRM`   | `.../Internal/Ops/Action/Confirm_Putaway`  |
| `PutawayMove.jsx` | `TOPIC_ACTION_REPORT_EX` | `.../Internal/Ops/Action/Report_Exception` |


#### Quality Module (`src/modules/quality/pages/`)


| File                 | Topic Constant             | Full Topic                                        |
| -------------------- | -------------------------- | ------------------------------------------------- |
| `QualityControl.jsx` | `TOPIC_ACTION`             | `.../Internal/Quality/Action/Submit_Result`       |
| `QASamples.jsx`      | `TOPIC_SUBMIT_RESULT`      | `.../Internal/Quality/Action/Submit_Result`       |
| `QADecisions.jsx`    | `TOPIC_ACTION_DISPOSITION` | `.../Internal/Quality/Action/Execute_Disposition` |
| `QCDisposition.jsx`  | `TOPIC_ACTION`             | `.../Internal/Quality/Action/Execute_Disposition` |


#### Production Module (`src/modules/production/pages/`)


| File                        | Topic Constant                    | Full Topic                                 |
| --------------------------- | --------------------------------- | ------------------------------------------ |
| `ProductionOrders.jsx`      | `TOPIC_CREATE_ORDER`              | `.../Production/Action/Create_Order`       |
| `ProductionRequests.jsx`    | `TOPIC_ACTION_CREATE_RESERVATION` | `.../Production/Action/Create_Reservation` |
| `ProductionPicking.jsx`     | `TOPIC_ACTION_PICK`               | `.../Production/Action/Confirm_Pick`       |
| `ProductionConsumption.jsx` | `TOPIC_ACTION_CONSUME`            | `.../Production/Action/Consume_Material`   |
| `LineStaging.jsx`           | `TOPIC_ACTION_STAGE`              | `.../Production/Action/Confirm_Stage`      |
| `FinishedGoodsReceipt.jsx`  | `TOPIC_ACTION_FG_RECEIPT`         | `.../Production/Action/Post_FG_Receipt`    |
| `Reservations.jsx`          | `TOPIC_ACTION_ALLOCATE`           | `.../Production/Action/Run_Allocation`     |


#### Master Data Module (`src/modules/master/pages/`)


| File                                      | Topic Constant | Full Topic                                     |
| ----------------------------------------- | -------------- | ---------------------------------------------- |
| `Materials.jsx`                           | `TOPIC_ACTION` | `.../MasterData/Action/Update_Material`        |
| `MaterialsDetails.jsx`                    | `TOPIC_ACTION` | `.../MasterData/Action/Update_Material`        |
| `Locations.jsx`                           | `TOPIC_ACTION` | `.../MasterData/Action/Update_Location`        |
| `Containers.jsx`                          | `TOPIC_ACTION` | `.../MasterData/Action/Update_Container`       |
| `WorkerList.jsx`                          | `TOPIC_ACTION` | `.../MasterData/Action/Update_Worker`          |
| `WorkerDetail.jsx`                        | `TOPIC_ACTION` | `.../MasterData/Action/Update_Worker`          |
| `warehouse/WarehouseDetail.jsx`           | `TOPIC_ACTION` | `.../MasterData/Action/Update_Warehouse`       |
| `warehouse/components/LocationsTable.jsx` | `TOPIC_ACTION` | `.../MasterData/Action/Update_Location`        |
| `partner/PartnerDetail.jsx`               | `TOPIC_ACTION` | `.../MasterData/Action/Update_BusinessPartner` |


#### Integration Module (`src/modules/integration/pages/`)


| File                    | Topic Constant | Full Topic                            |
| ----------------------- | -------------- | ------------------------------------- |
| `ThreePLExceptions.jsx` | `TOPIC_ACTION` | `.../Exceptions/Action/Raise_Dispute` |


### 10.3 Topic Naming Pattern

All topics follow this abbreviated prefix:

```
Henkelv2/Shanghai/Logistics/...
```

When seeing `.../Module/Submodule/Type/Entity` in this document, prepend the full prefix.

---

## References

- **Tier0 Platform**: [https://tier0.app](https://tier0.app)
- **Topic Patterns**: See `.cursor/skills/mqtt-uns-patterns/SKILL.md`
- **Domain Model**: See `DOMAIN_MODEL.md`
- **Workflows**: See `WORKFLOWS.md`

