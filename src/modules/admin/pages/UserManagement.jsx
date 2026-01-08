import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table'
import { Badge } from '../../../components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '../../../components/ui/avatar'
import { Button } from '../../../components/ui/button'
import { Plus, Shield, ShieldCheck, ShieldAlert, Users } from 'lucide-react'
import { DEMO_USERS } from '../../../context/AuthContext' // Import your personas
import PageContainer from '../../../components/PageContainer'

export default function UserManagement() {
  const usersList = Object.values(DEMO_USERS)

  // Helper for Role Badge Colors (Matches your UserSwitcher)
  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN': return <Badge className="bg-[#e60000] text-white">Admin</Badge>
      case 'OPERATOR': return <Badge className="bg-blue-500 text-white">Operator</Badge>
      case 'APPROVER': return <Badge className="bg-purple-500 text-white">Approver</Badge>
      case 'FINANCE': return <Badge className="bg-emerald-500 text-white">Finance</Badge>
      default: return <Badge variant="outline">{role}</Badge>
    }
  }

  // Helper for Access Level Description (Mock logic)
  const getAccessDescription = (role) => {
    switch (role) {
      case 'ADMIN': return 'Full System Access, User Mgmt, Settings'
      case 'OPERATOR': return 'Receiving, Putaway, Picking, Tasks'
      case 'APPROVER': return 'DN Approval, Reports, Overrides'
      case 'FINANCE': return 'Costing, Billing, Reconciliation'
      default: return 'Read Only'
    }
  }

  return (
    <PageContainer title="User Management" subtitle="Manage system access and role-based permissions (RBAC)">
      <div className="space-y-6">
        
        {/* ROW 1: STATS CARDS */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usersList.length}</div>
              <p className="text-xs text-slate-500">Active accounts</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Admin Roles</CardTitle>
              <ShieldAlert className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {usersList.filter(u => u.role === 'ADMIN').length}
              </div>
              <p className="text-xs text-slate-500">Full access privileges</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Operational Roles</CardTitle>
              <ShieldCheck className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {usersList.filter(u => u.role === 'OPERATOR').length}
              </div>
              <p className="text-xs text-slate-500">Shop floor access</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Departments</CardTitle>
              <Shield className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">4</div>
              <p className="text-xs text-slate-500">Across 2 Warehouses</p>
            </CardContent>
          </Card>
        </div>

        {/* ROW 2: USER TABLE */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>System Users</CardTitle>
                <CardDescription>View and manage user permissions.</CardDescription>
            </div>
            <Button className="bg-slate-900 text-white">
                <Plus className="h-4 w-4 mr-2" /> Invite User
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>User Profile</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Access Scope</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersList.map((user) => (
                  <TableRow key={user.email}>
                    <TableCell className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border border-slate-200">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-slate-900">{user.name}</div>
                        <div className="text-xs text-slate-500">{user.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getRoleBadge(user.role)}
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm">
                      {user.jobTitle || 'Staff'}
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm italic">
                      {getAccessDescription(user.role)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
                        Active
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}