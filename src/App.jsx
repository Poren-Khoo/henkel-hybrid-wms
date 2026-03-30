import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// --- 1. SHARED COMPONENTS ---
import { UNSProvider } from './context/UNSContext';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';

// --- DASHBOARD MODULE ---
import Dashboard from './modules/dashboard/pages/Dashboard';
import InternalDashboard from './modules/dashboard/pages/InternalDashboard';
import InternalOps from './modules/dashboard/pages/InternalOps';

// --- INBOUND MODULE ---
import InboundASN from './modules/inbound/pages/InboundASN';
import InboundOrders from './modules/inbound/pages/InboundOrders';
import Receiving from './modules/inbound/pages/Receiving';
import PutawayMove from './modules/inbound/pages/PutawayMove';
import Exceptions from './modules/inbound/pages/Exceptions';

// --- OUTBOUND MODULE ---
import OutboundPlanning from './modules/outbound/pages/OutboundPlanning';
import OutboundOrderCreate from './modules/outbound/pages/OutboundOrderCreate';
import OutboundDN from './modules/outbound/pages/OutboundDN';
import DnOperatorQueue from './modules/outbound/pages/DnOperatorQueue';
import DnApproval from './modules/outbound/pages/DnApproval';
import OutboundVAS from './modules/outbound/pages/OutboundVAS';
import DispatchOrders from './modules/outbound/pages/DispatchOrders';
import DispatchPicking from './modules/outbound/pages/DispatchPicking';
import DispatchPacking from './modules/outbound/pages/DispatchPacking';
import PickingTasks from './modules/outbound/pages/PickingTask';
import OutboundExecution from './modules/outbound/pages/OutboundExecution';

// --- MASTER DATA MODULE ---
import Materials from './modules/master/pages/Materials';
import MaterialsDetails from './modules/master/pages/MaterialsDetails';
import Locations from './modules/master/pages/Locations';
import Containers from './modules/master/pages/Containers';
import WarehouseList from './modules/master/pages/warehouse/WarehouseList';
import WarehouseDetail from './modules/master/pages/warehouse/WarehouseDetail';
import PartnerList from './modules/master/pages/partner/PartnerList';
import PartnerDetail from './modules/master/pages/partner/PartnerDetail';
import Warehouses from './modules/master/pages/Warehouses';
import WorkerList from './modules/master/pages/WorkerList';
import WorkerDetail from './modules/master/pages/WorkerDetail';

// --- FINANCE MODULE ---
import CostingEngine from './modules/finance/pages/CostingEngine';
import RateCard from './modules/finance/pages/RateCard';
import MonthlyBilling from './modules/finance/pages/MonthlyBilling';
import Reconciliation from './modules/finance/pages/Reconciliation';

// [PAUSED - 内仓 scope] production module imports
// Uncomment to re-enable manufacturing warehouse features
// import ProductionOrders from './modules/_production_paused/pages/ProductionOrders';
// import ProductionRequests from './modules/_production_paused/pages/ProductionRequests';
// import Reservations from './modules/_production_paused/pages/Reservations';
// import ProductionPicking from './modules/_production_paused/pages/ProductionPicking';
// import LineStaging from './modules/_production_paused/pages/LineStaging';
// import ProductionConsumption from './modules/_production_paused/pages/ProductionConsumption';
// import FinishedGoodsReceipt from './modules/_production_paused/pages/FinishedGoodsReceipt';

// --- QUALITY MODULE ---
import QualityControl from './modules/quality/pages/QualityControl';
import QASamples from './modules/quality/pages/QASamples';
import QADecisions from './modules/quality/pages/QADecisions';

// --- INVENTORY MODULE ---
import InventoryList from './modules/inventory/pages/InventoryList';

// --- INTEGRATION MODULE ---
import ExternalSync from './modules/integration/pages/ExternalSync';
import ThreePLExceptions from './modules/integration/pages/ThreePLExceptions';

// --- GOVERNANCE MODULE ---
import AuditLog from './modules/governance/pages/AuditLog';
import Traceability from './modules/governance/pages/Traceability';

// --- REPORTS MODULE ---
import Reports from './modules/reports/pages/Reports';

// --- ADMIN MODULE ---
import UserManagement from './modules/admin/pages/UserManagement';

/**
 * Route Structure (Enterprise Pattern)
 * 
 * /operations/inbound/...     - Inbound Operations
 * /operations/outbound/...    - Outbound Operations
 * /operations/inventory/...   - Inventory Operations
 * /operations/transfer/...    - Transfer Operations
 * /production/...             - Production Module
 * /quality/...                - Quality Module
 * /master/...                 - Master Data
 * /finance/...                - Finance/3PL
 * /governance/...             - Governance & Admin
 */
function App() {
  return (
    <AuthProvider>
      <UNSProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            {/* Redirect Root to Dashboard */}
            <Route index element={<Navigate to="/dashboard" replace />} />

            {/* ═══════════════════════════════════════════════════════════════
                DASHBOARDS
            ═══════════════════════════════════════════════════════════════ */}
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="internal-dashboard" element={<InternalDashboard />} />
            <Route path="internal" element={<InternalOps />} />

            {/* ═══════════════════════════════════════════════════════════════
                OPERATIONS: INBOUND (入库管理)
            ═══════════════════════════════════════════════════════════════ */}
            <Route path="operations/inbound/orders" element={<InboundOrders />} />
            <Route path="operations/inbound/receiving" element={<Receiving />} />
            <Route path="operations/inbound/execution" element={<PutawayMove />} />

            {/* ═══════════════════════════════════════════════════════════════
                OPERATIONS: OUTBOUND (出库管理)
            ═══════════════════════════════════════════════════════════════ */}
            <Route path="operations/outbound/planning" element={<OutboundPlanning />} />
            <Route path="operations/outbound/order/new" element={<OutboundOrderCreate />} />
            <Route path="operations/outbound/order/:id/edit" element={<OutboundOrderCreate />} />
            <Route path="operations/outbound/execution" element={<OutboundExecution />} />
            <Route path="operations/outbound/packing" element={<DispatchPacking />} />
            {/* Legacy: /orders and /waves redirect to /planning */}
            <Route path="operations/outbound/orders" element={<Navigate to="/operations/outbound/planning" replace />} />
            <Route path="operations/outbound/waves" element={<Navigate to="/operations/outbound/planning" replace />} />
            <Route path="operations/outbound/ship" element={<Navigate to="/operations/outbound/execution?tab=dispatch" replace />} />

            {/* ═══════════════════════════════════════════════════════════════
                OPERATIONS: INVENTORY (库存管理)
            ═══════════════════════════════════════════════════════════════ */}
            <Route path="operations/inventory/list" element={<InventoryList />} />
            <Route path="operations/inventory/count" element={<InventoryList />} />
            {/* TODO: Create CycleCount.jsx for inventory counting */}

            {/* ═══════════════════════════════════════════════════════════════
                OPERATIONS: TRANSFER (调拨管理)
            ═══════════════════════════════════════════════════════════════ */}
            <Route path="operations/transfer/orders" element={<DispatchOrders />} />

            {/* ═══════════════════════════════════════════════════════════════
                [PAUSED - 内仓 scope] production module routes
                Uncomment to re-enable manufacturing warehouse features
            ═══════════════════════════════════════════════════════════════ */}
            {/* <Route path="production/orders" element={<ProductionOrders />} /> */}
            {/* <Route path="production/requests" element={<ProductionRequests />} /> */}
            {/* <Route path="production/reservations" element={<Reservations />} /> */}
            {/* <Route path="production/picking" element={<ProductionPicking />} /> */}
            {/* <Route path="production/staging" element={<LineStaging />} /> */}
            {/* <Route path="production/consumption" element={<ProductionConsumption />} /> */}
            {/* <Route path="production/fg-receipt" element={<FinishedGoodsReceipt />} /> */}

            {/* ═══════════════════════════════════════════════════════════════
                QUALITY (质量管理)
            ═══════════════════════════════════════════════════════════════ */}
            <Route path="qc" element={<QualityControl />} />
            <Route path="qc/samples" element={<QASamples />} />
            <Route path="qc/worklist" element={<QADecisions />} />
            {/* New quality routes */}
            <Route path="quality/samples" element={<QASamples />} />
            <Route path="quality/decisions" element={<QADecisions />} />

            {/* ═══════════════════════════════════════════════════════════════
                MASTER DATA (基础数据)
            ═══════════════════════════════════════════════════════════════ */}
            <Route path="master/materials" element={<Materials />} />
            <Route path="master/material/:id" element={<MaterialsDetails />} />
            <Route path="master/warehouses" element={<WarehouseList />} />
            <Route path="master/warehouse/:id" element={<WarehouseDetail />} />
            <Route path="master/partners" element={<PartnerList />} />
            <Route path="master/partner/:id" element={<PartnerDetail />} />
            <Route path="master/locations" element={<Locations />} />
            <Route path="master/containers" element={<Containers />} />
            <Route path="master/workers" element={<WorkerList />} />
            <Route path="master/worker/:id" element={<WorkerDetail />} />

            {/* ═══════════════════════════════════════════════════════════════
                FINANCE / 3PL (财务管理)
            ═══════════════════════════════════════════════════════════════ */}
            <Route path="external" element={<ExternalSync />} />
            <Route path="costing" element={<CostingEngine />} />
            <Route path="rate-cards" element={<RateCard />} />
            <Route path="monthly-billing" element={<MonthlyBilling />} />
            <Route path="reconciliation" element={<Reconciliation />} />
            <Route path="exceptions" element={<ThreePLExceptions />} />
            <Route path="warehouses" element={<Warehouses />} />

            {/* ═══════════════════════════════════════════════════════════════
                GOVERNANCE (治理与设置)
            ═══════════════════════════════════════════════════════════════ */}
            <Route path="governance/traceability/:batchId?" element={<Traceability />} />
            <Route path="governance/audit" element={<AuditLog />} />
            <Route path="admin/users" element={<UserManagement />} />
            <Route path="reports" element={<Reports />} />

            {/* ═══════════════════════════════════════════════════════════════
                LEGACY ROUTES - Redirects for backward compatibility
                These ensure old bookmarks and external links still work
            ═══════════════════════════════════════════════════════════════ */}

            {/* Old Inbound Routes */}
            <Route path="inbound" element={<Navigate to="/operations/inbound/orders" replace />} />
            <Route path="inbound/orders" element={<Navigate to="/operations/inbound/orders" replace />} />
            <Route path="inbound/receipt" element={<Navigate to="/operations/inbound/receiving" replace />} />
            <Route path="inbound/putaway" element={<Navigate to="/operations/inbound/execution" replace />} />
            <Route path="inbound/exceptions" element={<Exceptions />} /> {/* Keep until migrated */}

            {/* Old Outbound Routes */}
            <Route path="outbound" element={<Navigate to="/operations/outbound/planning" replace />} />
            <Route path="outbound/order/new" element={<Navigate to="/operations/outbound/order/new" replace />} />
            <Route path="outbound/order/:id/edit" element={<OutboundOrderCreate />} />
            <Route path="outbound/picking-tasks" element={<Navigate to="/operations/outbound/execution" replace />} />
            <Route path="outbound-dn" element={<Navigate to="/operations/outbound/planning" replace />} />
            <Route path="dn-operator" element={<Navigate to="/operations/outbound/planning" replace />} />
            <Route path="dn-approval" element={<Navigate to="/operations/outbound/planning" replace />} />
            <Route path="outbound-vas" element={<OutboundVAS />} /> {/* Keep until migrated */}

            {/* Old Dispatch Routes */}
            <Route path="dispatch/orders" element={<Navigate to="/operations/transfer/orders" replace />} />
            <Route path="dispatch/picking" element={<Navigate to="/operations/outbound/execution" replace />} />
            <Route path="dispatch/packing" element={<Navigate to="/operations/outbound/packing" replace />} />
            <Route path="dispatch/ship" element={<Navigate to="/operations/outbound/execution" replace />} />

            {/* Old Inventory Routes */}
            <Route path="inventory/list" element={<Navigate to="/operations/inventory/list" replace />} />
            <Route path="inventory/receipt" element={<Navigate to="/operations/inbound/receiving" replace />} />
            <Route path="inventory/move" element={<Navigate to="/operations/inbound/execution" replace />} />
            <Route path="inventory/putaway" element={<Navigate to="/operations/inbound/execution" replace />} />

            {/* Old Master Data Routes */}
            <Route path="master/material" element={<Navigate to="/master/materials" replace />} />
            <Route path="master/warehouse" element={<Navigate to="/master/warehouses" replace />} />
            <Route path="master/partner" element={<Navigate to="/master/partners" replace />} />
            <Route path="master/worker" element={<Navigate to="/master/workers" replace />} />

            {/* Old Governance Routes */}
            <Route path="audit-log" element={<Navigate to="/governance/audit" replace />} />
            <Route path="traceability/:batchId?" element={<Navigate to="/governance/traceability" replace />} />

          </Route>
        </Routes>
      </UNSProvider>
    </AuthProvider>
  );
}

export default App;