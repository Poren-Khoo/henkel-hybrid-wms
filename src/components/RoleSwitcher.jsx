import { useAuth } from '../context/AuthContext'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Badge } from './ui/badge'

export default function RoleSwitcher() {
  const { user, switchRole } = useAuth()

  // Get role badge color
  const getRoleBadgeColor = (role) => {
    const roleUpper = (role || '').toUpperCase()
    switch (roleUpper) {
      case 'ADMIN':
        return 'bg-[#e60000] text-white' // Henkel Red
      case 'OPERATOR':
        return 'bg-blue-500 text-white'
      case 'APPROVER':
        return 'bg-purple-500 text-white'
      case 'FINANCE':
        return 'bg-green-500 text-white'
      default:
        return 'bg-slate-500 text-white'
    }
  }

  // Get role display label
  const getRoleLabel = (role) => {
    const roleUpper = (role || '').toUpperCase()
    switch (roleUpper) {
      case 'ADMIN':
        return 'Admin View'
      case 'OPERATOR':
        return 'Operator View'
      case 'APPROVER':
        return 'Approver View'
      case 'FINANCE':
        return 'Finance View'
      default:
        return role
    }
  }

  const handleRoleChange = (newRole) => {
    // Extract role from "Admin View" -> "ADMIN"
    const roleMap = {
      'Admin View': 'ADMIN',
      'Operator View': 'OPERATOR',
      'Approver View': 'APPROVER',
      'Finance View': 'FINANCE'
    }
    const roleKey = roleMap[newRole] || newRole
    switchRole(roleKey)
  }

  // Get current select value
  const currentSelectValue = getRoleLabel(user.role)

  return (
    <div className="flex items-center gap-3">
      <Badge className={`${getRoleBadgeColor(user.role)} uppercase px-3 py-1 rounded-full text-xs font-semibold`}>
        {user.role}
      </Badge>
      <Select
        value={currentSelectValue}
        onValueChange={handleRoleChange}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Select role" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Admin View">Admin View</SelectItem>
          <SelectItem value="Operator View">Operator View</SelectItem>
          <SelectItem value="Approver View">Approver View</SelectItem>
          <SelectItem value="Finance View">Finance View</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

