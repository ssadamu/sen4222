import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  MagnifyingGlassIcon, 
  FunnelIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import api from '../services/api';

export default function PricingGroups() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(100);
  const [search, setSearch] = useState('');
  const [archived, setArchived] = useState('');
  const [testing, setTesting] = useState('');
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [isSyncing, setIsSyncing] = useState(false);
  const queryClient = useQueryClient();
  
  const { data, isLoading } = useQuery({
    queryKey: ['pricingGroups', page, limit, search, archived, testing],
    queryFn: () => api.get(`/pricing-groups?page=${page}&limit=${limit}&search=${search}&archived=${archived}&testing=${testing}`).then(res => res.data)
  });

  // Mutation for syncing pricing groups
  const syncMutation = useMutation({
    mutationFn: () => api.post('/pricing-groups/sync'),
    onMutate: () => {
      setIsSyncing(true);
    },
    onSuccess: () => {
      // Invalidate and refetch the pricing groups query
      queryClient.invalidateQueries({ queryKey: ['pricingGroups'] });
      setIsSyncing(false);
    },
    onError: (error) => {
      console.error("Sync failed:", error);
      setIsSyncing(false);
    }
  });

  const handleSync = () => {
    syncMutation.mutate();
  };

  const toggleRow = (pricingGroupId) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(pricingGroupId)) {
      newExpandedRows.delete(pricingGroupId);
    } else {
      newExpandedRows.add(pricingGroupId);
    }
    setExpandedRows(newExpandedRows);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const handleLimitChange = (e) => {
    setLimit(Number(e.target.value));
    setPage(1); // Reset to first page when changing limit
  };

  return (
    <div>
      <div className="sm:flex sm:items-center justify-between">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Pricing Groups</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all pricing groups including their products, pricing details, and configuration.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowPathIcon className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Pricing Groups'}
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mt-6 mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="relative">
          <input
            type="text"
            placeholder="Search pricing groups..."
            className="block w-full rounded-md border-0 py-1.5 pl-10 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <MagnifyingGlassIcon 
            className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
            aria-hidden="true"
          />
        </div>

        <div className="relative">
          <select
            value={archived}
            onChange={(e) => setArchived(e.target.value)}
            className="block w-full rounded-md border-0 py-1.5 pl-10 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6 appearance-none"
          >
            <option value="">All (Archived Status)</option>
            <option value="true">Archived Only</option>
            <option value="false">Not Archived Only</option>
          </select>
          <FunnelIcon 
            className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
            aria-hidden="true"
          />
          <ChevronDownIcon 
            className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
            aria-hidden="true"
          />
        </div>

        <div className="relative">
          <select
            value={testing}
            onChange={(e) => setTesting(e.target.value)}
            className="block w-full rounded-md border-0 py-1.5 pl-10 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6 appearance-none"
          >
            <option value="">All (Testing Status)</option>
            <option value="true">Testing Only</option>
            <option value="false">Production Only</option>
          </select>
          <FunnelIcon 
            className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
            aria-hidden="true"
          />
          <ChevronDownIcon 
            className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
            aria-hidden="true"
          />
        </div>
      </div>

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
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Name</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Billing Model</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Full Price</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {isLoading ? (
                    <tr>
                      <td colSpan="6" className="text-center py-4">Loading...</td>
                    </tr>
                  ) : data?.pricingGroups?.length > 0 ? (
                    data.pricingGroups.map((pricingGroup) => (
                      <React.Fragment key={pricingGroup.qid}>
                        <tr className="hover:bg-gray-50">
                          <td className="px-3 py-4">
                            <button
                              onClick={() => toggleRow(pricingGroup.qid)}
                              className="text-gray-500 hover:text-gray-700 transition-colors duration-150"
                            >
                              {expandedRows.has(pricingGroup.qid) ? (
                                <ChevronUpIcon className="h-5 w-5" />
                              ) : (
                                <ChevronDownIcon className="h-5 w-5" />
                              )}
                            </button>
                          </td>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                            {pricingGroup.qid}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {pricingGroup.name}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {pricingGroup.billing_model}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {pricingGroup.full_price}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            <div className="flex flex-wrap gap-1">
                              {pricingGroup.is_archived && (
                                <span className="inline-flex rounded-full px-2 text-xs font-semibold leading-5 bg-amber-100 text-amber-800">
                                  Archived
                                </span>
                              )}
                              {pricingGroup.is_testing && (
                                <span className="inline-flex rounded-full px-2 text-xs font-semibold leading-5 bg-purple-100 text-purple-800">
                                  Testing
                                </span>
                              )}
                              {!pricingGroup.is_archived && !pricingGroup.is_testing && (
                                <span className="inline-flex rounded-full px-2 text-xs font-semibold leading-5 bg-green-100 text-green-800">
                                  Active
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                        {expandedRows.has(pricingGroup.qid) && (
                          <tr>
                            <td colSpan="6" className="px-4 py-4 bg-gray-50">
                              <div className="overflow-hidden rounded-lg border border-gray-200 shadow-sm">
                                <div className="bg-gray-100 px-4 py-3 border-b">
                                  <h3 className="text-sm font-medium text-gray-900">Pricing Group Details</h3>
                                </div>
                                <div className="px-4 py-3 grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6">
                                  <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Payment Information</h4>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                      <p className="text-gray-500">Down Payment:</p>
                                      <p className="font-medium">{pricingGroup.down_payment || 'N/A'}</p>
                                      
                                      <p className="text-gray-500">Full Price:</p>
                                      <p className="font-medium">{pricingGroup.full_price || 'N/A'}</p>
                                      
                                      <p className="text-gray-500">Payment Amount:</p>
                                      <p className="font-medium">{pricingGroup.payment_amount_per_period || 'N/A'}</p>
                                      
                                      <p className="text-gray-500">Payment Period:</p>
                                      <p className="font-medium">{pricingGroup.payment_period_in_days ? `${pricingGroup.payment_period_in_days} days` : 'N/A'}</p>
                                    </div>
                                  </div>
                                  
                                  <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Configuration</h4>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                      <p className="text-gray-500">Requires Approval:</p>
                                      <p className="font-medium">{pricingGroup.registration_requires_approval ? 'Yes' : 'No'}</p>
                                      
                                      <p className="text-gray-500">Requires Remetering:</p>
                                      <p className="font-medium">{pricingGroup.requires_remetering ? 'Yes' : 'No'}</p>
                                      
                                      <p className="text-gray-500">Testing:</p>
                                      <p className="font-medium">{pricingGroup.is_testing ? 'Yes' : 'No'}</p>
                                      
                                      <p className="text-gray-500">Archived:</p>
                                      <p className="font-medium">{pricingGroup.is_archived ? 'Yes' : 'No'}</p>
                                    </div>
                                  </div>
                                  
                                  {pricingGroup.products && pricingGroup.products.length > 0 && (
                                    <div className="col-span-1 md:col-span-2 space-y-3">
                                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Products</h4>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                        {pricingGroup.products.map((product, index) => (
                                          <div key={index} className="flex items-center p-2 rounded bg-gray-100">
                                            <div className="min-w-0 flex-1">
                                              <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                                              <p className="text-xs text-gray-500 truncate">{product.product_qid}</p>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="text-center py-4">No pricing groups found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Pagination */}
      {data?.pagination && data.pagination.totalPages > 1 && (
        <div className="mt-5 flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={!data.pagination.hasPrevious}
              className={`relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 ${!data.pagination.hasPrevious ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={!data.pagination.hasNext}
              className={`relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 ${!data.pagination.hasNext ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to{' '}
                <span className="font-medium">
                  {Math.min(page * limit, data.pagination.totalItems)}
                </span>{' '}
                of <span className="font-medium">{data.pagination.totalItems}</span> pricing groups
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div>
                <label htmlFor="perPage" className="mr-2 text-sm text-gray-600">Per page:</label>
                <select
                  id="perPage"
                  value={limit}
                  onChange={handleLimitChange}
                  className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={250}>250</option>
                </select>
              </div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={!data.pagination.hasPrevious}
                  className={`relative inline-flex items-center rounded-l-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 ${!data.pagination.hasPrevious ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                >
                  <span className="sr-only">First</span>
                  <span className="text-xs">First</span>
                </button>
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={!data.pagination.hasPrevious}
                  className={`relative inline-flex items-center border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 ${!data.pagination.hasPrevious ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                >
                  <span className="sr-only">Previous</span>
                  <span className="text-xs">Prev</span>
                </button>

                {/* Page numbers */}
                {[...Array(Math.min(5, data.pagination.totalPages))].map((_, i) => {
                  let pageNum;
                  
                  // Calculate which page numbers to show
                  if (data.pagination.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= data.pagination.totalPages - 2) {
                    pageNum = data.pagination.totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  
                  return (
                    <button
                      key={i}
                      onClick={() => handlePageChange(pageNum)}
                      className={`relative inline-flex items-center border ${page === pageNum ? 'z-10 bg-blue-50 border-blue-500 text-blue-600' : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'} px-4 py-2 text-sm font-medium`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={!data.pagination.hasNext}
                  className={`relative inline-flex items-center border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 ${!data.pagination.hasNext ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                >
                  <span className="sr-only">Next</span>
                  <span className="text-xs">Next</span>
                </button>
                <button
                  onClick={() => handlePageChange(data.pagination.totalPages)}
                  disabled={!data.pagination.hasNext}
                  className={`relative inline-flex items-center rounded-r-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 ${!data.pagination.hasNext ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                >
                  <span className="sr-only">Last</span>
                  <span className="text-xs">Last</span>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}