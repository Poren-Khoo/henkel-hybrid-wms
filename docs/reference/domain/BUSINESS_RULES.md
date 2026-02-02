# WMS Business Rules Catalog

This document catalogs all business rules in a searchable format. Each rule has a unique ID for reference in code and discussions.

---

## Rule Format

Each rule follows this structure:

```
## Rule: {ID} {Name}
**Domain**: {Inbound|Outbound|Inventory|Quality|Task|Exception}
**Trigger**: When this rule is evaluated
**Condition**: The check performed
**Decision**: ALLOW | WARN | BLOCK
**Required Approval**: Role if override needed
**Reason Code**: Code for audit trail
**Applies To**: Context where rule applies
**Implementation**: Code reference
```

---

## 1. Document Lifecycle Rules

### Rule: DOC-001 Order Release Conditions
**Domain**: Outbound
**Trigger**: User attempts to release order for picking
**Condition**: 
- All required fields present (type, warehouse, lines)
- At least 1 line with qty > 0
- Customer present if SALES_ORDER
- Destination present if TRANSFER_OUT
**Decision**: BLOCK if any condition fails
**Required Approval**: None
**Reason Code**: `VALIDATION_FAILED`
**Applies To**: All order types
**Implementation**: `OutboundOrderValidator.validateCreate()`

### Rule: DOC-002 Order Edit Lock
**Domain**: Outbound
**Trigger**: User attempts to edit order fields
**Condition**: Order status is `NEW` or `PENDING`
**Decision**: BLOCK if status beyond `PENDING`
**Required Approval**: None
**Reason Code**: `ORDER_LOCKED`
**Applies To**: All order types
**Notes**: Once released, orders cannot be edited—only cancelled and recreated

### Rule: DOC-003 Order Cancellation
**Domain**: Outbound
**Trigger**: User attempts to cancel order
**Condition**: Order status is before `PICKING`
**Decision**: BLOCK if `PICKING` or beyond
**Required Approval**: Warehouse Manager if `APPROVED`
**Reason Code**: `CANCELLATION_BLOCKED`
**Applies To**: All order types

### Rule: DOC-004 Split Shipment
**Domain**: Outbound
**Trigger**: Partial allocation or partial pick
**Condition**: Customer allows split shipment
**Decision**: ALLOW if customer permits, WARN if not configured
**Required Approval**: Planner
**Reason Code**: `SPLIT_SHIPMENT`
**Applies To**: SALES_ORDER

### Rule: DOC-005 Partial Receipt
**Domain**: Inbound
**Trigger**: Received qty < Expected qty
**Condition**: Allow partial close?
**Decision**: ALLOW with variance tracking
**Required Approval**: Supervisor if variance > 10%
**Reason Code**: `PARTIAL_RECEIPT`
**Applies To**: All inbound types

---

## 2. Inventory Attribute Rules

### Rule: INV-001 Lot Capture Required
**Domain**: Inbound
**Trigger**: Material received during goods receipt
**Condition**: Material is lot-controlled (`lot_controlled = true`)
**Decision**: BLOCK if lot not provided
**Required Approval**: None
**Reason Code**: `LOT_REQUIRED`
**Applies To**: Materials with `lot_controlled = true`
**Implementation**: Backend validation on receipt

### Rule: INV-002 Serial Capture Required
**Domain**: Inbound
**Trigger**: Material received during goods receipt
**Condition**: Material is serial-controlled (`serial_controlled = true`)
**Decision**: BLOCK if serial not provided
**Required Approval**: None
**Reason Code**: `SERIAL_REQUIRED`
**Applies To**: Materials with `serial_controlled = true`

### Rule: INV-003 Expiry Date Capture
**Domain**: Inbound
**Trigger**: Material received during goods receipt
**Condition**: Material has shelf life (`shelf_life_days > 0`)
**Decision**: BLOCK if expiry_date not provided
**Required Approval**: None
**Reason Code**: `EXPIRY_REQUIRED`
**Applies To**: Perishable materials

### Rule: INV-004 Expiry Validation
**Domain**: Inbound
**Trigger**: Expiry date captured
**Condition**: Expiry date is in the future
**Decision**: BLOCK if expiry_date <= today
**Required Approval**: QA Manager for expired goods
**Reason Code**: `EXPIRED_MATERIAL`
**Applies To**: All shelf-life controlled materials

### Rule: INV-005 Minimum Remaining Shelf Life
**Domain**: Outbound
**Trigger**: Allocation for customer order
**Condition**: Remaining shelf life >= customer minimum requirement
**Decision**: WARN if below threshold, BLOCK if below critical
**Required Approval**: Customer Service
**Reason Code**: `SHORT_SHELF_LIFE`
**Applies To**: Perishable materials, configurable per customer

### Rule: INV-006 Status Eligibility - Allocation
**Domain**: Outbound
**Trigger**: Inventory allocation
**Condition**: Inventory status = `AVAILABLE`
**Decision**: BLOCK if `QA_HOLD`, `BLOCKED`, `DAMAGED`, `IN_TRANSIT`
**Required Approval**: None
**Reason Code**: `STATUS_INELIGIBLE`
**Applies To**: All inventory

### Rule: INV-007 Status Eligibility - Pick
**Domain**: Outbound
**Trigger**: Pick task execution
**Condition**: Inventory status = `AVAILABLE` or `ALLOCATED`
**Decision**: BLOCK if status changed since allocation
**Required Approval**: Supervisor
**Reason Code**: `STATUS_CHANGED`
**Applies To**: All inventory

---

## 3. Location & Storage Rules

### Rule: LOC-001 Location Type Compatibility
**Domain**: Putaway
**Trigger**: Putaway location suggestion
**Condition**: Material type compatible with location type
**Decision**: BLOCK if incompatible (e.g., hazmat to non-hazmat zone)
**Required Approval**: None
**Reason Code**: `LOCATION_INCOMPATIBLE`
**Applies To**: All materials

### Rule: LOC-002 Capacity Check
**Domain**: Putaway
**Trigger**: Putaway to location
**Condition**: Location has available capacity (weight/volume/positions)
**Decision**: WARN if approaching limit, BLOCK if exceeded
**Required Approval**: Supervisor to override
**Reason Code**: `CAPACITY_EXCEEDED`
**Applies To**: All locations with capacity limits

### Rule: LOC-003 Temperature Zone Match
**Domain**: Putaway
**Trigger**: Putaway location suggestion
**Condition**: Material temperature requirement matches location zone
**Decision**: BLOCK if mismatch (e.g., frozen material to ambient)
**Required Approval**: QA Manager
**Reason Code**: `TEMPERATURE_MISMATCH`
**Applies To**: Temperature-controlled materials

### Rule: LOC-004 Hazmat Segregation
**Domain**: Putaway
**Trigger**: Putaway location suggestion
**Condition**: No incompatible hazmat classes in same location
**Decision**: BLOCK if conflict
**Required Approval**: Safety Officer
**Reason Code**: `HAZMAT_CONFLICT`
**Applies To**: Hazardous materials

### Rule: LOC-005 Mixed SKU in Location
**Domain**: Putaway
**Trigger**: Putaway to occupied location
**Condition**: Location allows mixed SKU (`allow_mixed_sku = true`)
**Decision**: BLOCK if mixed SKU not allowed
**Required Approval**: Supervisor
**Reason Code**: `MIXED_SKU_NOT_ALLOWED`
**Applies To**: Locations with `allow_mixed_sku = false`

### Rule: LOC-006 Mixed Lot in Location
**Domain**: Putaway
**Trigger**: Putaway to occupied location
**Condition**: Location allows mixed lots (`allow_mixed_lot = true`)
**Decision**: BLOCK if mixed lot not allowed
**Required Approval**: Supervisor
**Reason Code**: `MIXED_LOT_NOT_ALLOWED`
**Applies To**: Locations with `allow_mixed_lot = false`

### Rule: LOC-007 Fixed Bin Assignment
**Domain**: Putaway
**Trigger**: Putaway location suggestion
**Condition**: Material has fixed bin assignment
**Decision**: WARN if not using fixed bin, suggest fixed bin first
**Required Approval**: None
**Reason Code**: `FIXED_BIN_AVAILABLE`
**Applies To**: Materials with fixed bin configuration

---

## 4. Allocation Rules

### Rule: ALLOC-001 FEFO Strategy
**Domain**: Outbound
**Trigger**: Inventory allocation for order
**Condition**: Material is shelf-life controlled
**Decision**: Allocate oldest expiry date first
**Required Approval**: Planner to override
**Reason Code**: `FEFO_OVERRIDE`
**Applies To**: All shelf-life controlled materials
**Implementation**: Allocation engine

### Rule: ALLOC-002 FIFO Strategy
**Domain**: Outbound
**Trigger**: Inventory allocation for order
**Condition**: Material is not shelf-life controlled
**Decision**: Allocate oldest receipt date first
**Required Approval**: Planner to override
**Reason Code**: `FIFO_OVERRIDE`
**Applies To**: Non-perishable materials

### Rule: ALLOC-003 Pick Face Priority
**Domain**: Outbound
**Trigger**: Inventory allocation for picking
**Condition**: Pick face has available inventory
**Decision**: Allocate from pick face before bulk storage
**Required Approval**: None
**Reason Code**: N/A
**Applies To**: Materials with pick face locations

### Rule: ALLOC-004 HU Integrity
**Domain**: Outbound
**Trigger**: Full pallet allocation possible
**Condition**: Demand qty >= full HU qty
**Decision**: Allocate full HU before breaking
**Required Approval**: Planner to force break
**Reason Code**: `HU_BROKEN`
**Applies To**: Pallet and case picks

### Rule: ALLOC-005 Lot Preference
**Domain**: Outbound
**Trigger**: Customer specifies lot preference
**Condition**: Preferred lot available
**Decision**: Allocate preferred lot first
**Required Approval**: Customer Service if not available
**Reason Code**: `LOT_PREFERENCE_UNAVAILABLE`
**Applies To**: Orders with lot preferences

### Rule: ALLOC-006 Substitution Allowed
**Domain**: Outbound
**Trigger**: Primary material unavailable
**Condition**: Substitute material configured and available
**Decision**: WARN, suggest substitute
**Required Approval**: Customer Service or auto if configured
**Reason Code**: `SUBSTITUTION_APPLIED`
**Applies To**: Materials with substitutes configured

### Rule: ALLOC-007 Shortage Policy
**Domain**: Outbound
**Trigger**: Insufficient inventory for full order
**Condition**: Policy setting (backorder vs partial vs block)
**Decision**: Per policy—ALLOW partial, create backorder, or BLOCK
**Required Approval**: Planner for partial ship
**Reason Code**: `PARTIAL_ALLOCATION`, `BACKORDER_CREATED`
**Applies To**: Configurable per customer/material

---

## 5. Task Generation Rules

### Rule: TSK-001 Putaway Task Creation
**Domain**: Inbound
**Trigger**: Goods receipt confirmed
**Condition**: Inventory needs storage location
**Decision**: Create putaway task
**Required Approval**: None
**Applies To**: All received inventory (except cross-dock)

### Rule: TSK-002 Pick Task Creation
**Domain**: Outbound
**Trigger**: Order allocation confirmed
**Condition**: Inventory allocated to order
**Decision**: Create pick task per allocation line
**Required Approval**: None
**Applies To**: All allocated inventory

### Rule: TSK-003 Task Priority Assignment
**Domain**: Task
**Trigger**: Task created
**Condition**: Order priority, SLA, ship date
**Decision**: Assign priority 1-5 based on rules
**Required Approval**: Planner to override
**Applies To**: All tasks

### Rule: TSK-004 Task Assignment Rules
**Domain**: Task
**Trigger**: Task ready for assignment
**Condition**: Worker skill/zone/equipment match
**Decision**: Assign to qualified worker in zone
**Required Approval**: Supervisor to reassign
**Applies To**: All tasks

### Rule: TSK-005 Scan Confirmation Required
**Domain**: Task
**Trigger**: Task completion
**Condition**: High-value or serial-controlled material
**Decision**: Require double-scan confirmation
**Required Approval**: None
**Reason Code**: `SCAN_REQUIRED`
**Applies To**: Configurable per material class

---

## 6. Quality Gate Rules

### Rule: QA-001 QC Required on Receipt
**Domain**: Quality
**Trigger**: Material received
**Condition**: Material/supplier requires inspection
**Decision**: Route to QA_HOLD, create inspection task
**Required Approval**: None
**Applies To**: Configurable per material/supplier

### Rule: QA-002 Sampling Plan
**Domain**: Quality
**Trigger**: QC task created
**Condition**: Sample size determination
**Decision**: Calculate sample size based on lot size and AQL
**Required Approval**: QA Manager to modify
**Applies To**: Inspection lots

### Rule: QA-003 QC Release Authority
**Domain**: Quality
**Trigger**: QC inspection complete, results pass
**Condition**: User has QA release permission
**Decision**: ALLOW release if authorized
**Required Approval**: QA Manager for conditional release
**Applies To**: All QC lots

### Rule: QA-004 QC Reject Authority
**Domain**: Quality
**Trigger**: QC inspection complete, results fail
**Condition**: User has QA reject permission
**Decision**: ALLOW reject if authorized
**Required Approval**: None
**Applies To**: All QC lots

### Rule: QA-005 Disposition Options
**Domain**: Quality
**Trigger**: Material rejected by QC
**Condition**: Disposition type selected
**Decision**: Route to appropriate flow (RTV, scrap, rework, downgrade)
**Required Approval**: QA Manager for disposition
**Reason Code**: Per disposition type
**Applies To**: Rejected materials

---

## 7. Exception Handling Rules

### Rule: EXC-001 Over-Receipt Tolerance
**Domain**: Inbound
**Trigger**: Received qty > Expected qty
**Condition**: Variance percentage
**Decision**: 
- <= 5%: ALLOW
- 5-10%: WARN, auto-accept
- > 10%: BLOCK, create exception
**Required Approval**: Supervisor for > 10%
**Reason Code**: `OVER_RECEIPT`
**Applies To**: All inbound, configurable per supplier

### Rule: EXC-002 Short-Receipt Tolerance
**Domain**: Inbound
**Trigger**: Received qty < Expected qty
**Condition**: Variance percentage
**Decision**:
- <= 5%: ALLOW, close ASN
- > 5%: WARN, keep ASN open for remainder
**Required Approval**: None
**Reason Code**: `SHORT_RECEIPT`
**Applies To**: All inbound

### Rule: EXC-003 Short-Pick Handling
**Domain**: Outbound
**Trigger**: Physical qty < Allocated qty at pick
**Condition**: Inventory mismatch detected
**Decision**: BLOCK pick, create exception, trigger recount
**Required Approval**: Supervisor
**Reason Code**: `SHORT_PICK`
**Applies To**: All pick tasks
**Actions**: Recount location, adjust inventory, reallocate

### Rule: EXC-004 Reason Code Required
**Domain**: Exception
**Trigger**: Exception resolution
**Condition**: Resolution selected
**Decision**: BLOCK if reason_code not provided
**Required Approval**: None
**Reason Code**: Various (from reason code list)
**Applies To**: All exceptions

### Rule: EXC-005 Evidence Required
**Domain**: Exception
**Trigger**: Exception type requires evidence
**Condition**: Damage, contamination, mismatch
**Decision**: WARN if evidence not attached
**Required Approval**: Supervisor to override
**Reason Code**: `EVIDENCE_REQUIRED`
**Applies To**: Configurable per exception type

### Rule: EXC-006 Approval Threshold
**Domain**: Exception
**Trigger**: Exception value/severity
**Condition**: Value > threshold or severity = HIGH/CRITICAL
**Decision**: Require supervisor/manager approval
**Required Approval**: Based on threshold matrix
**Applies To**: All exceptions

---

## 8. Integration Rules

### Rule: INT-001 Idempotency Check
**Domain**: Integration
**Trigger**: Message received from external system
**Condition**: Message ID already processed
**Decision**: Ignore duplicate, return success
**Required Approval**: None
**Applies To**: All inbound integrations

### Rule: INT-002 Posting Retry
**Domain**: Integration
**Trigger**: Goods receipt/issue posting to ERP
**Condition**: ERP posting failed
**Decision**: Queue for retry (max 3 attempts)
**Required Approval**: Admin after 3 failures
**Reason Code**: `POSTING_FAILED`
**Applies To**: All ERP postings

### Rule: INT-003 Reconciliation Flag
**Domain**: Integration
**Trigger**: WMS/ERP data mismatch detected
**Condition**: Inventory qty differs
**Decision**: Flag for reconciliation, create discrepancy record
**Required Approval**: Finance/Controller
**Reason Code**: `RECONCILIATION_REQUIRED`
**Applies To**: All synchronized data

---

## 9. Audit Rules

### Rule: AUD-001 Event Immutability
**Domain**: Audit
**Trigger**: Confirmed operation event
**Condition**: Event already recorded
**Decision**: Prevent modification, allow only compensating events
**Required Approval**: None
**Applies To**: All operational events

### Rule: AUD-002 Override Logging
**Domain**: Audit
**Trigger**: User overrides a rule
**Condition**: Override allowed
**Decision**: Log override with user, reason, timestamp
**Required Approval**: Per rule requirements
**Applies To**: All overridable rules

### Rule: AUD-003 Sensitive Data Access
**Domain**: Audit
**Trigger**: Access to sensitive data (cost, customer info)
**Condition**: User has permission
**Decision**: Log access event
**Required Approval**: None
**Applies To**: Finance data, customer data

---

## 10. Quick Reference: Rules by Domain

### Inbound Rules
- DOC-005: Partial Receipt
- INV-001: Lot Capture Required
- INV-002: Serial Capture Required
- INV-003: Expiry Date Capture
- INV-004: Expiry Validation
- QA-001: QC Required on Receipt
- EXC-001: Over-Receipt Tolerance
- EXC-002: Short-Receipt Tolerance

### Outbound Rules
- DOC-001: Order Release Conditions
- DOC-002: Order Edit Lock
- DOC-003: Order Cancellation
- DOC-004: Split Shipment
- INV-005: Minimum Remaining Shelf Life
- INV-006: Status Eligibility - Allocation
- INV-007: Status Eligibility - Pick
- ALLOC-001 to ALLOC-007: Allocation Rules
- EXC-003: Short-Pick Handling

### Putaway Rules
- LOC-001 to LOC-007: Location & Storage Rules
- TSK-001: Putaway Task Creation

### Quality Rules
- QA-001 to QA-005: Quality Gate Rules

### Exception Rules
- EXC-001 to EXC-006: Exception Handling Rules

---

## References

- **Domain Model**: See `DOMAIN_MODEL.md`
- **Workflows**: See `WORKFLOWS.md`
- **Edge Cases**: See `EDGE_CASES.md`
- **MQTT Contract**: See `MQTT_CONTRACT.md`
