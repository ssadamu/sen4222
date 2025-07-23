"use client"

import React, { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowPathIcon,
  MapPinIcon,
  UserGroupIcon,
  PhoneIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline"
import api from "../services/api"

export default function Accounts() {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(100)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("")
  const [expandedRows, setExpandedRows] = useState(new Set())
  const [isSyncing, setIsSyncing] = useState(false)
  const [smsModal, setSmsModal] = useState({
    isOpen: false,
    phoneNumber: "",
    message: "",
    isSending: false,
    sendResult: null,
  })
  const queryClient = useQueryClient()
  const [syncStatus, setSyncStatus] = useState({
    isSyncing: false,
    lastSyncTime: null,
    timeUntilNextSync: 0
  })

  const { data, isLoading } = useQuery({
    queryKey: ["accounts", page, limit, search, status],
    queryFn: () =>
      api
        .get(`/accounts?page=${page}&limit=${limit}&search=${search}&statuses=${status}&populate=true`)
        .then((res) => res.data),
  })

  // Mutation for syncing accounts
  const syncMutation = useMutation({
    mutationFn: () => api.post("/accounts/sync"),
    onMutate: () => {
      setIsSyncing(true)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] })
      setIsSyncing(false)
    },
    onError: (error) => {
      console.error("Sync failed:", error)
      setIsSyncing(false)
    },
  })

  // Mutation for sending SMS
  const sendSmsMutation = useMutation({
    mutationFn: (data) => api.post("/accounts/send-sms", data),
    onSuccess: (response) => {
      setSmsModal((prev) => ({
        ...prev,
        isSending: false,
        sendResult: {
          success: true,
          message: "SMS sent successfully",
        },
      }))

      // Close the modal after 2 seconds
      setTimeout(() => {
        closeSmsModal()
      }, 2000)
    },
    onError: (error) => {
      setSmsModal((prev) => ({
        ...prev,
        isSending: false,
        sendResult: {
          success: false,
          message: error.response?.data?.message || "Failed to send SMS",
        },
      }))
    },
  })

  // Function to trigger sync
  const triggerSync = async () => {
    try {
      setSyncStatus(prev => ({ ...prev, isSyncing: true }));
      const response = await api.post('/accounts/sync');
      if (response.data.success) {
        setSyncStatus(prev => ({
          ...prev,
          isSyncing: false,
          lastSyncTime: new Date(),
          timeUntilNextSync: 5 * 60 * 1000 // 5 minutes
        }));
        // Invalidate queries to refresh the data
        queryClient.invalidateQueries({ queryKey: ["accounts"] });
      }
    } catch (error) {
      console.error('Error triggering sync:', error);
      setSyncStatus(prev => ({ ...prev, isSyncing: false }));
    }
  };

  // Set up automatic sync
  useEffect(() => {
    // Start sync immediately when component mounts
    triggerSync();

    // Set up interval to trigger sync every 5 minutes
    const syncInterval = setInterval(() => {
      if (!syncStatus.isSyncing) {
        triggerSync();
      }
    }, 5 * 60 * 1000);

    return () => {
      clearInterval(syncInterval);
    };
  }, []); // Empty dependency array means this runs once on mount

  // Format time until next sync
  const formatTimeUntilNextSync = () => {
    if (!syncStatus.lastSyncTime) return 'Never synced';
    if (syncStatus.timeUntilNextSync <= 0) return 'Syncing now...';
    
    const minutes = Math.floor(syncStatus.timeUntilNextSync / 60000);
    const seconds = Math.floor((syncStatus.timeUntilNextSync % 60000) / 1000);
    return `Next sync in ${minutes}m ${seconds}s`;
  };

  // Update time until next sync every second
  useEffect(() => {
    if (!syncStatus.lastSyncTime) return;

    const timer = setInterval(() => {
      setSyncStatus(prev => {
        const now = new Date();
        const timeSinceLastSync = now - prev.lastSyncTime;
        const timeUntilNext = Math.max(0, 5 * 60 * 1000 - timeSinceLastSync);
        
        return {
          ...prev,
          timeUntilNextSync: timeUntilNext
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [syncStatus.lastSyncTime]);

  const handleSync = () => {
    syncMutation.mutate()
  }

  const toggleRow = (accountId) => {
    const newExpandedRows = new Set(expandedRows)
    if (newExpandedRows.has(accountId)) {
      newExpandedRows.delete(accountId)
    } else {
      newExpandedRows.add(accountId)
    }
    setExpandedRows(newExpandedRows)
  }

  // Format a date string or return 'N/A'
  const formatDate = (dateString) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleString()
  }

  // Calculate days left to disabled
  const calculateDaysLeftToDisabled = (paymentDueDate) => {
    if (!paymentDueDate) return "N/A"
    const dueDate = new Date(paymentDueDate)
    const now = new Date()
    const differenceMs = dueDate - now
    const daysDifference = Math.floor(differenceMs / (1000 * 60 * 60 * 24))
    return daysDifference > 0 ? daysDifference : 0
  }

  const handlePageChange = (newPage) => {
    setPage(newPage)
  }

  const parseStateAndLGA = (value) => {
    try {
      let data = value
      if (typeof value === "string") {
        try {
          data = JSON.parse(value)
        } catch (e) {
          return { state: "N/A", lga: "N/A" }
        }
      }
      if (data && typeof data === "object") {
        return {
          state: data["CO001126"] || "N/A",
          lga: data["CO001127"] || "N/A",
        }
      }
      return { state: "N/A", lga: "N/A" }
    } catch (e) {
      console.error("Error parsing state and LGA:", e)
      return { state: "N/A", lga: "N/A" }
    }
  }

  const renderAttributeValue = (value) => {
    if (value === null || value === undefined) return "N/A"
    if (typeof value === "object") {
      try {
        return JSON.stringify(value, null, 2)
      } catch (e) {
        return "Complex Object"
      }
    }
    return value.toString()
  }

  const extractClientAttributes = (client) => {
    if (!client || !client.attribute_values) return {}
    let attributes = {}
    if (Array.isArray(client.attribute_values)) {
      client.attribute_values.forEach((attr) => {
        attributes[attr.name || attr.attribute_qid || "Unknown"] = attr.value
      })
    } else if (typeof client.attribute_values === "object") {
      attributes = client.attribute_values
    }
    return attributes
  }

  const formatGeolocation = (geolocation) => {
    if (!geolocation) return null
    try {
      if (typeof geolocation === "string") {
        try {
          geolocation = JSON.parse(geolocation)
        } catch (e) {
          return geolocation
        }
      }
      const lat = geolocation.latitude
      const lng = geolocation.longitude
      if (lat && lng) {
        const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`
        return (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-blue-600 hover:text-blue-800"
          >
            <MapPinIcon className="h-4 w-4 mr-1" />
            {lat.toFixed(6)}, {lng.toFixed(6)}
          </a>
        )
      }
      return JSON.stringify(geolocation)
    } catch (e) {
      console.error("Error formatting geolocation:", e)
      return JSON.stringify(geolocation)
    }
  }

  const handleImageClick = (url) => {
    window.open(url, "_blank")
  }

  const formatImageUrl = (url) => {
    if (!url) return "N/A"
    if (typeof url === "string" && (url.startsWith("http") || url.startsWith("https"))) {
      return (
        <button
          onClick={() => handleImageClick(url)}
          className="inline-flex items-center text-blue-600 hover:text-blue-800"
        >
          View Image
        </button>
      )
    }
    return url
  }

  // New function to format phone numbers as clickable links
  const formatPhoneNumber = (phoneNumber) => {
    if (!phoneNumber || phoneNumber === "N/A") return "N/A"

    return (
      <button
        onClick={() => openSmsModal(phoneNumber)}
        className="inline-flex items-center text-blue-600 hover:text-blue-800"
      >
        <PhoneIcon className="h-4 w-4 mr-1" />
        {phoneNumber}
      </button>
    )
  }

  // Function to open SMS modal
  const openSmsModal = (phoneNumber) => {
    setSmsModal({
      isOpen: true,
      phoneNumber,
      message: "",
      isSending: false,
      sendResult: null,
    })
  }

  // Function to close SMS modal
  const closeSmsModal = () => {
    setSmsModal({
      isOpen: false,
      phoneNumber: "",
      message: "",
      isSending: false,
      sendResult: null,
    })
  }

  // Function to handle sending SMS using Termii API
  const handleSendSms = (e) => {
    e.preventDefault()

    if (!smsModal.phoneNumber || !smsModal.message) {
      setSmsModal((prev) => ({
        ...prev,
        sendResult: {
          success: false,
          message: "Phone number and message are required",
        },
      }))
      return
    }

    // Format the phone number (remove + if present)
    const formattedPhone = smsModal.phoneNumber.startsWith("+")
      ? smsModal.phoneNumber.substring(1)
      : smsModal.phoneNumber

    // Set sending state
    setSmsModal((prev) => ({
      ...prev,
      isSending: true,
      sendResult: null,
    }))

    // Send SMS using the API
    sendSmsMutation.mutate({
      phoneNumber: formattedPhone,
      message: smsModal.message,
    })
  }

  // Update the statuses array to ensure REPOSSESSED and WrittenOff are properly included
  // Updated statuses array: REPOSSESSED comes before WrittenOff (which is last)
  const statuses = ["DISABLED", "ENABLED", "UNLOCKED", "REPOSSESSED", "WRITTEN_OFF"]

  return (
    <div>
      <div className="sm:flex sm:items-center justify-between">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Accounts</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all accounts including their status, payment details, and client information.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <div className="flex items-center space-x-4">
            {/* Sync Status Indicator */}
            <div className="text-sm text-gray-500">
              {syncStatus.isSyncing ? (
                <div className="flex items-center">
                  <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                  Syncing accounts...
                </div>
              ) : (
                <div>
                  <div>Last sync: {syncStatus.lastSyncTime ? new Date(syncStatus.lastSyncTime).toLocaleString() : 'Never'}</div>
                  <div>{formatTimeUntilNextSync()}</div>
                </div>
              )}
            </div>
            
            {/* Manual Sync Button */}
            <button
              type="button"
              onClick={triggerSync}
              disabled={syncStatus.isSyncing}
              className="flex items-center justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowPathIcon className={`mr-2 h-4 w-4 ${syncStatus.isSyncing ? "animate-spin" : ""}`} />
              {syncStatus.isSyncing ? "Syncing..." : "Sync Now"}
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mt-6 mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="relative">
          <input
            type="text"
            placeholder="Search accounts..."
            className="block w-full rounded-md border-0 py-1.5 pl-10 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <MagnifyingGlassIcon
            className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
            aria-hidden="true"
          />
        </div>

        {/* Modify the status filter dropdown to ensure proper case handling */}
        <div className="relative">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="block w-full rounded-md border-0 py-1.5 pl-10 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6 appearance-none"
          >
            <option value="">All Statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <FunnelIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" aria-hidden="true" />
          <ChevronDownIcon
            className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Add debug information to help troubleshoot status filtering
      {process.env.NODE_ENV !== "production" && (
        <div className="mt-2 p-4 bg-gray-100 rounded text-sm border border-gray-300">
          <h3 className="font-bold mb-2">Debug Information</h3>
          <p>
            <strong>Current filter:</strong> {status || "None"}
          </p>
          <p>
            <strong>API Query:</strong> /accounts?page={page}&limit={limit}&search={search}&statuses={status}
            &populate=true
          </p>
          <p className="mt-2 text-xs">
            If filters aren't working, check that status values in the database match exactly: "DISABLED", "ENABLED",
            "UNLOCKED", "REPOSSESSED", "WrittenOff"
          </p>
        </div>
      )} */}

      {/* Table */}
      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-8 px-3 py-3.5"></th>
                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">QID</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Account Number</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Client Name</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Group</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Total Paid</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Full Price</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Due Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {isLoading ? (
                    <tr>
                      <td colSpan="9" className="text-center py-4">
                        Loading...
                      </td>
                    </tr>
                  ) : (
                    data?.accounts?.map((account) => {
                      const clientName = account.clients && account.clients.length > 0 ? account.clients[0].name : "N/A"

                      return (
                        <React.Fragment key={account.qid}>
                          <tr className="hover:bg-gray-50">
                            <td className="px-3 py-4">
                              <button
                                onClick={() => toggleRow(account.qid)}
                                className="text-gray-500 hover:text-gray-700 transition-colors duration-150"
                              >
                                {expandedRows.has(account.qid) ? (
                                  <ChevronUpIcon className="h-5 w-5" />
                                ) : (
                                  <ChevronDownIcon className="h-5 w-5" />
                                )}
                              </button>
                            </td>
                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                              {account.qid}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{account.number}</td>
                            {/* Update the status display in the table to handle REPROCESSED and WrittenOff properly */}
                            <td className="whitespace-nowrap px-3 py-4 text-sm">
                              <span
                                className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                                  account.status === "ENABLED"
                                    ? "bg-green-100 text-green-800"
                                    : account.status === "DISABLED"
                                      ? "bg-red-100 text-red-800"
                                      : account.status === "UNLOCKED"
                                        ? "bg-blue-100 text-blue-800"
                                        : account.status === "REPOSSESSED"
                                          ? "bg-yellow-100 text-yellow-800"
                                          : account.status === "WRITTEN_OFF"
                                            ? "bg-gray-100 text-gray-800"
                                            : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {account.status}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{clientName}</td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {account.groupName ? (
                                <span className="inline-flex items-center">
                                  <UserGroupIcon className="h-4 w-4 mr-1 text-gray-400" />
                                  {account.groupName}
                                </span>
                              ) : (
                                "N/A"
                              )}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {account.total_paid} {account.currency}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {account.full_price} {account.currency}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {formatDate(account.payment_due_date)}
                            </td>
                          </tr>
                          {expandedRows.has(account.qid) && (
                            <tr>
                              <td colSpan="9" className="px-4 py-4 bg-gray-50">
                                <div className="overflow-hidden rounded-lg border border-gray-200 shadow-sm">
                                  <div className="bg-gray-100 px-4 py-3 border-b">
                                    <h3 className="text-sm font-medium text-gray-900">Account Details</h3>
                                  </div>
                                  <div className="px-4 py-3 grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6">
                                    {/* Payment Information Section */}
                                    <div className="space-y-3 border rounded-lg p-4">
                                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b pb-2 mb-2">
                                        Payment Information
                                      </h4>
                                      <div className="grid grid-cols-2 gap-2 text-sm">
                                        <p className="text-gray-500 border-b border-r p-2">Account Number:</p>
                                        <p className="font-medium border-b p-2">{account.number || "N/A"}</p>

                                        <p className="text-gray-500 border-b border-r p-2">Group Name:</p>
                                        <p className="font-medium border-b p-2">
                                          {account.groupName ? (
                                            <span className="inline-flex items-center">
                                              <UserGroupIcon className="h-4 w-4 mr-1 text-gray-400" />
                                              {account.groupName}
                                            </span>
                                          ) : (
                                            "N/A"
                                          )}
                                        </p>

                                        <p className="text-gray-500 border-b border-r p-2">Billing Model:</p>
                                        <p className="font-medium border-b p-2">{account.billing_model || "N/A"}</p>

                                        <p className="text-gray-500 border-b border-r p-2">Payment Period:</p>
                                        <p className="font-medium border-b p-2">
                                          {account.payment_period_in_days
                                            ? `${account.payment_period_in_days} days`
                                            : "N/A"}
                                        </p>

                                        <p className="text-gray-500 border-b border-r p-2">Down Payment:</p>
                                        <p className="font-medium border-b p-2">
                                          {account.down_payment} {account.currency}
                                        </p>

                                        <p className="text-gray-500 border-b border-r p-2">Minimum Payment:</p>
                                        <p className="font-medium border-b p-2">
                                          {account.minimum_payment || "550"} {account.currency}
                                        </p>

                                        <p className="text-gray-500 border-b border-r p-2">Number of Installments:</p>
                                        <p className="font-medium border-b p-2">{account.num_installments || "16"}</p>

                                        <p className="text-gray-500 border-b border-r p-2">Latest Payment:</p>
                                        <p className="font-medium border-b p-2">
                                          {formatDate(account.latest_payment_when)}
                                        </p>

                                        <p className="text-gray-500 border-b border-r p-2">Payment Due Date:</p>
                                        <p className="font-medium border-b p-2">
                                          {formatDate(account.payment_due_date)}
                                        </p>

                                        {account.status === "ENABLED" && (
                                          <>
                                            <p className="text-gray-500 border-b border-r p-2">
                                              Days left to disabled:
                                            </p>
                                            <p className="font-medium border-b p-2">
                                              {calculateDaysLeftToDisabled(account.payment_due_date)}
                                            </p>
                                          </>
                                        )}

                                        <p className="text-gray-500 border-b border-r p-2">Days Disabled:</p>
                                        <p className="font-medium border-b p-2">
                                          {account.cumulative_days_disabled || "0"}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Client Information Section */}
                                    {account.clients &&
                                      account.clients.length > 0 &&
                                      (() => {
                                        const client = account.clients[0]
                                        const clientAttributes = extractClientAttributes(client)
                                        let stateAndLGA = { state: "N/A", lga: "N/A" }
                                        if (clientAttributes["Clients State and LGA"]) {
                                          stateAndLGA = parseStateAndLGA(clientAttributes["Clients State and LGA"])
                                        }
                                        return (
                                          <div className="space-y-3 border rounded-lg p-4">
                                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b pb-2 mb-2">
                                              Client Information
                                            </h4>
                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                              <p className="text-gray-500 border-b border-r p-2">Client Name:</p>
                                              <p className="font-medium border-b p-2">{client.name || "N/A"}</p>

                                              <p className="text-gray-500 border-b border-r p-2">Primary Phone:</p>
                                              <p className="font-medium border-b p-2">
                                                {formatPhoneNumber(client.primary_phone)}
                                              </p>

                                              <p className="text-gray-500 border-b border-r p-2">Alternative Phone:</p>
                                              <p className="font-medium border-b p-2">
                                                {formatPhoneNumber(clientAttributes["Alternative Phone Number"])}
                                              </p>

                                              <p className="text-gray-500 border-b border-r p-2">State:</p>
                                              <p className="font-medium border-b p-2">{stateAndLGA.state}</p>

                                              <p className="text-gray-500 border-b border-r p-2">LGA:</p>
                                              <p className="font-medium border-b p-2">{stateAndLGA.lga}</p>

                                              <p className="text-gray-500 border-b border-r p-2">Registration Date:</p>
                                              <p className="font-medium border-b p-2">
                                                {formatDate(account.registration_date)}
                                              </p>

                                              <p className="text-gray-500 border-b border-r p-2">Home Address:</p>
                                              <p className="font-medium border-b p-2">
                                                {clientAttributes["Home Address"] || "N/A"}
                                              </p>

                                              <p className="text-gray-500 border-b border-r p-2">Closest Landmark:</p>
                                              <p className="font-medium border-b p-2">
                                                {clientAttributes["Closest Landmark to Resident"] || "N/A"}
                                              </p>

                                              <p className="text-gray-500 border-b border-r p-2">Location:</p>
                                              <div className="font-medium border-b p-2">
                                                {formatGeolocation(
                                                  account.registration_location || clientAttributes["Geolocation"],
                                                )}
                                              </div>

                                              <p className="text-gray-500 border-r p-2">Contract Form:</p>
                                              <div className="font-medium p-2">
                                                {formatImageUrl(clientAttributes["Contract Form"])}
                                              </div>
                                            </div>
                                          </div>
                                        )
                                      })()}

                                    {/* Additional Attributes Section */}
                                    {account.clients &&
                                      account.clients.length > 0 &&
                                      account.clients[0].attribute_values && (
                                        <div className="col-span-1 md:col-span-2 space-y-3 border rounded-lg p-4">
                                          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b pb-2 mb-2">
                                            Additional Attributes
                                          </h4>
                                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                                            {(() => {
                                              const client = account.clients[0]
                                              const clientAttributes = extractClientAttributes(client)
                                              const commonAttributes = [
                                                "Home Address",
                                                "Closest Landmark to Resident",
                                                "Alternative Phone Number",
                                                "Contract Form",
                                                "Clients State and LGA",
                                                "Geolocation",
                                              ]
                                              const filteredAttributes = Object.entries(clientAttributes).filter(
                                                ([key]) => !commonAttributes.includes(key),
                                              )
                                              if (filteredAttributes.length === 0) {
                                                return (
                                                  <p className="col-span-3 text-gray-500">
                                                    No additional attributes available
                                                  </p>
                                                )
                                              }
                                              return filteredAttributes.map(([key, value], index) => (
                                                <React.Fragment key={index}>
                                                  <p className="text-gray-500 border-b border-r p-2">{key}:</p>
                                                  <p className="font-medium md:col-span-2 border-b p-2 break-words">
                                                    <pre className="whitespace-pre-wrap font-sans">
                                                      {renderAttributeValue(value)}
                                                    </pre>
                                                  </p>
                                                </React.Fragment>
                                              ))
                                            })()}
                                          </div>
                                        </div>
                                      )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Pagination */}
      {data?.pagination && (
        <div className="mt-5 flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={!data.pagination.hasPrevious}
              className={`relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 ${
                !data.pagination.hasPrevious ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"
              }`}
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={!data.pagination.hasNext}
              className={`relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 ${
                !data.pagination.hasNext ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"
              }`}
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to{" "}
                <span className="font-medium">{Math.min(page * limit, data.pagination.totalAccounts)}</span> of{" "}
                <span className="font-medium">{data.pagination.totalAccounts}</span> results
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={!data.pagination.hasPrevious}
                  className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 ${
                    !data.pagination.hasPrevious ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"
                  }`}
                >
                  <span className="sr-only">Previous</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path
                      fillRule="evenodd"
                      d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>

                {Array.from({ length: Math.min(5, data.pagination.totalPages) }, (_, i) => {
                  let pageNum
                  const totalPages = data.pagination.totalPages
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else {
                    const startPage = Math.max(1, Math.min(page - 2, totalPages - 4))
                    pageNum = startPage + i
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                        page === pageNum
                          ? "z-10 bg-blue-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                          : "text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0"
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}

                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={!data.pagination.hasNext}
                  className={`relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 ${
                    !data.pagination.hasNext ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"
                  }`}
                >
                  <span className="sr-only">Next</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path
                      fillRule="evenodd"
                      d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 011.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* SMS Modal */}
      {smsModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Send SMS Message</h3>
              <button onClick={closeSmsModal} className="text-gray-400 hover:text-gray-500">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSendSms}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="phone-number" className="block text-sm font-medium text-gray-700">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    id="phone-number"
                    value={smsModal.phoneNumber}
                    onChange={(e) => setSmsModal({ ...smsModal, phoneNumber: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm py-2 px-3 text-gray-700 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                    Message
                  </label>
                  <textarea
                    id="message"
                    rows={4}
                    value={smsModal.message}
                    onChange={(e) => setSmsModal({ ...smsModal, message: e.target.value })}
                    placeholder="Type your message here..."
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
                    required
                  />
                </div>

                {/* Display result message if available */}
                {smsModal.sendResult && (
                  <div
                    className={`p-3 rounded-md ${
                      smsModal.sendResult.success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
                    }`}
                  >
                    {smsModal.sendResult.message}
                  </div>
                )}

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={closeSmsModal}
                    className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={smsModal.isSending}
                    className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    {smsModal.isSending ? (
                      <>
                        <ArrowPathIcon className="animate-spin h-4 w-4 mr-2" />
                        Sending...
                      </>
                    ) : (
                      "Send"
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
