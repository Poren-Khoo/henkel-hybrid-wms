import React from 'react'
import { useAuth } from '../context/AuthContext'
import { 
  Check, 
  ChevronsUpDown, 
  LogOut, 
  ShieldAlert, 
  HardHat, 
  FileCheck, 
  Wallet
} from 'lucide-react'
import { cn } from '../lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"

export default function UserSwitcher() {
  const { user, switchRole } = useAuth() // Ensure switchRole is available

  // CONFIGURATION: The "Glass" Look
  // We use bg-opacity (e.g. bg-red-500/10) instead of solid colors.
  const ROLE_CONFIG = {
    ADMIN: {
      label: "Warehouse Manager",
      badgeText: "ADMIN",
      icon: ShieldAlert,
      // Light background, Darker text, Subtle border
      style: "bg-red-500/10 text-red-500 border-red-500/20",
      iconStyle: "text-red-500 bg-red-500/10",
      desc: "Full System Access"
    },
    OPERATOR: {
      label: "Shift Supervisor",
      badgeText: "OPERATOR",
      icon: HardHat,
      style: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      iconStyle: "text-blue-500 bg-blue-500/10",
      desc: "Inbound/Outbound Ops"
    },
    APPROVER: {
      label: "Logistics Coordinator",
      badgeText: "APPROVER",
      icon: FileCheck,
      style: "bg-purple-500/10 text-purple-500 border-purple-500/20",
      iconStyle: "text-purple-500 bg-purple-500/10",
      desc: "DN/ASN Approval"
    },
    FINANCE: {
      label: "Financial Controller",
      badgeText: "FINANCE",
      icon: Wallet,
      style: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      iconStyle: "text-emerald-500 bg-emerald-500/10",
      desc: "Billing & Costing"
    }
  }

  const currentRole = (user.role || 'ADMIN').toUpperCase()
  const activeConfig = ROLE_CONFIG[currentRole] || ROLE_CONFIG['ADMIN']

  return (
    <DropdownMenu>
      {/* TRIGGER BUTTON */}
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-3 pl-3 pr-2 py-1.5 rounded-md hover:bg-slate-100 transition-colors outline-none group border border-transparent hover:border-slate-200">
          <div className="text-right hidden sm:block">
            <div className="flex items-center justify-end gap-2">
               {/* Current Role Badge - Mini Version */}
               <span className={cn(
                 "text-[9px] font-bold px-1.5 py-0.5 rounded-[3px] border uppercase tracking-wider",
                 activeConfig.style
               )}>
                 {activeConfig.badgeText}
               </span>
               <div className="text-xs font-bold text-slate-700 leading-tight group-hover:text-slate-900">
                 Selene Morgan
               </div>
            </div>
            <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wide group-hover:text-slate-500 mt-0.5">
              {activeConfig.label}
            </div>
          </div>
          
          <div className="relative">
            <Avatar className="h-8 w-8 border border-slate-200 shadow-sm">
              <AvatarImage src="/avatar-placeholder.jpg" />
              <AvatarFallback className="bg-slate-900 text-[#a3e635] text-xs font-bold">SM</AvatarFallback>
            </Avatar>
            {/* Online Status Dot */}
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-[#a3e635] border-2 border-white shadow-sm"></span>
          </div>
          
          <ChevronsUpDown className="h-3 w-3 text-slate-400 opacity-50 group-hover:opacity-100" />
        </button>
      </DropdownMenuTrigger>

      {/* DROPDOWN CONTENT - Dark Tier0 Console Theme */}
      <DropdownMenuContent 
        className="w-80 bg-slate-950 border-slate-800 text-slate-200 shadow-xl rounded-md p-1.5" 
        align="end"
        sideOffset={8}
      >
        {/* User Header */}
        <div className="flex items-center gap-3 p-3 pb-4">
          <Avatar className="h-10 w-10 border border-slate-700">
            <AvatarFallback className="bg-slate-800 text-white font-medium">SM</AvatarFallback>
          </Avatar>
          <div className="flex flex-col space-y-0.5">
            <span className="text-sm font-semibold text-white tracking-tight">Selene Morgan</span>
            <span className="text-xs text-slate-500 font-mono">selene.m@henkel.com</span>
          </div>
        </div>

        <DropdownMenuSeparator className="bg-slate-800" />

        <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold px-3 mt-3 mb-2">
          Switch Persona
        </DropdownMenuLabel>

        {/* Role List */}
        <div className="space-y-1">
          {Object.entries(ROLE_CONFIG).map(([roleKey, config]) => {
            const isActive = currentRole === roleKey
            const RoleIcon = config.icon

            return (
              <DropdownMenuItem
                key={roleKey}
                onClick={() => switchRole(roleKey)}
                className={cn(
                  "flex items-start gap-3 p-2.5 rounded-md cursor-pointer transition-all border border-transparent",
                  "focus:bg-slate-900 focus:border-slate-800", // Hover State
                  isActive ? "bg-slate-900 border-slate-800" : "hover:bg-slate-900/50"
                )}
              >
                {/* 1. Icon Box */}
                <div className={cn(
                  "h-8 w-8 rounded-md flex items-center justify-center shrink-0 mt-0.5",
                  config.iconStyle // Uses the subtle bg opacity
                )}>
                  <RoleIcon className="h-4 w-4" />
                </div>

                {/* 2. Text Content */}
                <div className="flex-1 flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-sm font-medium transition-colors",
                      isActive ? "text-white" : "text-slate-300 group-hover:text-white"
                    )}>
                      {/* Name of the Persona (Warehouse Manager) */}
                      {config.label}
                    </span>
                    
                    {/* 3. THE BADGE (Fixed Colors) */}
                    <span className={cn(
                      "text-[9px] font-bold px-1.5 py-0.5 rounded-[3px] border uppercase tracking-wider",
                      config.style // This applies the glass effect
                    )}>
                      {config.badgeText}
                    </span>
                  </div>
                  
                  <span className="text-[11px] text-slate-500 leading-tight mt-0.5">
                    {config.desc}
                  </span>
                </div>

                {/* 4. Active Checkmark */}
                {isActive && (
                  <Check className="h-4 w-4 text-[#a3e635] mt-1.5 animate-in fade-in zoom-in duration-200" />
                )}
              </DropdownMenuItem>
            )
          })}
        </div>

        <DropdownMenuSeparator className="bg-slate-800 my-2" />

        {/* Logout */}
        <DropdownMenuItem 
          className="text-red-400 focus:text-red-300 focus:bg-red-500/10 p-2.5 rounded-md cursor-pointer flex items-center gap-2 justify-center font-medium"
          onClick={() => console.log("Logout")}
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </DropdownMenuItem>

      </DropdownMenuContent>
    </DropdownMenu>
  )
}