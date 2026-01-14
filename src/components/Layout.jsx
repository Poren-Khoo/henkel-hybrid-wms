import React from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { 
  ClipboardList, 
  ArrowDownCircle, 
  Truck, 
  Clipboard, 
  CheckCircle,
  Package, 
  ClipboardCheck, 
  SplitSquareHorizontal, 
  Calculator, 
  FileText, 
  BarChart3, 
  Receipt,
  Building2,
  GitCompare,
  GitBranch,
  FlaskConical,
  AlertTriangle,
  Factory,        
  Bookmark,       
  ShoppingCart,   
  Container,      
  List,           
  ArrowLeftRight, 
  LayoutGrid,      
  Database, 
  Box,      
  MapPin,
  // NEW ICONS FOR CLEANER LOOK
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Settings,
  Activity,
  Search,
  Users,
  // DISPATCH ICONS
  PackageCheck,
  Send,
  // GOVERNANCE ICONS
  ShieldCheck,
  GitCommit,
  ScrollText,
  // NEW HEADER ICONS
  Wifi,
  Server,
  Clock,
  Command,
  // TOGGLE ICONS
  Sun,
  Moon
} from 'lucide-react'
import { Button } from './ui/button'
import { cn } from '../lib/utils'
import UserSwitcher from './UserSwitcher'
import { useAuth } from '../context/AuthContext'

// Role-based permissions configuration
const ROLE_PERMISSIONS = {
  OPERATOR: [
    '/',                    // Dashboard
    '/internal-dashboard',  // Internal Dashboard
    '/inbound-group',       // PARENT: Inbound
    '/inventory/receipt',   // Goods Receipt
    '/inventory/putaway',   // Putaway
    '/outbound-group',      // PARENT: Outbound
    '/outbound',            // Outbound (DN)
    '/dn-operator',         // Operator Queue
    '/production/orders',  // Production Orders
    '/production/requests', // Material Requests
    '/production/picking',  // Picking
    '/inventory',           // PARENT: Inventory
    '/inventory/list',      // Inventory List
    '/internal',            // Tasks (Work Queue)
    '/finance',             // PARENT: 3PL Mgmt (for Sync)
    '/external',            // External 3PL Sync
  ],
  APPROVER: [
    '/',                    
    '/outbound-group',
    '/outbound',            
    '/dn-approval',         
    '/admin',               // PARENT: Gov
    '/reports',  
    '/inbound'          
  ],
  FINANCE: [
    '/',                    
    '/finance',             // PARENT: 3PL Mgmt
    '/costing',             
    '/rate-cards',          
    '/monthly-billing',     
    '/reconciliation',     
    '/admin',
    '/reports',             
  ],
  ADMIN: [
    // ADMIN sees everything - no restrictions
  ],
}

const menuItems = [
  // --- SECTION 1: OVERVIEW ---
  { 
    label: 'Dashboards', 
    icon: LayoutGrid,
    path: '/dashboard-group', // Virtual path for grouping
    children: [
      { path: '/dashboard', label: 'Executive View (Ext)' },
      { path: '/internal-dashboard', label: 'Operations View (Int)' }
    ]
  },

  // --- SECTION 2: MASTER DATA ---
  { 
    label: 'Master Data', 
    icon: Database,
    path: '/master',
    children: [
      { path: '/master/materials', label: 'Materials' },
      { path: '/master/locations', label: 'Locations' },
      { path: '/master/containers', label: 'Containers' }
    ]
  },

  // --- SECTION 3: INBOUND LOGISTICS (Receive) ---
  { 
    label: 'Inbound', 
    icon: ArrowDownLeft, 
    path: '/inbound-group',
    children: [
      { path: '/inventory/receipt', label: 'Receipts & ASNs' },
      { path: '/inventory/putaway', label: 'Putaway Tasks' } 
    ]
  },

  // --- SECTION 4: INVENTORY MANAGEMENT ---
  { 
    label: 'Inventory', 
    icon: Package,
    path: '/inventory',
    children: [
      { path: '/inventory/list', label: 'Stock List' },
      { path: '/inventory/move', label: 'Internal Moves' } 
    ]
  },

  // --- SECTION 6: QUALITY ---
  { 
    label: 'Quality', 
    icon: FlaskConical,
    path: '/quality',
    children: [
      { path: '/qc/samples', label: 'QA Samples' }, 
      { path: '/qc/worklist', label: 'QA Decisions' }, 
      { path: '/qc/disposition', label: 'Disposition' }
    ]
  },

  // --- SECTION 7: PRODUCTION ---
  { 
    label: 'Production', 
    icon: Factory,
    path: '/production',
    children: [
      { path: '/production/orders', label: 'Prod. Orders' },
      { path: '/production/requests', label: 'Material Requests' },
      { path: '/production/reservations', label: 'Reservations' },
      { path: '/production/picking', label: 'Picking' },
      { path: '/production/staging', label: 'Line Staging' },
      { path: '/production/consumption', label: 'Goods Issued' },
      { path: '/production/fg-receipt', label: 'FG Receipt',  }
    ]
  },

  // --- SECTION 8: DISPATCH TO 3PL ---
  { 
    label: 'Dispatch to 3PL', 
    icon: Truck,
    path: '/dispatch',
    children: [
      { path: '/dispatch/orders', label: 'Transfer Orders', },
      { path: '/dispatch/picking', label: 'Picking Tasks' },
      { path: '/dispatch/packing', label: 'Packing Station' },
      { path: '/dispatch/ship', label: 'Ship / Dispatch', }
    ]
  },

  // --- SECTION 9: OUTBOUND LOGISTICS (Ship) ---
  { 
    label: 'Outbound', 
    icon: ArrowUpRight, 
    path: '/outbound-group',
    children: [
      { path: '/outbound', label: 'DN List (Docs)' },
      { path: '/dn-operator', label: 'DN Operator Queue' },
      { path: '/dn-approval', label: 'DN Approval' },
      { path: '/production/picking', label: 'Picking Tasks' } 
    ]
  },

  // --- SECTION 10: 3PL & FINANCE (Consolidated) ---
  { 
    label: '3PL Management', 
    icon: Calculator, 
    path: '/finance',
    children: [
      { path: '/external', label: 'Sync Status' },
      { path: '/inbound', label: 'Global ASN Logs' }, 
      { path: '/costing', label: 'Daily Costing' },
      { path: '/monthly-billing', label: 'Monthly Billing' },
      { path: '/reconciliation', label: 'Reconciliation' },
      { path: '/exceptions', label: 'Disputes / Exceptions' },
      { path: '/rate-cards', label: 'Rate Cards' }
    ]
  },

  // --- SECTION 11: GOVERNANCE & ADMIN ---
  { 
    label: 'Governance', 
    icon: ShieldCheck,
    path: '/governance',
    children: [
      { path: '/governance/traceability', label: 'Traceability', },
      { path: '/governance/audit', label: 'Audit Log', },
      { path: '/admin/users', label: 'User Management' },
      { path: '/reports', label: 'KPI Reports' },
      { path: '/warehouses', label: 'Warehouse Admin' }
    ]
  }
]

export default function Layout() {
  const location = useLocation()
  const { user } = useAuth()
  
  // --- STATE ---
  const [openMenus, setOpenMenus] = React.useState(['Dashboards', 'Inbound', 'Outbound']) 
  // SEARCH STATE
  const navigate = useNavigate()
  const [globalSearch, setGlobalSearch] = React.useState('')
  // THEME STATE (Default: Dark Sidebar)
  const [isSidebarDark, setIsSidebarDark] = React.useState(true)

  // --- HANDLERS ---
  const toggleMenu = (label) => {
    setOpenMenus(prev => 
      prev.includes(label) 
        ? prev.filter(item => item !== label) 
        : [...prev, label]
    )
  }

  const handleGlobalSearch = (e) => {
    if (e.key === 'Enter' && globalSearch.trim()) {
      navigate(`/search?q=${encodeURIComponent(globalSearch)}`)
    }
  }

  // Filter menu items based on role permissions
  const filteredMenuItems = React.useMemo(() => {
    const userRole = (user.role || 'ADMIN').toUpperCase()
    
    if (userRole === 'ADMIN') {
      return menuItems
    }

    const allowedPaths = ROLE_PERMISSIONS[userRole] || []
    
    return menuItems.filter(item => {
      if (allowedPaths.includes(item.path)) return true;
      if (item.children) {
        return item.children.some(child => allowedPaths.includes(child.path))
      }
      return false;
    })
  }, [user.role])

  // Helper to find current page label
  const currentPageLabel = React.useMemo(() => {
    const flatList = menuItems.flatMap(i => i.children ? [i, ...i.children] : [i])
    return flatList.find(i => i.path === location.pathname)?.label || "Dashboard"
  }, [location.pathname])

  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans text-slate-900 relative">
      
      {/* SIDEBAR: Dynamic Theme (Dark/Light) */}
      <aside className={cn(
        "w-[280px] flex-col border-r hidden md:flex transition-colors duration-300",
        isSidebarDark ? "bg-slate-900 border-slate-800 text-slate-300" : "bg-white border-slate-200 text-slate-600"
      )}>
        
        {/* Logo Area */}
        <div className={cn(
          "flex h-[80px] items-center gap-4 pl-6 pr-4 border-b shrink-0 transition-colors duration-300",
          isSidebarDark ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"
        )}>
          <div className="h-9 w-auto min-w-[100px] flex items-center">
             <img 
               src={isSidebarDark ? "/tier0logowhite.svg" : "/tier0logo.png"} 
               alt="Tier0" 
               className="h-full w-full object-contain object-left" 
               onError={(e) => {
                   e.target.onerror = null; 
                   e.target.style.display = 'none';
                   e.target.nextSibling.style.display = 'flex'; // Show fallback
               }}
             />
             <div className="hidden h-9 px-3 bg-[#a3e635] rounded-sm items-center justify-center font-bold text-slate-900 text-lg tracking-tighter">
               TIER<span className="font-light">0</span>
             </div>
          </div>
          
          <div className={cn("flex flex-col justify-center border-l pl-4 h-8 transition-colors duration-300", isSidebarDark ? "border-slate-700" : "border-slate-200")}>
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest leading-none">
              Unified
            </span>
            <span className="text-[15px] font-bold text-[#a3e635] uppercase tracking-widest leading-none mt-1">
              WMS
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 space-y-0 overflow-y-auto">
          {filteredMenuItems.map((item) => {
            if (item.children) {
              const isOpen = openMenus.includes(item.label)
              const isActiveParent = item.children.some(child => location.pathname === child.path)
              const Icon = item.icon

              return (
                <div key={item.label} className="mb-1">
                  {/* Parent Button */}
                  <Button
                    variant="ghost"
                    onClick={() => toggleMenu(item.label)}
                    className={cn(
                      "w-full justify-between h-10 px-4 mb-1 transition-all group",
                      isActiveParent 
                        ? (isSidebarDark ? "text-white bg-slate-800/50" : "text-slate-900 bg-slate-100") 
                        : (isSidebarDark ? "text-slate-400 hover:bg-slate-800 hover:text-white" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900")
                    )}
                  >
                    <div className="flex items-center">
                      <Icon className={cn(
                        "mr-3 h-4 w-4 transition-colors", 
                        isActiveParent 
                          ? "text-[#a3e635]" 
                          : (isSidebarDark ? "text-slate-500 group-hover:text-slate-300" : "text-slate-400 group-hover:text-slate-600")
                      )} />
                      <span className={cn("text-sm", isActiveParent ? "font-medium" : "")}>{item.label}</span>
                    </div>
                    <span className={cn("transition-transform text-slate-500 text-xs", isOpen ? "rotate-180" : "")}>▼</span>
                  </Button>

                  {/* Children Links */}
                  {isOpen && (
                    <div className={cn("mt-1 ml-4 space-y-1 pl-4 border-l", isSidebarDark ? "border-slate-700" : "border-slate-200")}>
                      {item.children.map(child => {
                        const isChildActive = location.pathname === child.path
                        const ChildIcon = child.icon 
                        
                        return (
                          <Button
                            key={child.path}
                            asChild
                            variant="ghost"
                            className={cn(
                              "w-full justify-start h-9 px-4 rounded-md text-sm transition-all border-l-2",
                              isChildActive 
                                // Active state (Always Tier0 Green)
                                ? "bg-[#a3e635]/10 text-[#a3e635] border-[#a3e635]" 
                                // Inactive state (Dynamic)
                                : (isSidebarDark 
                                    ? "text-slate-400 border-transparent hover:text-white hover:bg-slate-800"
                                    : "text-slate-500 border-transparent hover:text-slate-900 hover:bg-slate-50")
                            )}
                          >
                            <Link to={child.path} className="flex items-center w-full">
                              {ChildIcon ? <ChildIcon className="h-3.5 w-3.5 mr-2" /> : <div className={cn("h-1.5 w-1.5 rounded-full mr-2 transition-colors", isChildActive ? "bg-[#a3e635]" : (isSidebarDark ? "bg-slate-600" : "bg-slate-300"))} />}
                              {child.label}
                            </Link>
                          </Button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            }

            // Standard Item
            const isActive = location.pathname === item.path
            const Icon = item.icon
            return (
              <Button
                key={item.path}
                asChild
                variant="ghost"
                className={cn(
                  "w-full justify-start h-11 px-4 mb-1 rounded-md transition-all duration-200 border-l-4",
                  isActive
                    ? "bg-[#a3e635]/10 text-[#a3e635] border-[#a3e635] font-medium" 
                    : (isSidebarDark 
                        ? "text-slate-400 border-transparent hover:bg-slate-800 hover:text-white"
                        : "text-slate-500 border-transparent hover:bg-slate-50 hover:text-slate-900")
                )}
              >
                <Link to={item.path} className="flex items-center w-full">
                  <Icon className="mr-3 h-5 w-5" /> 
                  <span className="text-sm">{item.label}</span>
                </Link>
              </Button>
            )
          })}
        </nav>
        
        <div className={cn("p-4 border-t", isSidebarDark ? "border-slate-800" : "border-slate-200")}>
            <div className={cn("text-[10px] text-center font-mono", isSidebarDark ? "text-slate-600" : "text-slate-400")}>TIER0 EDGE v2.4.0</div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50">
        
        {/* HEADER */}
        <header className="h-[72px] bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm border-t-4 border-t-[#a3e635]">
          
          {/* LEFT: Context & Breadcrumbs */}
          <div className="flex flex-col justify-center gap-0.5">
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium uppercase tracking-wider">
              <Link to="/" className="hover:text-slate-600 transition-colors">Home</Link>
              <span>/</span>
              <span>{currentPageLabel}</span>
            </div>
            
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold text-slate-900 leading-none">
                {currentPageLabel}
              </h1>
              
              {/* THEME TOGGLE BUTTON (Replaced Context Chips) */}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsSidebarDark(!isSidebarDark)}
                className="hidden md:flex h-6 w-6 p-0 rounded-full border border-slate-200 hover:bg-slate-100 items-center justify-center text-slate-500"
                title="Toggle Sidebar Theme"
              >
                {isSidebarDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>

          {/* CENTER: Global Search Bar */}
          <div className="flex-1 max-w-xl mx-6 hidden md:block">
            <div className="relative group">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 group-focus-within:text-[#a3e635] transition-colors" />
              <input 
                type="text"
                placeholder="Search DN, ASN, SKU, Lot, Container..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                onKeyDown={handleGlobalSearch}
                className="w-full h-9 pl-9 pr-4 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#a3e635] focus:border-[#a3e635] focus:bg-white transition-all placeholder:text-slate-400"
              />
              <div className="absolute right-2 top-2">
                <kbd className="hidden lg:inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-100 px-1.5 font-mono text-[10px] font-medium text-slate-500">
                  <Command className="h-3 w-3" /> K
                </kbd>
              </div>
            </div>
          </div>

          {/* RIGHT: Status & User */}
          <div className="flex items-center gap-5">
            
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
        <div className="flex-1 overflow-auto p-6 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}