# Sidebar Restructure: Enterprise Navigation Pattern

## Goal

Transform the current flat navigation into an enterprise-grade **Operations Management (运营管理)** pattern:

```
BEFORE (Current)                    AFTER (Enterprise)
├── Dashboards                      ├── Dashboards (概览)
├── Master Data                     ├── Operations (运营管理)
├── Inbound          ──────────►    │   ├── Inbound (入库管理)
├── Outbound                        │   ├── Outbound (出库管理)  
├── Inventory                       │   ├── Inventory (库存管理)
├── Quality                         │   └── Transfer (调拨管理)
├── Production                      ├── Production (生产管理)
├── Dispatch to 3PL                 ├── Quality (质量管理)
├── 3PL Management                  ├── Master Data (基础数据)
└── Governance                      ├── Finance (财务管理)
                                    └── Governance (治理与设置)
```

---

## Design Decisions

| Decision | Choice |
|----------|--------|
| **Primary Language** | English (Chinese in tooltip) |
| **Route Prefix** | `/operations/...` (verbose but clear) |
| **Navigation Depth** | 3 levels (Domain → Process → Page) |

### Navigation Depth

| Level | Name | Example |
|-------|------|---------|
| **Level 1** | Domain Group | Operations, Quality, Master Data |
| **Level 2** | Process Area | Inbound, Outbound, Inventory |
| **Level 3** | Page/Function | Outbound Orders, Execution, Wave Planning |

---

## Complete New Sidebar Structure

```javascript
const menuItems = [
  // === LEVEL 1: DASHBOARDS ===
  {
    label: 'Dashboards',
    labelCn: '概览',
    icon: LayoutGrid,
    path: '/dashboard-group',
    children: [
      { path: '/dashboard', label: 'Logistics Dashboard', labelCn: '物流仪表盘' },
      { path: '/internal-dashboard', label: 'Manufacturing Ops', labelCn: '制造运营' },
    ]
  },

  // === LEVEL 1: OPERATIONS (运营管理) ===
  {
    label: 'Operations',
    labelCn: '运营管理',
    icon: Briefcase,
    path: '/operations',
    children: [
      // --- LEVEL 2: INBOUND ---
      {
        label: 'Inbound',
        labelCn: '入库管理',
        icon: ArrowDownLeft,
        path: '/operations/inbound',
        children: [
          { path: '/operations/inbound/orders', label: 'Inbound Orders', labelCn: '入库通知' },
          { path: '/operations/inbound/execution', label: 'Inbound Execution', labelCn: '入库执行' },
        ]
      },
      // --- LEVEL 2: OUTBOUND ---
      {
        label: 'Outbound',
        labelCn: '出库管理',
        icon: ArrowUpRight,
        path: '/operations/outbound',
        children: [
          { path: '/operations/outbound/orders', label: 'Outbound Orders', labelCn: '出库通知' },
          { path: '/operations/outbound/waves', label: 'Wave Planning', labelCn: '波次管理' },
          { path: '/operations/outbound/execution', label: 'Execution', labelCn: '出库执行' },
          { path: '/operations/outbound/ship', label: 'Ship Confirm', labelCn: '发运确认' },
        ]
      },
      // --- LEVEL 2: INVENTORY ---
      {
        label: 'Inventory',
        labelCn: '库存管理',
        icon: Package,
        path: '/operations/inventory',
        children: [
          { path: '/operations/inventory/list', label: 'Stock List', labelCn: '库存列表' },
          { path: '/operations/inventory/count', label: 'Cycle Count', labelCn: '盘点管理' },
        ]
      },
      // --- LEVEL 2: TRANSFER ---
      {
        label: 'Transfer',
        labelCn: '调拨管理',
        icon: ArrowLeftRight,
        path: '/operations/transfer',
        children: [
          { path: '/operations/transfer/orders', label: 'Transfer Orders', labelCn: '调拨单' },
        ]
      },
    ]
  },

  // === LEVEL 1: PRODUCTION ===
  {
    label: 'Production',
    labelCn: '生产管理',
    icon: Factory,
    path: '/production',
    children: [
      { path: '/production/orders', label: 'Prod. Orders', labelCn: '生产订单' },
      { path: '/production/requests', label: 'Material Requests', labelCn: '物料请求' },
      { path: '/production/reservations', label: 'Reservations', labelCn: '预留' },
      { path: '/production/execution', label: 'Execution', labelCn: '生产执行' },
    ]
  },

  // === LEVEL 1: QUALITY ===
  {
    label: 'Quality',
    labelCn: '质量管理',
    icon: FlaskConical,
    path: '/quality',
    children: [
      { path: '/quality/samples', label: 'QA Samples', labelCn: '质检样品' },
      { path: '/quality/decisions', label: 'QA Decisions', labelCn: '质检决策' },
      { path: '/quality/disposition', label: 'Disposition', labelCn: '处置' },
    ]
  },

  // === LEVEL 1: MASTER DATA ===
  {
    label: 'Master Data',
    labelCn: '基础数据',
    icon: Database,
    path: '/master',
    children: [
      { path: '/master/materials', label: 'Materials', labelCn: '物料' },
      { path: '/master/warehouses', label: 'Warehouses', labelCn: '仓库' },
      { path: '/master/partners', label: 'Partners', labelCn: '合作伙伴' },
      { path: '/master/containers', label: 'Containers', labelCn: '容器' },
    ]
  },

  // === LEVEL 1: FINANCE / 3PL ===
  {
    label: '3PL & Finance',
    labelCn: '财务管理',
    icon: Calculator,
    path: '/finance',
    children: [
      { path: '/finance/sync', label: 'Sync Status', labelCn: '同步状态' },
      { path: '/finance/costing', label: 'Daily Costing', labelCn: '日成本' },
      { path: '/finance/billing', label: 'Monthly Billing', labelCn: '月结' },
      { path: '/finance/rate-cards', label: 'Rate Cards', labelCn: '费率卡' },
    ]
  },

  // === LEVEL 1: GOVERNANCE ===
  {
    label: 'Governance',
    labelCn: '治理与设置',
    icon: ShieldCheck,
    path: '/governance',
    children: [
      { path: '/governance/traceability', label: 'Traceability', labelCn: '追溯' },
      { path: '/governance/audit', label: 'Audit Log', labelCn: '审计日志' },
      { path: '/governance/users', label: 'User Management', labelCn: '用户管理' },
      { path: '/governance/reports', label: 'Reports', labelCn: '报表' },
    ]
  },
]
```

---

## Outbound Page Consolidation

**Current: 12 pages → New: 4 pages**

| Current Pages | New Page | Route |
|---------------|----------|-------|
| `OutboundOrders.jsx`, `DnApproval.jsx`, `DnOperatorQueue.jsx` | **Outbound Orders** | `/operations/outbound/orders` |
| NEW | **Wave Planning** | `/operations/outbound/waves` |
| `PickingTask.jsx`, `DispatchPicking.jsx`, `DispatchPacking.jsx` | **Execution** (tabs) | `/operations/outbound/execution` |
| `ShipmentConfirmation.jsx` | **Ship Confirm** | `/operations/outbound/ship` |

### Execution Page Tabs

```
┌─────────────────────────────────────────────────────────────┐
│  [Picking]  [Staging]  [Loading]  [Packing]                 │
├─────────────────────────────────────────────────────────────┤
│  Task List filtered by current tab                          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ PICK-001 | SKU-A | Qty: 100 | Zone A-01 → Staging  │    │
│  │ PICK-002 | SKU-B | Qty: 50  | Zone B-03 → Staging  │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## Route Mapping (Old → New)

| Old Route | New Route | Action |
|-----------|-----------|--------|
| `/outbound` | `/operations/outbound/orders` | Redirect |
| `/outbound/picking-tasks` | `/operations/outbound/execution` | Redirect |
| `/dispatch/orders` | `/operations/transfer/orders` | Redirect |
| `/dispatch/packing` | `/operations/outbound/execution?tab=staging` | Redirect |
| `/dispatch/ship` | `/operations/outbound/ship` | Redirect |
| `/inbound/orders` | `/operations/inbound/orders` | Redirect |
| `/inbound/putaway` | `/operations/inbound/execution` | Redirect |
| `/inventory/list` | `/operations/inventory/list` | Redirect |
| `/qc/samples` | `/quality/samples` | Redirect |

---

## Implementation Phases

### Phase 1: Sidebar Structure ✅ (Current)
- [x] Design new navigation structure
- [ ] Update `AppSidebar.jsx` with 3-level support
- [ ] Add legacy route redirects in `App.jsx`

### Phase 2: New Pages
- [ ] Create `OutboundExecution.jsx` with tabs
- [ ] Create `WavePlanning.jsx` page
- [ ] Create `InboundExecution.jsx` with tabs

### Phase 3: Cleanup
- [ ] Mark deprecated pages
- [ ] Update documentation
- [ ] Test all paths

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/AppSidebar.jsx` | New menuItems structure with 3-level nesting |
| `src/App.jsx` | New routes under `/operations/...` + redirects |
| `src/modules/outbound/pages/OutboundExecution.jsx` | NEW - Consolidated execution page |
| `src/modules/outbound/pages/WavePlanning.jsx` | NEW - Wave management page |
