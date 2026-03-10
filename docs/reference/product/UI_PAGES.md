# WMS UI Pages and Route Responsibilities

This document defines each page's purpose, data sources, user actions, and domain layer integration.

---

## Route Structure Overview

```
/
├── /dashboard                    # Main dashboard
├── /inbound
│   ├── /orders                   # Inbound orders / ASN list
│   ├── /receiving                # Receiving workbench
│   ├── /putaway                  # Putaway task execution
│   └── /exceptions               # Inbound exception management
├── /outbound
│   ├── /orders                   # Outbound order list
│   ├── /orders/create            # Create new outbound order
│   ├── /orders/:id               # Order detail view
│   ├── /dn-approval              # DN approval queue
│   ├── /dn-operator-queue        # Operator work queue
│   ├── /picking                  # Picking task execution
│   ├── /packing                  # Packing workbench
│   ├── /vas                      # Value-added services
│   └── /shipment                 # Shipment confirmation
├── /inventory
│   └── /list                     # Inventory list and search
├── /production
│   ├── /orders                   # Production order list
│   ├── /reservations             # Material reservations
│   ├── /picking                  # Production picking
│   └── /issue                    # Material issue
├── /quality
│   ├── /inspection               # QC inspection queue
│   ├── /samples                  # QA sample management
│   ├── /decisions                # QA decision queue
│   └── /disposition              # Disposition execution
├── /master
│   ├── /materials                # Material master
│   ├── /locations                # Location master
│   ├── /warehouses               # Warehouse master
│   ├── /partners                 # Business partners
│   └── /workers                  # Worker management
├── /finance
│   ├── /rate-card                # Rate card management
│   ├── /costing                  # Costing engine
│   ├── /billing                  # Monthly billing
│   └── /reconciliation           # Reconciliation
├── /integration
│   ├── /external-sync            # 3PL sync status
│   └── /3pl-exceptions           # 3PL dispute management
├── /governance
│   ├── /audit-log                # Audit trail viewer
│   └── /traceability             # Lot/serial traceability
└── /admin
    └── /users                    # User management
```

---

## Page Specifications

### Outbound Module

#### /outbound/orders - Outbound Order List

**Purpose**: List, filter, search all outbound orders (DN/Delivery Notes)

**Data Sources**:
- Primary: `Henkelv2/Shanghai/Logistics/Costing/State/DN_Workflow_DB`
- Secondary: `Henkelv2/Shanghai/Logistics/External/Integration/State/Sync_Status`

**User Actions**:
| Action | Who | Condition |
|--------|-----|-----------|
| View list | All | Always |
| Filter by status tab | All | Always |
| Search by DN number | All | Always |
| Click to view detail | All | Always |
| Quick approve | Manager | Status = PENDING_APPROVAL |
| Create new order | Planner | Always |

**Domain Layer Integration**:
- `OutboundOrderValidator.isPendingApproval(status)` - Filter pending orders
- `OutboundOrderValidator.isReleased(status)` - Filter released orders
- `OutboundOrderValidator.getStatusBadgeConfig(status)` - Status display
- `OutboundOrderService.filterOrdersByStatus(orders, tab)` - Tab filtering
- `OutboundOrderService.normalizeOrder(rawData, source)` - Data normalization

**UI States**:
- Loading: Show skeleton table
- Empty: "No orders found" message
- Error: Connection error banner with retry

**File**: `src/modules/outbound/pages/OutboundOrders.jsx`

---

#### /outbound/orders/create - Create Outbound Order

**Purpose**: Create new sales order or transfer order

**Data Sources**:
- `Henkelv2/Shanghai/Logistics/MasterData/State/Materials` - Material picker
- `Henkelv2/Shanghai/Logistics/MasterData/State/BusinessPartners` - Customer picker
- `Henkelv2/Shanghai/Logistics/MasterData/State/Warehouses` - Warehouse picker

**Publish To**:
- `Henkelv2/Shanghai/Logistics/Outbound/Command/Create_Order`

**User Actions**:
| Action | Who | Condition |
|--------|-----|-----------|
| Select order type | Planner | Always |
| Select warehouse | Planner | Always |
| Select customer | Planner | If SALES_ORDER |
| Select destination | Planner | If TRANSFER_OUT |
| Add line items | Planner | Always |
| Submit order | Planner | All required fields valid |

**Domain Layer Integration**:
- `OutboundOrderValidator.collectCreateErrors(orderData)` - Field validation
- `OutboundOrderValidator.validateCreate(orderData)` - Submit validation
- `OutboundOrderService.buildCreateCommand(orderData)` - MQTT payload

**Validation Rules**:
- Type required
- Warehouse required
- Customer required if SALES_ORDER
- Destination required if TRANSFER_OUT
- At least 1 line with material + qty > 0

**File**: `src/modules/outbound/pages/OutboundOrderCreate.jsx`

---

#### /outbound/orders/:id - Order Detail View

**Purpose**: View and manage single outbound order

**Data Sources**:
- Filter from `DN_Workflow_DB` by `dn_no`
- Or dedicated detail topic (TBD)

**User Actions**:
| Action | Who | Condition |
|--------|-----|-----------|
| View details | All | Always |
| View workflow progress | All | Always |
| Approve order | Manager | Status = PENDING_APPROVAL |
| Reject order | Manager | Status = PENDING_APPROVAL |
| Start picking | Operator | Status = APPROVED |
| Complete picking | Operator | Status = PICKING |
| Complete packing | Operator | Status = PACKING |
| Confirm shipment | Shipping | Status = READY_TO_SHIP |

**Domain Layer Integration**:
- `OutboundOrderValidator.validateApprovalAction()` - Before approve
- `OutboundOrderValidator.validateRejectAction()` - Before reject
- `OutboundOrderValidator.validateWorkflowAction()` - Before status change
- `OutboundOrderService.buildApproveCommand()` - Approve payload
- `OutboundOrderService.buildRejectCommand()` - Reject payload
- `OutboundOrderService.buildStatusUpdateCommand()` - Status update payload
- `OutboundOrderService.getProgressSteps()` - Workflow visualization

**File**: `src/modules/outbound/pages/OutboundOrderDetail.jsx`

---

#### /outbound/dn-approval - DN Approval Queue

**Purpose**: Manager queue for orders requiring approval

**Data Sources**:
- Filter from `DN_Workflow_DB` where status in PENDING_APPROVAL, NEW, PENDING

**User Actions**:
| Action | Who | Condition |
|--------|-----|-----------|
| View pending orders | Manager | Always |
| Bulk approve | Manager | Selected orders |
| Approve single | Manager | Per order |
| Reject with reason | Manager | Per order |

**Domain Layer Integration**:
- `OutboundOrderValidator.isPendingApproval(status)` - Filter logic
- `OutboundOrderService.buildApproveCommand()` - Per order
- `OutboundOrderService.buildRejectCommand()` - With reason

**File**: `src/modules/outbound/pages/DnApproval.jsx`

---

### Inbound Module

#### /inbound/orders - Inbound Order List (ASN)

**Purpose**: List and manage inbound orders / ASN / receipts

**Data Sources**:
- `Henkelv2/Shanghai/Logistics/Internal/Ops/State/Inbound_Plan`

**User Actions**:
| Action | Who | Condition |
|--------|-----|-----------|
| View ASN list | All | Always |
| Filter by status | All | Always |
| Create new ASN | Receiver | Always |
| Click to receive | Receiver | Status = EXPECTED or ARRIVED |

**Domain Layer Integration**:
- `InboundOrderValidator.validateCreate()` - Create validation
- `InboundOrderService.buildCreateCommand()` - Create payload
- Business type mapping in service

**File**: `src/modules/inbound/pages/InboundOrders.jsx`

---

#### /inbound/receiving - Receiving Workbench

**Purpose**: Execute goods receipt against ASN

**Data Sources**:
- `Henkelv2/Shanghai/Logistics/Internal/Ops/State/Inbound_Plan` - Pending receipts
- `Henkelv2/Shanghai/Logistics/MasterData/State/Materials` - Material lookup

**Publish To**:
- `Henkelv2/Shanghai/Logistics/Internal/Ops/Action/Post_Goods_Receipt`

**User Actions**:
| Action | Who | Condition |
|--------|-----|-----------|
| Select ASN to receive | Receiver | ASN status = EXPECTED/ARRIVED |
| Scan/enter material | Receiver | Per line |
| Enter received qty | Receiver | Per line |
| Capture lot/serial | Receiver | If required |
| Capture expiry | Receiver | If required |
| Confirm receipt | Receiver | All required data present |
| Report exception | Receiver | Variance detected |

**Domain Layer Integration**:
- `ReceiptValidator.validateReceipt()` - Receipt validation
- `ReceiptService.buildReceiptCommand()` - Receipt payload
- `ExceptionService.buildExceptionReport()` - For variances

**File**: `src/modules/inbound/pages/Receiving.jsx`

---

#### /inbound/putaway - Putaway Task Execution

**Purpose**: Execute putaway tasks for received inventory

**Data Sources**:
- `Henkelv2/Shanghai/Logistics/Internal/Ops/State/Task_Queue` - Putaway tasks

**Publish To**:
- `Henkelv2/Shanghai/Logistics/Internal/Ops/Action/Confirm_Putaway`

**User Actions**:
| Action | Who | Condition |
|--------|-----|-----------|
| View assigned tasks | Operator | Tasks assigned to user |
| Start task | Operator | Task status = ASSIGNED |
| Scan HU | Operator | Task in progress |
| Scan destination | Operator | HU scanned |
| Confirm putaway | Operator | All scans valid |
| Report exception | Operator | Issue found |

**Domain Layer Integration**:
- `PutawayTaskValidator.validateTaskStart()` - Before start
- `PutawayTaskValidator.validateConfirmation()` - Before confirm
- `PutawayTaskService.normalizeTask()` - Data normalization
- `PutawayTaskService.buildConfirmCommand()` - Confirm payload

**File**: `src/modules/inbound/pages/PutawayMove.jsx`

---

#### /inbound/exceptions - Inbound Exception Management

**Purpose**: Manage and resolve inbound exceptions

**Data Sources**:
- `Henkelv2/Shanghai/Logistics/Internal/Ops/State/Exceptions`

**Publish To**:
- `Henkelv2/Shanghai/Logistics/Internal/Ops/Action/Resolve_Exception`

**User Actions**:
| Action | Who | Condition |
|--------|-----|-----------|
| View exception queue | Supervisor | Always |
| Filter by type/status | Supervisor | Always |
| Accept exception | Supervisor | Exception open |
| Reject exception | Supervisor | Exception open |
| Add notes/evidence | Supervisor | Exception open |

**Domain Layer Integration**:
- `ExceptionValidator.validateResolution()` - Before resolve
- `ExceptionService.buildResolutionCommand()` - Resolve payload

**File**: `src/modules/inbound/pages/Exceptions.jsx`

---

### Quality Module

#### /quality/inspection - QC Inspection Queue

**Purpose**: QC inspector workbench for executing inspections

**Data Sources**:
- `Henkelv2/Shanghai/Logistics/Internal/Quality/State/Inspection_Queue`

**Publish To**:
- `Henkelv2/Shanghai/Logistics/Internal/Quality/Action/Submit_Result`

**User Actions**:
| Action | Who | Condition |
|--------|-----|-----------|
| View inspection queue | QC Inspector | Always |
| Start inspection | QC Inspector | Sample pending |
| Record results | QC Inspector | Inspection in progress |
| Attach evidence | QC Inspector | Optional |
| Submit results | QC Inspector | Results complete |

**File**: `src/modules/quality/pages/QualityControl.jsx`

---

#### /quality/decisions - QA Decision Queue

**Purpose**: QA Manager approval for disposition decisions

**Data Sources**:
- `Henkelv2/Shanghai/Logistics/Internal/Quality/State/Decision_Queue`

**User Actions**:
| Action | Who | Condition |
|--------|-----|-----------|
| View pending decisions | QA Manager | Always |
| Review inspection results | QA Manager | Per lot |
| Approve release | QA Manager | Results acceptable |
| Reject lot | QA Manager | Results unacceptable |
| Conditional release | QA Manager | With restrictions |

**File**: `src/modules/quality/pages/QADecisions.jsx`

---

### Master Data Module

#### /master/materials - Material Master

**Purpose**: View and manage material master data

**Data Sources**:
- `Henkelv2/Shanghai/Logistics/MasterData/State/Materials`

**Publish To**:
- `Henkelv2/Shanghai/Logistics/MasterData/Action/Update_Material`

**User Actions**:
| Action | Who | Condition |
|--------|-----|-----------|
| View material list | All | Always |
| Search materials | All | Always |
| View material detail | All | Always |
| Edit material | Admin | Has permission |

**Domain Layer Integration**:
- `MaterialValidator.validate()` - Edit validation

**File**: `src/modules/master/pages/Materials.jsx`

---

### Dashboard

#### /dashboard - Main Dashboard

**Purpose**: Overview of warehouse operations and KPIs

**Data Sources**:
- Multiple state topics for aggregated metrics
- `DN_Workflow_DB` for order counts
- `Inventory_Level` for stock overview
- `Task_Queue` for task metrics
- `Exceptions` for exception counts

**User Actions**:
| Action | Who | Condition |
|--------|-----|-----------|
| View KPIs | All | Always |
| Click to drill down | All | Per widget |
| Filter by date range | All | If supported |
| Filter by warehouse | All | If multi-warehouse |

**File**: `src/modules/dashboard/pages/Dashboard.jsx`

---

## Page Component Pattern

Every page should follow this pattern:

```jsx
import { useGlobalUNS } from '@/context/UNSContext';
import { EntityValidator } from '@/domain/{module}/{Entity}Validator';
import { EntityService } from '@/domain/{module}/{Entity}Service';
import UNSConnectionInfo from '@/components/UNSConnectionInfo';
import PageContainer from '@/components/PageContainer';

// Topics
const TOPIC_STATE = "Henkelv2/Shanghai/Logistics/.../State/...";
const TOPIC_ACTION = "Henkelv2/Shanghai/Logistics/.../Action/...";

export default function MyPage() {
  const { data, publish, status } = useGlobalUNS();
  
  // 1. Normalize data using Service
  const items = useMemo(() => {
    const rawData = data.raw[TOPIC_STATE];
    // Handle UNS envelope + normalize
    return EntityService.normalizeList(rawData);
  }, [data.raw]);
  
  // 2. Handle actions using Validator + Service
  const handleAction = () => {
    try {
      // Validate
      EntityValidator.validateAction(formData);
      // Build command
      const payload = EntityService.buildCommand(formData);
      // Publish
      publish(TOPIC_ACTION, payload);
    } catch (error) {
      // Show error to user
    }
  };
  
  return (
    <PageContainer title="Page Title">
      <UNSConnectionInfo topic={TOPIC_STATE} />
      {/* Page content */}
    </PageContainer>
  );
}
```

---

## References

- **MQTT Topics**: See `MQTT_CONTRACT.md`
- **Domain Model**: See `DOMAIN_MODEL.md`
- **Workflows**: See `WORKFLOWS.md`
- **Business Rules**: See `BUSINESS_RULES.md`
