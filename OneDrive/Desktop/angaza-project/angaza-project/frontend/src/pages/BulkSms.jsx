"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  PaperAirplaneIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  PhoneIcon,
  ClockIcon,
  MapPinIcon,
  TagIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline"
import { Switch } from "@headlessui/react"
import api from "../services/api"

export default function BulkSms() {
  const queryClient = useQueryClient()
  const [message, setMessage] = useState("")
  const [selectedAccounts, setSelectedAccounts] = useState([])
  const [selectAll, setSelectAll] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [apiError, setApiError] = useState(null)
  const [autoSmsEnabled, setAutoSmsEnabled] = useState(false)

  // Filter states
  const [filterType, setFilterType] = useState("days") // "days", "states", "pricingGroups"
  const [daysFilter, setDaysFilter] = useState("daysLeft2") // Default filter: accounts with 2 days left
  const [selectedState, setSelectedState] = useState("All States")
  const [selectedPricingGroup, setSelectedPricingGroup] = useState("All Groups")
  const [selectedDaysForState, setSelectedDaysForState] = useState("daysLeft2")
  const [selectedDaysForPricingGroup, setSelectedDaysForPricingGroup] = useState("daysLeft2")

  // Fetch states with error handling and fallback - OPTIMIZED
  const { data: statesData, isLoading: isLoadingStates } = useQuery({
    queryKey: ["states"],
    queryFn: async () => {
      try {
        const response = await api.get("/accounts/states")
        console.log("States response:", response.data)
        return response.data
      } catch (error) {
        console.error("Error fetching states:", error)
        return { states: [], success: false }
      }
    },
    retry: 1,
    retryDelay: 300,
    staleTime: 300000, // Consider states fresh for 5 minutes
  })

  // Fetch pricing groups with error handling and fallback - OPTIMIZED
  const { data: pricingGroupsData, isLoading: isLoadingPricingGroups } = useQuery({
    queryKey: ["pricingGroups"],
    queryFn: async () => {
      try {
        const response = await api.get("/accounts/pricing-groups")
        console.log("Pricing groups response:", response.data)
        return response.data
      } catch (error) {
        console.error("Error fetching pricing groups:", error)
        return { groups: [] }
      }
    },
    retry: 1,
    retryDelay: 300,
    staleTime: 300000, // Consider pricing groups fresh for 5 minutes
  })

  // Fetch accounts based on selected filter with optimized error handling
  const {
    data,
    isLoading: isLoadingAccounts,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: [
      "accountsFiltered",
      filterType,
      daysFilter,
      selectedState,
      selectedPricingGroup,
      selectedDaysForState,
      selectedDaysForPricingGroup,
    ],
    queryFn: async () => {
      setApiError(null)
      let endpoint,
        params = {}

      // Determine which API endpoint and parameters to use based on the filter type
      if (filterType === "days") {
        if (daysFilter.startsWith("daysLeft")) {
          endpoint = "/accounts/near-disabled"
          params.daysLeft = daysFilter.replace("daysLeft", "")
        } else {
          endpoint = "/accounts/disabled"
          params.daysDisabled = daysFilter.replace("daysDisabled", "")
        }
      } else if (filterType === "states") {
        if (selectedState !== "All States") {
          params.state = selectedState
        }

        if (selectedDaysForState.startsWith("daysLeft")) {
          endpoint = "/accounts/near-disabled"
          params.daysLeft = selectedDaysForState.replace("daysLeft", "")
        } else {
          endpoint = "/accounts/disabled"
          params.daysDisabled = selectedDaysForState.replace("daysDisabled", "")
        }
      } else if (filterType === "pricingGroups") {
        if (selectedPricingGroup !== "All Groups") {
          params.pricingGroup = selectedPricingGroup
        }

        if (selectedDaysForPricingGroup.startsWith("daysLeft")) {
          endpoint = "/accounts/near-disabled"
          params.daysLeft = selectedDaysForPricingGroup.replace("daysLeft", "")
        } else {
          endpoint = "/accounts/disabled"
          params.daysDisabled = selectedDaysForPricingGroup.replace("daysDisabled", "")
        }
      }

      console.log(`Fetching from ${endpoint} with params:`, params)
      const response = await api.get(endpoint, { params })
      console.log("API response:", response.data)
      return response.data
    },
    retry: 2,
    retryDelay: 500,
    staleTime: 10000, // Consider data fresh for 10 seconds
    onError: (error) => {
      console.error("API Error:", error)
      setApiError(error.response?.data?.message || error.message || "Failed to fetch accounts")
    },
  })

  // Fetch auto SMS status with proper error handling and retry - OPTIMIZED
  const { data: autoSmsStatus, isLoading: isLoadingAutoSms } = useQuery({
    queryKey: ["autoSmsStatus"],
    queryFn: async () => {
      try {
        const response = await api.get("/accounts/auto-sms")
        console.log("Auto SMS status response:", response.data)
        return {
          enabled: response.data.enabled || false,
          settings: response.data.settings || null,
          messageHistory: response.data.messageHistory || [],
          lastRun: response.data.lastRun
        }
      } catch (error) {
        console.error("Error fetching auto SMS status:", error)
        return { enabled: false, settings: null, messageHistory: [], lastRun: null }
      }
    },
    retry: 2,
    retryDelay: 500,
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchInterval: 60000, // Refetch every 1 minute instead of 5 seconds
  })

  // Update auto SMS status with optimistic updates - SIMPLIFIED
  const { mutate: updateAutoSmsStatus, isLoading: isUpdatingAutoSms } = useMutation({
    mutationFn: async ({ enabled, settings }) => {
      if (settings) {
        // Use detailed settings endpoint
        const response = await api.put("/accounts/auto-sms-settings", { enabled, settings })
        return response.data
      } else {
        // Use simple enable/disable endpoint
        const response = await api.post("/accounts/auto-sms", { enabled })
        return response.data
      }
    },
    onSuccess: () => {
      // Invalidate and refetch on success
      queryClient.invalidateQueries(["autoSmsStatus"])
    },
    onError: (error) => {
      console.error("Failed to update Auto SMS:", error)
      alert("Failed to update Auto SMS: " + (error.response?.data?.message || error.message))
    },
  })

  // Handle auto SMS toggle with proper state management - SIMPLIFIED
  const handleAutoSmsToggle = (enabled, settings = null) => {
    if (settings) {
      // For detailed settings updates - ensure main system is enabled if any sub-feature is enabled
      const shouldEnableMain = enabled || Object.values(settings).some(s => s?.enabled)
      updateAutoSmsStatus({ enabled: shouldEnableMain, settings })
    } else {
      // For simple enable/disable
      updateAutoSmsStatus({ enabled })
    }
  }

  // Update local state when autoSmsStatus changes
  useEffect(() => {
    if (autoSmsStatus) {
      setAutoSmsEnabled(autoSmsStatus.enabled)
    }
  }, [autoSmsStatus])

  // Reset selected accounts when filter changes
  useEffect(() => {
    setSelectedAccounts([])
    setSelectAll(false)
    setApiError(null)
  }, [filterType, daysFilter, selectedState, selectedPricingGroup, selectedDaysForState, selectedDaysForPricingGroup])

  // Handle select all checkbox
  useEffect(() => {
    const accounts = data?.accounts
    if (accounts && accounts.length > 0) {
      if (selectAll) {
        setSelectedAccounts(accounts.map((account) => account.phoneNumber))
      } else {
        setSelectedAccounts([])
      }
    }
  }, [selectAll, data])

  // Handle individual checkbox selection
  const handleSelectAccount = (phoneNumber) => {
    if (selectedAccounts.includes(phoneNumber)) {
      setSelectedAccounts(selectedAccounts.filter((phone) => phone !== phoneNumber))
    } else {
      setSelectedAccounts([...selectedAccounts, phoneNumber])
    }
  }

  // Handle sending bulk SMS
  const handleSendBulkSms = () => {
    if (selectedAccounts.length === 0) {
      setResult({
        success: false,
        message: "Please select at least one account",
      })
      return
    }

    if (!message.trim()) {
      setResult({
        success: false,
        message: "Please enter a message",
      })
      return
    }

    setIsLoading(true)
    sendSmsMutation.mutate({
      phoneNumbers: selectedAccounts,
      message: message,
    })
  }

  // Get filter title based on selected filter
  const getFilterTitle = () => {
    if (filterType === "days") {
      switch (daysFilter) {
        case "daysLeft2":
          return "Accounts with 2 Days Left to be Disabled"
        case "daysDisabled2":
          return "Accounts Disabled for 2 Days"
        case "daysDisabled5":
          return "Accounts Disabled for 5 Days"
        case "daysDisabled10":
          return "Accounts Disabled for 10 Days"
        default:
          return "Filtered Accounts"
      }
    } else if (filterType === "states") {
      let daysText = ""
      switch (selectedDaysForState) {
        case "daysLeft2":
          daysText = "2 Days Left to be Disabled"
          break
        case "daysDisabled2":
          daysText = "Disabled for 2 Days"
          break
        case "daysDisabled5":
          daysText = "Disabled for 5 Days"
          break
        case "daysDisabled10":
          daysText = "Disabled for 10 Days"
          break
      }
      return `${selectedState}: ${daysText}`
    } else if (filterType === "pricingGroups") {
      let daysText = ""
      switch (selectedDaysForPricingGroup) {
        case "daysLeft2":
          daysText = "2 Days Left to be Disabled"
          break
        case "daysDisabled2":
          daysText = "Disabled for 2 Days"
          break
        case "daysDisabled5":
          daysText = "Disabled for 5 Days"
          break
        case "daysDisabled10":
          daysText = "Disabled for 10 Days"
          break
      }
      return `${selectedPricingGroup}: ${daysText}`
    }
    return "Filtered Accounts"
  }

  // Get accounts based on filter type
  const getAccounts = () => {
    if (!data || !data.accounts) return []
    return data.accounts
  }

  // Get count of accounts
  const getAccountCount = () => {
    if (data) return data.count || 0
    return 0
  }

  // Get the appropriate field name based on filter type
  const getDaysFieldName = () => {
    if (filterType === "days") {
      return daysFilter.startsWith("daysLeft") ? "daysLeft" : "daysDisabled"
    } else if (filterType === "states") {
      return selectedDaysForState.startsWith("daysLeft") ? "daysLeft" : "daysDisabled"
    } else if (filterType === "pricingGroups") {
      return selectedDaysForPricingGroup.startsWith("daysLeft") ? "daysLeft" : "daysDisabled"
    }
    return "daysLeft"
  }

  // Mutation for sending bulk SMS
  const sendSmsMutation = useMutation({
    mutationFn: (data) => api.post("/accounts/bulk-sms", data),
    onSuccess: (response) => {
      setResult({
        success: true,
        message: `Successfully sent ${response.data.successCount} messages`,
        details: response.data,
      })
      setIsLoading(false)
    },
    onError: (error) => {
      setResult({
        success: false,
        message: "Failed to send messages",
        error: error.response?.data?.message || error.message,
      })
      setIsLoading(false)
    },
  })

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Bulk SMS</h1>
        <p className="mt-2 text-sm text-gray-700">Send SMS to accounts based on selected filter criteria</p>
      </div>

      {/* Auto SMS Toggle with Loading State */}
      <div className="mb-8">
        <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow mb-4">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Auto SMS for Near-Disabled Accounts</h2>
            <p className="text-sm text-gray-500">
              Automatically send SMS to accounts that are 2 days away from being disabled
            </p>
            {autoSmsStatus?.lastRun && (
              <p className="text-sm text-gray-500 mt-1">
                Last run: {new Date(autoSmsStatus.lastRun).toLocaleString()}
              </p>
            )}
            {autoSmsStatus?.enabled && autoSmsStatus?.settings?.nearDisabled?.enabled && (
              <p className="text-sm text-green-600 mt-1">
                Auto SMS is currently running and will send messages to accounts with 2 days left
              </p>
            )}
          </div>
          <div className="flex items-center">
            {isLoadingAutoSms || isUpdatingAutoSms ? (
              <div className="animate-pulse bg-gray-200 h-6 w-11 rounded-full" />
            ) : (
              <Switch
                checked={autoSmsStatus?.enabled && autoSmsStatus?.settings?.nearDisabled?.enabled || false}
                onChange={(enabled) => {
                  // Toggle the near-disabled functionality specifically
                  if (enabled) {
                    // Enable both main system and near-disabled feature
                    handleAutoSmsToggle(true, {
                      nearDisabled: { ...autoSmsStatus?.settings?.nearDisabled, enabled: true }
                    })
                  } else {
                    // Disable near-disabled feature
                    handleAutoSmsToggle(autoSmsStatus?.enabled, {
                      nearDisabled: { ...autoSmsStatus?.settings?.nearDisabled, enabled: false }
                    })
                  }
                }}
                className={`${
                  autoSmsStatus?.enabled && autoSmsStatus?.settings?.nearDisabled?.enabled ? "bg-blue-600" : "bg-gray-200"
                } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                disabled={isUpdatingAutoSms}
              >
                <span
                  className={`${
                    autoSmsStatus?.enabled && autoSmsStatus?.settings?.nearDisabled?.enabled ? "translate-x-6" : "translate-x-1"
                  } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                />
              </Switch>
            )}
          </div>
        </div>

        {/* Auto SMS for 5-Days Disabled Accounts */}
        <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow mb-4">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Auto SMS for 5-Days Disabled Accounts</h2>
            <p className="text-sm text-gray-500">
              Automatically send SMS to accounts that have been disabled for exactly 5 days
            </p>
            {autoSmsStatus?.lastRun && (
              <p className="text-sm text-gray-500 mt-1">
                Last run: {new Date(autoSmsStatus.lastRun).toLocaleString()}
              </p>
            )}
            {autoSmsStatus?.enabled && autoSmsStatus?.settings?.disabledDays?.enabled && (
              <p className="text-sm text-green-600 mt-1">
                Auto SMS is currently running and will send messages to accounts disabled for 5 days
              </p>
            )}
          </div>
          <div className="flex items-center">
            {isLoadingAutoSms || isUpdatingAutoSms ? (
              <div className="animate-pulse bg-gray-200 h-6 w-11 rounded-full" />
            ) : (
              <Switch
                checked={autoSmsStatus?.enabled && autoSmsStatus?.settings?.disabledDays?.enabled || false}
                onChange={(enabled) => {
                  // Toggle the disabled-days functionality specifically
                  if (enabled) {
                    // Enable both main system and disabled-days feature
                    handleAutoSmsToggle(true, {
                      disabledDays: { ...autoSmsStatus?.settings?.disabledDays, enabled: true }
                    })
                  } else {
                    // Disable disabled-days feature
                    handleAutoSmsToggle(autoSmsStatus?.enabled, {
                      disabledDays: { ...autoSmsStatus?.settings?.disabledDays, enabled: false }
                    })
                  }
                }}
                className={`${
                  autoSmsStatus?.enabled && autoSmsStatus?.settings?.disabledDays?.enabled ? "bg-orange-600" : "bg-gray-200"
                } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2`}
                disabled={isUpdatingAutoSms}
              >
                <span
                  className={`${
                    autoSmsStatus?.enabled && autoSmsStatus?.settings?.disabledDays?.enabled ? "translate-x-6" : "translate-x-1"
                  } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                />
              </Switch>
            )}
          </div>
        </div>

        {/* Auto SMS for 10-Days Disabled Accounts */}
        <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow mb-4">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Auto SMS for 10-Days Disabled Accounts</h2>
            <p className="text-sm text-gray-500">
              Automatically send SMS to accounts that have been disabled for exactly 10 days
            </p>
            {autoSmsStatus?.lastRun && (
              <p className="text-sm text-gray-500 mt-1">
                Last run: {new Date(autoSmsStatus.lastRun).toLocaleString()}
              </p>
            )}
            {autoSmsStatus?.enabled && autoSmsStatus?.settings?.disabledDays10?.enabled && (
              <p className="text-sm text-green-600 mt-1">
                Auto SMS is currently running and will send messages to accounts disabled for 10 days
              </p>
            )}
          </div>
          <div className="flex items-center">
            {isLoadingAutoSms || isUpdatingAutoSms ? (
              <div className="animate-pulse bg-gray-200 h-6 w-11 rounded-full" />
            ) : (
              <Switch
                checked={autoSmsStatus?.enabled && autoSmsStatus?.settings?.disabledDays10?.enabled || false}
                onChange={(enabled) => {
                  // Toggle the disabled-days-10 functionality specifically
                  if (enabled) {
                    // Enable both main system and disabled-days-10 feature
                    handleAutoSmsToggle(true, {
                      disabledDays10: { ...autoSmsStatus?.settings?.disabledDays10, enabled: true }
                    })
                  } else {
                    // Disable disabled-days-10 feature
                    handleAutoSmsToggle(autoSmsStatus?.enabled, {
                      disabledDays10: { ...autoSmsStatus?.settings?.disabledDays10, enabled: false }
                    })
                  }
                }}
                className={`${
                  autoSmsStatus?.enabled && autoSmsStatus?.settings?.disabledDays10?.enabled ? "bg-red-600" : "bg-gray-200"
                } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2`}
                disabled={isUpdatingAutoSms}
              >
                <span
                  className={`${
                    autoSmsStatus?.enabled && autoSmsStatus?.settings?.disabledDays10?.enabled ? "translate-x-6" : "translate-x-1"
                  } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                />
              </Switch>
            )}
          </div>
        </div>

      </div>

      {/* Main Filter Type Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Filter by:</label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            onClick={() => setFilterType("days")}
            className={`flex items-center justify-center px-4 py-2 border rounded-md ${
              filterType === "days"
                ? "bg-blue-50 border-blue-500 text-blue-700"
                : "border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            <ClockIcon className="h-5 w-5 mr-2 text-blue-500" />
            Days
          </button>
          <button
            onClick={() => setFilterType("states")}
            className={`flex items-center justify-center px-4 py-2 border rounded-md ${
              filterType === "states"
                ? "bg-blue-50 border-blue-500 text-blue-700"
                : "border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            <MapPinIcon className="h-5 w-5 mr-2 text-green-500" />
            States
          </button>
          <button
            onClick={() => setFilterType("pricingGroups")}
            className={`flex items-center justify-center px-4 py-2 border rounded-md ${
              filterType === "pricingGroups"
                ? "bg-blue-50 border-blue-500 text-blue-700"
                : "border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            <TagIcon className="h-5 w-5 mr-2 text-purple-500" />
            Pricing Groups
          </button>
        </div>
      </div>

      {/* Secondary Filter Options */}
      <div className="mb-6">
        {filterType === "days" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select days filter:</label>
            <select
              value={daysFilter}
              onChange={(e) => setDaysFilter(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="daysLeft2">2 Days Left to be Disabled</option>
              <option value="daysDisabled2">Disabled for 2 Days</option>
              <option value="daysDisabled5">Disabled for 5 Days</option>
              <option value="daysDisabled10">Disabled for 10 Days</option>
            </select>
          </div>
        )}

        {filterType === "states" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select state:</label>
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="All States">All States</option>
                {isLoadingStates ? (
                  <option disabled>Loading states...</option>
                ) : statesData?.states ? (
                  statesData.states.map((state) => (
                    <option key={state.name} value={state.name}>
                      {state.name}
                    </option>
                  ))
                ) : (
                  <option disabled>No states available</option>
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select days filter:</label>
              <select
                value={selectedDaysForState}
                onChange={(e) => setSelectedDaysForState(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="daysLeft2">2 Days Left to be Disabled</option>
                <option value="daysDisabled2">Disabled for 2 Days</option>
                <option value="daysDisabled5">Disabled for 5 Days</option>
                <option value="daysDisabled10">Disabled for 10 Days</option>
              </select>
            </div>
          </div>
        )}

        {filterType === "pricingGroups" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select pricing group:</label>
              <select
                value={selectedPricingGroup}
                onChange={(e) => setSelectedPricingGroup(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="All Groups">All Groups</option>
                {isLoadingPricingGroups ? (
                  <option disabled>Loading pricing groups...</option>
                ) : pricingGroupsData?.groups ? (
                  pricingGroupsData.groups.map((group) => (
                    <option key={group.name} value={group.name}>
                      {group.name}
                    </option>
                  ))
                ) : (
                  <option disabled>No pricing groups available</option>
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select days filter:</label>
              <select
                value={selectedDaysForPricingGroup}
                onChange={(e) => setSelectedDaysForPricingGroup(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="daysLeft2">2 Days Left to be Disabled</option>
                <option value="daysDisabled2">Disabled for 2 Days</option>
                <option value="daysDisabled5">Disabled for 5 Days</option>
                <option value="daysDisabled10">Disabled for 10 Days</option>
              </select>
            </div>
          </div>
        )}

        <div className="mt-3">
          <button
            onClick={() => {
              queryClient.invalidateQueries(["accountsFiltered"])
              refetch()
            }}
            className="inline-flex items-center rounded-md bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
          >
            <ArrowPathIcon className="h-4 w-4 mr-1" />
            Refresh Data
          </button>
        </div>
      </div>

      {/* Debug Information - Remove in production */}
      <div className="mb-4 p-3 bg-gray-50 rounded-md border border-gray-200 text-xs">
        <h3 className="font-semibold mb-1">Debug Information:</h3>
        <div>States Data: {statesData ? `Found ${statesData.states?.length || 0} states` : "No data"}</div>
        <div>States Loading: {isLoadingStates ? "Yes" : "No"}</div>
        <div>Selected State: {selectedState}</div>
        <div>Selected Days for State: {selectedDaysForState}</div>
        <div>Filter Type: {filterType}</div>
        <div>API Error: {apiError || "None"}</div>
        <div className="mt-2 flex space-x-2">
          <button
            onClick={() => queryClient.invalidateQueries(["states"])}
            className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
          >
            Refresh States
          </button>
          <button
            onClick={() => queryClient.invalidateQueries(["pricingGroups"])}
            className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs"
          >
            Refresh Groups
          </button>
        </div>
      </div>

      {/* API Error message */}
      {apiError && (
        <div className="mb-6 p-4 rounded-md bg-red-50 text-red-800">
          <div className="flex">
            <div className="flex-shrink-0">
              <XCircleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">Error fetching accounts: {apiError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Message composer */}
      <div className="mb-6">
        <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
          Message:
        </label>
        <textarea
          id="message"
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message here..."
          className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6"
        />
        <p className="mt-1 text-sm text-gray-500">
          Characters: {message.length} | Selected accounts: {selectedAccounts.length}
        </p>
      </div>

      {/* Result message */}
      {result && (
        <div
          className={`mb-6 p-4 rounded-md ${result.success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}
        >
          <div className="flex">
            <div className="flex-shrink-0">
              {result.success ? (
                <CheckCircleIcon className="h-5 w-5 text-green-400" aria-hidden="true" />
              ) : (
                <XCircleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
              )}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">{result.message}</p>
              {result.details && (
                <div className="mt-2 text-sm">
                  <p>Successful: {result.details.successCount}</p>
                  <p>Failed: {result.details.failedCount}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Send button */}
      <div className="mb-6">
        <button
          onClick={handleSendBulkSms}
          disabled={isLoading || selectedAccounts.length === 0 || !message.trim()}
          className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <PaperAirplaneIcon className="mr-2 h-4 w-4" />
              Send Bulk SMS ({selectedAccounts.length})
            </>
          )}
        </button>
      </div>

      {/* Accounts table */}
      <div className="mt-8 flow-root">
        <div className="mb-4">
          <h2 className="text-lg font-medium text-gray-900">{getFilterTitle()}</h2>
          <div className="flex items-center mt-1">
            <p className="text-sm text-gray-500">{getAccountCount()} accounts found</p>
            <div className="ml-2 flex items-center text-sm text-blue-600">
              <FunnelIcon className="h-4 w-4 mr-1" />
              <span>Using exact day matching for disabled accounts</span>
            </div>
          </div>
        </div>
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="relative px-7 sm:w-12 sm:px-6">
                      <input
                        type="checkbox"
                        className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                        checked={selectAll}
                        onChange={() => setSelectAll(!selectAll)}
                      />
                    </th>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-3">
                      Account Number
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Client Name
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Phone Number
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      {getDaysFieldName() === "daysLeft" ? "Days Left" : "Days Disabled"}
                    </th>
                    {(filterType === "states" || filterType === "pricingGroups") && (
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        {filterType === "states" ? "State" : "Pricing Group"}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {isLoadingAccounts ? (
                    <tr>
                      <td colSpan={filterType === "days" ? 5 : 6} className="text-center py-4">
                        <ArrowPathIcon className="inline h-5 w-5 animate-spin text-gray-400" />
                        <span className="ml-2">Loading accounts...</span>
                      </td>
                    </tr>
                  ) : !getAccounts() || getAccounts().length === 0 ? (
                    <tr>
                      <td colSpan={filterType === "days" ? 5 : 6} className="text-center py-4 text-gray-500">
                        No accounts found matching the selected filter
                      </td>
                    </tr>
                  ) : (
                    getAccounts().map((account) => (
                      <tr
                        key={account.qid || account.accountNumber}
                        className={selectedAccounts.includes(account.phoneNumber) ? "bg-blue-50" : ""}
                      >
                        <td className="relative px-7 sm:w-12 sm:px-6">
                          <input
                            type="checkbox"
                            className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                            checked={selectedAccounts.includes(account.phoneNumber)}
                            onChange={() => handleSelectAccount(account.phoneNumber)}
                          />
                        </td>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-3">
                          {account.accountNumber}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{account.clientName}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <span className="inline-flex items-center">
                            <PhoneIcon className="h-4 w-4 mr-1 text-gray-400" />
                            {account.phoneNumber}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <span
                            className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                              getDaysFieldName() === "daysLeft"
                                ? "bg-red-100 text-red-800"
                                : getDaysFieldName() === "daysDisabled" && account.daysDisabled === 2
                                  ? "bg-yellow-100 text-yellow-800"
                                  : getDaysFieldName() === "daysDisabled" && account.daysDisabled === 5
                                    ? "bg-orange-100 text-orange-800"
                                    : "bg-red-100 text-red-800"
                            }`}
                          >
                            {getDaysFieldName() === "daysLeft"
                              ? `${account.daysLeft} days left`                              : `${account.daysDisabled} days disabled`}
                          </span>
                        </td>
                        {filterType === "states" && (
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            <span className="inline-flex items-center">
                              <MapPinIcon className="h-4 w-4 mr-1 text-gray-400" />
                              {account.state}
                            </span>
                          </td>
                        )}
                        {filterType === "pricingGroups" && (
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            <span className="inline-flex items-center">
                              <TagIcon className="h-4 w-4 mr-1 text-gray-400" />
                              {account.groupName}
                            </span>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

