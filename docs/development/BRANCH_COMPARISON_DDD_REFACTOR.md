# Branch Comparison: DDD Refactor Journey

This document compares the three main branches to show how the project evolved from "vibe code" to DDD-structured code. Use it as a reference before merging.

---

## Quick Reference

| Branch | Focus | Domain Layer | Module Structure |
|--------|-------|--------------|------------------|
| `feature/demo-build` | Original vibe code | Master data validators only | `internal/`, `external/` |
| `feature/ddd-refactor-inbound` | Inbound DDD | Inbound + Master data | Reorganized by capability |
| `feature/ddd-refactor-outbound` | Outbound DDD | Inbound + Outbound + Master data | Same as inbound |

---

## 1. feature/demo-build (Vibe Code Baseline)

**What it is:** The original codebase before DDD. Logic lives directly in UI components.

### src/domain/ (What Exists)

```
src/domain/
├── container/ContainerValidator.js
├── location/LocationValidator.js
├── material/MaterialValidator.js
├── partner/PartnerValidator.js
└── warehouse/WarehouseValidator.js
```

- **No** Inbound domain (no InboundOrderValidator, InboundOrderService)
- **No** Outbound domain
- **Only** master data validators (Materials, Locations, Warehouses, etc.)

### Module Structure

```
src/modules/
├── external/     # Costing, DnApproval, OutboundDN, InboundASN, etc.
├── internal/     # Dashboard, Inbound, Dispatch, Master, Production, Quality
└── admin/
```

- Flat structure: `internal/` and `external/` mix many concerns
- Pages live under `internal/pages/inbound/`, `internal/pages/dispatch/`, etc.

### Example: InboundOrders.jsx (Vibe Code Style)

**Path:** `src/modules/internal/pages/inbound/InboundOrders.jsx`

**handleCreate – validation and payload building inline:**

```javascript
const handleCreate = () => {
  // 1. Conditional Validation - all inline, no Validator
  if (isManufacturing(newOrder.type)) {
    if (!newOrder.lineId) return alert("Production Line ID is required")
  } else {
    if (!newOrder.supplier) return alert("Supplier is required")
  }
  if (newOrder.lines.length === 0) return alert("At least one line item is required")
  const invalidLine = newOrder.lines.find(l => !l.code || !l.qty || Number(l.qty) <= 0)
  if (invalidLine) return alert("All lines must have a valid Material and positive Quantity")

  // 2. Data Preparation - built manually in component
  const payload = {
    ...newOrder,
    supplier: isManufacturing(newOrder.type) ? newOrder.lineId : newOrder.supplier,
    businessType: BUSINESS_TYPES[newOrder.type]?.label || newOrder.type,
    lines: newOrder.lines.map(l => ({ code: l.code, qty: Number(l.qty) })),
    timestamp: Date.now()
  }

  publish(TOPIC_CREATE_ACTION, payload)
  setIsCreateOpen(false)
  setNewOrder(INITIAL_ORDER_STATE)
}
```

**Problems:**
- Validation logic scattered in the component
- Payload building duplicated if used elsewhere
- No reusable error types
- Hard to test validation in isolation

---

## 2. feature/ddd-refactor-inbound (Inbound DDD)

**What it adds:** Validator + Service pattern for Inbound module. Business logic moved to `src/domain/inbound/`.

### src/domain/ (What's Added)

```
src/domain/
├── inbound/                          ← NEW
│   ├── InboundOrderValidator.js
│   ├── InboundOrderService.js
│   ├── ReceiptValidator.js
│   ├── ReceiptService.js
│   ├── PutawayTaskValidator.js
│   ├── PutawayTaskService.js
│   ├── ExceptionValidator.js
│   └── ExceptionService.js
├── container/ContainerValidator.js
├── location/LocationValidator.js
├── material/MaterialValidator.js
├── partner/PartnerValidator.js
└── warehouse/WarehouseValidator.js
```

- **No** Outbound domain yet

### Module Structure (Reorganized)

```
src/modules/
├── inbound/       # InboundOrders, Receiving, PutawayMove, Exceptions, InboundASN
├── outbound/      # (not in this branch - or minimal)
├── dashboard/
├── finance/
├── governance/
├── integration/
├── inventory/
├── master/
├── production/
├── quality/
└── reports/
```

- Organized by **business capability** (inbound, outbound, finance, etc.)
- Clearer than `internal/` vs `external/`

### Example: InboundOrders.jsx (DDD Style)

**Path:** `src/modules/inbound/pages/InboundOrders.jsx`

**Imports:**
```javascript
import { InboundOrderValidator, InboundOrderValidationError } from '../../../domain/inbound/InboundOrderValidator'
import { InboundOrderService } from '../../../domain/inbound/InboundOrderService'
```

**handleCreate – delegates to Service:**

```javascript
const handleCreate = () => {
  try {
    // Service handles validation + command building (DDD pattern)
    const payload = InboundOrderService.buildCreateCommand(newOrder)
    
    publish(TOPIC_CREATE_ACTION, payload)
    setIsCreateOpen(false)
    setNewOrder(INITIAL_ORDER_STATE)
  } catch (error) {
    if (error instanceof InboundOrderValidationError) {
      alert(error.message)
      return
    }
    throw error
  }
}
```

**Improvements over demo-build:**
- Validation in `InboundOrderValidator` (reusable, testable)
- Command building in `InboundOrderService.buildCreateCommand()`
- Custom `InboundOrderValidationError` for user-friendly messages
- Component stays thin: UI + call Service + handle errors

---

## 3. feature/ddd-refactor-outbound (Outbound DDD)

**What it adds:** Full Outbound domain layer. Inbound domain from inbound branch is included.

### src/domain/ (What's Added)

```
src/domain/
├── inbound/       # Same as ddd-refactor-inbound
│   ├── InboundOrderValidator.js
│   ├── InboundOrderService.js
│   ├── ReceiptValidator.js
│   ├── ReceiptService.js
│   ├── PutawayTaskValidator.js
│   ├── PutawayTaskService.js
│   ├── ExceptionValidator.js
│   └── ExceptionService.js
├── outbound/                          ← NEW
│   ├── OutboundOrderValidator.js
│   ├── OutboundOrderService.js
│   ├── PickingTaskValidator.js
│   ├── PickingTaskService.js
│   └── WaveService.js
├── worker/WorkerValidator.js          ← NEW
└── [master data validators...]
```

### Outbound Pages (Full Set)

```
src/modules/outbound/pages/
├── OutboundOrders.jsx        # Main control tower
├── OutboundOrderDetail.jsx   # View/edit single order
├── OutboundOrderCreate.jsx   # Create new order
├── WavePlanning.jsx
├── PickingTask.jsx
├── OutboundExecution.jsx
├── DispatchOrders.jsx
├── DispatchPicking.jsx
├── DispatchPacking.jsx
├── ShipmentConfirmation.jsx
├── DnApproval.jsx
├── DnOperatorQueue.jsx
├── OutboundDN.jsx
└── OutboundVAS.jsx
```

### Improvements over demo-build (Outbound-specific)

| Aspect | demo-build | ddd-refactor-outbound |
|--------|------------|------------------------|
| Order validation | Inline `if` checks | `OutboundOrderValidator` |
| MQTT payload building | Manual in component | `OutboundOrderService.buildApproveCommand()`, etc. |
| Status transitions | Ad hoc | `validateStatusTransition()`, `getStatusBadgeConfig()` |
| Data merging | Scattered | `OutboundOrderService.mergeOrders()`, `normalizeOrder()` |
| Error handling | Generic `alert()` | `OutboundOrderValidationError` with clear messages |

---

## Summary: What Each Branch Gives You

| Branch | Use when... |
|--------|-------------|
| `feature/demo-build` | You need the original "before DDD" baseline |
| `feature/ddd-refactor-inbound` | Inbound + Master Data DDD done, Outbound not refactored |
| `feature/ddd-refactor-outbound` | Inbound + Outbound + Master Data DDD done (most complete) |

---

## Before Merging

1. **Commit your outbound changes** (if you have uncommitted work):
   ```bash
   git add .
   git commit -m "chore: save DDD outbound refactor state before merge"
   ```

2. **Merge strategy:** Merge `feature/ddd-refactor-inbound` into `feature/ddd-refactor-outbound` (or vice versa). The outbound branch already has inbound domain, so you mainly bring in any inbound-only page/route changes.

3. **After merge:** You'll have one branch with full DDD for Inbound, Outbound, and Master Data.

---

*Last updated: Generated from branch comparison. Switch branches and re-read this file to verify.*
