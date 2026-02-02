# WMS Edge Cases and Exception Playbook

This document catalogs edge cases that break non-enterprise systems. Each edge case is a first-class exception scenario requiring governed workflows.

---

## Edge Case Format

```
## EDGE-{DOMAIN}-{NUMBER}: {Name}
**Scenario**: What happens
**Detection**: How system detects it
**Frequency**: Common | Occasional | Rare
**Impact**: LOW | MEDIUM | HIGH | CRITICAL
**Workflow**:
1. Step-by-step resolution
**Required Data**: Fields needed
**Roles**: Who is involved
**Outcome**: What happens after resolution
**Related Rules**: Links to BUSINESS_RULES.md
```

---

## 1. Inbound Edge Cases

### EDGE-INB-001: Blind Receiving (No ASN)
**Scenario**: Truck arrives without advance shipping notice (ASN) in system
**Detection**: Operator cannot find matching ASN during gate check-in
**Frequency**: Occasional
**Impact**: MEDIUM
**Workflow**:
1. Operator selects "Blind Receive" option
2. System creates ad-hoc ASN with status `BLIND_RECEIVE`
3. Supervisor approval required to proceed
4. Operator captures all details manually (supplier, materials, qty)
5. Exception logged for audit trail
6. Finance/purchasing notified for follow-up
**Required Data**: `reason_code`, `supervisor_id`, `supplier_name`, `material_codes`, `quantities`
**Roles**: Receiver, Supervisor, Purchasing
**Outcome**: ASN created retroactively, receipt processed
**Related Rules**: EXC-004 (Reason Code Required)

### EDGE-INB-002: ASN vs Physical Mismatch - Wrong Item
**Scenario**: ASN says Material A, physical goods are Material B
**Detection**: Operator scans material, system shows mismatch
**Frequency**: Occasional
**Impact**: HIGH
**Workflow**:
1. System blocks receipt confirmation
2. Exception created: type `WRONG_ITEM`
3. Operator captures evidence (photo of label, document)
4. Options:
   - a) Return to Vendor (RTV)
   - b) Accept with substitution (if allowed)
   - c) Quarantine pending supplier confirmation
5. Supplier contacted for resolution
6. Corrective action logged
**Required Data**: `expected_material`, `actual_material`, `evidence_photos`, `supplier_response`
**Roles**: Receiver, Supervisor, Purchasing
**Outcome**: RTV created OR substitution accepted with audit trail
**Related Rules**: QA-001 (QC Required)

### EDGE-INB-003: Over-Receipt Beyond Tolerance
**Scenario**: Received 1200 units, ASN expected 1000 (20% over)
**Detection**: System calculates variance > configured tolerance (e.g., 10%)
**Frequency**: Common
**Impact**: MEDIUM
**Workflow**:
1. System creates exception: type `OVER_RECEIPT`
2. Receiver cannot close ASN without resolution
3. Supervisor reviews and decides:
   - a) Accept all (update PO if authorized)
   - b) Accept partial, return excess
   - c) Reject all, return to vendor
4. If accepted, inventory adjusted
5. Purchasing notified for PO adjustment
**Required Data**: `expected_qty`, `received_qty`, `variance_pct`, `decision`, `approver`
**Roles**: Receiver, Supervisor, Purchasing
**Outcome**: Inventory updated, PO potentially amended
**Related Rules**: EXC-001 (Over-Receipt Tolerance)

### EDGE-INB-004: Multi-Arrival Against Single ASN
**Scenario**: ASN for 1000 units, but arrives in 3 separate trucks over 3 days
**Detection**: Partial receipts against same ASN
**Frequency**: Common
**Impact**: LOW
**Workflow**:
1. First arrival: Receive 400, ASN status → `PARTIAL`
2. Second arrival: Receive 350, ASN remains `PARTIAL`
3. Third arrival: Receive 250, ASN → `RECEIVED`
4. Each receipt creates inventory independently
5. Putaway tasks created per arrival
**Required Data**: `arrival_number`, `received_qty`, `cumulative_qty`
**Roles**: Receiver
**Outcome**: Complete ASN fulfilled across multiple receipts
**Related Rules**: DOC-005 (Partial Receipt)

### EDGE-INB-005: Damaged Goods on Arrival
**Scenario**: Pallet visibly damaged, cartons crushed
**Detection**: Visual inspection at dock
**Frequency**: Occasional
**Impact**: MEDIUM to HIGH
**Workflow**:
1. Operator flags damage before receiving
2. Photos captured as evidence
3. Options:
   - a) Refuse delivery (full RTV)
   - b) Accept good, reject damaged (partial RTV)
   - c) Accept all, quarantine damaged
4. If partial: Split HU into good vs damaged
5. Damaged inventory → status `DAMAGED`
6. Carrier/supplier claim initiated
**Required Data**: `damage_description`, `photos`, `damaged_qty`, `good_qty`, `claim_number`
**Roles**: Receiver, Supervisor, Carrier Coordinator
**Outcome**: Good inventory received, claim filed for damages
**Related Rules**: EXC-005 (Evidence Required)

### EDGE-INB-006: Missing Lot/Serial Information
**Scenario**: Material requires lot tracking but label is unreadable
**Detection**: Operator cannot scan or enter required attribute
**Frequency**: Occasional
**Impact**: MEDIUM
**Workflow**:
1. System blocks receipt (lot required by material master)
2. Exception created: type `MISSING_ATTRIBUTE`
3. Options:
   - a) Contact supplier for lot info
   - b) Create temporary lot (requires supervisor)
   - c) Reject goods
4. If temporary lot: Flag for later update
5. Quality may require inspection before use
**Required Data**: `temporary_lot_id`, `reason`, `supplier_contact_result`
**Roles**: Receiver, Supervisor, QA
**Outcome**: Inventory received with proper lot tracking
**Related Rules**: INV-001 (Lot Capture Required)

### EDGE-INB-007: Expired Material Received
**Scenario**: Expiry date on goods is in the past or very close
**Detection**: Operator enters expiry date, system validates
**Frequency**: Rare
**Impact**: HIGH
**Workflow**:
1. System blocks receipt (expiry <= today)
2. Exception created: type `EXPIRED_MATERIAL`
3. Material → `QA_HOLD` status automatically
4. QA Manager reviews:
   - a) Reject and RTV
   - b) Conditional use (manufacturing only, not for sale)
   - c) Scrap
5. Supplier notification sent
**Required Data**: `expiry_date`, `material_code`, `decision`, `qa_approver`
**Roles**: Receiver, QA Manager
**Outcome**: Material disposed appropriately with audit trail
**Related Rules**: INV-004 (Expiry Validation)

### EDGE-INB-008: No Valid Putaway Location
**Scenario**: All suitable storage locations are full or blocked
**Detection**: Putaway algorithm returns no valid location
**Frequency**: Occasional
**Impact**: MEDIUM
**Workflow**:
1. Exception created: type `NO_LOCATION`
2. Inventory remains in staging/receiving area
3. Warehouse manager reviews options:
   - a) Clear space in existing locations
   - b) Use overflow area (if available)
   - c) Cross-dock if outbound demand exists
4. Manual location assignment with override
5. Capacity alert generated
**Required Data**: `material_code`, `qty`, `required_zone`, `reason_no_location`
**Roles**: Forklift Operator, Warehouse Manager
**Outcome**: Inventory stored with location override
**Related Rules**: LOC-002 (Capacity Check)

---

## 2. Outbound Edge Cases

### EDGE-OUT-001: Short Pick - Inventory Not Found
**Scenario**: System says 100 units at A-01-02-03, picker finds 0 or less
**Detection**: Picker reports variance during pick confirmation
**Frequency**: Common
**Impact**: HIGH
**Workflow**:
1. Picker reports short pick
2. Exception created: type `SHORT_PICK`
3. Pick task → status `EXCEPTION`
4. Location flagged for recount
5. System attempts reallocation:
   - a) Find alternate location with same material/lot
   - b) If none: Order → partial status
6. Cycle count task created for location
7. Inventory adjustment after count
**Required Data**: `expected_qty`, `found_qty`, `location`, `alternate_allocated`
**Roles**: Picker, Supervisor, Inventory Controller
**Outcome**: Order fulfilled from alternate OR partial ship
**Related Rules**: EXC-003 (Short-Pick Handling)

### EDGE-OUT-002: Order Cancellation After Picking Started
**Scenario**: Customer cancels after some items already picked
**Detection**: Cancel request received, order status = `PICKING`
**Frequency**: Occasional
**Impact**: MEDIUM
**Workflow**:
1. Cancel request blocked (order in execution)
2. Exception escalated to Warehouse Manager
3. Options:
   - a) Complete pick, then process return
   - b) Stop pick, return picked items to stock
4. If return to stock:
   - Unpick tasks created
   - Inventory returned to original or available location
   - Inventory status → `AVAILABLE`
5. Order → `CANCELLED` with audit
**Required Data**: `cancel_reason`, `picked_items`, `return_location`
**Roles**: Customer Service, Warehouse Manager, Picker
**Outcome**: Order cancelled, inventory restored
**Related Rules**: DOC-003 (Order Cancellation)

### EDGE-OUT-003: Insufficient Inventory After Allocation
**Scenario**: Inventory was available at allocation, but consumed by another order before pick
**Detection**: Allocation check fails at pick time
**Frequency**: Rare (indicates concurrency issue)
**Impact**: HIGH
**Workflow**:
1. System detects allocation no longer valid
2. Exception created: type `ALLOCATION_CONFLICT`
3. Options:
   - a) Reallocate from other inventory
   - b) Partial fulfillment
   - c) Backorder
4. Root cause investigation (concurrency bug?)
5. Alert to IT if pattern detected
**Required Data**: `original_allocation`, `conflict_reason`, `competing_order`
**Roles**: Picker, Planner, IT (if systemic)
**Outcome**: Order reallocated or partial shipped
**Related Rules**: INV-007 (Status Eligibility - Pick)

### EDGE-OUT-004: FEFO Violation Request
**Scenario**: Customer requests specific lot that is NOT oldest expiry
**Detection**: Allocation would skip older lots
**Frequency**: Occasional
**Impact**: MEDIUM
**Workflow**:
1. Allocation rules would pick older lot (FEFO)
2. Customer override request received
3. Planner reviews:
   - Verify older lot not at risk
   - Document business reason
4. FEFO override applied with approval
5. Audit log captures exception
6. Older inventory flagged for attention
**Required Data**: `requested_lot`, `fefo_lot`, `business_reason`, `approver`
**Roles**: Customer Service, Planner
**Outcome**: Customer lot allocated with documented override
**Related Rules**: ALLOC-001 (FEFO Strategy)

### EDGE-OUT-005: Packing Weight Exceeds Carton Limit
**Scenario**: Picked items exceed max carton weight when packed
**Detection**: Pack station scale or manual check
**Frequency**: Common
**Impact**: LOW
**Workflow**:
1. Cartonization recalculated
2. Items split into multiple cartons
3. New labels generated per carton
4. SSCC/shipping labels updated
5. Manifest updated with correct carton count
**Required Data**: `actual_weight`, `max_weight`, `carton_count`
**Roles**: Packer
**Outcome**: Properly packaged shipment
**Related Rules**: Cartonization rules (TBD)

### EDGE-OUT-006: Label Printer Failure at Pack Station
**Scenario**: Cannot print shipping labels, orders waiting
**Detection**: Printer error or no output
**Frequency**: Occasional
**Impact**: HIGH (blocks shipping)
**Workflow**:
1. Alert raised immediately
2. Options:
   - a) Route to alternate printer
   - b) Generate labels later, continue packing
   - c) IT intervention
3. If deferred labels: Track which cartons need labels
4. Print batch labels when resolved
5. Verify label-to-carton matching
**Required Data**: `printer_id`, `pending_labels`, `alternate_printer`
**Roles**: Packer, IT Support
**Outcome**: Labels printed, shipment continues
**Related Rules**: None specific

### EDGE-OUT-007: Carrier No-Show
**Scenario**: Scheduled carrier does not arrive for pickup
**Detection**: Shipment status unchanged past pickup window
**Frequency**: Occasional
**Impact**: MEDIUM to HIGH
**Workflow**:
1. Alert generated at pickup window + threshold
2. Options:
   - a) Contact carrier, wait for delay
   - b) Reroute to alternate carrier
   - c) Move shipment to hold area
3. Customer notified of delay
4. If reroute: Update BOL, manifest, labels
5. Carrier performance logged
**Required Data**: `scheduled_time`, `carrier`, `alternate_carrier`, `customer_notified`
**Roles**: Shipping Coordinator, Customer Service
**Outcome**: Shipment rerouted or delayed with notification
**Related Rules**: None specific

---

## 3. Inventory Edge Cases

### EDGE-INV-001: Cycle Count Variance Exceeds Threshold
**Scenario**: Physical count differs from system by > 5%
**Detection**: Count variance calculation
**Frequency**: Common
**Impact**: MEDIUM
**Workflow**:
1. Recount required (automatic for high variance)
2. If recount confirms variance:
   - Exception created: type `INVENTORY_MISMATCH`
   - Root cause investigation
3. Adjustment approval based on value:
   - < $100: Auto-approve
   - $100-$1000: Supervisor
   - > $1000: Manager + Finance
4. Adjustment posted with reason code
**Required Data**: `system_qty`, `count_qty`, `recount_qty`, `reason_code`, `approver`
**Roles**: Inventory Controller, Supervisor, Finance
**Outcome**: Inventory adjusted, root cause documented
**Related Rules**: EXC-006 (Approval Threshold)

### EDGE-INV-002: Negative Inventory Event
**Scenario**: System would decrement inventory below zero
**Detection**: Inventory check before decrement
**Frequency**: Rare (indicates data issue)
**Impact**: CRITICAL
**Workflow**:
1. Transaction blocked immediately
2. Exception created: type `NEGATIVE_INVENTORY`
3. Location flagged for immediate count
4. All pending transactions on material reviewed
5. Root cause investigation:
   - Missed receipt?
   - Double pick?
   - System bug?
6. Corrective adjustment after investigation
**Required Data**: `current_qty`, `decrement_qty`, `transaction_type`, `root_cause`
**Roles**: IT, Inventory Controller, Warehouse Manager
**Outcome**: Data integrity restored
**Related Rules**: INV-001 (Inventory qty cannot be negative)

### EDGE-INV-003: HU Integrity Broken
**Scenario**: Operator breaks pallet without system update
**Detection**: HU scan returns unexpected contents
**Frequency**: Occasional
**Impact**: MEDIUM
**Workflow**:
1. Exception created: type `HU_MISMATCH`
2. Physical reconciliation required
3. HU split/merge transaction to align system
4. New HU labels if needed
5. Training issue flagged if recurring
**Required Data**: `hu_id`, `expected_contents`, `actual_contents`, `new_hu_ids`
**Roles**: Operator, Supervisor
**Outcome**: HU structure matches physical reality
**Related Rules**: ALLOC-004 (HU Integrity)

---

## 4. Quality Edge Cases

### EDGE-QA-001: QC Sample Contaminated
**Scenario**: Sample taken for inspection is contaminated during handling
**Detection**: QC inspector identifies contamination
**Frequency**: Rare
**Impact**: MEDIUM
**Workflow**:
1. Original sample discarded
2. New sample requested from lot
3. If lot already dispersed:
   - Track which inventory to sample
   - May need to recall from locations
4. Inspection restarted
5. Root cause for contamination documented
**Required Data**: `sample_id`, `contamination_type`, `new_sample_id`
**Roles**: QC Inspector, QA Manager
**Outcome**: Valid sample tested, lot status determined
**Related Rules**: QA-002 (Sampling Plan)

### EDGE-QA-002: QC Test Equipment Failure
**Scenario**: Testing equipment fails mid-inspection
**Detection**: Equipment error or calibration failure
**Frequency**: Occasional
**Impact**: HIGH (blocks QC throughput)
**Workflow**:
1. Affected tests marked incomplete
2. Options:
   - a) Use backup equipment
   - b) Send to external lab
   - c) Hold lots until equipment repaired
3. All pending lots flagged
4. Equipment maintenance scheduled
5. Results from backup equipment accepted
**Required Data**: `equipment_id`, `affected_lots`, `alternate_method`
**Roles**: QC Inspector, Lab Manager, Maintenance
**Outcome**: Lots tested via alternate method
**Related Rules**: None specific

### EDGE-QA-003: Conditional Release
**Scenario**: Material fails some tests but passes critical ones; production needs it
**Detection**: QA decision: conditional release
**Frequency**: Occasional (manufacturing)
**Impact**: MEDIUM
**Workflow**:
1. QA Manager reviews failed parameters
2. Risk assessment performed
3. If acceptable risk:
   - Status → `CONDITIONAL`
   - Use restricted to specific purposes
   - Traceability mandatory
4. Additional monitoring during use
5. Final disposition after use (pass/rework/scrap)
**Required Data**: `failed_tests`, `risk_assessment`, `use_restrictions`, `qa_approver`
**Roles**: QA Manager, Production Manager
**Outcome**: Material used with documented restrictions
**Related Rules**: QA-003 (QC Release Authority)

---

## 5. Integration Edge Cases

### EDGE-INT-001: ERP Posting Failure
**Scenario**: Goods receipt/issue posting to ERP fails
**Detection**: Integration error response
**Frequency**: Occasional
**Impact**: HIGH (financial discrepancy)
**Workflow**:
1. Transaction logged to retry queue
2. Automatic retry (3 attempts, exponential backoff)
3. If still failing after retries:
   - Alert to IT
   - Manual intervention queue
4. WMS continues operations (not blocked)
5. Reconciliation report generated
6. Manual posting if needed
**Required Data**: `transaction_id`, `error_code`, `retry_count`, `manual_posting_id`
**Roles**: IT, Finance
**Outcome**: ERP eventually reflects WMS transactions
**Related Rules**: INT-002 (Posting Retry)

### EDGE-INT-002: Duplicate Message from ERP
**Scenario**: Same order/ASN received twice from ERP
**Detection**: Message ID or document number already exists
**Frequency**: Common
**Impact**: LOW (if handled correctly)
**Workflow**:
1. Idempotency check identifies duplicate
2. Message acknowledged as success (no error to sender)
3. No duplicate record created
4. Duplicate attempt logged for monitoring
5. If pattern: Investigate source system
**Required Data**: `message_id`, `document_number`, `original_timestamp`
**Roles**: System (automated)
**Outcome**: Duplicate safely ignored
**Related Rules**: INT-001 (Idempotency Check)

### EDGE-INT-003: Out-of-Order Messages
**Scenario**: Cancel arrives before create, or update arrives after delete
**Detection**: State transition invalid for current state
**Frequency**: Occasional
**Impact**: MEDIUM
**Workflow**:
1. Message cannot be processed (invalid state)
2. Message queued with timestamp
3. Reprocessing attempted after delay
4. If still invalid: Alert generated
5. Manual reconciliation if needed
**Required Data**: `message_type`, `expected_state`, `actual_state`, `queue_position`
**Roles**: IT, Operations
**Outcome**: Messages processed in correct logical order
**Related Rules**: None specific

---

## 6. Handling Unit Edge Cases

### EDGE-HU-001: Mixed Lot Pallet (Not Allowed)
**Scenario**: Receiving multiple lots, operator places on same pallet
**Detection**: Scan shows lot different from existing HU contents
**Frequency**: Occasional
**Impact**: MEDIUM
**Workflow**:
1. System blocks placement (policy: no mixed lots)
2. Operator must:
   - Use different HU
   - OR get supervisor override
3. If override: Reason documented, HU flagged
4. Putaway respects mixed lot constraint
**Required Data**: `existing_lot`, `new_lot`, `override_reason`
**Roles**: Operator, Supervisor
**Outcome**: Lots properly segregated OR documented exception
**Related Rules**: LOC-006 (Mixed Lot in Location)

### EDGE-HU-002: HU Relabel Required
**Scenario**: HU label damaged, unreadable, or fell off
**Detection**: Scan fails or returns unknown HU
**Frequency**: Occasional
**Impact**: LOW to MEDIUM
**Workflow**:
1. Operator requests HU relabel
2. System generates new HU ID (or reissues same)
3. Old HU ID deactivated
4. New label printed and applied
5. All inventory transferred to new HU ID
6. Audit trail links old → new HU
**Required Data**: `old_hu_id` (if known), `new_hu_id`, `relabel_reason`
**Roles**: Operator, Supervisor
**Outcome**: HU identity restored with traceability
**Related Rules**: None specific

### EDGE-HU-003: Nested HU Integrity
**Scenario**: Carton removed from pallet without updating system
**Detection**: Pallet scan shows carton that physically isn't there
**Frequency**: Occasional
**Impact**: MEDIUM
**Workflow**:
1. Exception: type `HU_HIERARCHY_MISMATCH`
2. Physical reconciliation of pallet contents
3. System updated:
   - Remove carton from pallet hierarchy
   - Update carton location if known
   - Mark carton as "unparented" if lost
4. Location cycle count if carton cannot be found
**Required Data**: `parent_hu`, `child_hu`, `expected_contents`, `actual_contents`
**Roles**: Operator, Supervisor, Inventory Controller
**Outcome**: HU hierarchy matches physical reality
**Related Rules**: ALLOC-004 (HU Integrity)

---

## 7. Manufacturing-Specific Edge Cases

### EDGE-MFG-001: Production Order Qty Change After Issue
**Scenario**: Production order reduced after materials already issued
**Detection**: MES update, original issue qty > new required qty
**Frequency**: Occasional
**Impact**: MEDIUM
**Workflow**:
1. Excess material identified
2. Options:
   - a) Return to warehouse
   - b) Transfer to next production order
   - c) Keep at line-side (if space allows)
3. Return task created if returning
4. Inventory reappears as available
5. Production order consumption adjusted
**Required Data**: `original_qty`, `new_qty`, `excess_qty`, `disposition`
**Roles**: Production Planner, Warehouse Operator
**Outcome**: Excess material properly accounted
**Related Rules**: None specific

### EDGE-MFG-002: Line-Side Replenishment Delay
**Scenario**: Production line running low, replenishment not arriving
**Detection**: Kanban/pull signal, inventory below minimum
**Frequency**: Occasional
**Impact**: CRITICAL (line stoppage risk)
**Workflow**:
1. Urgent replenishment alert
2. Task priority elevated to P1
3. Expedite picking from any available location
4. If shortage imminent:
   - Notify production supervisor
   - Production may pause or use alternate material
5. Root cause (why delay?) documented
**Required Data**: `material_code`, `line_id`, `current_qty`, `min_qty`, `eta`
**Roles**: Warehouse Operator, Production Supervisor
**Outcome**: Line supplied, production continues
**Related Rules**: TSK-003 (Task Priority Assignment)

### EDGE-MFG-003: Wrong Lot Picked for Production
**Scenario**: Genealogy requires specific lot, picker picked different lot
**Detection**: Production confirms receipt, lot doesn't match reservation
**Frequency**: Rare
**Impact**: HIGH (genealogy break)
**Workflow**:
1. Production rejects issue (lot mismatch)
2. Exception created
3. Wrong lot returned to warehouse
4. Correct lot located and picked
5. If correct lot unavailable:
   - Production hold
   - Engineering review for substitution
6. Root cause: Why wrong pick?
**Required Data**: `required_lot`, `picked_lot`, `work_order`, `root_cause`
**Roles**: Production Operator, Warehouse Supervisor, Quality
**Outcome**: Correct lot supplied, genealogy maintained
**Related Rules**: ALLOC-005 (Lot Preference)

---

## 8. Exception Resolution Summary

### Quick Reference: Exception to Action Matrix

| Exception Type | Default Action | Escalation |
|----------------|----------------|------------|
| OVER_RECEIPT | Accept with approval | Manager if > 10% |
| SHORT_RECEIPT | Keep ASN open | Close if minor |
| WRONG_ITEM | RTV | QA for accept |
| DAMAGED | Quarantine | Claim process |
| MISSING_ATTRIBUTE | Temporary value | QA review |
| NO_LOCATION | Override | Capacity review |
| SHORT_PICK | Reallocate | Recount location |
| INVENTORY_MISMATCH | Adjust | Finance if large |
| ALLOCATION_CONFLICT | Reallocate | IT investigation |

---

## References

- **Business Rules**: See `BUSINESS_RULES.md`
- **Workflows**: See `WORKFLOWS.md`
- **Domain Model**: See `DOMAIN_MODEL.md`
- **MQTT Contract**: See `MQTT_CONTRACT.md`
