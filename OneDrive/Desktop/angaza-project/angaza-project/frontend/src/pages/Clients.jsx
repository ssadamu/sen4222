import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  MagnifyingGlassIcon, 
  ArrowPathIcon, 
  ExclamationCircleIcon 
} from '@heroicons/react/24/outline';
import api from '../services/api';

export default function Clients() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const queryClient = useQueryClient();

  // Apply search only after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1); // Reset to first page when searching
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch clients data
  const { 
    data, 
    isLoading, 
    isError, 
    error 
  } = useQuery({
    queryKey: ['clients', page, search],
    queryFn: () => api.get(`/clients?page=${page}&limit=50${search ? `&search=${search}` : ''}`).then(res => res.data),
    keepPreviousData: true
  });

  // Sync clients mutation
  const syncMutation = useMutation({
    mutationFn: () => api.post('/clients/sync').then(res => res.data),
    onSuccess: () => {
      // Invalidate queries to refetch data
      queryClient.invalidateQueries(['clients']);
    }
  });

  // Handle sync button click
  const handleSync = () => {
    syncMutation.mutate();
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Clients</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all clients in your account including their name, phone and location.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            onClick={handleSync}
            disabled={syncMutation.isLoading}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
          >
            {syncMutation.isLoading ? (
              <>
                <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <ArrowPathIcon className="h-4 w-4 mr-2" />
                Sync Clients
              </>
            )}
          </button>
        </div>
      </div>

      {/* Sync Status Messages */}
      {syncMutation.isSuccess && (
        <div className="mt-4 rounded-md bg-green-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">
                {syncMutation.data?.message || "Successfully synced clients"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="mt-6 mb-4">
        <div className="relative max-w-md">
          <input
            type="text"
            placeholder="Search by name, phone, or city..."
            className="block w-full rounded-md border-0 py-1.5 pl-10 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <MagnifyingGlassIcon 
            className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Error State */}
      {isError && (
        <div className="mt-4 rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <ExclamationCircleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading clients</h3>
              <p className="mt-2 text-sm text-red-700">
                {error?.response?.data?.message || error?.message || "Something went wrong"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Name</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Phone</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">City</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">QID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {isLoading ? (
                    Array(5).fill(0).map((_, index) => (
                      <tr key={index} className="animate-pulse">
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 sm:pl-6">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4">
                          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4">
                          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4">
                          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                        </td>
                      </tr>
                    ))
                  ) : data?.clients?.length > 0 ? (
                    data.clients.map((client) => (
                      <tr key={client.qid} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                          {client.name || 'N/A'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {client.primary_phone || 'N/A'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {client.city || client.attribute_values?.find(attr => attr.name === 'City')?.value || 'N/A'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {client.qid}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="text-center py-8 text-sm text-gray-500">
                        {search ? 'No clients found matching your search criteria' : 'No clients found in the database'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Pagination */}
      {data?.pagination && data.pagination.totalPages > 0 && (
        <div className="mt-5 flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => setPage(page - 1)}
              disabled={!data.pagination.hasPrevious}
              className={`relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium ${data.pagination.hasPrevious ? 'text-gray-700 hover:bg-gray-50' : 'text-gray-300 cursor-not-allowed'}`}
            >
              Previous
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={!data.pagination.hasNext}
              className={`relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium ${data.pagination.hasNext ? 'text-gray-700 hover:bg-gray-50' : 'text-gray-300 cursor-not-allowed'}`}
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing page <span className="font-medium">{data.pagination.currentPage}</span> of{' '}
                <span className="font-medium">{data.pagination.totalPages}</span> pages (
                <span className="font-medium">{data.pagination.totalClients}</span> total clients)
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-sm ${page === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'} ring-1 ring-inset ring-gray-300 focus:z-20 focus:outline-offset-0`}
                >
                  First
                </button>
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={!data.pagination.hasPrevious}
                  className={`relative inline-flex items-center px-2 py-2 text-sm ${!data.pagination.hasPrevious ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'} ring-1 ring-inset ring-gray-300 focus:z-20 focus:outline-offset-0`}
                >
                  Previous
                </button>
                <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 focus:outline-offset-0">
                  {page}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={!data.pagination.hasNext}
                  className={`relative inline-flex items-center px-2 py-2 text-sm ${!data.pagination.hasNext ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'} ring-1 ring-inset ring-gray-300 focus:z-20 focus:outline-offset-0`}
                >
                  Next
                </button>
                <button
                  onClick={() => setPage(data.pagination.totalPages)}
                  disabled={page === data.pagination.totalPages}
                  className={`relative inline-flex items-center rounded-r-md px-2 py-2 text-sm ${page === data.pagination.totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'} ring-1 ring-inset ring-gray-300 focus:z-20 focus:outline-offset-0`}
                >
                  Last
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}