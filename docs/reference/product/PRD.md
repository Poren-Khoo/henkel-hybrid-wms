# WMS Product Requirements Document

## 1. Problem Statement

### 1.1 Core Problem

Most warehouses run on a mix of ERP transactions, spreadsheets, paper-based execution, and tribal knowledge. The result is that physical operations and system records drift apart.

**In one sentence:**
> An enterprise WMS solves the problem of executing warehouse operations with high correctness, traceability, and efficiency under real-world variability, while keeping inventory and process state consistent across people, systems, and time.

### 1.2 Why This Is Hard

A warehouse is not a simple CRUD system. It's a state machine operating in a messy environment:

| Challenge | Examples |
|-----------|----------|
| **High Variability** | Late trucks, partial deliveries, mixed pallets, damaged goods, missing labels, wrong ASN, short picks |
| **High Concurrency** | Many workers and devices performing operations simultaneously on the same inventory |
| **Hard Constraints** | FEFO/FIFO, lot/batch rules, serial tracking, hazardous storage, temperature zones, customs/bonded |
| **Multiple Truth Sources** | ERP says one thing, supplier docs say another, physical count says another |
| **Irreversibility** | Once you ship wrong goods, the cost is real (claims, penalties, customer trust, compliance) |
| **Audit & Compliance** | Regulated industries need provable traceability (who did what, when, why, with what evidence) |
| **Integration Complexity** | ERP, TMS, MES, automation/PLC, carriers, EDI, handheld scanners—each has different semantics and latency |

### 1.3 Business Impact Without Enterprise WMS

| Impact Area | Consequence |
|-------------|-------------|
| Inventory Inaccuracy | Overselling, stockouts, emergency replenishment, lost revenue |
| Low Fulfillment Performance | Late shipments, wrong shipments, chargebacks/penalties |
| High Labor Cost | Inefficient travel paths, manual exception handling, rework |
| Poor Visibility | Management can't answer "where is my inventory/order right now?" |
| Weak Traceability | Audit failures, recalls slow and expensive, regulatory risk |
| Inability to Scale | New sites/customers require heroics, not repeatable rollout |

---

## 2. What "Enterprise-Grade" Means

| Property | Requirement |
|----------|-------------|
| **A. Correctness under complexity** | Inventory must be correct across multi-UoM, lot/serial, status (QA hold/blocked/available), ownership, location, handling unit (HU/LPN) |
| **B. Execution orchestration** | Convert business intent into executable work (not just data entry) |
| **C. Exception-first reality** | Exceptions are daily normal, not edge cases. Support controlled deviations with governance |
| **D. Traceability and auditability** | Full event history: who/what/when/where/why. Reconstructable state transitions |
| **E. Multi-warehouse scalability** | Standard process template + site-specific configuration |
| **F. Integration reliability** | Idempotency, deduplication, retry safety, eventual consistency, reconciliation |

---

## 3. Users and Roles

| Role | Responsibilities | Primary Pages |
|------|-----------------|---------------|
| **Warehouse Operator** | Receive goods, putaway, pick orders, pack shipments, execute physical tasks | Receiving, Putaway, Picking, Packing |
| **Warehouse Supervisor** | Manage exceptions, approve deviations, assign tasks, monitor workflow | Exception Center, Task Board, Approval Queue |
| **Warehouse Manager** | Configure warehouse, manage capacity, review KPIs, handle escalations | Dashboard, Configuration, Reports |
| **Quality Inspector (QC)** | Perform inspections, capture results, submit disposition recommendations | QC Inspection, Sample Queue |
| **Quality Manager (QA)** | Approve/reject dispositions, release quarantined inventory, manage holds | QA Decisions, Disposition Queue |
| **Inventory Controller** | Cycle counts, adjustments, reconciliation, inventory analysis | Inventory List, Cycle Count, Adjustments |
| **Planner** | Wave planning, allocation optimization, workload balancing | Wave Planning, Allocation View |
| **Finance/Costing** | Rate management, billing calculation, cost reconciliation | Rate Card, Costing Engine, Billing |
| **3PL Coordinator** | External sync, dispute resolution, shipment tracking | External Sync, 3PL Exceptions |
| **System Admin** | User management, master data, system configuration | User Management, Master Data |

---

## 4. Scope Boundaries

### WMS IS:
- Execution control (not just recording)
- Inventory accuracy and traceability
- Task orchestration and workforce management
- Exception governance with approvals
- Integration hub for warehouse operations

### WMS IS NOT:
- Full ERP (no finance, procurement approvals, invoicing)
- BI/dashboard-only tool (must control execution)
- Automation control system (WCS/PLC scope differs)
- Simple record keeper (must enforce policies, transitions, evidence)

---

## 5. Platform Scope

This WMS must support **both Trading/DC (商贸仓) and Manufacturing/Plant (制造仓)** on a single extensible platform:

| Aspect | Trading/DC | Manufacturing |
|--------|-----------|---------------|
| **Inbound Focus** | ASN + PO, fast receiving, cross-dock | Raw material QC, production receipts, genealogy |
| **Outbound Focus** | Many small orders, carrier compliance, cartonization | Production issue, line-side delivery, kitting |
| **QC Intensity** | Varies by industry | Mandatory for raw materials and FG |
| **Integration** | ERP, TMS, Carriers | ERP, MES, Production systems |

**Key Principle:** Same domain objects, same state machines, different policy profiles selected by context.

---

## 6. Technology Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Frontend | React (JavaScript), Vite, shadcn/ui, Tailwind | Single-page application |
| Backend | Node-RED | Flow-based programming for IoT integration |
| Communication | MQTT | Real-time pub/sub, not REST. Requires custom error handling |
| Broker | Tier0 UNS Platform | Unified Namespace pattern |
| State | MQTT retained messages | Topics as "databases" |

### MQTT Architecture Implications

Unlike REST APIs:
- No built-in error codes (must design custom error protocol)
- No request-response correlation (must use correlationId)
- No timeout mechanism (must implement client-side)
- Binary protocol (not inspectable in Chrome DevTools)

See `MQTT_CONTRACT.md` for detailed protocol design.

---

## References

- **Domain Model**: See `DOMAIN_MODEL.md`
- **Workflows**: See `WORKFLOWS.md`
- **MQTT Contract**: See `MQTT_CONTRACT.md`
- **Business Rules**: See `BUSINESS_RULES.md`
- **Edge Cases**: See `EDGE_CASES.md`
