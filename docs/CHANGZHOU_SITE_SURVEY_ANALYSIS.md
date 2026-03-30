# Henkel Changzhou DC — Site Survey Analysis & Requirements Brief

**Prepared by:** Senior Lead Engineer (Tier0 / Freezonex Team)
**Survey Date:** March 2026 | **Site:** Henkel Changzhou Distribution Center (常州DC)
**Document Purpose:** Engineering analysis of the on-site survey findings. This is the definitive reference for WMS feature scoping and prioritization before development begins.

---

## 1. Executive Summary

Henkel's Changzhou Distribution Center (DC) is a high-throughput, JIT (Just-In-Time) **finished goods warehouse** serving major automotive OEMs (BYD, Volvo, SAIC-GM, etc.). It is operated by a 3PL (Third-Party Logistics provider) under Henkel's oversight.

The warehouse runs on three systems today: SAP (the ERP, acting as a ledger), a 3PL-owned WMS (not controlled by Henkel), and an invisible third "system" — the experience, memory, and judgment of a small number of veteran employees.

> **Root Finding:** The warehouse does not have an execution layer. SAP knows what *should* exist; workers figure out *what to do*; the system records *what happened*. These three things frequently diverge.

**The goal of this WMS project is to close that gap: to make the system the authority on what should happen, and to use scan confirmation to ensure the physical world matches the record before it counts.**

---

## 2. Warehouse Profile

| Attribute | Detail |
|-----------|--------|
| **Site Type** | Distribution Center (DC) — finished goods only. No raw materials or WIP. |
| **Products** | Chemical adhesives, sealants, and coatings for automotive manufacturing |
| **Key Customers** | BYD, Volvo, SAIC-GM, others — all automotive OEMs |
| **Fulfillment Model** | JIT (Just-In-Time): Henkel holds the inventory, delivers to customer production lines in small, precise batches on demand. On-time delivery is critical. |
| **Warehouse Areas** | **SJIR** — Flat floor warehouse (no rack, floor stacking, no 3D location codes). **SJAR** — Rack warehouse (full 3D location codes, e.g., Row 15-Column 9-Level 4). Daily operations primarily in SJAR. |
| **Rack-Mounted QR Codes** | Physical QR codes are already mounted on SJAR racks but are **not connected to any system**. This is a hardware asset waiting to be activated. |
| **Planned Relocation** | DC is moving to a new building across the street in H2 2026. WMS must include a bulk location migration feature. |

---

## 3. Personnel & Access Structure — The Core Structural Problem

Understanding the people in the warehouse is key to understanding *why* every single pain point exists.

| Person Type | Count | SAP Access | Role |
|-------------|-------|-----------|------|
| **Henkel Resident Staff** | 1–2 | Full SAP account | Acts as the **sole data bridge** between the physical warehouse and the Henkel/SAP system. Every single system transaction must pass through these 1–2 people. |
| **3PL Management** | Few | Minimal / None | Manages the 3PL's own legacy WMS. Coordinates 3PL floor workers. |
| **3PL Floor Workers** | Multiple | Zero | Drivers, pickers, receivers, VAS operators. Executes all physical tasks based on paper documents and verbal instructions. Completely system-blind. |

> **Engineering Verdict:** The entire warehouse's digital layer is a **Single Point of Failure (SPOF)**. 1–2 humans are the sole data entry point. If they are overloaded, sick, or leave, the operational data pipeline stops. This is the unacceptable architectural reality that the WMS must dismantle.

---

## 4. Current System Landscape ("As-Is")

### 4.1 SAP — Record System, Not Execution System

SAP is configured as a **"record after the fact" tool**. It knows the inventory *exists* and records *results*, but it does not:
- Direct workers on where to go.
- Validate that workers are in the right location with the right goods.
- Push real-time tasks to anyone.

The Henkel Operations Manager stated it directly:
> *"Our current logic is backward — we get a location, the worker puts the goods away, and then we tell SAP where it went."*

Normal WMS logic: **System assigns location → Worker executes → Worker confirms via scan.**
Current reality: **Worker decides location → Worker executes → SAP told afterward (if remembered correctly).**

### 4.2 No WMS (Warehouse Execution Layer)

Between SAP and the physical workers, there is **nothing**. No WMS, no mobile scanning devices connected to any system, no execution software.

All SAP-uncovered operations (location management, pick execution, cycle counting, VAS work orders, pallet tracking) are handled by:
- Excel spreadsheets (manually maintained, multiple files, multiple tabs)
- Handwritten paper documents (short-haul manifests, putaway records, check sheets)
- WeChat groups (10+ groups, truck arrival notifications, VAS requirement changes, urgent comms)
- Email (customer VAS, dispatch confirmations, exception handling)
- **Human memory** (customer SOPs, location preferences, exception handling procedures)

### 4.3 BI Tool — Exists But Non-Functional

A Business Intelligence (BI) dashboard tool exists and is theoretically supposed to show KPIs for all Henkel warehouses. In practice it is useless:
- **Data source is the same broken Excel files.** Excel is wrong → BI is wrong.
- Had a technical failure during the survey period; staff had to revert to manual reporting.
- The BI tool is a visualization layer on top of a broken data layer. It cannot fix the underlying data quality issue.

### 4.4 3PL's Own WMS — Not Henkel's to Control

The 3PL logistics provider owns and operates their own WMS for managing their floor operations. This is a critical compliance finding:
- A CA (compliance audit) specifically flagged that Henkel's inventory control depends on a **third-party system**. Henkel cannot independently verify their own inventory counts.
- There is a documented incident where a customer closed their own system at period-end, claimed the returnable container count was short, and charged the loss to suppliers including Henkel. Henkel had to manually take screenshots every day of the week before close to build evidence — because they had no system of their own.

> **The business case for Henkel owning a WMS is not just efficiency. It is data sovereignty and compliance independence.**

---

## 5. Pain Points by Workflow — Deep Engineering Analysis

### 5.1 Inbound (Receiving from Factory)

**How it works today:**
Goods travel by short-haul truck from Henkel's Wuxi factory (~1 hour). Trucks typically depart Wuxi at 4 PM, arriving in Changzhou after 6 PM. Workers offload, put away goods to locations (chosen by the veteran worker), write the location code on a paper manifest, and hand it to the SAP operator, who manually types each line into SAP. The entire process regularly finishes at 9:30 PM.

| # | Pain Point | Engineering Root Cause |
|---|-----------|----------------------|
| P1 | **Daily mandatory overtime** (trucks arrive at 6PM, data entry finishes ~9:30PM) | SAP data entry is sequential, manual, done by 1–2 people after physical work is complete. No parallelization possible. |
| P2 | **No arrival notification system** (rely on WeChat group messages) | No integration between factory dispatch system and DC. No event published when truck departs. |
| P3 | **Location errors from handwritten manifests** | Workers write location codes on paper. SAP operator reads and types. Human transcription error rate. "O" vs "0", "I" vs "1" are common mistakes. |
| P4 | **No scan-based receiving validation** | Batch numbers on cartons are verified only visually against paper. No electronic cross-check against PO/DN. |
| P5 | **Short-haul manifest is 100% handwritten** | Required for CA compliance audit (proving 1 truck = 1 delivery trip). Completely manual. Manager acknowledged this only works at Wuxi's small scale. |

**WMS Solution Design:**
- SAP DN auto-pushed to WMS → WMS generates digital "Inbound Order" for workers.
- PDA-based receiving scan: worker scans carton barcode, system validates Material Code, Batch No., Qty against the DN, and flags mismatches immediately.
- WMS generates a digital Short-Haul Manifest automatically, substituting the handwritten paper.
- System-directed putaway: WMS recommends location based on weight, category, and available space rules; worker scans target location to confirm.
- GR (Goods Receipt) auto-posted to SAP when worker completes confirmation scan. No manual SAP typing.

---

### 5.2 Putaway & Storage Management

| # | Pain Point | Engineering Root Cause |
|---|-----------|----------------------|
| P1 | **Putaway entirely based on one person's experience** | No system-assigned location. The veteran worker from the Wuxi factory carries all putaway logic in his head. When he leaves, the knowledge disappears. |
| P2 | **FEFO (First-Expired-First-Out) is inconsistently executed** | Henkel's chemicals have shelf lives. SAP is supposed to recommend the correct batch but sometimes recommends incorrectly. When it does, warehouse staff must call a CPS (Customer Planning & Supply) team member to manually adjust the SAP pick recommendation — a workaround process for a system defect. |

**WMS Solution Design:**
- WMS maintains its own batch-level inventory with expiry dates.
- Pick task generation uses WMS-native FEFO logic, **independent of SAP's recommendation**. CPS team no longer needs to intervene.
- SJAR putaway rules: heavy goods to bottom levels, product category affinity rules, zone management for SJIR vs. SJAR.

---

### 5.3 Outbound (Picking, Packing, Shipment)

**How it works today:**
Customers order → SAP generates a DN (Delivery Note, 送货单) specifying: what to ship, to whom, when, which batch. SAP operators print the DN as a paper pick list. These pile up at the printer. Workers walk to the office every **60–90 minutes** to collect new paper, sort by customer and date, go to the warehouse to pick, and place in the staging area.

| # | Pain Point | Engineering Root Cause |
|---|-----------|----------------------|
| P1 | **60–90 min paper pick-list loop — zero real-time visibility** | No digital push mechanism. System is pull-based (workers walk to the printer) instead of push-based (tasks delivered to workers' devices). |
| P2 | **Customer SOP stored only in worker memory** | Each customer has different labeling formats, packing requirements, documentation. New workers can only be trained verbally. When requirements change, a single email is sent — if the worker misses it, they incorrectly ship. |
| P3 | **No scan verification on pick, causing wrong-batch shipments** | Documented incidents of shipping the wrong batch because batch codes looked similar (O and 0). Error only discovered when the customer receives the goods. Henkel Operations Manager has threatened the 3PL with chargebacks, but the root cause (no scan) has never been fixed. |
| P4 | **Picking confirmation to SAP is manual (GI posting)** | After physically shipping goods, SAP operator must manually post a Goods Issue (GI). Two-step redundancy with no automation. |
| P5 | **Daily dispatch Excel emailed to logistics company manually** | SAP has all the data. Logistics company (LDP/OTM systems) needs a daily schedule. Current process: SAP operator exports → compiles Excel → emails it. Fully automatable. Identified during survey as work that **should not even belong to the warehouse team** — it is a logistics planning responsibility, done by the warehouse due to historical inertia. |

**WMS Solution Design:**
- DN from SAP auto-received by WMS → WMS generates pick task → task pushed to worker's **PDA in real-time**.
- PDA-guided picking: screen tells worker exactly: go to Location `15-9-4`, pick Material `IDH-XXXX`, Batch `B240601`, Qty `12`.
- Worker **scans the carton barcode** before picking. If wrong material or wrong batch → PDA rejects with alert. Cannot physically proceed without correct scan.
- Customer SOP rules stored in WMS per customer + per material. System auto-displays/enforces special packing, labeling, document instructions.
- Post-pick scan at staging area completes the DN → WMS auto-triggers GI posting to SAP.
- WMS integrates with LDP/OTM directly. Dispatch plan is pushed automatically, eliminating the daily Excel email.

---

### 5.4 Value-Added Services (VAS / 增值服务)

VAS operations are required before goods are shipped: relabeling (贴标), repacking/splitting by piece count (倒装), and pallet consolidation/splitting (倒托). Customer VAS requirements vary per SKU and change annually.

| # | Pain Point | Engineering Root Cause |
|---|-----------|----------------------|
| P1 | **VAS requirements communicated by email and remembered by staff** | No system-level storage of per-customer, per-material VAS rules. Requirements change; workers may not see the update email. |
| P2 | **VAS billing reconciliation is the biggest monthly pain point** | Billing requires: DN qty → find packaging multiplier → calculate box count → divide by boxes per pallet → get pallet count. Each DN requires one manual calculation run, every month, for every DN. Error-prone and labor-intensive. The Henkel Manager specifically said: *"I just want it to be like a production BOM. The system should automatically know what VAS is needed and calculate the quantities."* |
| P3 | **Packaging multiplier master data in SAP is 2+ years outdated** | The multiplier (pieces per box, boxes per pallet) is in SAP but the warehouse team has no access, and the last export was 2 years ago. Data accuracy is questionable. |
| P4 | **Inventory state changes from VAS are communicated via WeChat** | After a VAS operation (e.g., repacking changes the carton count), the worker messages the SAP operator in a WeChat group. The SAP operator manually adjusts inventory. There is a time gap where SAP shows incorrect stock. |

**WMS Solution Design:**
- WMS stores a **"VAS Rule Table"** per customer × per material (IDH code), defining: label format, repacking spec, pallet spec.
- When a DN is received, WMS auto-calculates the VAS work order (like a BOM explosion): `ship 120 pieces → 10 boxes → 2 pallets → apply Label Type A (Customer X format)`.
- Worker executes VAS on PDA, confirming actual quantities used (actual labels stuck, actual boxes split). This is the ground truth for billing.
- VAS completion triggers automatic inventory state update in WMS and triggers auto-sync to SAP. No WeChat, no manual SAP entry.
- Month-end: WMS generates the billing reconciliation report automatically vs. 3PL invoice.

---

### 5.5 Pallet & Returnable Container Management

| # | Pain Point | Engineering Root Cause |
|---|-----------|----------------------|
| P1 | **Pallet count tracked in a manually maintained Excel spreadsheet** | SAP tracks inventory in pieces (CON) but the 3PL charges by the pallet. Worker manually logs inbound pallets, outbound pallets, and current stock daily. Excel formula turns red when utilization > 85%. Someone sees the red, calls or emails someone else. |
| P2 | **CA audit requires physically photographing 100 pallets/month** | Because Henkel has no system of their own for pallet tracking, and the 3PL's data has a conflict of interest, the CA auditor requires manual photo evidence. This takes 4+ hours per month, excluding photo sorting. Manager described this as *"very painful — but we have no choice."* |
| P3 | **Outbound pallet count requires manual calculation from DN** | SAP DN records piece count, not pallet count. To get pallets shipped: export pieces from SAP → look up packaging multiplier → calculate boxes → divide by boxes-per-pallet → get pallets. Manual run per DN, every month. |
| P4 | **Returnable containers (Volvo & generic)** tracked only in Excel | Two types: Volvo-specific containers (Volvo asset), and generic containers (Henkel-owned). Both need to be returned by customers. Generic containers have a documented financial loss history — 150 units went unaccounted for in one case. Current mitigation: customer must bring back equal count of empties to receive delivery. |

**WMS Solution Design:**
- WMS tracks inventory at the **Handling Unit (HU/pallet)** level. Every pallet has a system ID.
- Every pallet movement (inbound, putaway, outbound, return from customer) is recorded when the pallet label is scanned.
- **Pallet utilization dashboard** is real-time. No Excel. Alert triggers automatically via system notification (Teams / WeChat integration) when threshold is exceeded.
- Returnable container lifecycle tracked: outbound with shipment → customer acknowledges → expected return date → return scan-in.
- WMS pallet records serve as CA audit evidence. No more monthly photo sessions.
- CN (CON) to box-to-pallet unit conversion calculated automatically by WMS using the packaging multiplier from master data.

---

## 6. Root Cause Summary — Why All Pain Points Share the Same Origin

All the individual pain points described above trace back to **five common root causes**. Fixing one symptom without fixing the root cause will not improve the system:

| Root Cause | Manifestation |
|-----------|---------------|
| **1. Reverse Process Logic** | Physical actions happen before system direction. System records results instead of guiding operations. |
| **2. SAP Access Bottleneck** | 1–2 people are the sole data entry gatekeepers. All warehouse activities pass through this human bottleneck. |
| **3. SAP Data Cannot Reach the Right People** | Packaging multipliers, dispatch plans, customer VAS requirements — all in SAP but inaccessible to the transport company, floor workers, and billing team. They resort to manual exports and re-distribution. |
| **4. No Warehouse Execution Layer** | The gap between SAP (knows what should exist) and workers (physically touch the goods) is filled by paper and memory. Errors are invisible until they cause downstream customer problems. |
| **5. Operational Knowledge Lives in People, Not Systems** | Customer SOPs, location logic, VAS rules, exception handling — all stored in human brains. When someone leaves, the knowledge leaves with them. |

---

## 7. WMS Feature Requirements — Prioritized Backlog

Requirements are drawn directly from survey findings. Each requirement maps to a specific pain point cited by the Henkel team.

> **Priority Definitions:**
> - **P0 (Core):** Without this, the WMS has no meaningful improvement over the current state.
> - **P1 (Important):** Solves major pain points; expected in Phase 1 delivery.
> - **P2 (Value-Add):** Optimization features; not required for initial POC.

### 8.1 Inbound (Handle Inbound Operations)

| ID | Requirement | Priority |
|----|------------|----------|
| IN-01 | SAP DN automatically pushed to WMS; generates inbound order without manual creation | P0 |
| IN-02 | WMS auto-generates a digital Short-Haul Manifest per truck (replaces handwritten paper) | P0 |
| IN-03 | PDA-based receiving scan: validates Material IDH code, Batch No., Qty against DN; alerts on mismatch | P0 |
| IN-04 | Support partial receipt and over-receipt with automatic exception record creation | P1 |
| IN-05 | Batch mismatch exception flow: record details, support photo upload, trigger email to factory QC | P1 |
| IN-06 | Support urgent cross-docking: bypass standard putaway, record temporary location (0-1-1) | P1 |
| IN-07 | Display expected inbound shipment info from SAP before truck arrives, enabling advance preparation | P2 |

### 8.2 Storage & Inventory Management

| ID | Requirement | Priority |
|----|------------|----------|
| ST-01 | PDA-guided putaway: system recommends location, worker scans to confirm; wrong scan rejected | P0 |
| ST-02 | WMS enforces FEFO independently of SAP recommendation during pick task generation | P0 |
| ST-03 | Support two storage zones: SJAR (rack, 3D location code) and SJIR (flat floor) with different putaway logic | P0 |
| ST-04 | Real-time inventory view: queryable by material, batch, location, and expiry date at any time | P0 |
| ST-05 | Full batch traceability: record inbound source, current location, expiry, outbound destination | P0 |
| ST-06 | Warehouse utilization real-time monitoring with configurable threshold alert (e.g., 85%), auto-notify via Teams/WeChat | P1 |
| ST-07 | Cycle Count: system generates count task; worker scans to count on PDA; system auto-records variances | P1 |
| ST-08 | Bulk location migration feature: remap goods from old locations to new locations in batch (for DC relocation) | P1 |
| ST-09 | Annual full physical inventory: system takes a snapshot, supports comparison against physical count result | P1 |

### 8.3 Outbound — Pick, Pack & Consolidate

| ID | Requirement | Priority |
|----|------------|----------|
| OUT-01 | SAP DN received by WMS in real-time → auto-generate pick task → real-time push to worker PDA | P0 |
| OUT-02 | PDA-guided picking: tells worker location, material, batch, qty; rejects wrong scan immediately | P0 |
| OUT-03 | Customer SOP rules stored in WMS per customer × per IDH material; enforced automatically during pick | P0 |
| OUT-04 | Wave picking: group and sequence pick tasks by ship date, customer, priority | P1 |
| OUT-05 | Outbound scan verification at staging: final scan confirms actual material, batch, qty matches DN | P0 |
| OUT-06 | DN completion auto-triggers GI posting to SAP (no manual SAP posting step) | P0 |

### 8.4 Shipment Management

| ID | Requirement | Priority |
|----|------------|----------|
| SHP-01 | WMS auto-sends dispatch plan to logistics carrier (LDP/OTM integration); eliminates daily Excel email | P1 |
| SHP-02 | Track and distinguish two shipment modes: customer self-pickup vs. Henkel-arranged logistics | P1 |
| SHP-03 | Record pallet IDs used in each shipment; track outbound pallet consumption for billing calculations | P0 |
| SHP-04 | Print logistics labels and shipping documents (DN) per customer format from WMS | P1 |

### 8.5 Value-Added Services (VAS)

| ID | Requirement | Priority |
|----|------------|----------|
| VAS-01 | WMS stores VAS rule table (labeling spec, repack spec, pallet spec) per customer × per IDH | P0 |
| VAS-02 | System auto-calculates VAS work quantities from DN × packaging multiplier (like a BOM explosion) | P0 |
| VAS-03 | Support parsing of standardized VAS instruction format from SAP DN remarks field (requires agreement with CS team on format) | P1 |
| VAS-04 | Worker executes VAS via PDA; system records actual quantities completed (labels used, pallets moved) | P0 |
| VAS-05 | Post-VAS: WMS auto-updates inventory state and syncs to SAP immediately | P0 |
| VAS-06 | Generate monthly VAS billing record for reconciliation against 3PL invoice | P0 |

### 8.6 Container & Pallet Management (Returnable)

| ID | Requirement | Priority |
|----|------------|----------|
| CNT-01 | Track full lifecycle of returnable containers (Volvo-specific + generic): inbound, outbound, customer return, return to factory | P0 |
| CNT-02 | Track container balance per customer; trigger alert if customer's balance insufficient when they come to collect | P0 |
| CNT-03 | Real-time pallet quantity tracking (by inbound/outbound/current stock); generates billing data; replaces manual Excel daily log | P0 |
| CNT-04 | Pallet utilization vs. capacity monitoring; auto-alert at configurable threshold (e.g., 85%) | P1 |
| CNT-05 | Monthly pallet audit report: system generates a random sample check list; records audit results; replaces 100-photo manual process | P1 |
| CNT-06 | Unit conversion: auto-convert SAP piece count (CON) to box count and pallet count using packaging multiplier | P0 |

### 8.7 Reverse Logistics

| ID | Requirement | Priority |
|----|------------|----------|
| RV-01 | Customer return flow: receive return → QC inspection → restock or send back to factory; all recorded in WMS and synced to SAP | P1 |
| RV-02 | Non-conforming material (NCMR) handling: lock inventory record (freeze), record reason, trigger resolution workflow | P1 |

### 8.8 Reporting & Warehouse Management

| ID | Requirement | Priority |
|----|------------|----------|
| RPT-01 | Monthly billing report: auto-aggregates storage fees (by pallet × days), inbound fees (by pallet), outbound fees (by pallet), VAS fees (by actual work), short-haul fees (by trip) for 3PL invoice comparison | P0 |
| RPT-02 | 3PL KPI monthly scorecard: auto-pull from operational data (on-time rate, order accuracy rate, inventory accuracy) | P1 |
| RPT-03 | Daily operations dashboard: real-time inbound/outbound volumes, pending task count, utilization; replaces manual daily report and email | P1 |
| RPT-04 | Configurable report builder for management-layer custom views | P2 |
| RPT-05 | WMS data serves as Henkel's own independent inventory record for CA audit; eliminates dependence on 3PL self-reported data | P0 |
| RPT-06 | Full operation audit trail: every transaction is logged with timestamp, user, and action; supports traceability queries per document | P1 |

### 8.9 SAP Interface Requirements

| ID | Requirement | Priority |
|----|------------|----------|
| INT-01 | SAP → WMS (one-way push): DN info, inventory changes, and batch expiry data auto-pushed to WMS; no manual re-keying | P0 |
| INT-02 | WMS → SAP (one-way callback): GR and GI are auto-triggered by worker scan confirmation in WMS; no manual SAP posting | P0 |
| INT-03 | Bi-directional sync: returns, VAS inventory state changes, batch corrections require two-way interface | P1 |
| INT-04 | Packaging multiplier master data synced from SAP to WMS; auto-updated when changed in SAP | P0 |
| INT-05 | WMS ↔ LDP/OTM: dispatch plan auto-sent to transport management system; eliminates daily Excel email | P1 |

### 8.10 Hardware & Infrastructure

| ID | Requirement | Priority |
|----|------------|----------|
| HW-01 | Procure PDA (handheld scanning devices) for floor workers to support barcode scan, location scan, and task receipt/confirmation | P0 |
| HW-02 | Procure label printers and document printers at the office, supporting auto-print for VAS labels, logistics labels, and shipping docs | P0 |
| HW-03 | Activate existing QR codes on SJAR racks by binding them to WMS location codes; enable PDA scan-to-confirm for putaway | P0 |

---

## 8. Pre-Go-Live Blockers — Must Be Resolved Before Launch

> [!CAUTION]
> If these foundational issues are not resolved before the WMS goes live, the system will be built on an unstable foundation. These are not optional.

| # | Blocker | Owner | Action Required |
|---|---------|-------|-----------------|
| 1 | **Packaging Multiplier Master Data** | Rebecca's SAP Team | Identify which SAP fields store the multiplier. For Changzhou (small SKU count), physically verify each IDH code's packaging spec against actuals. For large warehouses (Jinshan, Tianji etc.), a systematic SAP extract and verification plan is required. |
| 2 | **SAP Interface Scope Definition** | Henkel IT / SAP Team | Define which SAP transactions will auto-push to WMS (DN release, GR confirmation, GI posting, batch info, packaging master). Define field-level API contract. |
| 3 | **VAS Instruction Text Standard** | CS Team (Customer Service) | VAS requirements are currently stored as free-text in SAP DN remarks. The CS team must agree on a standardized text format so WMS can parse it reliably. |
| 4 | **Warehouse Relocation Plan** | Henkel Ops Team + WMS Team | Bulk location migration feature must be designed and tested before H2 2026 relocation. A dedicated relocation SOP is required. |
| 5 | **Floor Worker Training** | 3PL Management + WMS Team | Front-line workers (pickers, receivers, VAS operators) must participate in WMS design reviews and receive adequate training. Not a 1-hour walk-through the day before go-live. |
| 6 | **Network & Security Architecture** | Henkel IT | Define network topology for Changzhou DC: How do PDA devices connect? How does the WMS server integrate with Henkel's security perimeter? Where does the WMS application run? |

---

## 9. What WMS Cannot Solve (Out of Scope)

Being honest about scope boundaries prevents scope creep and sets realistic stakeholder expectations.

| Issue | Why WMS Cannot Solve It | Who Owns It |
|-------|------------------------|-------------|
| Factory packing errors (short count inside a carton) | WMS can detect the discrepancy on receipt, but cannot fix upstream factory packing quality | Factory QC + Production team |
| Export goods date uncertainty (customs clearance) | Customs clearance is an external regulatory process outside warehouse control | Customs / Trade team |
| Trucks departing from factory late | That is factory dispatch scheduling, not warehouse receiving | Factory Logistics / Planning |

---

## 10. Engineering Recommendations

As a Senior Lead Engineer reviewing this survey, the following recommendations go beyond just implementing the feature list:

**1. Treat Scan Confirmation as Non-Negotiable.**
Every location assignment, pick action, and shipment must require a scan confirmation. No business logic exceptions allowed at launch. The survey Operations Manager said: *"Humans will always make mistakes. The boss only looks at results, not reasons."* The WMS's job is to make the correct action the only possible action.

**2. The SAP Interface is the Critical Path.**
Without the SAP → WMS integration (INT-01 for DNs), every other feature is weakened. Workers would need to manually create orders, re-introducing the same bottleneck. This interface must be the first technical item agreed upon with the Henkel SAP/IT team.

**3. Packaging Multiplier Data Must Be Clean Before Launch.**
VAS billing (VAS-06), pallet counting (CNT-03, CNT-06), and monthly reconciliation (RPT-01) all depend on this master data being correct. Launching with bad multiplier data means generating wrong billing from day one. This is a data governance problem, not a software problem.

**4. Start with Changzhou; Design for the Network.**
Changzhou is the smallest site and the right place to prove the concept. But the data model must account for the fact that Henkel has multiple DCs (the survey mentions Jinshan, Tianji, etc.). The WMS should be designed as a multi-warehouse platform from the start, even if only one site is live initially.

**5. The 3PL Relationship Requires Clear Boundary Definition.**
The 3PL has their own WMS. There will be operational overlap. Define clearly: which system is the authority of record for Henkel's inventory? (Answer: Henkel's WMS). Define what data, if any, is exchanged with the 3PL's system. This boundary must be agreed upon contractually before software is written.

---

*Document prepared by the Tier0 / Freezonex Engineering Team, March 2026.*
*This document should be reviewed alongside:*
- `docs/reference/product/PRD.md` — Platform-level product requirements
- `docs/reference/domain/DOMAIN_MODEL.md` — Entity definitions
- `docs/reference/architecture/MQTT_CONTRACT.md` — Backend communication contract
