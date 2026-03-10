# WMS Domain Model

This document defines all business entities, their attributes, relationships, and invariants (rules that must always be true).

---

## 1. Core Entities

### 1.1 OutboundOrder (出库单 / Delivery Note)

The demand intent representing what must be shipped.

| Field | Type | Required | Validation | Notes |
|-------|------|----------|------------|-------|
| `dn_no` | string | Yes | Format: DN-YYYY-NNNN | Unique identifier |
| `type` | enum | Yes | `SALES_ORDER`, `TRANSFER_OUT` | Determines required fields |
| `status` | enum | Yes | See Status Values below | Current workflow state |
| `customer` | string | If SALES_ORDER | Partner code from BusinessPartners | Ship-to party |
| `destination` | string | If TRANSFER_OUT | Warehouse code | Target warehouse |
| `warehouse` | string | Yes | Warehouse code | Source warehouse |
| `requested_date` | date | Yes | Future or today | Required ship date |
| `lines[]` | array | Yes, min 1 | Each line must have code + qty | Order line items |
| `total_cost` | number | No | >= 0 | Calculated by costing engine |
| `carrier` | string | If SHIPPED | - | Carrier for shipment |
| `tracking_number` | string | If SHIPPED | - | Tracking reference |

#### Enterprise Extension Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `wave_id` | string | If WAVE_ASSIGNED | Wave group ID (Trading context) |
| `priority` | enum | No | `HIGH`, `NORMAL`, `LOW` |
| `context` | enum | Auto | `TRADING`, `MANUFACTURING` (derived from type) |
| `on_hold` | boolean | No | Whether order is on hold |
| `hold_reason` | string | If on_hold | Reason for hold |
| `allocated_at` | timestamp | No | When allocation completed |
| `picked_at` | timestamp | No | When picking completed |
| `packed_at` | timestamp | No | When packing completed |
| `shipped_at` | timestamp | No | When shipment confirmed |

**Validator**: `src/domain/outbound/OutboundOrderValidator.js`
**Service**: `src/domain/outbound/OutboundOrderService.js`

#### OutboundOrderLine

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `code` | string | Yes | Must exist in Materials master |
| `qty` | number | Yes | > 0 |
| `picked_qty` | number | No | >= 0, <= qty |
| `packed_qty` | number | No | >= 0, <= picked_qty |

---

### 1.2 InboundOrder (入库单 / ASN / Receipt)

The supply signal representing expected goods arrival.

| Field | Type | Required | Validation | Notes |
|-------|------|----------|------------|-------|
| `id` | string | Yes | Unique | ASN/Receipt identifier |
| `type` | enum | Yes | `PO`, `ASN`, `RMA`, `PROD_FG`, `PROD_SFG`, `SUB_RET`, `TRANSFER` | Business type |
| `status` | enum | Yes | See WORKFLOWS.md | Current workflow state |
| `supplier` | string | If PO/ASN | Partner code | Supplier party |
| `line_id` | string | If PROD_* | Production line | Manufacturing source |
| `warehouse` | string | Yes | Warehouse code | Target warehouse |
| `eta` | date | No | - | Expected arrival |
| `lines[]` | array | Yes, min 1 | - | Expected items |

**Validator**: `src/domain/inbound/InboundOrderValidator.js`
**Service**: `src/domain/inbound/InboundOrderService.js`

#### Business Type Mapping

| Type Code | Display Name | Source |
|-----------|-------------|--------|
| `PO` | Purchase Receipt | External supplier |
| `ASN` | Supplier Delivery | External supplier (advance notice) |
| `RMA` | Sales Return | Customer return |
| `PROD_FG` | Finished Goods Receipt | Production (FG) |
| `PROD_SFG` | Semi-Finished Receipt | Production (SFG) |
| `SUB_RET` | Subcontract Return | Subcontractor |
| `TRANSFER` | Inter-WH Transfer | Another warehouse |

---

### 1.3 Inventory (库存)

Current stock state at a specific location.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `material_code` | string | Yes | Material identifier |
| `warehouse` | string | Yes | Warehouse code |
| `location` | string | Yes | Bin/location code |
| `qty` | number | Yes | Current quantity |
| `uom` | string | Yes | Unit of measure |
| `status` | enum | Yes | `AVAILABLE`, `QA_HOLD`, `BLOCKED`, `DAMAGED`, `IN_TRANSIT` |
| `lot` | string | If lot-controlled | Batch/lot number |
| `serial` | string | If serial-controlled | Serial number |
| `expiry_date` | date | If shelf-life controlled | Expiration date |
| `owner` | string | No | Owner code (for consignment) |
| `hu_id` | string | No | Handling unit containing this inventory |

---

### 1.4 HandlingUnit (HU / LPN / 容器)

Physical packaging/container that holds inventory.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `hu_id` | string | Yes | Unique identifier (license plate) |
| `type` | enum | Yes | `PALLET`, `CARTON`, `TOTE`, `BIN` |
| `status` | enum | Yes | `EMPTY`, `PARTIAL`, `FULL`, `IN_TRANSIT` |
| `location` | string | Yes | Current location |
| `parent_hu` | string | No | Parent HU (for nesting) |
| `contents[]` | array | No | Inventory items in this HU |

**Validator**: `src/domain/container/ContainerValidator.js`

---

### 1.5 Task (任务)

Executable work unit assigned to operators.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `task_id` | string | Yes | Unique identifier |
| `type` | enum | Yes | `PUTAWAY`, `PICK`, `PACK`, `MOVE`, `COUNT`, `REPLENISH` |
| `status` | enum | Yes | `PENDING`, `ASSIGNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED` |
| `priority` | number | Yes | 1 (highest) to 5 (lowest) |
| `source_location` | string | Depends on type | From location |
| `target_location` | string | Depends on type | To location |
| `material_code` | string | Yes | Material to handle |
| `qty` | number | Yes | Quantity to handle |
| `hu_id` | string | No | Handling unit to move |
| `assigned_to` | string | No | Worker ID |
| `order_ref` | string | No | Reference to source order |

**Validator**: `src/domain/inbound/PutawayTaskValidator.js`, `src/domain/outbound/PickingTaskValidator.js`
**Service**: `src/domain/inbound/PutawayTaskService.js`, `src/domain/outbound/PickingTaskService.js`

---

### 1.6 Exception (异常)

Governed deviation from expected workflow.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | Yes | Unique identifier |
| `type` | enum | Yes | See Exception Types below |
| `status` | enum | Yes | `OPEN`, `INVESTIGATING`, `PENDING_APPROVAL`, `RESOLVED`, `CLOSED` |
| `severity` | enum | Yes | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| `source_document` | string | Yes | Related order/task ID |
| `reason_code` | string | Yes | Standardized reason |
| `description` | string | Yes | Human-readable description |
| `evidence` | array | No | Attachments (photos, docs) |
| `resolution` | string | If resolved | Resolution action taken |
| `resolver` | string | If resolved | Who resolved |
| `approver` | string | If approval required | Who approved |

**Validator**: `src/domain/inbound/ExceptionValidator.js`
**Service**: `src/domain/inbound/ExceptionService.js`

#### Exception Types

| Type | Domain | Description |
|------|--------|-------------|
| `OVER_RECEIPT` | Inbound | Received qty > expected |
| `SHORT_RECEIPT` | Inbound | Received qty < expected |
| `WRONG_ITEM` | Inbound | Material mismatch |
| `DAMAGED` | Inbound/Inventory | Physical damage |
| `MISSING_ATTRIBUTE` | Inbound | Lot/serial not captured |
| `NO_LOCATION` | Putaway | No valid putaway location |
| `SHORT_PICK` | Outbound | Inventory not found at location |
| `INVENTORY_MISMATCH` | Inventory | Count variance |

---

### 1.7 Master Data Entities

#### Material (物料)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `code` | string | Yes | Unique material code |
| `name` | string | Yes | Description |
| `uom` | string | Yes | Base unit of measure |
| `category` | string | No | Classification |
| `lot_controlled` | boolean | No | Requires lot tracking |
| `serial_controlled` | boolean | No | Requires serial tracking |
| `shelf_life_days` | number | No | Days until expiry |
| `hazmat_class` | string | No | Hazardous material class |
| `temperature_zone` | enum | No | `AMBIENT`, `CHILLED`, `FROZEN` |

**Validator**: `src/domain/material/MaterialValidator.js`

#### Location (库位)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `code` | string | Yes | Unique location code |
| `warehouse` | string | Yes | Parent warehouse |
| `zone` | string | No | Zone classification |
| `type` | enum | Yes | `BULK`, `RACK`, `BIN`, `STAGING`, `DOCK`, `QUARANTINE` |
| `capacity` | number | No | Max weight/volume |
| `allow_mixed_sku` | boolean | No | Can hold multiple materials |
| `allow_mixed_lot` | boolean | No | Can hold multiple lots |

**Validator**: `src/domain/location/LocationValidator.js`

#### Warehouse (仓库)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `code` | string | Yes | Unique warehouse code |
| `name` | string | Yes | Display name |
| `type` | enum | Yes | `INTERNAL`, `EXTERNAL`, `3PL` |
| `address` | string | No | Physical address |

**Validator**: `src/domain/warehouse/WarehouseValidator.js`

#### BusinessPartner (业务伙伴)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `code` | string | Yes | Unique partner code |
| `name` | string | Yes | Display name |
| `type` | enum | Yes | `CUSTOMER`, `SUPPLIER`, `CARRIER`, `3PL` |
| `address` | string | No | Address |
| `contact` | string | No | Contact info |

**Validator**: `src/domain/partner/PartnerValidator.js`

#### Worker (工人)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | Yes | Unique worker ID |
| `name` | string | Yes | Display name |
| `role` | enum | Yes | See PRD.md Users & Roles |
| `warehouse` | string | Yes | Assigned warehouse |
| `skills` | array | No | Certifications/capabilities |

**Validator**: `src/domain/worker/WorkerValidator.js`

---

## 2. Invariants (Business Rules That Must Always Be True)

### 2.1 Order Invariants

| ID | Rule | Enforced By |
|----|------|-------------|
| ORD-001 | Order must have at least 1 line with qty > 0 | `OutboundOrderValidator.validateCreate()` |
| ORD-002 | SALES_ORDER requires customer | `OutboundOrderValidator.validateCreate()` |
| ORD-003 | TRANSFER_OUT requires destination | `OutboundOrderValidator.validateCreate()` |
| ORD-004 | Cannot ship if picked_qty < required_qty | `OutboundOrderValidator.validateWorkflowAction()` |
| ORD-005 | SHIPPED status requires carrier + tracking | `OutboundOrderValidator.validateWorkflowAction()` |
| ORD-006 | Status transitions must follow state machine | `OutboundOrderValidator.validateStatusTransition()` |

### 2.2 Inventory Invariants

| ID | Rule | Enforced By |
|----|------|-------------|
| INV-001 | Inventory qty cannot be negative | Backend validation |
| INV-002 | QA_HOLD inventory cannot be allocated | Allocation logic |
| INV-003 | BLOCKED inventory cannot be picked | Picking logic |
| INV-004 | Lot-controlled materials must have lot | Receipt validation |
| INV-005 | Serial-controlled materials must have serial | Receipt validation |

### 2.3 Task Invariants

| ID | Rule | Enforced By |
|----|------|-------------|
| TSK-001 | Task cannot be completed without confirmation | Task service |
| TSK-002 | COMPLETED tasks are immutable | Task service |
| TSK-003 | Only ASSIGNED tasks can be IN_PROGRESS | `PutawayTaskValidator` |

### 2.4 Exception Invariants

| ID | Rule | Enforced By |
|----|------|-------------|
| EXC-001 | All exceptions require reason_code | `ExceptionValidator` |
| EXC-002 | Resolution requires resolver identity | `ExceptionService` |
| EXC-003 | HIGH/CRITICAL exceptions require approval | Exception workflow |

### 2.5 Audit Invariants

| ID | Rule | Enforced By |
|----|------|-------------|
| AUD-001 | Confirmed events are immutable | Event store design |
| AUD-002 | All state changes must be traceable | Event logging |
| AUD-003 | Overrides require reason_code + approver | Override workflow |

---

## 3. Relationships (Entity Graph)

```
OutboundOrder ─────┬──── lines[] ────── OutboundOrderLine
                   │                           │
                   │                           └── Material
                   │
                   ├──── customer ────── BusinessPartner
                   │
                   └──── warehouse ────── Warehouse
                                              │
                                              └──── Location[]
                                                       │
                                                       └──── Inventory[]
                                                                │
                                                                ├── Material
                                                                └── HandlingUnit
```

---

## 4. Status Values Reference

### OutboundOrder Status

> **Note**: Enterprise extensions add additional statuses beyond the basic workflow. See the Extended Status section below.

#### Basic Status (per WORKFLOWS.md)

| Status | Display | Can Edit | Can Delete |
|--------|---------|----------|------------|
| `NEW` | New | Yes | Yes |
| `PENDING` | Pending | Yes | Yes |
| `PENDING_APPROVAL` | Needs Approval | Limited | No |
| `APPROVED` | Approved | No | No |
| `ALLOCATED` | Allocated | No | No |
| `READY_TO_PICK` | Ready to Pick | No | No |
| `PICKING` | Picking | No | No |
| `PACKING` | Packing | No | No |
| `READY_TO_SHIP` | Ready to Ship | No | No |
| `SHIPPED` | Shipped | No | No |
| `REJECTED` | Rejected | No | No |

#### Enterprise Extended Status

| Status | Display | Context | Description |
|--------|---------|---------|-------------|
| `RELEASED` | Released | Both | Order released for execution |
| `ON_HOLD` | On Hold | Both | Temporarily suspended |
| `WAVE_ASSIGNED` | Wave Assigned | Trading | Added to wave for batch picking |
| `ALLOCATING` | Allocating | Both | Inventory allocation in progress |
| `BACKORDER` | Backorder | Both | Insufficient inventory |
| `PICKED` | Picked | Both | All lines picked |
| `PACKED` | Packed | Both | All lines packed |
| `DELIVERED` | Delivered | Manufacturing | Material delivered to production |

See `WORKFLOWS.md` for valid transitions.

### Inventory Status

| Status | Available for Allocation | Available for Pick | Notes |
|--------|--------------------------|-------------------|-------|
| `AVAILABLE` | Yes | Yes | Normal usable stock |
| `QA_HOLD` | No | No | Pending quality decision |
| `BLOCKED` | No | No | Administratively blocked |
| `DAMAGED` | No | No | Physically damaged |
| `IN_TRANSIT` | No | No | Being moved |

---

## References

- **State Machines**: See `WORKFLOWS.md`
- **MQTT Messages**: See `MQTT_CONTRACT.md`
- **Business Rules**: See `BUSINESS_RULES.md`
- **Edge Cases**: See `EDGE_CASES.md`
