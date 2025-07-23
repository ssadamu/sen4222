"use client"

// Update your DashboardLayout.jsx to include the Bulk SMS navigation item
import { useState } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import { logout } from "../services/auth"
import {
  HomeIcon,
  UsersIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  Bars3Icon,
  XMarkIcon,
  PaperAirplaneIcon, // Add this import
  EnvelopeIcon, // Add this import for the Multi SMS icon
} from "@heroicons/react/24/outline"

function DashboardLayout({ children, user, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = async () => {
    try {
      await logout()
      if (onLogout) {
        onLogout()
      }
      navigate("/login")
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  // Modified navigation array including Bulk SMS and Multi SMS
  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: HomeIcon },
    { name: "Clients", href: "/clients", icon: UsersIcon },
    { name: "Accounts", href: "/accounts", icon: DocumentTextIcon },
    { name: "Pricing Groups", href: "/pricing-groups", icon: CurrencyDollarIcon },
    { name: "Registered Accounts", href: "/registered-accounts", icon: DocumentTextIcon },
    { name: "Bulk SMS", href: "/bulk-sms", icon: PaperAirplaneIcon },
    { name: "Multi SMS", href: "/multi-sms", icon: EnvelopeIcon }, // Add Multi SMS navigation item
  ]

  const isActive = (path) => location.pathname === path

  const displayName = user?.name || user?.email || "User"
  const initials = displayName.charAt(0).toUpperCase()

  // Rest of your component remains the same
  // ...

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-40 flex md:hidden ${sidebarOpen ? "" : "pointer-events-none"}`}>
        {/* Dark overlay */}
        <div
          className={`fixed inset-0 bg-gray-600 ${sidebarOpen ? "opacity-75" : "opacity-0 pointer-events-none"} transition-opacity ease-linear duration-300`}
          onClick={() => setSidebarOpen(false)}
        ></div>

        {/* Sidebar */}
        <div
          className={`relative flex-1 flex flex-col max-w-xs w-full bg-white transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} transition ease-in-out duration-300`}
        >
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sr-only">Close sidebar</span>
              <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
            </button>
          </div>

          <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
            <div className="flex-shrink-0 flex items-center px-4">
              <h1 className="text-xl font-bold text-indigo-600">Account Manager</h1>
            </div>
            <nav className="mt-5 px-2 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                    isActive(item.href)
                      ? "bg-indigo-50 text-indigo-600"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <item.icon
                    className={`mr-4 h-6 w-6 ${
                      isActive(item.href) ? "text-indigo-600" : "text-gray-400 group-hover:text-gray-500"
                    }`}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
            <button onClick={handleLogout} className="flex-shrink-0 group block w-full">
              <div className="flex items-center">
                <div>
                  <div className="h-9 w-9 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                    <span className="text-sm font-medium leading-none">{initials}</span>
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{displayName}</p>
                  <p className="text-xs text-gray-500">Sign Out</p>
                </div>
              </div>
            </button>
          </div>
        </div>

        <div className="flex-shrink-0 w-14" aria-hidden="true"></div>
      </div>

      {/* Static sidebar for desktop */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex-1 flex flex-col min-h-0 border-r border-gray-200 bg-white">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4">
              <h1 className="text-xl font-bold text-indigo-600">Account Manager</h1>
            </div>
            <nav className="mt-5 flex-1 px-2 bg-white space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    isActive(item.href)
                      ? "bg-indigo-50 text-indigo-600"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <item.icon
                    className={`mr-3 h-5 w-5 ${
                      isActive(item.href) ? "text-indigo-600" : "text-gray-400 group-hover:text-gray-500"
                    }`}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
            <button onClick={handleLogout} className="flex-shrink-0 w-full group block">
              <div className="flex items-center">
                <div>
                  <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                    <span className="text-sm font-medium leading-none">{initials}</span>
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{displayName}</p>
                  <p className="text-xs text-gray-500">Sign Out</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="md:pl-64 flex flex-col flex-1">
        <div className="sticky top-0 z-10 md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3 bg-white">
          <button
            type="button"
            className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
        <main className="flex-1">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">{children}</div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout
