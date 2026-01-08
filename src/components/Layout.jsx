import React from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
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
  ScrollText
} from 'lucide-react'
import { Button } from './ui/button'
import { cn } from '../lib/utils'
import UserSwitcher from './UserSwitcher'
import { useAuth } from '../context/AuthContext'

// Role-based permissions configuration
// NOTE: I added the new "Parent Groups" here so they are visible to Operators
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
      { path: '/', label: 'Executive View (Ext)' },
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
      // 1. REMOVE: { path: '/inbound', label: 'ASN List (Docs)' }, 
      //    Reason: This page is for External/Integration view. 
      //            Internal Ops should use the Receipt page which now has the list.
      
      // 2. RENAME: Give it a broader name since it now includes the list
      { path: '/inventory/receipt', label: 'Receipts & ASNs' },
      
      // 3. KEEP:
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
  // ... inside menuItems ...

  // --- SECTION 6: QUALITY ---
  { 
    label: 'Quality', 
    icon: FlaskConical,
    path: '/quality',
    children: [
      // 1. INPUT: Take a sample
      { path: '/qc/samples', label: 'QA Samples' }, 
      
      // 2. DECISION: Pass/Fail (Replaces Worklist & Decision)
      { path: '/qc/worklist', label: 'QA Decisions' }, 
      
      // 3. CONSEQUENCE: Handle bad stuff
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
      { path: '/production/picking', label: 'Staging / Picking', },
      { path: '/production/consumption', label: 'Goods Issued' },
      { path: '/production/fg-receipt', label: 'FG Receipt', icon: PackageCheck }
    ]
  },

  // --- SECTION 8: DISPATCH TO 3PL ---
  { 
    label: 'Dispatch to 3PL', 
    icon: Truck,
    path: '/dispatch',
    children: [
      { path: '/dispatch/orders', label: 'Transfer Orders', icon: ClipboardList },
      { path: '/dispatch/picking', label: 'Picking Tasks' },
      { path: '/dispatch/packing', label: 'Packing Station' },
      { path: '/dispatch/ship', label: 'Ship / Dispatch', icon: Send }
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
      { path: '/governance/traceability', label: 'Traceability', icon: GitCommit },
      { path: '/governance/audit', label: 'Audit Log', icon: ScrollText },
      { path: '/admin/users', label: 'User Management' },
      { path: '/reports', label: 'KPI Reports' },
      { path: '/warehouses', label: 'Warehouse Admin' }
    ]
  }
]

export default function Layout() {
  const location = useLocation()
  const { user } = useAuth()

  // Default open menus for better UX
  const [openMenus, setOpenMenus] = React.useState(['Dashboards', 'Inbound', 'Outbound']) 

  const toggleMenu = (label) => {
    setOpenMenus(prev => 
      prev.includes(label) 
        ? prev.filter(item => item !== label) 
        : [...prev, label]
    )
  }

  // Filter menu items based on role permissions
  const filteredMenuItems = React.useMemo(() => {
    const userRole = (user.role || 'ADMIN').toUpperCase()
    
    // ADMIN sees everything
    if (userRole === 'ADMIN') {
      return menuItems
    }

    // Get allowed paths for the current role
    const allowedPaths = ROLE_PERMISSIONS[userRole] || []
    
    // Filter menu items to only show allowed paths
    // NOTE: For items with children, we check if the PARENT path is allowed OR if any child is allowed
    return menuItems.filter(item => {
      if (allowedPaths.includes(item.path)) return true;
      if (item.children) {
        return item.children.some(child => allowedPaths.includes(child.path))
      }
      return false;
    })
  }, [user.role])

  return (
    <div className="flex h-screen w-full bg-white font-sans text-slate-900 relative">
      {/* Sidebar */}
      <aside className="w-[280px] flex-col bg-white border-r border-slate-200 hidden md:flex">
        <div className="flex h-[80px] items-center gap-3 pl-8 pr-6 bg-white">
          <img src="/Henkel logo transparent png.png" alt="Henkel" className="h-10 w-auto" />
          <div className="flex flex-col">
            <span className="font-bold text-base leading-none tracking-tight text-slate-900">Henkel</span>
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-widest mt-1">Hybrid WMS</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {filteredMenuItems.map((item) => {
            
            // CASE A: Item with Submenu
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
                      "w-full justify-between h-11 px-4 rounded-lg hover:bg-slate-50",
                      isActiveParent ? "text-slate-900 font-semibold bg-slate-50" : "text-slate-600"
                    )}
                  >
                    <div className="flex items-center">
                      <Icon className={cn("mr-3 h-5 w-5", isActiveParent ? "text-[#e60000]" : "text-slate-400")} />
                      <span className="text-sm">{item.label}</span>
                    </div>
                    {/* Tiny Arrow Icon */}
                    <span className={cn("transition-transform text-slate-400 text-xs", isOpen ? "rotate-180" : "")}>▼</span>
                  </Button>

                  {/* Children Links (Collapsible Area) */}
                  {isOpen && (
                    <div className="mt-1 ml-4 space-y-1 pl-4 border-l-2 border-slate-100">
                      {item.children.map(child => {
                        const isChildActive = location.pathname === child.path
                        const ChildIcon = child.icon // Optional child icon
                        
                        return (
                          <Button
                            key={child.path}
                            asChild
                            variant="ghost"
                            className={cn(
                              "w-full justify-start h-9 px-4 rounded-lg text-sm",
                              isChildActive 
                                ? "bg-red-50 text-[#e60000] font-medium" 
                                : "text-slate-500 hover:text-slate-900 hover:bg-transparent"
                            )}
                          >
                            <Link to={child.path} className="flex items-center">
                              {/* Icon or dot indicator */}
                              {ChildIcon ? (
                                <ChildIcon className={cn("h-3.5 w-3.5 mr-2", isChildActive ? "text-[#e60000]" : "text-slate-400")} />
                              ) : (
                                <div className={cn("h-1.5 w-1.5 rounded-full mr-2", isChildActive ? "bg-[#e60000]" : "bg-slate-300")} />
                              )}
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

            // CASE B: Standard Item (No Children)
            const isActive = location.pathname === item.path
            const Icon = item.icon
            return (
              <Button
                key={item.path}
                asChild
                variant="ghost"
                className={cn(
                  "w-full justify-start h-11 px-4 mb-1 rounded-lg transition-colors duration-200",
                  isActive
                    ? "bg-red-50 text-[#e60000] font-bold shadow-sm hover:bg-red-100"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <Link to={item.path} className="flex items-center">
                  <Icon className={cn("mr-3 h-5 w-5", isActive ? "text-[#e60000]" : "text-slate-400")} />
                  <span className="text-sm">{item.label}</span>
                </Link>
              </Button>
            )
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-8 shadow-sm z-50">
          <div className="flex items-center gap-2 text-sm">
            <Link to="/" className="text-slate-500 hover:text-slate-900 transition-colors">Home</Link>
            <span className="text-slate-300">/</span>
            <span className="font-semibold text-slate-900">
              {/* Logic to find label even in children */}
              {(() => {
                const flatList = menuItems.flatMap(i => i.children ? [i, ...i.children] : [i])
                return flatList.find(i => i.path === location.pathname)?.label || "Dashboard"
              })()}
            </span>
          </div>
          <UserSwitcher />
        </header>
        <div className="flex-1 overflow-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}