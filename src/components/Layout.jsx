import React from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
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
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from './ui/breadcrumb'
import { Separator } from './ui/separator'

// Helper to find current page label
const menuItems = [
  { label: 'Dashboards', path: '/dashboard-group' },
  { label: 'Master Data', path: '/master' },
  { label: 'Inbound', path: '/inbound-group' },
  { label: 'Inventory', path: '/inventory' },
  { label: 'Quality', path: '/quality' },
  { label: 'Production', path: '/production' },
  { label: 'Dispatch to 3PL', path: '/dispatch' },
  { label: 'Outbound', path: '/outbound-group' },
  { label: '3PL Management', path: '/finance' },
  { label: 'Governance', path: '/governance' },
]

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

  // Helper to find current page label
  const currentPageLabel = React.useMemo(() => {
    // This is a simplified version - you can enhance it to match your actual routes
    const path = location.pathname
    if (path === '/') return 'Dashboard'
    if (path.startsWith('/outbound')) return 'Outbound Orders'
    if (path.startsWith('/inbound')) return 'Inbound'
    if (path.startsWith('/master')) return 'Master Data'
    if (path.startsWith('/production')) return 'Production'
    if (path.startsWith('/dispatch')) return 'Dispatch'
    if (path.startsWith('/governance')) return 'Governance'
    if (path.startsWith('/finance')) return '3PL Management'
    return 'Dashboard'
  }, [location.pathname])

  return (
    <SidebarProvider>
      <AppSidebar isDark={isSidebarDark} onThemeToggle={() => setIsSidebarDark(!isSidebarDark)} />
      <SidebarInset>
        <header className="flex h-[72px] shrink-0 items-center gap-2 bg-white border-b border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink asChild>
                    <Link to="/" className="hover:text-slate-600 transition-colors">
                      Home
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-lg font-bold text-slate-900">
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
          <div className="flex items-center gap-5 pr-6">
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
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}