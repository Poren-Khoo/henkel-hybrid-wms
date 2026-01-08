import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// --- 1. SHARED COMPONENTS (Now in src/components, NOT src/components/ui) ---
import { UNSProvider } from './context/UNSContext';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout'; // <--- Much cleaner path

// --- 2. EXTERNAL MODULE (Logistics) ---
import ExternalDashboard from './modules/external/pages/ExternalDashboard'; 
import InboundASN from './modules/external/pages/InboundASN';
import OutboundDN from './modules/external/pages/OutboundDN';
import DnOperatorQueue from './modules/external/pages/DnOperatorQueue';
import DnApproval from './modules/external/pages/DnApproval';
import CostingEngine from './modules/external/pages/CostingEngine';
import RateCard from './modules/external/pages/RateCard';
import Reports from './modules/external/pages/Reports';
import MonthlyBilling from './modules/external/pages/MonthlyBilling';
import Warehouses from './modules/external/pages/Warehouses';
import Reconciliation from './modules/external/pages/Reconciliation';
import ThreePLExceptions from './modules/external/pages/ThreePLExceptions';
import ExternalSync from './modules/external/pages/ExternalSync';
import OutboundVAS from './modules/external/pages/OutboundVAS';

// --- 3. INTERNAL MODULE (Manufacturing) ---
import InternalDashboard from './modules/internal/pages/InternalDashboard';
import Materials from './modules/internal/pages/master/Materials';
import Locations from './modules/internal/pages/master/Locations';
import Containers from './modules/internal/pages/master/Containers';
import InventoryList from './modules/internal/pages/inventory/InventoryList';
import GoodsReceipt from './modules/internal/pages/inventory/GoodsReceipt';
import PutawayMove from './modules/internal/pages/inventory/PutawayMove';
import InternalOps from './modules/internal/pages/InternalOps';
import QualityControl from './modules/internal/pages/QualityControl';
import QASamples from './modules/internal/pages/QASamples';
import QADecisions from './modules/internal/pages/QADecisions';
import QCDisposition from './modules/internal/pages/QCDisposition';
import ProductionOrders from './modules/internal/pages/production/ProductionOrders';
import ProductionRequests from './modules/internal/pages/production/ProductionRequests';
import Reservations from './modules/internal/pages/production/Reservations';
import ProductionPicking from './modules/internal/pages/production/ProductionPicking';
import ProductionConsumption from './modules/internal/pages/production/ProductionConsumption';
import FinishedGoodsReceipt from './modules/internal/pages/production/FinishedGoodsReceipt';
import DispatchOrders from './modules/internal/pages/dispatch/DispatchOrders';
import DispatchPicking from './modules/internal/pages/dispatch/DispatchPicking';
import DispatchPacking from './modules/internal/pages/dispatch/DispatchPacking';
import ShipmentConfirmation from './modules/internal/pages/dispatch/ShipmentConfirmation';
import AuditLog from './modules/internal/pages/audit/AuditLog';
import Traceability from './modules/internal/pages/traceability/Traceability';
import UserManagement from './modules/admin/pages/UserManagement';

function App() {
  return (
    <AuthProvider>
      <UNSProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            {/* Redirect Root to Dashboard */}
            <Route index element={<Navigate to="/dashboard" replace />} />
            
            {/* --- External Module Routes --- */}
            <Route path="dashboard" element={<ExternalDashboard />} />
            <Route path="internal-dashboard" element={<InternalDashboard />} />
            <Route path="inbound" element={<InboundASN />} />
            <Route path="outbound" element={<OutboundDN />} />
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

            {/* --- Internal Module Routes --- */}
            <Route path="master/materials" element={<Materials />} />
            <Route path="master/locations" element={<Locations />} />
            <Route path="master/containers" element={<Containers />} />
            <Route path="inventory/list" element={<InventoryList />} />
            <Route path="inventory/receipt" element={<GoodsReceipt />} />
            <Route path="inventory/move" element={<PutawayMove />} />
            <Route path="inventory/putaway" element={<PutawayMove />} />
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