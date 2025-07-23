"use client"

import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  UsersIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  BanknotesIcon,
  ClockIcon,
  XCircleIcon,
  LockOpenIcon,
  DocumentMinusIcon,
  ArrowPathIcon,
  TagIcon,
  MapPinIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CurrencyDollarIcon,
} from "@heroicons/react/24/outline"
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
import api from "../services/api"

export default function Dashboard() {
  const queryClient = useQueryClient()
  const [timeFrame, setTimeFrame] = useState("monthly")
  const [expandedStates, setExpandedStates] = useState(new Set())
  const [expandedGroups, setExpandedGroups] = useState(new Set())

  // Main dashboard stats
  const {
    data: stats,
    isLoading,
    isError,
    error,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ["dashboard-stats", timeFrame],
    queryFn: async () => {
      const response = await api.get(`/accounts/dashboard?timeFrame=${timeFrame}`)
      return response.data
    },
    refetchInterval: 300000, // 5 minutes
  })

  // Modified pricing group stats query with proper error handling
  const {
    data: pricingStats,
    isLoading: isPricingLoading,
    isError: isPricingError,
    refetch: refetchPricingStats,
  } = useQuery({
    queryKey: ["pricing-group-stats"],
    queryFn: async () => {
      try {
        // First try the detailed pricing stats endpoint
        const response = await api.get("/accounts/pricing-groups-stats")
        console.log("Pricing stats response:", response.data)
        return response.data
      } catch (error) {
        console.error("Error fetching pricing stats:", error)

        // Try the fallback endpoint
        try {
          const fallbackResponse = await api.get("/accounts/pricing-groups")
          console.log("Fallback pricing response:", fallbackResponse.data)
          return fallbackResponse.data
        } catch (fallbackError) {
          console.error("Error with fallback pricing endpoint:", fallbackError)

          // If everything fails, use the main dashboard data if available
          if (stats && stats.pricingGroups) {
            return { groups: stats.pricingGroups, success: true }
          }

          // Last resort - return empty data
          return { groups: [], success: false }
        }
      }
    },
    enabled: true, // Always run this query
    refetchInterval: 300000, // 5 minutes
    useErrorBoundary: false,
    retry: 2,
    retryDelay: 1000,
  })

  // New query for state-based account statistics
  const {
    data: stateStats,
    isLoading: isStateStatsLoading,
    isError: isStateStatsError,
    error: stateStatsError,
    refetch: refetchStateStats,
  } = useQuery({
    queryKey: ["state-account-stats"],
    queryFn: async () => {
      try {
        const response = await api.get("/accounts/state-stats")
        console.log("State stats response:", response.data)
        return response.data
      } catch (error) {
        console.error("Error fetching state stats:", error)
        return { states: [], success: false }
      }
    },
    refetchInterval: 300000, // 5 minutes
    useErrorBoundary: false,
    retry: 2,
    retryDelay: 1000,
  })

  // Function to refresh all data
  const refreshAllData = () => {
    refetchStats()
    refetchPricingStats()
    refetchStateStats()
  }

  const toggleStateExpansion = (stateName) => {
    const newExpandedStates = new Set(expandedStates)
    if (newExpandedStates.has(stateName)) {
      newExpandedStates.delete(stateName)
    } else {
      newExpandedStates.add(stateName)
    }
    setExpandedStates(newExpandedStates)
  }

  const toggleGroupExpansion = (groupName) => {
    const newExpandedGroups = new Set(expandedGroups)
    if (newExpandedGroups.has(groupName)) {
      newExpandedGroups.delete(groupName)
    } else {
      newExpandedGroups.add(groupName)
    }
    setExpandedGroups(newExpandedGroups)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="bg-red-50 p-4 rounded-md">
        <h3 className="text-lg font-medium text-red-800">Error loading dashboard data</h3>
        <p className="mt-2 text-sm text-red-700">{error?.message || "Failed to fetch data"}</p>
        <button onClick={refreshAllData} className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200">
          <ArrowPathIcon className="h-4 w-4 inline mr-2" />
          Retry
        </button>
      </div>
    )
  }

  const statusData = [
    { name: "Enabled", value: stats?.enabledAccounts || 0, color: "#10B981" },
    { name: "Disabled", value: stats?.disabledAccounts || 0, color: "#EF4444" },
    { name: "Unlocked", value: stats?.unlockedAccounts || 0, color: "#3B82F6" },
    { name: "Written Off", value: stats?.writtenOffAccounts || 0, color: "#9CA3AF" },
    { name: "Repossessed", value: stats?.repossessedAccounts || 0, color: "#F59E0B" },
  ]

  const cards = [
    {
      name: "Total Clients",
      value: stats?.totalClients || 0,
      icon: UsersIcon,
      color: "bg-indigo-500",
    },
    {
      name: "Total Accounts",
      value: stats?.totalAccounts || 0,
      icon: DocumentTextIcon,
      color: "bg-cyan-500",
    },
    {
      name: "Active Accounts",
      value: stats?.activeAccounts || 0,
      icon: CheckCircleIcon,
      color: "bg-green-500",
    },
    {
      name: "Total Revenue",
      value: `N${(stats?.totalRevenue || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
      icon: BanknotesIcon,
      color: "bg-blue-500",
    },
    {
      name: "Recent Activities",
      value: stats?.recentActivities || 0,
      icon: ClockIcon,
      color: "bg-purple-500",
    },
  ]

  const totalAccounts = statusData.reduce((acc, item) => acc + item.value, 0)

  // Pricing group colors with a better color palette
  const pricingGroupColors = [
    "#8B5CF6", // Purple
    "#EC4899", // Pink
    "#14B8A6", // Teal
    "#F97316", // Orange
    "#84CC16", // Lime
    "#3B82F6", // Blue
    "#EF4444", // Red
    "#A855F7", // Purple
    "#06B6D4", // Cyan
    "#F59E0B", // Amber
    "#10B981", // Emerald
    "#6366F1", // Indigo
    "#D946EF", // Fuchsia
    "#0EA5E9", // Sky
    "#22C55E", // Green
  ]

  // Format pricing group data for visualization
  const pricingGroupData = (pricingStats?.groups || [])
    .filter((group) => group.name) // Filter out null/undefined names
    .map((group, index) => ({
      name: group.name || "Unknown",
      value: group.count || 0,
      color: pricingGroupColors[index % pricingGroupColors.length],
      enabled: group.enabledCount || 0,
      disabled: group.disabledCount || 0,
      unlocked: group.unlockedCount || 0,
      writtenOff: group.writtenOffCount || 0,
      repossessed: group.repossessedCount || 0,
      revenue: group.totalRevenue || 0,
    }))
    .sort((a, b) => b.value - a.value) // Sort by count descending

  // State colors for the horizontal bar chart
  const stateColors = [
    "#8B5CF6", // Purple
    "#EC4899", // Pink
    "#14B8A6", // Teal
    "#F97316", // Orange
    "#84CC16", // Lime
    "#3B82F6", // Blue
    "#EF4444", // Red
    "#A855F7", // Purple
    "#06B6D4", // Cyan
    "#F59E0B", // Amber
    "#10B981", // Emerald
    "#6366F1", // Indigo
    "#D946EF", // Fuchsia
    "#0EA5E9", // Sky
    "#22C55E", // Green
    "#DC2626", // Red
    "#0891B2", // Cyan
    "#4F46E5", // Indigo
    "#7C3AED", // Violet
    "#C026D3", // Fuchsia
  ]

  // Format state data for the horizontal bar chart
  const stateAccountData = (stateStats?.states || [])
    .sort((a, b) => b.totalAccounts - a.totalAccounts) // Sort by total accounts descending
    .map((state, index) => ({
      name: state.name || "Unknown",
      value: state.totalAccounts || 0,
      color: stateColors[index % stateColors.length],
      enabled: state.enabledAccounts || 0,
      disabled: state.disabledAccounts || 0,
      unlocked: state.unlockedAccounts || 0,
      writtenOff: state.writtenOffAccounts || 0,
      repossessed: state.repossessedAccounts || 0,
    }))

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const percentage = ((payload[0].value / totalAccounts) * 100).toFixed(1)
      return (
        <div className="bg-white p-2 border border-gray-200 shadow-md rounded-md">
          <p className="font-medium">{`${payload[0].name}: ${payload[0].value}`}</p>
          <p className="text-sm text-gray-500">{`${percentage}%`}</p>
        </div>
      )
    }
    return null
  }

  const PricingTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const totalPricingAccounts = pricingGroupData.reduce((acc, item) => acc + item.value, 0)
      const percentage = totalPricingAccounts > 0 ? ((payload[0].value / totalPricingAccounts) * 100).toFixed(1) : "0.0"
      const group = payload[0].payload

      return (
        <div className="bg-white p-3 border border-gray-200 shadow-md rounded-md">
          <p className="font-medium text-gray-900">{`${group.name}: ${group.value} accounts`}</p>
          <p className="text-sm text-gray-500">{`${percentage}% of total`}</p>

          {group.enabled || group.disabled || group.unlocked || group.writtenOff || group.repossessed ? (
            <div className="mt-2 space-y-1 border-t pt-2">
              {group.enabled > 0 && <p className="text-xs text-green-600">{`Enabled: ${group.enabled}`}</p>}
              {group.disabled > 0 && <p className="text-xs text-red-600">{`Disabled: ${group.disabled}`}</p>}
              {group.unlocked > 0 && <p className="text-xs text-blue-600">{`Unlocked: ${group.unlocked}`}</p>}
              {group.writtenOff > 0 && <p className="text-xs text-gray-600">{`Written Off: ${group.writtenOff}`}</p>}
              {group.repossessed > 0 && <p className="text-xs text-amber-600">{`Repossessed: ${group.repossessed}`}</p>}
            </div>
          ) : null}

          {group.revenue > 0 && (
            <div className="mt-2 border-t pt-2">
              <p className="text-xs font-medium text-emerald-600">
                {`Revenue: N${group.revenue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
              </p>
            </div>
          )}
        </div>
      )
    }
    return null
  }

  const StateTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const state = payload[0].payload
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-md rounded-md">
          <p className="font-medium text-gray-900">{`${state.name}: ${state.value} accounts`}</p>
          <div className="mt-2 space-y-1">
            <p className="text-sm text-green-600">{`Enabled: ${state.enabled}`}</p>
            <p className="text-sm text-red-600">{`Disabled: ${state.disabled}`}</p>
            <p className="text-sm text-blue-600">{`Unlocked: ${state.unlocked}`}</p>
            <p className="text-sm text-gray-600">{`Written Off: ${state.writtenOff}`}</p>
            <p className="text-sm text-amber-600">{`Repossessed: ${state.repossessed}`}</p>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome to your account management dashboard</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={refreshAllData}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Refresh Data
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card) => (
          <div
            key={card.name}
            className="relative overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 shadow hover:shadow-lg transition-shadow duration-300 sm:px-6 sm:pt-6"
          >
            <dt>
              <div className={`absolute rounded-md ${card.color} p-3`}>
                <card.icon className="h-6 w-6 text-white" />
              </div>
              <p className="ml-16 truncate text-sm font-medium text-gray-500">{card.name}</p>
            </dt>
            <dd className="ml-16 flex items-baseline">
              <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
            </dd>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Pie Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Account Status Distribution</h3>
            <select
              className="rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              value={timeFrame}
              onChange={(e) => setTimeFrame(e.target.value)}
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="bottom" />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Breakdown Section */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Account Status Breakdown</h3>
          <div className="space-y-5">
            {statusData.map((status) => (
              <div key={status.name}>
                <div className="flex justify-between mb-1">
                  <span className="flex items-center space-x-2">
                    {status.name === "Enabled" && <CheckCircleIcon className="h-5 w-5 text-green-500" />}
                    {status.name === "Disabled" && <XCircleIcon className="h-5 w-5 text-red-500" />}
                    {status.name === "Unlocked" && <LockOpenIcon className="h-5 w-5 text-blue-500" />}
                    {status.name === "Written Off" && <DocumentMinusIcon className="h-5 w-5 text-gray-500" />}
                    {status.name === "Repossessed" && <ArrowPathIcon className="h-5 w-5 text-amber-500" />}
                    <span>{status.name}</span>
                  </span>
                  <span>
                    {status.value} ({totalAccounts > 0 ? ((status.value / totalAccounts) * 100).toFixed(1) : "0.0"}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 h-2 rounded">
                  <div
                    className="h-2 rounded"
                    style={{
                      width: `${totalAccounts > 0 ? (status.value / totalAccounts) * 100 : 0}%`,
                      backgroundColor: status.color,
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing Groups Section - Full Width with Chart & Breakdown stacked vertically */}
      <div className="bg-white p-6 rounded-lg shadow">
        {/* Pricing Group Distribution Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-medium text-gray-900">
              <span className="flex items-center">
                <TagIcon className="h-6 w-6 text-indigo-600 mr-2" />
                Pricing Group Distribution
              </span>
            </h3>
            <button
              onClick={() => refetchPricingStats()}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
            >
              <ArrowPathIcon className="h-4 w-4 mr-1" />
              Refresh
            </button>
          </div>

          {isPricingLoading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
              <p className="text-gray-500 mt-4">Loading pricing data...</p>
            </div>
          ) : isPricingError ? (
            <div className="flex flex-col items-center justify-center h-64">
              <p className="text-gray-500 mb-4">Unable to load pricing group data</p>
              <button
                className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200"
                onClick={() => refetchPricingStats()}
              >
                <ArrowPathIcon className="h-4 w-4 inline mr-2" />
                Retry
              </button>
            </div>
          ) : pricingGroupData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <p className="text-gray-500">No pricing group data available</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={pricingGroupData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => (value.length > 12 ? `${value.substring(0, 12)}...` : value)}
                />
                <YAxis />
                <Tooltip content={<PricingTooltip />} />
                <Legend />
                <Bar dataKey="value" name="Accounts">
                  {pricingGroupData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pricing Groups Breakdown Section - Now positioned below the chart */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium mb-4 text-gray-700">
            <span className="flex items-center">
              <TagIcon className="h-5 w-5 text-indigo-600 mr-2" />
              Pricing Groups Breakdown
            </span>
          </h3>

          {isPricingLoading ? (
            <div className="flex flex-col items-center justify-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
              <p className="text-gray-500 mt-4">Loading pricing data...</p>
            </div>
          ) : isPricingError ? (
            <div className="flex flex-col items-center justify-center h-40">
              <p className="text-gray-500 mb-4">Unable to load pricing group data</p>
              <button
                className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200"
                onClick={() => refetchPricingStats()}
              >
                <ArrowPathIcon className="h-4 w-4 inline mr-2" />
                Retry
              </button>
            </div>
          ) : pricingGroupData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40">
              <p className="text-gray-500">No pricing group data available</p>
              <p className="text-sm text-gray-400 mt-2">Try registering accounts with pricing groups first</p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto pr-2">
              <div className="space-y-3">
                {pricingGroupData.map((group) => {
                  const totalPricingAccounts = pricingGroupData.reduce((acc, item) => acc + item.value, 0)
                  const percentage =
                    totalPricingAccounts > 0 ? ((group.value / totalPricingAccounts) * 100).toFixed(1) : "0.0"

                  return (
                    <div key={group.name} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div
                        className="flex justify-between items-center p-3 bg-gray-50 cursor-pointer hover:bg-gray-100"
                        onClick={() => toggleGroupExpansion(group.name)}
                      >
                        <div className="flex items-center space-x-2">
                          <span className="w-4 h-4 rounded-full" style={{ backgroundColor: group.color }}></span>
                          <span className="font-medium">{group.name}</span>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className="font-semibold">
                            {group.value} accounts ({percentage}%)
                          </span>
                          {expandedGroups.has(group.name) ? (
                            <ChevronUpIcon className="h-5 w-5 text-gray-500" />
                          ) : (
                            <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                          )}
                        </div>
                      </div>

                      {expandedGroups.has(group.name) && (
                        <div className="p-4 bg-white">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                            <div className="bg-green-50 p-3 rounded-md">
                              <div className="flex items-center mb-1">
                                <CheckCircleIcon className="h-4 w-4 text-green-500 mr-1" />
                                <span className="text-sm font-medium text-green-700">Enabled</span>
                              </div>
                              <p className="text-xl font-semibold text-green-800">{group.enabled || 0}</p>
                            </div>

                            <div className="bg-red-50 p-3 rounded-md">
                              <div className="flex items-center mb-1">
                                <XCircleIcon className="h-4 w-4 text-red-500 mr-1" />
                                <span className="text-sm font-medium text-red-700">Disabled</span>
                              </div>
                              <p className="text-xl font-semibold text-red-800">{group.disabled || 0}</p>
                            </div>

                            <div className="bg-blue-50 p-3 rounded-md">
                              <div className="flex items-center mb-1">
                                <LockOpenIcon className="h-4 w-4 text-blue-500 mr-1" />
                                <span className="text-sm font-medium text-blue-700">Unlocked</span>
                              </div>
                              <p className="text-xl font-semibold text-blue-800">{group.unlocked || 0}</p>
                            </div>

                            <div className="bg-gray-50 p-3 rounded-md">
                              <div className="flex items-center mb-1">
                                <DocumentMinusIcon className="h-4 w-4 text-gray-500 mr-1" />
                                <span className="text-sm font-medium text-gray-700">Written Off</span>
                              </div>
                              <p className="text-xl font-semibold text-gray-800">{group.writtenOff || 0}</p>
                            </div>

                            <div className="bg-amber-50 p-3 rounded-md">
                              <div className="flex items-center mb-1">
                                <ArrowPathIcon className="h-4 w-4 text-amber-500 mr-1" />
                                <span className="text-sm font-medium text-amber-700">Repossessed</span>
                              </div>
                              <p className="text-xl font-semibold text-amber-800">{group.repossessed || 0}</p>
                            </div>
                          </div>

                          {group.revenue > 0 && (
                            <div className="mt-4 bg-emerald-50 p-3 rounded-md">
                              <div className="flex items-center mb-1">
                                <CurrencyDollarIcon className="h-4 w-4 text-emerald-500 mr-1" />
                                <span className="text-sm font-medium text-emerald-700">Total Revenue</span>
                              </div>
                              <p className="text-xl font-semibold text-emerald-800">
                                N{group.revenue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                              </p>
                            </div>
                          )}

                          <div className="mt-4">
                            <div className="w-full bg-gray-200 h-3 rounded overflow-hidden flex">
                              <div
                                className="h-3"
                                style={{
                                  width: `${group.value > 0 ? (group.enabled / group.value) * 100 : 0}%`,
                                  backgroundColor: "#10B981",
                                }}
                              ></div>
                              <div
                                className="h-3"
                                style={{
                                  width: `${group.value > 0 ? (group.disabled / group.value) * 100 : 0}%`,
                                  backgroundColor: "#EF4444",
                                }}
                              ></div>
                              <div
                                className="h-3"
                                style={{
                                  width: `${group.value > 0 ? (group.unlocked / group.value) * 100 : 0}%`,
                                  backgroundColor: "#3B82F6",
                                }}
                              ></div>
                              <div
                                className="h-3"
                                style={{
                                  width: `${group.value > 0 ? (group.writtenOff / group.value) * 100 : 0}%`,
                                  backgroundColor: "#9CA3AF",
                                }}
                              ></div>
                              <div
                                className="h-3"
                                style={{
                                  width: `${group.value > 0 ? (group.repossessed / group.value) * 100 : 0}%`,
                                  backgroundColor: "#F59E0B",
                                }}
                              ></div>
                            </div>

                            <div className="flex justify-between mt-2 text-xs text-gray-500">
                              <span>
                                {Math.round(group.value > 0 ? (group.enabled / group.value) * 100 : 0)}% Enabled
                              </span>
                              <span>
                                {Math.round(group.value > 0 ? (group.disabled / group.value) * 100 : 0)}% Disabled
                              </span>
                              <span>
                                {Math.round(group.value > 0 ? (group.unlocked / group.value) * 100 : 0)}% Unlocked
                              </span>
                              <span>
                                {Math.round(group.value > 0 ? (group.writtenOff / group.value) * 100 : 0)}% Written Off
                              </span>
                              <span>
                                {Math.round(group.value > 0 ? (group.repossessed / group.value) * 100 : 0)}% Repossessed
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* State-based Account Distribution Section */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="mb-6">
          <h3 className="text-xl font-medium text-gray-900">
            <span className="flex items-center">
              <MapPinIcon className="h-6 w-6 text-indigo-600 mr-2" />
              State-based Account Distribution
            </span>
          </h3>
          <p className="text-gray-500 mt-1">Distribution of accounts across different Nigerian states</p>
        </div>

        {isStateStatsLoading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
            <p className="text-gray-500 mt-4">Loading state data...</p>
          </div>
        ) : isStateStatsError ? (
          <div className="flex flex-col items-center justify-center h-64">
            <p className="text-red-500">{stateStatsError?.message || "Failed to load state data"}</p>
            <button
              className="mt-4 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200"
              onClick={() => refetchStateStats()}
            >
              <ArrowPathIcon className="h-4 w-4 inline mr-2" />
              Retry
            </button>
          </div>
        ) : stateAccountData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <p className="text-gray-500">No state data available</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Bar chart - now in a fixed height scrollable container */}
            <div className="h-96 overflow-y-auto border border-gray-100 rounded-md p-2 pr-4">
              <ResponsiveContainer width="100%" height={Math.max(500, stateAccountData.length * 35)}>
                <BarChart
                  data={stateAccountData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={100}
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => (value.length > 15 ? `${value.substring(0, 15)}...` : value)}
                  />
                  <Tooltip content={<StateTooltip />} />
                  <Legend />
                  <Bar dataKey="value" name="Total Accounts">
                    {stateAccountData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* State breakdown with collapsible details */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium mb-4 text-gray-700">
                <span className="flex items-center">
                  <MapPinIcon className="h-5 w-5 text-indigo-600 mr-2" />
                  States Breakdown
                </span>
              </h3>

              <div className="h-80 overflow-y-auto pr-2 border border-gray-100 rounded-md p-2">
                <div className="space-y-3">
                  {stateAccountData.map((state) => (
                    <div key={state.name} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div
                        className="flex justify-between items-center p-3 bg-gray-50 cursor-pointer hover:bg-gray-100"
                        onClick={() => toggleStateExpansion(state.name)}
                      >
                        <div className="flex items-center space-x-2">
                          <span className="w-4 h-4 rounded-full" style={{ backgroundColor: state.color }}></span>
                          <span className="font-medium">{state.name}</span>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className="font-semibold">{state.value} accounts</span>
                          {expandedStates.has(state.name) ? (
                            <ChevronUpIcon className="h-5 w-5 text-gray-500" />
                          ) : (
                            <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                          )}
                        </div>
                      </div>

                      {expandedStates.has(state.name) && (
                        <div className="p-4 bg-white">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                            <div className="bg-green-50 p-3 rounded-md">
                              <div className="flex items-center mb-1">
                                <CheckCircleIcon className="h-4 w-4 text-green-500 mr-1" />
                                <span className="text-sm font-medium text-green-700">Enabled</span>
                              </div>
                              <p className="text-xl font-semibold text-green-800">{state.enabled}</p>
                            </div>

                            <div className="bg-red-50 p-3 rounded-md">
                              <div className="flex items-center mb-1">
                                <XCircleIcon className="h-4 w-4 text-red-500 mr-1" />
                                <span className="text-sm font-medium text-red-700">Disabled</span>
                              </div>
                              <p className="text-xl font-semibold text-red-800">{state.disabled}</p>
                            </div>

                            <div className="bg-blue-50 p-3 rounded-md">
                              <div className="flex items-center mb-1">
                                <LockOpenIcon className="h-4 w-4 text-blue-500 mr-1" />
                                <span className="text-sm font-medium text-blue-700">Unlocked</span>
                              </div>
                              <p className="text-xl font-semibold text-blue-800">{state.unlocked}</p>
                            </div>

                            <div className="bg-gray-50 p-3 rounded-md">
                              <div className="flex items-center mb-1">
                                <DocumentMinusIcon className="h-4 w-4 text-gray-500 mr-1" />
                                <span className="text-sm font-medium text-gray-700">Written Off</span>
                              </div>
                              <p className="text-xl font-semibold text-gray-800">{state.writtenOff}</p>
                            </div>

                            <div className="bg-amber-50 p-3 rounded-md">
                              <div className="flex items-center mb-1">
                                <ArrowPathIcon className="h-4 w-4 text-amber-500 mr-1" />
                                <span className="text-sm font-medium text-amber-700">Repossessed</span>
                              </div>
                              <p className="text-xl font-semibold text-amber-800">{state.repossessed}</p>
                            </div>
                          </div>

                          <div className="mt-4">
                            <div className="w-full bg-gray-200 h-3 rounded overflow-hidden flex">
                              <div
                                className="h-3"
                                style={{
                                  width: `${state.value > 0 ? (state.enabled / state.value) * 100 : 0}%`,
                                  backgroundColor: "#10B981",
                                }}
                              ></div>
                              <div
                                className="h-3"
                                style={{
                                  width: `${state.value > 0 ? (state.disabled / state.value) * 100 : 0}%`,
                                  backgroundColor: "#EF4444",
                                }}
                              ></div>
                              <div
                                className="h-3"
                                style={{
                                  width: `${state.value > 0 ? (state.unlocked / state.value) * 100 : 0}%`,
                                  backgroundColor: "#3B82F6",
                                }}
                              ></div>
                              <div
                                className="h-3"
                                style={{
                                  width: `${state.value > 0 ? (state.writtenOff / state.value) * 100 : 0}%`,
                                  backgroundColor: "#9CA3AF",
                                }}
                              ></div>
                              <div
                                className="h-3"
                                style={{
                                  width: `${state.value > 0 ? (state.repossessed / state.value) * 100 : 0}%`,
                                  backgroundColor: "#F59E0B",
                                }}
                              ></div>
                            </div>

                            <div className="flex justify-between mt-2 text-xs text-gray-500">
                              <span>
                                {Math.round(state.value > 0 ? (state.enabled / state.value) * 100 : 0)}% Enabled
                              </span>
                              <span>
                                {Math.round(state.value > 0 ? (state.disabled / state.value) * 100 : 0)}% Disabled
                              </span>
                              <span>
                                {Math.round(state.value > 0 ? (state.unlocked / state.value) * 100 : 0)}% Unlocked
                              </span>
                              <span>
                                {Math.round(state.value > 0 ? (state.writtenOff / state.value) * 100 : 0)}% Written Off
                              </span>
                              <span>
                                {Math.round(state.value > 0 ? (state.repossessed / state.value) * 100 : 0)}% Repossessed
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
