import React from 'react'
import { useAuth, DEMO_USERS } from '../context/AuthContext'
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar'
import { Badge } from './ui/badge'
import { Check, LogOut, Users, ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
} from './ui/dropdown-menu'

export default function UserSwitcher() {
  const { user, switchUser, logout } = useAuth()
  const allUsers = Object.values(DEMO_USERS)

  // Helper for Badge Colors
  const getRoleStyle = (role) => {
    switch (role) {
      case 'ADMIN': return 'bg-[#e60000] hover:bg-[#cc0000] text-white border-transparent'
      case 'OPERATOR': return 'bg-blue-500 hover:bg-blue-600 text-white border-transparent'
      case 'APPROVER': return 'bg-purple-500 hover:bg-purple-600 text-white border-transparent'
      case 'FINANCE': return 'bg-emerald-500 hover:bg-emerald-600 text-white border-transparent'
      default: return 'bg-slate-500 text-white'
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-full hover:bg-slate-100 transition-colors outline-none focus:ring-2 focus:ring-slate-200">
          <div className="text-right hidden md:block mr-1">
            <p className="text-sm font-semibold text-slate-700 leading-none">{user.name}</p>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide mt-0.5">{user.role}</p>
          </div>
          <Avatar className="h-9 w-9 border-2 border-white shadow-sm cursor-pointer">
            <AvatarImage src={user.avatar} alt={user.name} className="object-cover" />
            <AvatarFallback className="bg-slate-900 text-white font-medium">
              {user.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-80" align="end" forceMount>
        {/* CURRENT USER HEADER */}
        <div className="flex items-center gap-4 p-2">
          <div className="relative">
            <Avatar className="h-12 w-12 border border-slate-200">
              <AvatarImage src={user.avatar} alt={user.name} className="object-cover" />
              <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${user.role === 'ADMIN' ? 'bg-[#e60000]' : 'bg-green-500'}`} />
          </div>
          <div className="grid gap-0.5">
            <p className="font-semibold text-sm text-slate-900">{user.name}</p>
            <p className="text-xs text-slate-500">{user.email}</p>
            <Badge className={`mt-1 w-fit text-[10px] h-5 px-2 ${getRoleStyle(user.role)}`}>
              {user.jobTitle}
            </Badge>
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* SWITCH PERSONA SECTION */}
        <DropdownMenuLabel className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
          Switch Persona
        </DropdownMenuLabel>
        
        <DropdownMenuGroup>
          {allUsers.map((persona) => {
            const isActive = user.role === persona.role
            return (
              <DropdownMenuItem
                key={persona.id}
                onClick={() => switchUser(persona)}
                className={`flex items-center gap-3 p-3 cursor-pointer rounded-lg mb-1 focus:bg-slate-50 ${isActive ? 'bg-slate-50' : ''}`}
              >
                <Avatar className="h-9 w-9 border border-slate-100">
                  <AvatarImage src={persona.avatar} />
                  <AvatarFallback>{persona.name.charAt(0)}</AvatarFallback>
                </Avatar>
                
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-medium ${isActive ? 'text-slate-900' : 'text-slate-700'}`}>
                      {persona.name}
                    </p>
                    {isActive && <Check className="h-4 w-4 text-[#e60000]" />}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${getRoleStyle(persona.role).replace('text-white', 'bg-opacity-10 text-opacity-100')}`}>
                      {persona.role}
                    </span>
                    <span className="text-xs text-slate-400 truncate">{persona.jobTitle}</span>
                  </div>
                </div>
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* LOGOUT */}
        <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer p-3">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}