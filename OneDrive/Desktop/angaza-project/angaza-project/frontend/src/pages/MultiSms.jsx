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
  CalendarIcon,
} from "@heroicons/react/24/outline"
import api from "../services/api"

export default function MultiSms() {
  const queryClient = useQueryClient()
  const [message, setMessage] = useState("")
  const [selectedAccounts, setSelectedAccounts] = useState([])
  const [selectAll, setSelectAll] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [apiError, setApiError] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")

  // Define disabled day ranges for filtering (in correct order)
  const disabledRanges = [
    { label: "1 to 29 days", value: "1-29" },
    { label: "30 to 59 days", value: "30-59" },
    { label: "60 to 89 days", value: "60-89" },
    { label: "90 to 119 days", value: "90-119" },
    { label: "120 to 149 days", value: "120-149" },
    { label: "150 to 179 days", value: "150-179" },
    { label: "180 to 210 days", value: "180-210" },
    { label: "211 to 239 days", value: "211-239" },
    { label: "240 to 269 days", value: "240-269" },
    { label: "270 to 299 days", value: "270-299" },
    { label: "300+ days", value: "300+" },
  ]

  // Filter states
  const [filterType, setFilterType] = useState("days") // "days", "states", "pricingGroups", "dateRange"
  const [selectedRanges, setSelectedRanges] = useState([])
  const [selectedState, setSelectedState] = useState("All States")
  const [selectedStateRange, setSelectedStateRange] = useState("")
  const [selectedPricingGroup, setSelectedPricingGroup] = useState("All Groups")
  const [selectedPricingGroupRange, setSelectedPricingGroupRange] = useState("")
  const [dateRange, setDateRange] = useState({ from: "", to: "" })
  const [selectedDateRanges, setSelectedDateRanges] = useState([])

  // Initialize filter options
  useEffect(() => {
    if (filterType === "states" && !selectedStateRange) {
      setSelectedStateRange("1-29") // Default state filter
    }
    if (filterType === "pricingGroups" && !selectedPricingGroupRange) {
      setSelectedPricingGroupRange("1-29") // Default pricing group filter
    }
  }, [filterType, selectedStateRange, selectedPricingGroupRange])

  // Fetch states with error handling and fallback
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
    retry: 3,
    retryDelay: 1000,
  })

  // Fetch pricing groups with error handling and fallback
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
    retry: 3,
    retryDelay: 1000,
  })

  // Convert range value to min/max days
  const getRangeValues = (rangeValue) => {
    if (rangeValue === "300+") {
      return { min: 300 }
    }
    const [min, max] = rangeValue.split('-').map(Number)
    return { min, max }
  }

  // Handle date range changes with validation
  const handleDateRangeChange = (field, value) => {
    setDateRange(prev => {
      const newRange = { ...prev, [field]: value };
      
      // Validate date range
      if (newRange.from && newRange.to) {
        const fromDate = new Date(newRange.from);
        const toDate = new Date(newRange.to);
        
        // If to date is before from date, reset to date
        if (toDate < fromDate) {
          newRange.to = '';
        }
      }
      
      return newRange;
    });
  };

  // Format date for display
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  // Reset date range
  const resetDateRange = () => {
    setDateRange({ from: '', to: '' });
    setSelectedDateRanges([]);
  };

  // Modify the toggleDateRangeSelection function to remove the 3-range limit
  const toggleDateRangeSelection = (rangeValue) => {
    if (selectedDateRanges.includes(rangeValue)) {
      setSelectedDateRanges(selectedDateRanges.filter(range => range !== rangeValue))
    } else {
      setSelectedDateRanges([...selectedDateRanges, rangeValue])
    }
  }

  // Add loading state for date range filter
  const [isDateRangeLoading, setIsDateRangeLoading] = useState(false)

  // Fetch accounts based on selected filter type
  const {
    data,
    isLoading: isLoadingAccounts,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: [
      "accountsFilteredMulti",
      filterType,
      selectedRanges,
      selectedState,
      selectedStateRange,
      selectedPricingGroup,
      selectedPricingGroupRange,
      dateRange,
      selectedDateRanges
    ],
    queryFn: async () => {
      setApiError(null)
      setIsDateRangeLoading(true)
      
      try {
        let endpoint = "/accounts/disabled-ranges"
        let requestData = {}

        if (filterType === "days") {
          if (selectedRanges.length === 0) {
            return { accounts: [], count: 0 }
          }
          
          // Multi-range disabled accounts
          requestData = {
            ranges: selectedRanges.map(range => getRangeValues(range))
          }
          
          console.log(`Fetching disabled accounts with ranges:`, requestData.ranges)
        } 
        else if (filterType === "states") {
          if (selectedState === "All States" || !selectedStateRange) {
            return { accounts: [], count: 0 }
          }
          
          // State filter with specified range
          requestData = {
            ranges: [getRangeValues(selectedStateRange)],
            state: selectedState
          }
          
          console.log(`Fetching disabled accounts for state ${selectedState} with range:`, selectedStateRange)
        }
        else if (filterType === "pricingGroups") {
          if (selectedPricingGroup === "All Groups" || !selectedPricingGroupRange) {
            return { accounts: [], count: 0 }
          }
          
          // Pricing group filter with specified range
          requestData = {
            ranges: [getRangeValues(selectedPricingGroupRange)],
            pricingGroup: selectedPricingGroup
          }
          
          console.log(`Fetching disabled accounts for pricing group ${selectedPricingGroup} with range:`, selectedPricingGroupRange)
        }
        else if (filterType === "dateRange") {
          if (!dateRange.from || !dateRange.to) {
            setIsDateRangeLoading(false)
            return { accounts: [], count: 0 }
          }
          
          // Date range filter with optimized request
          requestData = {
            dateRange: {
              from: new Date(dateRange.from).toISOString(),
              to: new Date(dateRange.to).toISOString()
            }
          }
          
          // Add days disabled ranges if selected
          if (selectedDateRanges.length > 0) {
            requestData.ranges = selectedDateRanges.map(range => getRangeValues(range))
          }
          
          // Add state and pricing group filters if selected
          if (selectedState !== "All States") {
            requestData.state = selectedState
          }
          if (selectedPricingGroup !== "All Groups") {
            requestData.pricingGroup = selectedPricingGroup
          }
          
          console.log(`Fetching accounts registered between ${dateRange.from} and ${dateRange.to} with ranges:`, selectedDateRanges)
        }
        
        const response = await api.post(endpoint, requestData)
        console.log("API response:", response.data)
        setIsDateRangeLoading(false)
        return response.data
      } catch (error) {
        console.error("API Error:", error)
        setApiError(
          error.response?.data?.message || 
          error.message || 
          "Failed to fetch accounts. Please ensure the backend server is running."
        )
        setIsDateRangeLoading(false)
        return { accounts: [], count: 0 }
      }
    },
    enabled: (
      filterType === "days" ? selectedRanges.length > 0 : 
      filterType === "states" ? (selectedState !== "All States" && !!selectedStateRange) : 
      filterType === "pricingGroups" ? (selectedPricingGroup !== "All Groups" && !!selectedPricingGroupRange) :
      filterType === "dateRange" ? (!!dateRange.from && !!dateRange.to) : false
    ),
    retry: 1,
    retryDelay: 500,
    staleTime: 30000,
    suspense: true,
    keepPreviousData: true
  })

  // Add effect to refetch when date ranges change
  useEffect(() => {
    if (filterType === "dateRange" && dateRange.from && dateRange.to && selectedDateRanges.length > 0) {
      refetch()
    }
  }, [selectedDateRanges, filterType, dateRange, refetch])

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

  // Reset selected accounts when filter changes
  useEffect(() => {
    setSelectedAccounts([])
    setSelectAll(false)
    setApiError(null)
  }, [filterType, selectedRanges, selectedState, selectedStateRange, selectedPricingGroup, selectedPricingGroupRange, dateRange])

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

  // Toggle range selection (allowing multiple selections for days filter type)
  const toggleRangeSelection = (rangeValue) => {
    if (selectedRanges.includes(rangeValue)) {
      setSelectedRanges(selectedRanges.filter(range => range !== rangeValue))
    } else {
      // Limit to 3 selections maximum
      if (selectedRanges.length < 3) {
        setSelectedRanges([...selectedRanges, rangeValue])
      }
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
    
    // Get selected accounts data
    const selectedAccountsData = data.accounts.filter(account => 
      selectedAccounts.includes(account.phoneNumber)
    )

    sendSmsMutation.mutate({
      phoneNumbers: selectedAccounts,
      message: message,
      accounts: selectedAccountsData
    })
  }

  // Add search filter function
  const filterAccountsBySearch = (accounts) => {
    if (!searchQuery.trim()) return accounts;
    
    const query = searchQuery.toLowerCase().trim();
    return accounts.filter(account => {
      // Safely convert account number to string and check
      const accountNumber = String(account.accountNumber || '').toLowerCase();
      // Safely convert phone number to string and check
      const phoneNumber = String(account.phoneNumber || '').toLowerCase();
      
      return accountNumber.includes(query) || phoneNumber.includes(query);
    });
  };

  // Modify getAccounts function to include search
  const getAccounts = () => {
    if (!data || !data.accounts) return []
    
    // Make a copy of the accounts array and sort based on filter type
    let sortedAccounts = [...data.accounts]
    
    if (filterType === "dateRange") {
      // Sort by registration date for date range filter
      sortedAccounts = sortedAccounts.sort((a, b) => 
        new Date(a.registrationDate) - new Date(b.registrationDate)
      )
    } else {
      // Sort by days disabled for other filters
      sortedAccounts = sortedAccounts.sort((a, b) => a.daysDisabled - b.daysDisabled)
    }

    // Apply search filter
    return filterAccountsBySearch(sortedAccounts);
  }

  // Get count of accounts
  const getAccountCount = () => {
    if (data) return data.count || 0
    return 0
  }

  // Get filter title based on selected filters
  const getFilterTitle = () => {
    if (filterType === "days") {
      if (selectedRanges.length === 0) {
        return "Select filters to view accounts"
      }

      const rangeLabels = selectedRanges.map(rangeValue => {
        const range = disabledRanges.find(r => r.value === rangeValue)
        return range ? range.label : rangeValue
      }).join(", ")

      return `Accounts Disabled for ${rangeLabels}`
    } 
    else if (filterType === "states") {
      if (selectedState === "All States" || !selectedStateRange) {
        return "Select a state and range to view accounts"
      }
      
      const range = disabledRanges.find(r => r.value === selectedStateRange)
      const rangeLabel = range ? range.label : selectedStateRange
      
      return `${selectedState}: Accounts Disabled for ${rangeLabel}`
    }
    else if (filterType === "pricingGroups") {
      if (selectedPricingGroup === "All Groups" || !selectedPricingGroupRange) {
        return "Select a pricing group and range to view accounts"
      }
      
      const range = disabledRanges.find(r => r.value === selectedPricingGroupRange)
      const rangeLabel = range ? range.label : selectedPricingGroupRange
      
      return `${selectedPricingGroup} Group: Accounts Disabled for ${rangeLabel}`
    }
    else if (filterType === "dateRange") {
      if (!dateRange.from || !dateRange.to) {
        return "Select a date range to view accounts"
      }
      
      return `Accounts Registered from ${new Date(dateRange.from).toLocaleDateString()} to ${new Date(dateRange.to).toLocaleDateString()}`
    }
    
    return "Filtered Accounts"
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Multi SMS</h1>
        <p className="mt-2 text-sm text-gray-700">Send SMS to accounts disabled for specific time ranges</p>
      </div>

      {/* Filter controls in a card */}
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-medium text-gray-900 mb-3">Filter Controls</h2>
        
        {/* Main Filter Type Selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Filter by:</label>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <button
              onClick={() => setFilterType("days")}
              className={`flex items-center justify-center px-4 py-2 border rounded-md ${
                filterType === "days"
                  ? "bg-blue-50 border-blue-500 text-blue-700"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              <ClockIcon className="h-5 w-5 mr-2 text-blue-500" />
              Days Range
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
            <button
              onClick={() => setFilterType("dateRange")}
              className={`flex items-center justify-center px-4 py-2 border rounded-md ${
                filterType === "dateRange"
                  ? "bg-blue-50 border-blue-500 text-blue-700"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              <CalendarIcon className="h-5 w-5 mr-2 text-orange-500" />
              Registration Date
            </button>
          </div>
        </div>
        
        {/* Secondary Filter Options */}
        <div className="mb-4">
          {filterType === "days" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select disabled account ranges (up to 3):
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {disabledRanges.map((range) => (
                  <button
                    key={range.value}
                    onClick={() => toggleRangeSelection(range.value)}
                    className={`flex items-center justify-center px-3 py-2 text-sm border rounded-md ${
                      selectedRanges.includes(range.value)
                        ? "bg-blue-50 border-blue-500 text-blue-700"
                        : "border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                    disabled={selectedRanges.length >= 3 && !selectedRanges.includes(range.value)}
                  >
                    <ClockIcon className="h-4 w-4 mr-1 text-blue-500" />
                    {range.label}
                  </button>
                ))}
              </div>
              <div className="mt-2 text-sm text-gray-500">
                Selected: {selectedRanges.length > 0 
                  ? selectedRanges.map(range => {
                      const rangeObj = disabledRanges.find(r => r.value === range);
                      return rangeObj ? rangeObj.label : range;
                    }).join(", ") 
                  : "None"}
              </div>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Select days disabled range:</label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {disabledRanges.map((range) => (
                    <button
                      key={range.value}
                      onClick={() => setSelectedStateRange(range.value)}
                      className={`flex items-center justify-center px-3 py-2 text-sm border rounded-md ${
                        selectedStateRange === range.value
                          ? "bg-blue-50 border-blue-500 text-blue-700"
                          : "border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <ClockIcon className="h-4 w-4 mr-1 text-blue-500" />
                      {range.label}
                    </button>
                  ))}
                </div>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Select days disabled range:</label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {disabledRanges.map((range) => (
                    <button
                      key={range.value}
                      onClick={() => setSelectedPricingGroupRange(range.value)}
                      className={`flex items-center justify-center px-3 py-2 text-sm border rounded-md ${
                        selectedPricingGroupRange === range.value
                          ? "bg-blue-50 border-blue-500 text-blue-700"
                          : "border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <ClockIcon className="h-4 w-4 mr-1 text-blue-500" />
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {filterType === "dateRange" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">From Date:</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={formatDateForInput(dateRange.from)}
                      onChange={(e) => handleDateRangeChange("from", e.target.value)}
                      max={dateRange.to || undefined}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="Select start date"
                    />
                    {dateRange.from && (
                      <button
                        onClick={() => handleDateRangeChange("from", "")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <XCircleIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">To Date:</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={formatDateForInput(dateRange.to)}
                      onChange={(e) => handleDateRangeChange("to", e.target.value)}
                      min={dateRange.from || undefined}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="Select end date"
                    />
                    {dateRange.to && (
                      <button
                        onClick={() => handleDateRangeChange("to", "")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <XCircleIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Days Disabled Range Selection */}
              {dateRange.from && dateRange.to && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select disabled account ranges:
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {disabledRanges.map((range) => (
                      <button
                        key={range.value}
                        onClick={() => toggleDateRangeSelection(range.value)}
                        className={`flex items-center justify-center px-3 py-2 text-sm border rounded-md transition-colors duration-200 ${
                          selectedDateRanges.includes(range.value)
                            ? "bg-blue-50 border-blue-500 text-blue-700 hover:bg-blue-100"
                            : "border-gray-300 text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <ClockIcon className="h-4 w-4 mr-1 text-blue-500" />
                        {range.label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 text-sm text-gray-500">
                    Selected: {selectedDateRanges.length > 0 
                      ? selectedDateRanges.map(range => {
                          const rangeObj = disabledRanges.find(r => r.value === range);
                          return rangeObj ? rangeObj.label : range;
                        }).join(", ") 
                      : "None"}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  {dateRange.from && dateRange.to ? (
                    <span>
                      Showing disabled accounts registered between {new Date(dateRange.from).toLocaleDateString()} and {new Date(dateRange.to).toLocaleDateString()}
                      {selectedDateRanges.length > 0 && ` with selected ranges: ${selectedDateRanges.map(range => {
                        const rangeObj = disabledRanges.find(r => r.value === range);
                        return rangeObj ? rangeObj.label : range;
                      }).join(", ")}`}
                    </span>
                  ) : (
                    <span>Please select both from and to dates</span>
                  )}
                </div>
                {(dateRange.from || dateRange.to || selectedDateRanges.length > 0) && (
                  <button
                    onClick={resetDateRange}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Reset dates
                  </button>
                )}
              </div>

              {/* Loading indicator */}
              {isDateRangeLoading && (
                <div className="flex items-center justify-center py-4">
                  <ArrowPathIcon className="h-5 w-5 animate-spin text-blue-500" />
                  <span className="ml-2 text-sm text-gray-500">Loading accounts...</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => {
              queryClient.invalidateQueries(["accountsFilteredMulti"])
              refetch()
            }}
            className="inline-flex items-center rounded-md bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
            disabled={
              (filterType === "days" && selectedRanges.length === 0) || 
              (filterType === "states" && (selectedState === "All States" || !selectedStateRange)) ||
              (filterType === "pricingGroups" && (selectedPricingGroup === "All Groups" || !selectedPricingGroupRange)) ||
              (filterType === "dateRange" && (!dateRange.from || !dateRange.to))
            }
          >
            <ArrowPathIcon className="h-4 w-4 mr-1" />
            Refresh Data
          </button>
        </div>
      </div>
      
      {/* Debug Information - Remove in production */}
      <div className="mb-4 p-3 bg-gray-50 rounded-md border border-gray-200 text-xs">
        <h3 className="font-semibold mb-1">Debug Information:</h3>
        <div>Filter Type: {filterType}</div>
        {filterType === "days" && <div>Selected Ranges: {selectedRanges.join(", ") || "None"}</div>}
        {filterType === "states" && (
          <>
            <div>Selected State: {selectedState}</div>
            <div>Selected State Range: {selectedStateRange}</div>
            <div>States Data: {statesData ? `Found ${statesData.states?.length || 0} states` : "No data"}</div>
          </>
        )}
        {filterType === "pricingGroups" && (
          <>
            <div>Selected Pricing Group: {selectedPricingGroup}</div>
            <div>Selected Pricing Group Range: {selectedPricingGroupRange}</div>
            <div>Pricing Groups Data: {pricingGroupsData ? `Found ${pricingGroupsData.groups?.length || 0} groups` : "No data"}</div>
          </>
        )}
        {filterType === "dateRange" && (
          <>
            <div>From Date: {dateRange.from || "Not selected"}</div>
            <div>To Date: {dateRange.to || "Not selected"}</div>
          </>
        )}
        <div>API Error: {apiError || "None"}</div>
        <div>Query Status: {isLoadingAccounts ? "Loading" : queryError ? "Error" : "Success"}</div>
        <div>Accounts Retrieved: {getAccountCount()}</div>
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
              <p className="mt-1 text-sm">Make sure your backend server is running at http://localhost:5000</p>
            </div>
          </div>
        </div>
      )}

      {/* Message composer */}
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-medium text-gray-900 mb-3">Message Composer</h2>
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
            Message:
          </label>
          <textarea
            id="message"
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message here... Use ACCOUNT NUMBER as a placeholder for the account number. Example: Congratulations! Your account ACCOUNT NUMBER has been selected for the Asolar Mega Promo. Call 09024864907 now to enjoy 50% off your outstanding balance!"
            className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6"
          />
          <p className="mt-1 text-sm text-gray-500">
            Characters: {message.length} | Selected accounts: {selectedAccounts.length}
          </p>
        </div>

        {/* Result message */}
        {result && (
          <div
            className={`mt-4 p-4 rounded-md ${result.success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}
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
        <div className="mt-4">
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
      </div>

      {/* Accounts table with fixed height and scroll */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="mb-4">
          <h2 className="text-lg font-medium text-gray-900">{getFilterTitle()}</h2>
          <div className="flex items-center justify-between mt-1">
            <p className="text-sm text-gray-500">{getAccountCount()} accounts found</p>
            <div className="flex items-center space-x-4">
              {/* Add search bar */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by account or phone number..."
                  className="block w-64 rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                  >
                    <XCircleIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="flex items-center text-sm text-blue-600">
                <FunnelIcon className="h-4 w-4 mr-1" />
                <span>Sorted by {filterType === "dateRange" ? "registration date" : "days disabled"} (ascending)</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Fixed height scrollable table container */}
        <div className="border border-gray-200 rounded-md">
          <div className="overflow-auto" style={{ maxHeight: "400px" }}>
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50 sticky top-0 z-10">
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
                    {filterType === "dateRange" ? "Status" : "Days Disabled"}
                  </th>
                  {(filterType === "states" || filterType === "days") && (
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      State
                    </th>
                  )}
                  {(filterType === "pricingGroups" || filterType === "days") && (
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Pricing Group
                    </th>
                  )}
                  {filterType === "dateRange" && (
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Registration Date
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {isLoadingAccounts || isDateRangeLoading ? (
                  <tr>
                    <td colSpan={filterType === "days" ? 7 : filterType === "dateRange" ? 6 : 6} className="text-center py-4">
                      <div className="flex items-center justify-center">
                        <ArrowPathIcon className="h-5 w-5 animate-spin text-blue-500" />
                        <span className="ml-2 text-sm text-gray-500">Loading accounts...</span>
                      </div>
                    </td>
                  </tr>
                ) : (filterType === "days" && selectedRanges.length === 0) || 
                   (filterType === "states" && (selectedState === "All States" || !selectedStateRange)) ||
                   (filterType === "pricingGroups" && (selectedPricingGroup === "All Groups" || !selectedPricingGroupRange)) ||
                   (filterType === "dateRange" && (!dateRange.from || !dateRange.to)) ? (
                  <tr>
                    <td colSpan={filterType === "days" ? 7 : filterType === "dateRange" ? 6 : 6} className="text-center py-4 text-gray-500">
                      Please select at least one filter
                    </td>
                  </tr>
                ) : !getAccounts() || getAccounts().length === 0 ? (
                  <tr>
                    <td colSpan={filterType === "days" ? 7 : filterType === "dateRange" ? 6 : 6} className="text-center py-4 text-gray-500">
                      {apiError ? "Error loading accounts. Please try again." : "No accounts found matching the selected filter ranges"}
                    </td>
                  </tr>
                ) : (
                  getAccounts().map((account) => (
                    <tr
                      key={`${account.accountNumber}-${account.phoneNumber}`}
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
                        {account.accountNumber || 'N/A'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {account.clientName || 'N/A'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <span className="inline-flex items-center">
                          <PhoneIcon className="h-4 w-4 mr-1 text-gray-400" />
                          {account.phoneNumber || 'N/A'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        {filterType === "dateRange" ? (
                          <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                            account.status === "ENABLED" 
                              ? "bg-green-100 text-green-800"
                              : account.status === "DISABLED"
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-800"
                          }`}>
                            {account.status || "UNKNOWN"}
                          </span>
                        ) : (
                          <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                            account.daysDisabled < 30
                              ? "bg-yellow-100 text-yellow-800"
                              : account.daysDisabled < 90
                                ? "bg-orange-100 text-orange-800"
                                : "bg-red-100 text-red-800"
                          }`}>
                            {account.daysDisabled} days disabled
                          </span>
                        )}
                      </td>
                      {(filterType === "states" || filterType === "days") && (
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <span className="inline-flex items-center">
                            <MapPinIcon className="h-4 w-4 mr-1 text-gray-400" />
                            {account.state || "Unknown"}
                          </span>
                        </td>
                      )}
                      {(filterType === "pricingGroups" || filterType === "days") && (
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <span className="inline-flex items-center">
                            <TagIcon className="h-4 w-4 mr-1 text-gray-400" />
                            {account.groupName || "Unknown"}
                          </span>
                        </td>
                      )}
                      {filterType === "dateRange" && (
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <span className="inline-flex items-center">
                            <CalendarIcon className="h-4 w-4 mr-1 text-gray-400" />
                            {account.registrationDate ? new Date(account.registrationDate).toLocaleDateString() : 'N/A'}
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
  )
} 