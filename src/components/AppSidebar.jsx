import * as React from "react"
import { Link, useLocation } from "react-router-dom"
import {
  LayoutGrid,
  Database,
  ArrowDownLeft,
  Package,
  FlaskConical,
  Factory,
  ArrowUpRight,
  Calculator,
  ShieldCheck,
  ChevronRight,
  Briefcase,
  ArrowLeftRight,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "./ui/sidebar"
import { cn } from "../lib/utils"
import { useAuth } from "../context/AuthContext"

// Role-based permissions configuration
const ROLE_PERMISSIONS = {
  OPERATOR: [
    '/',
    '/dashboard',
    '/internal-dashboard',
    '/operations',
    '/operations/inbound',
    '/operations/inbound/orders',
    '/operations/inbound/execution',
    '/operations/outbound',
    '/operations/outbound/orders',
    '/operations/outbound/execution',
    '/operations/outbound/waves',
    '/operations/outbound/ship',
    '/operations/inventory',
    '/operations/inventory/list',
    '/operations/transfer',
    '/operations/transfer/orders',
    '/production',
    '/production/orders',
    '/production/requests',
    '/production/execution',
  ],
  APPROVER: [
    '/',
    '/dashboard',
    '/operations',
    '/operations/outbound',
    '/operations/outbound/orders',
    '/governance',
    '/governance/reports',
  ],
  FINANCE: [
    '/',
    '/dashboard',
    '/finance',
    '/finance/costing',
    '/finance/billing',
    '/finance/rate-cards',
    '/governance',
    '/governance/reports',
  ],
  ADMIN: [],
}

/**
 * Enterprise Navigation Structure
 * 
 * Level 1: Domain Groups (Dashboards, Operations, Quality, etc.)
 * Level 2: Process Areas (Inbound, Outbound, Inventory)  
 * Level 3: Pages/Functions (Orders, Execution, Wave Planning)
 * 
 * Labels: English primary, Chinese (labelCn) for tooltips
 * Routes: /operations/outbound/... pattern
 */
const menuItems = [
  // === DASHBOARDS ===
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

  // === OPERATIONS (运营管理) - Contains nested Level 2 groups ===
  {
    label: 'Operations',
    labelCn: '运营管理',
    icon: Briefcase,
    path: '/operations',
    children: [
      // --- INBOUND (入库管理) ---
      {
        label: 'Inbound',
        labelCn: '入库管理',
        icon: ArrowDownLeft,
        path: '/operations/inbound',
        isGroup: true, // Marks this as a sub-group (Level 2)
        children: [
          { path: '/operations/inbound/orders', label: 'Inbound Orders', labelCn: '入库通知' },
          { path: '/operations/inbound/execution', label: 'Execution', labelCn: '入库执行' },
        ]
      },
      // --- OUTBOUND (出库管理) ---
      {
        label: 'Outbound',
        labelCn: '出库管理',
        icon: ArrowUpRight,
        path: '/operations/outbound',
        isGroup: true,
        children: [
          { path: '/operations/outbound/orders', label: 'Outbound Orders', labelCn: '出库通知' },
          { path: '/operations/outbound/waves', label: 'Wave Planning', labelCn: '波次管理' },
          { path: '/operations/outbound/execution', label: 'Execution', labelCn: '出库执行' },
          { path: '/operations/outbound/ship', label: 'Ship Confirm', labelCn: '发运确认' },
        ]
      },
      // --- INVENTORY (库存管理) ---
      {
        label: 'Inventory',
        labelCn: '库存管理',
        icon: Package,
        path: '/operations/inventory',
        isGroup: true,
        children: [
          { path: '/operations/inventory/list', label: 'Stock List', labelCn: '库存列表' },
          { path: '/operations/inventory/count', label: 'Cycle Count', labelCn: '盘点管理' },
        ]
      },
      // --- TRANSFER (调拨管理) ---
      {
        label: 'Transfer',
        labelCn: '调拨管理',
        icon: ArrowLeftRight,
        path: '/operations/transfer',
        isGroup: true,
        children: [
          { path: '/operations/transfer/orders', label: 'Transfer Orders', labelCn: '调拨单' },
        ]
      },
    ]
  },

  // === PRODUCTION ===
  {
    label: 'Production',
    labelCn: '生产管理',
    icon: Factory,
    path: '/production',
    children: [
      { path: '/production/orders', label: 'Prod. Orders', labelCn: '生产订单' },
      { path: '/production/requests', label: 'Material Requests', labelCn: '物料请求' },
      { path: '/production/reservations', label: 'Reservations', labelCn: '预留' },
      { path: '/production/picking', label: 'Picking', labelCn: '拣货' },
      { path: '/production/staging', label: 'Line Staging', labelCn: '线边暂存' },
      { path: '/production/consumption', label: 'Consumption', labelCn: '消耗确认' },
      { path: '/production/fg-receipt', label: 'FG Receipt', labelCn: '成品入库' },
    ]
  },

  // === QUALITY ===
  {
    label: 'Quality',
    labelCn: '质量管理',
    icon: FlaskConical,
    path: '/quality',
    children: [
      { path: '/qc/samples', label: 'QA Samples', labelCn: '质检样品' },
      { path: '/qc/worklist', label: 'QA Decisions', labelCn: '质检决策' },
      { path: '/qc/disposition', label: 'Disposition', labelCn: '处置' },
    ]
  },

  // === MASTER DATA ===
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
      { path: '/master/workers', label: 'Workers', labelCn: '工人' },
    ]
  },

  // === 3PL & FINANCE ===
  {
    label: '3PL & Finance',
    labelCn: '财务管理',
    icon: Calculator,
    path: '/finance',
    children: [
      { path: '/external', label: 'Sync Status', labelCn: '同步状态' },
      { path: '/costing', label: 'Daily Costing', labelCn: '日成本' },
      { path: '/monthly-billing', label: 'Monthly Billing', labelCn: '月结' },
      { path: '/reconciliation', label: 'Reconciliation', labelCn: '对账' },
      { path: '/rate-cards', label: 'Rate Cards', labelCn: '费率卡' },
      { path: '/exceptions', label: 'Disputes', labelCn: '异议处理' },
    ]
  },

  // === GOVERNANCE ===
  {
    label: 'Governance',
    labelCn: '治理与设置',
    icon: ShieldCheck,
    path: '/governance',
    children: [
      { path: '/governance/traceability', label: 'Traceability', labelCn: '追溯' },
      { path: '/governance/audit', label: 'Audit Log', labelCn: '审计日志' },
      { path: '/admin/users', label: 'User Management', labelCn: '用户管理' },
      { path: '/reports', label: 'Reports', labelCn: '报表' },
      { path: '/warehouses', label: 'Warehouse Admin', labelCn: '仓库管理' },
    ]
  }
]

export function AppSidebar({ isDark, onThemeToggle }) {
  const location = useLocation()
  const { user } = useAuth()
  const { open } = useSidebar()

  // Track open menus at each level
  const [openMenus, setOpenMenus] = React.useState(['Dashboards', 'Operations', 'Outbound'])

  // Filter menu items based on role permissions
  const filteredMenuItems = React.useMemo(() => {
    const userRole = (user?.role || 'ADMIN').toUpperCase()

    if (userRole === 'ADMIN') {
      return menuItems
    }

    const allowedPaths = ROLE_PERMISSIONS[userRole] || []

    return menuItems.filter(item => {
      if (allowedPaths.includes(item.path)) return true
      if (item.children) {
        return item.children.some(child => {
          if (allowedPaths.includes(child.path)) return true
          if (child.children) {
            return child.children.some(grandChild => allowedPaths.includes(grandChild.path))
          }
          return false
        })
      }
      return false
    })
  }, [user?.role])

  const toggleMenu = (label) => {
    setOpenMenus(prev =>
      prev.includes(label)
        ? prev.filter(item => item !== label)
        : [...prev, label]
    )
  }

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  const isParentActive = (item) => {
    if (!item.children) return false
    return item.children.some(child => {
      if (isActive(child.path)) return true
      if (child.children) {
        return child.children.some(grandChild => isActive(grandChild.path))
      }
      return false
    })
  }

  // Render a menu item (can be Level 1, 2, or 3)
  const renderMenuItem = (item, level = 1) => {
    const Icon = item.icon
    const hasChildren = item.children && item.children.length > 0
    const menuOpen = openMenus.includes(item.label)
    const isItemActive = isActive(item.path)
    const hasActiveChild = isParentActive(item)

    // Styling based on level
    const levelStyles = {
      1: {
        button: "w-full",
        text: "text-sm font-medium",
        icon: "h-4 w-4",
        indent: "",
      },
      2: {
        button: "w-full",
        text: "text-sm",
        icon: "h-3.5 w-3.5",
        indent: "ml-2",
      },
      3: {
        button: "w-full",
        text: "text-xs",
        icon: "h-3 w-3",
        indent: "ml-1",
      }
    }
    const styles = levelStyles[level] || levelStyles[3]

    if (hasChildren) {
      return (
        <SidebarMenuItem key={item.label}>
          <SidebarMenuButton
            onClick={() => toggleMenu(item.label)}
            isActive={false}
            className={cn(
              styles.button,
              "transition-all duration-200",
              open ? "justify-between" : "justify-center",
              isDark && "text-slate-400 hover:bg-slate-800 hover:text-white",
              !isDark && "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
              hasActiveChild && (isDark ? "text-white" : "text-slate-900")
            )}
            title={!open ? `${item.label} (${item.labelCn})` : item.labelCn}
          >
            <div className={cn("flex items-center gap-2", styles.indent)}>
              {Icon && (
                <Icon className={cn(
                  styles.icon,
                  "shrink-0",
                  isDark ? "text-slate-500" : "text-slate-400",
                  hasActiveChild && (isDark ? "text-[#b2ed1d]" : "text-blue-600")
                )} />
              )}
              {open && <span className={styles.text}>{item.label}</span>}
            </div>
            {open && (
              <ChevronRight className={cn(
                "h-4 w-4 transition-transform shrink-0",
                menuOpen && "rotate-90"
              )} />
            )}
          </SidebarMenuButton>

          {open && menuOpen && (
            <SidebarMenuSub className={cn(
              level === 1 ? "ml-4 pl-2 border-l" : "ml-8 pl-4 border-l",
              isDark ? "border-slate-700" : "border-slate-200"
            )}>
              {item.children.map(child => {
                // If child has isGroup, it's a Level 2 group
                if (child.isGroup) {
                  return renderMenuItem(child, 2)
                }
                // Otherwise, it's a regular link (Level 2 or 3 page)
                const childActive = isActive(child.path)
                return (
                  <SidebarMenuSubItem key={child.path}>
                    <SidebarMenuSubButton
                      asChild
                      isActive={childActive}
                      className={cn(
                        childActive && (isDark ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-900"),
                        !childActive && isDark && "text-slate-400 hover:bg-slate-800 hover:text-white",
                        !childActive && !isDark && "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                      )}
                      title={child.labelCn}
                    >
                      <Link to={child.path}>
                        {child.label}
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                )
              })}
            </SidebarMenuSub>
          )}
        </SidebarMenuItem>
      )
    }

    // Standard item without children
    return (
      <SidebarMenuItem key={item.path}>
        <SidebarMenuButton
          asChild
          isActive={isItemActive}
          className={cn(
            styles.button,
            "transition-all duration-200",
            open ? "justify-start" : "justify-center",
            isItemActive && (isDark ? "bg-slate-700 text-white font-medium" : "bg-slate-100 text-slate-900 font-medium"),
            !isItemActive && isDark && "text-slate-400 hover:bg-slate-800 hover:text-white",
            !isItemActive && !isDark && "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
          )}
          title={!open ? `${item.label} (${item.labelCn})` : item.labelCn}
        >
          <Link to={item.path} className="flex items-center gap-2 w-full">
            {Icon && <Icon className="h-5 w-5 shrink-0" />}
            {open && <span>{item.label}</span>}
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  return (
    <Sidebar
      className={cn(
        "border-r transition-colors duration-300",
        isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
      )}
    >
      <SidebarHeader className={cn(
        "border-b transition-colors duration-300 h-[72px]",
        isDark ? "border-slate-800" : "border-slate-200"
      )}>
        <div className={cn(
          "flex h-full items-center gap-4 px-4 transition-all duration-300",
          !open && "justify-center px-2"
        )}>
          {open ? (
            <>
              <div className="h-9 w-auto min-w-[100px] flex items-center">
                <img
                  src={isDark ? "/tier0logowhite.svg" : "/tier0logo.png"}
                  alt="Tier0"
                  className="h-full w-full object-contain object-left"
                  onError={(e) => {
                    e.target.onerror = null
                    e.target.style.display = 'none'
                    if (e.target.nextSibling) {
                      e.target.nextSibling.style.display = 'flex'
                    }
                  }}
                />
                <div className="hidden h-9 px-3 bg-[#b2ed1d] rounded-sm items-center justify-center font-bold text-slate-900 text-lg tracking-tighter">
                  TIER<span className="font-light">0</span>
                </div>
              </div>

              <div className={cn(
                "flex flex-col justify-center border-l pl-4 h-8 transition-colors duration-300",
                isDark ? "border-slate-700" : "border-slate-200"
              )}>
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest leading-none">
                  Unified
                </span>
                <span className="text-[15px] font-bold text-[#b2ed1d] uppercase tracking-widest leading-none mt-1">
                  WMS
                </span>
              </div>
            </>
          ) : (
            <div className="h-9 w-9 flex items-center justify-center">
              <div className="h-7 w-7 bg-[#b2ed1d] rounded-sm flex items-center justify-center font-bold text-slate-900 text-sm">
                T0
              </div>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          {filteredMenuItems.map((item) => renderMenuItem(item, 1))}
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
