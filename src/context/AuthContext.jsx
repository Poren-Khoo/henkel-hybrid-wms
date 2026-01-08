import React, { createContext, useContext, useState, useEffect } from 'react'

// Enhanced Persona Data
export const DEMO_USERS = {
  ADMIN: {
    id: 'admin_01',
    name: "Selene Morgan",
    role: "ADMIN",
    jobTitle: "Warehouse Manager",
    avatar: "/Selene Morgan.jpg", // Make sure this file exists in /public
    email: "selene.m@henkel.com"
  },
  OPERATOR: {
    id: 'op_01',
    name: "Anthony Edwards",
    role: "OPERATOR",
    jobTitle: "Shift Supervisor",
    avatar: "/Anthony Edwards.jpg",
    email: "anthony.e@henkel.com"
  },
  APPROVER: {
    id: 'app_01',
    name: "Arjun Patel",
    role: "APPROVER",
    jobTitle: "Logistics Coordinator",
    avatar: "/Arjun Patel.webp",
    email: "arjun.p@henkel.com"
  },
  FINANCE: {
    id: 'fin_01',
    name: "Roxanne Miller",
    role: "FINANCE",
    jobTitle: "Financial Controller",
    avatar: "/Roxanne.jpg",
    email: "roxanne.m@henkel.com"
  }
}

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUserJson = localStorage.getItem('henkel_demo_user')
    if (savedUserJson) {
      try {
        return JSON.parse(savedUserJson)
      } catch (e) {
        console.error('Failed to parse saved user:', e)
      }
    }
    return DEMO_USERS.ADMIN
  })

  useEffect(() => {
    localStorage.setItem('henkel_demo_user', JSON.stringify(user))
  }, [user])

  const switchUser = (userObject) => {
    // Simulate a reload effect for a cleaner demo transition (optional)
    setUser(userObject)
  }

  const logout = () => {
    setUser(DEMO_USERS.ADMIN)
  }

  const value = {
    user,
    switchUser,
    logout
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}