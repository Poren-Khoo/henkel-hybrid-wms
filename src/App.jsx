import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// --- 1. SHARED COMPONENTS (Now in src/components, NOT src/components/ui) ---
import { UNSProvider } from './context/UNSContext';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout'; // <--- Much cleaner path

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
import OutboundOrders from './modules/outbound/pages/OutboundOrders';
import OutboundDN from './modules/outbound/pages/OutboundDN';
import DnOperatorQueue from './modules/outbound/pages/DnOperatorQueue';
import DnApproval from './modules/outbound/pages/DnApproval';
import OutboundVAS from './modules/outbound/pages/OutboundVAS';
import DispatchOrders from './modules/outbound/pages/DispatchOrders';
import DispatchPicking from './modules/outbound/pages/DispatchPicking';
import DispatchPacking from './modules/outbound/pages/DispatchPacking';
import ShipmentConfirmation from './modules/outbound/pages/ShipmentConfirmation';

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

// --- FINANCE MODULE ---
import CostingEngine from './modules/finance/pages/CostingEngine';
import RateCard from './modules/finance/pages/RateCard';
import MonthlyBilling from './modules/finance/pages/MonthlyBilling';
import Reconciliation from './modules/finance/pages/Reconciliation';

// --- PRODUCTION MODULE ---
import ProductionOrders from './modules/production/pages/ProductionOrders';
import ProductionRequests from './modules/production/pages/ProductionRequests';
import Reservations from './modules/production/pages/Reservations';
import ProductionPicking from './modules/production/pages/ProductionPicking';
import LineStaging from './modules/production/pages/LineStaging';
import ProductionConsumption from './modules/production/pages/ProductionConsumption';
import FinishedGoodsReceipt from './modules/production/pages/FinishedGoodsReceipt';

// --- QUALITY MODULE ---
import QualityControl from './modules/quality/pages/QualityControl';
import QASamples from './modules/quality/pages/QASamples';
import QADecisions from './modules/quality/pages/QADecisions';
import QCDisposition from './modules/quality/pages/QCDisposition';

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

function App() {
  return (
    <AuthProvider>
      <UNSProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            {/* Redirect Root to Dashboard */}
            <Route index element={<Navigate to="/dashboard" replace />} />
            
            {/* --- Dashboard Routes --- */}
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="internal-dashboard" element={<InternalDashboard />} />
            {/* --- Inbound Routes --- */}
            <Route path="inbound" element={<InboundASN />} />
            {/* --- Outbound Routes --- */}
            <Route path="outbound" element={<OutboundOrders />} />
            {/* Legacy routes - kept for backward compatibility, will be deprecated */}
            <Route path="outbound-dn" element={<OutboundDN />} />
            <Route path="dn-operator" element={<DnOperatorQueue />} />
            <Route path="dn-approval" element={<DnApproval />} />
            <Route path="costing" element={<CostingEngine />} />
            <Route path="rate-cards" element={<RateCard />} />
            <Route path="reports" element={<Reports />} />
            <Route path="monthly-billing" element={<MonthlyBilling />} />
            <Route path="warehouses" element={<Warehouses />} />
            <Route path="reconciliation" element={<Reconciliation />} />
            <Route path="exceptions" element={<ThreePLExceptions />} />
            <Route path="external" element={<ExternalSync />} />
            <Route path="outbound-vas" element={<OutboundVAS />} />

            {/* --- Master Data Routes --- */}
            <Route path="master/material" element={<Navigate to="/master/materials" replace />} />
            <Route path="master/materials" element={<Materials />} />
            <Route path="master/material/:id" element={<MaterialsDetails />} />
            <Route path="master/warehouse" element={<Navigate to="/master/warehouses" replace />} />
            <Route path="master/warehouses" element={<WarehouseList />} />
            <Route path="master/warehouse/:id" element={<WarehouseDetail />} />
            <Route path="master/partner" element={<Navigate to="/master/partners" replace />} />
            <Route path="master/partners" element={<PartnerList />} />
            <Route path="master/partner/:id" element={<PartnerDetail />} />
            <Route path="master/locations" element={<Locations />} />
            <Route path="master/containers" element={<Containers />} />
            <Route path="inventory/list" element={<InventoryList />} />
            <Route path="inbound/orders" element={<InboundOrders />} />
            <Route path="inbound/receipt" element={<Receiving />} />
            <Route path="inbound/putaway" element={<PutawayMove />} />
            <Route path="inbound/exceptions" element={<Exceptions />} />
            {/* Legacy routes - redirect to new inbound paths */}
            <Route path="inventory/receipt" element={<Navigate to="/inbound/receipt" replace />} />
            <Route path="inventory/move" element={<Navigate to="/inbound/putaway" replace />} />
            <Route path="inventory/putaway" element={<Navigate to="/inbound/putaway" replace />} />
            <Route path="internal" element={<InternalOps />} />
            <Route path="qc" element={<QualityControl />} />
            
            
            {/* --- QC Module Routes --- */}
            <Route path="qc/samples" element={<QASamples />} />
            <Route path="qc/worklist" element={<QADecisions />} />
            <Route path="qc/disposition" element={<QCDisposition />} />
            
            {/* --- Production Module Routes --- */}
            <Route path="production/orders" element={<ProductionOrders />} />
            <Route path="production/requests" element={<ProductionRequests />} />
            <Route path="production/reservations" element={<Reservations />} />
            <Route path="production/picking" element={<ProductionPicking />} />
            <Route path="production/staging" element={<LineStaging />} />
            <Route path="production/consumption" element={<ProductionConsumption />} />
            <Route path="production/fg-receipt" element={<FinishedGoodsReceipt />} />

            {/* --- Dispatch Module Routes --- */}
            <Route path="dispatch/orders" element={<DispatchOrders />} />
            <Route path="dispatch/picking" element={<DispatchPicking />} />
            <Route path="dispatch/packing" element={<DispatchPacking />} />
            <Route path="dispatch/ship" element={<ShipmentConfirmation />} />

            {/* --- Governance Module Routes --- */}
            <Route path="governance/traceability/:batchId?" element={<Traceability />} />
            <Route path="governance/audit" element={<AuditLog />} />
            
            {/* Legacy routes for backward compatibility */}
            <Route path="audit-log" element={<AuditLog />} />
            <Route path="traceability/:batchId?" element={<Traceability />} />
            <Route path="admin/users" element={<UserManagement />} />
          </Route>
        </Routes>
      </UNSProvider>
    </AuthProvider>
  );
}

export default App;