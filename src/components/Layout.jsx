import React from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Search,
  Wifi,
  Command,
  Sun,
  Moon,
} from 'lucide-react'
import { Button } from './ui/button'
import { cn } from '../lib/utils'
import UserSwitcher from './UserSwitcher'
import { useAuth } from '../context/AuthContext'
import { AppSidebar } from './AppSidebar'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from './ui/sidebar'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from './ui/breadcrumb'
import { Separator } from './ui/separator'

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [globalSearch, setGlobalSearch] = React.useState('')
  const [isSidebarDark, setIsSidebarDark] = React.useState(false)

  const handleGlobalSearch = (e) => {
    if (e.key === 'Enter' && globalSearch.trim()) {
      navigate(`/search?q=${encodeURIComponent(globalSearch)}`)
    }
  }

  // Path-to-page-title map (matches sidebar labels)
  const ROUTE_TITLES = React.useMemo(() => ({
    '/dashboard': 'Dashboard',
    '/internal-dashboard': 'Production Dashboard',
    '/internal': 'Internal Ops',
    '/operations/inbound/orders': 'Inbound Orders',
    '/operations/inbound/receiving': 'Receiving',
    '/operations/inbound/execution': 'Execution',
    '/operations/outbound/planning': 'Outbound Planning',
    '/operations/outbound/order/new': 'New Order',
    '/operations/outbound/order': 'Order',
    '/operations/outbound/execution': 'Execution',
    '/operations/outbound/packing': 'Packing',
    '/operations/inventory/list': 'Stock List',
    '/operations/inventory/count': 'Cycle Count',
    '/operations/transfer/orders': 'Transfer Orders',
    '/production/orders': 'Prod. Orders',
    '/production/requests': 'Material Requests',
    '/production/reservations': 'Reservations',
    '/production/picking': 'Picking',
    '/production/staging': 'Line Staging',
    '/production/consumption': 'Consumption',
    '/production/fg-receipt': 'FG Receipt',
    '/qc/samples': 'QA Samples',
    '/qc/worklist': 'QA Decisions',
    '/qc/disposition': 'Disposition',
    '/quality/samples': 'QA Samples',
    '/quality/decisions': 'QA Decisions',
    '/quality/disposition': 'Disposition',
    '/master/materials': 'Materials',
    '/master/material': 'Material Details',
    '/master/warehouses': 'Warehouses',
    '/master/warehouse': 'Warehouse Details',
    '/master/partners': 'Partners',
    '/master/partner': 'Partner Details',
    '/master/containers': 'Containers',
    '/master/workers': 'Workers',
    '/master/worker': 'Worker Details',
    '/master/locations': 'Locations',
    '/external': 'Sync Status',
    '/costing': 'Daily Costing',
    '/monthly-billing': 'Monthly Billing',
    '/reconciliation': 'Reconciliation',
    '/rate-cards': 'Rate Cards',
    '/exceptions': 'Disputes',
    '/warehouses': 'Warehouse Admin',
    '/governance/traceability': 'Traceability',
    '/governance/audit': 'Audit Log',
    '/admin/users': 'User Management',
    '/reports': 'Reports',
    '/inbound/exceptions': 'Exceptions',
    '/outbound-vas': 'Outbound VAS',
  }), [])

  const currentPageLabel = React.useMemo(() => {
    const path = location.pathname
    if (ROUTE_TITLES[path]) return ROUTE_TITLES[path]
    const sorted = Object.entries(ROUTE_TITLES).sort((a, b) => b[0].length - a[0].length)
    const match = sorted.find(([p]) => path.startsWith(p))
    return match ? match[1] : 'Dashboard'
  }, [location.pathname, ROUTE_TITLES])

  return (
    <SidebarProvider>
      <AppSidebar isDark={isSidebarDark} onThemeToggle={() => setIsSidebarDark(!isSidebarDark)} />
      <SidebarInset>
        <header className="flex h-[56px] sm:h-[72px] shrink-0 items-center gap-2 bg-white border-b border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-base sm:text-lg font-bold text-slate-900 truncate max-w-[140px] sm:max-w-none">
                    {currentPageLabel}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <Separator
              orientation="vertical"
              className="mx-2 h-4"
            />
            <button
              onClick={() => setIsSidebarDark(!isSidebarDark)}
              className={cn(
                "h-8 w-8 p-0 rounded-md border transition-colors shrink-0 flex items-center justify-center",
                "border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-700"
              )}
              title="Toggle Sidebar Theme"
            >
              {isSidebarDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>

          {/* CENTER: Global Search Bar */}
          <div className="flex-1 max-w-xl mx-6 hidden md:block">
            <div className="relative group">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 group-focus-within:text-[#b2ed1d] transition-colors" />
              <input
                type="text"
                placeholder="Search DN, ASN, SKU, Lot, Container..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                onKeyDown={handleGlobalSearch}
                className="w-full h-9 pl-9 pr-4 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#b2ed1d] focus:border-[#b2ed1d] focus:bg-white transition-all placeholder:text-slate-400"
              />
              <div className="absolute right-2 top-2">
                <kbd className="hidden lg:inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-100 px-1.5 font-mono text-[10px] font-medium text-slate-500">
                  <Command className="h-3 w-3" /> K
                </kbd>
              </div>
            </div>
          </div>

          {/* RIGHT: Status & User */}
          <div className="flex items-center gap-3 sm:gap-5 pr-3 sm:pr-6">
            {/* Status Rail */}
            <div className="hidden xl:flex flex-col items-end gap-0.5 text-[10px] font-medium text-slate-500 border-r border-slate-100 pr-5 h-8 justify-center">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Broker:</span>
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <Wifi className="h-3 w-3" /> Online
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Latency:</span>
                <span className="text-slate-700 font-mono">24ms</span>
              </div>
            </div>

            {/* User Profile */}
            <UserSwitcher />
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-[10px] bg-slate-50">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}