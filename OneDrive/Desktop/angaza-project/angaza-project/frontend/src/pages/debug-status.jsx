"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import api from "../services/api"

export default function DebugStatus() {
  const [fixingStatus, setFixingStatus] = useState(false)

  const {
    data: statusDistribution,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["status-distribution"],
    queryFn: () => api.get("/accounts/status-distribution").then((res) => res.data),
  })

  const handleFixStatus = async () => {
    try {
      setFixingStatus(true)
      const response = await api.post("/accounts/fix-status-values")
      console.log("Status fix response:", response.data)
      await refetch()
    } catch (error) {
      console.error("Error fixing status values:", error)
    } finally {
      setFixingStatus(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Status Debug Tool</h1>

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Current Status Distribution</h2>
          <button onClick={refetch} className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
            Refresh
          </button>
        </div>

        {isLoading ? (
          <p>Loading status distribution...</p>
        ) : (
          <div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Count
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {statusDistribution?.statusDistribution?.map((status) => (
                  <tr key={status._id || "unknown"}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {status._id || "Unknown"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{status.count}</td>
                  </tr>
                ))}
                {(!statusDistribution?.statusDistribution || statusDistribution.statusDistribution.length === 0) && (
                  <tr>
                    <td colSpan="2" className="px-6 py-4 text-center text-sm text-gray-500">
                      No status data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Fix Status Values</h2>
        <p className="mb-4 text-gray-600">
          This will normalize all status values in the database to ensure consistency:
          <ul className="list-disc ml-6 mt-2">
            <li>Convert all status values to uppercase</li>
            <li>Change "REPROCESSED" to "REPOSSESSED"</li>
            <li>Ensure "WRITTEN_OFF" is properly formatted</li>
          </ul>
        </p>

        <button
          onClick={handleFixStatus}
          disabled={fixingStatus}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {fixingStatus ? "Fixing..." : "Fix Status Values"}
        </button>
      </div>
    </div>
  )
}
