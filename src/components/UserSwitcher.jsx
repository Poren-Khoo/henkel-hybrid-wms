import React from 'react'
import { useAuth, DEMO_USERS } from '../context/AuthContext'
import { 
  Check, 
  ChevronsUpDown, 
  LogOut, 
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
  const { user, switchUser, logout } = useAuth()
  
  // Define Personas with Images
  const PERSONAS = [
    {
      id: 'admin',
      name: "Selene Morgan",
      email: "selene.m@tier0.com",
      role: "ADMIN",
      jobTitle: "Warehouse Manager",
      avatar: "/Selene Morgan.jpg" 
    },
    {
      id: 'operator',
      name: "Anthony Edwards",
      email: "anthony.e@tier0.com",
      role: "OPERATOR",
      jobTitle: "Shift Supervisor",
      avatar: "/Anthony Edwards.jpg" 
    },
    {
      id: 'approver',
      name: "Arjun Patel",
      email: "arjun.p@tier0.com",
      role: "APPROVER",
      jobTitle: "Logistics Coordinator",
      avatar: "/Arjun Patel.webp" 
    },
    {
      id: 'finance',
      name: "Roxanne Miller",
      email: "roxanne.m@tier0.com",
      role: "FINANCE",
      jobTitle: "Financial Controller",
      avatar: "/Roxanne.jpg" 
    }
  ]

  // Helper: Get Badge Styles (Pastel Theme)
  const getBadgeStyle = (role) => {
    switch (role) {
      case 'ADMIN': 
        return "bg-red-50 text-red-700 border-red-200"
      case 'OPERATOR': 
        return "bg-blue-50 text-blue-700 border-blue-200"
      case 'APPROVER': 
        return "bg-purple-50 text-purple-700 border-purple-200"
      case 'FINANCE': 
        return "bg-emerald-50 text-emerald-700 border-emerald-200"
      default: 
        return "bg-slate-50 text-slate-700 border-slate-200"
    }
  }

  return (
    <DropdownMenu>
      {/* TRIGGER */}
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-3 pl-3 pr-2 py-1.5 rounded-md hover:bg-slate-100 transition-colors outline-none group border border-transparent hover:border-slate-200 focus:bg-slate-50">
          <div className="text-right hidden sm:block">
            <div className="flex items-center justify-end gap-2">
               {/* Mini Badge */}
               <span className={cn(
                 "text-[9px] font-bold px-1.5 py-0.5 rounded-[3px] border uppercase tracking-wider transition-colors",
                 getBadgeStyle(user.role)
               )}>
                 {user.role}
               </span>
               <div className="text-xs font-bold text-slate-700 leading-tight group-hover:text-slate-900">
                 {user.name}
               </div>
            </div>
            <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wide group-hover:text-slate-500 mt-0.5">
              {user.jobTitle || user.role}
            </div>
          </div>
          
          <div className="relative">
            <Avatar className="h-8 w-8 border border-slate-200 shadow-sm">
              <AvatarImage src={user.avatar} className="object-cover" />
              <AvatarFallback className="bg-slate-100 text-slate-600 text-xs font-bold">
                {user.name?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            {/* Status Dot */}
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-[#a3e635] border-2 border-white shadow-sm"></span>
          </div>
          
          <ChevronsUpDown className="h-3 w-3 text-slate-400 opacity-50 group-hover:opacity-100" />
        </button>
      </DropdownMenuTrigger>

      {/* DROPDOWN CONTENT */}
      <DropdownMenuContent 
        className="w-80 bg-white border-slate-200 text-slate-900 shadow-xl rounded-lg p-1.5" 
        align="end"
        sideOffset={8}
      >
        {/* CURRENT USER HEADER */}
        <div className="flex items-center gap-3 p-3 pb-4">
          <Avatar className="h-12 w-12 border border-slate-100 shadow-sm">
            <AvatarImage src={user.avatar} className="object-cover" />
            <AvatarFallback className="bg-slate-100 text-slate-600 font-bold text-lg">
              {user.name?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col space-y-0.5">
            <span className="text-sm font-bold text-slate-900 tracking-tight">{user.name}</span>
            <span className="text-xs text-slate-500 font-medium">{user.email || "user@tier0.com"}</span>
          </div>
        </div>

        <DropdownMenuSeparator className="bg-slate-100" />

        <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-slate-400 font-bold px-3 mt-3 mb-2">
          Switch Persona
        </DropdownMenuLabel>

        {/* LIST OF PERSONAS */}
        <div className="space-y-1">
          {PERSONAS.map((persona) => {
            const isActive = user.role === persona.role
            const badgeStyle = getBadgeStyle(persona.role)

            return (
              <DropdownMenuItem
                key={persona.id}
                onClick={() => switchUser(persona)}
                className={cn(
                  "flex items-center gap-3 p-2.5 rounded-md cursor-pointer transition-all border border-transparent",
                  "focus:bg-slate-50",
                  isActive ? "bg-slate-50 border-slate-200 shadow-sm" : "hover:bg-slate-50"
                )}
              >
                {/* 1. Avatar Image (Replaced Icon Box) */}
                <Avatar className="h-9 w-9 border border-slate-100 shadow-sm">
                  <AvatarImage src={persona.avatar} className="object-cover" />
                  <AvatarFallback className="bg-slate-100 text-slate-600 text-xs font-bold">
                    {persona.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>

                {/* 2. Text Details */}
                <div className="flex-1 flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-sm font-semibold transition-colors truncate",
                      isActive ? "text-slate-900" : "text-slate-600 group-hover:text-slate-900"
                    )}>
                      {persona.name}
                    </span>
                    
                    {/* Badge */}
                    <span className={cn(
                      "text-[9px] font-bold px-1.5 py-0.5 rounded-[3px] border uppercase tracking-wider shrink-0",
                      badgeStyle
                    )}>
                      {persona.role}
                    </span>
                  </div>
                  
                  <span className="text-[11px] text-slate-500 leading-tight mt-0.5 font-medium truncate">
                    {persona.jobTitle}
                  </span>
                </div>

                {/* 3. Active Check */}
                {isActive && (
                  <Check className="h-4 w-4 text-[#a3e635] shrink-0" strokeWidth={3} />
                )}
              </DropdownMenuItem>
            )
          })}
        </div>

        <DropdownMenuSeparator className="bg-slate-100 my-2" />

        <DropdownMenuItem 
          className="text-red-600 focus:text-red-700 focus:bg-red-50 p-2.5 rounded-md cursor-pointer flex items-center gap-2 justify-center font-semibold text-xs"
          onClick={logout}
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </DropdownMenuItem>

      </DropdownMenuContent>
    </DropdownMenu>
  )
}