import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRegisteredAccounts, syncRegisteredAccounts } from '../services/registeredAccountService';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import CsvUpload from '../components/CsvUpload';

export default function RegisteredAccounts() {
  const queryClient = useQueryClient();

  // UI state
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [sortField, setSortField] = useState('registrationDate');
  const [sortDirection, setSortDirection] = useState('desc');

  // Fetch all accounts
  const { data: accounts = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['registeredAccounts', sortField, sortDirection],
    queryFn: async () => {
      const res = await getRegisteredAccounts({ sortField, sortDirection, limit: 0 });
      return res.data;
    },
    staleTime: 300,
    refetchOnWindowFocus: true,
    refetchOnMount: true
  });

  // Log fetch count
  useEffect(() => {
    if (accounts.length) console.log(`Fetched ${accounts.length} accounts`);
  }, [accounts]);

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await syncRegisteredAccounts();
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['registeredAccounts'] });
      alert(`Sync complete: ${data.count} records processed.`);
    },
    onError: (err) => {
      console.error('Sync failed:', err);
      alert(`Sync failed: ${err.message}`);
    }
  });

  // Handlers
  const handleSync = () => syncMutation.mutate();
  const handleSort = (field) => {
    if (sortField === field) setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };
  const handleDateChange = (e, field) => {
    setDateRange((prev) => ({ ...prev, [field]: e.target.value }));
    setCurrentPage(1);
  };
  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setDateRange({ from: '', to: '' });
    setCurrentPage(1);
  };

  // Filter, sort, paginate
  const filtered = accounts.filter((acc) => {
    let ok = true;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      ok = acc.accountNumber.toLowerCase().includes(term) ||
           acc.clientName.toLowerCase().includes(term);
    }
    if (ok && statusFilter) ok = acc.status === statusFilter;
    if (ok && (dateRange.from || dateRange.to)) {
      const reg = new Date(acc.registrationDate);
      if (dateRange.from) ok = ok && reg >= new Date(dateRange.from);
      if (dateRange.to) ok = ok && reg <= new Date(dateRange.to);
    }
    return ok;
  });

  const sorted = [...filtered].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sorted.length / itemsPerPage);
  const pageSlice = sorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (isLoading)
    return <p className="text-center p-4">Loading accounts...</p>;

  if (isError)
    return (
      <div className="p-4 text-red-600">
        <p>Error: {error.message}</p>
        <button onClick={refetch} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded">Retry</button>
      </div>
    );

  return (
    <div className="p-4">
      <div className="flex flex-wrap gap-2 items-center mb-4">
        <h1 className="text-2xl font-bold">Registered Accounts ({accounts.length})</h1>
        <input
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          className="px-3 py-1 border rounded"
        />
        <button onClick={() => setFilterOpen(!filterOpen)} className="px-3 py-1 bg-blue-600 text-white rounded">
          {filterOpen ? 'Hide Filters' : 'Show Filters'}
        </button>
        <button
          onClick={handleSync}
          disabled={syncMutation.isLoading}
          className="px-3 py-1 bg-green-600 text-white rounded disabled:opacity-50"
        >
          {syncMutation.isLoading ? 'Syncing...' : 'Refresh Data'}
        </button>
      </div>

      {filterOpen && (
        <div className="mb-4 p-4 bg-gray-100 rounded">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label>From:</label>
              <input type="date" value={dateRange.from} onChange={(e) => handleDateChange(e, 'from')} className="w-full px-2 py-1 border rounded" />
            </div>
            <div>
              <label>To:</label>
              <input type="date" value={dateRange.to} onChange={(e) => handleDateChange(e, 'to')} className="w-full px-2 py-1 border rounded" />
            </div>
            <div>
              <label>Status:</label>
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1);} } className="w-full px-2 py-1 border rounded">
                <option value="">All</option>
                <option>Enabled</option>
                <option>Disabled</option>
                <option>Pending</option>
                <option>Unlocked</option>
              </select>
            </div>
          </div>
          <button onClick={resetFilters} className="mt-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Reset Filters</button>
        </div>
      )}

      <CsvUpload onUploadSuccess={refetch} />

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              {['accountNumber','clientName','pricingGroupId','totalPaid','registrationDate','daysFromReg','status'].map((col) => (
                <th key={col} onClick={() => handleSort(col)} className="px-4 py-2 border-b cursor-pointer hover:bg-gray-200">
                  {col} {sortField === col ? (sortDirection === 'asc' ? '↑' : '↓') : '⇅'}
                </th>
              ))}
              <th className="px-4 py-2 border-b">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageSlice.length ? pageSlice.map((acc) => (
              <tr key={acc._id} className="hover:bg-gray-50">
                <td className="px-4 py-2 border-b">
                  <Link to={`/registered-accounts/detailed/${acc.accountNumber}`} className="text-blue-600 hover:underline">
                    {acc.accountNumber}
                  </Link>
                </td>
                <td className="px-4 py-2 border-b">{acc.clientName}</td>
                <td className="px-4 py-2 border-b">{acc.pricingGroupId?.name || 'N/A'}</td>
                <td className="px-4 py-2 border-b">{acc.totalPaid.toLocaleString('en-US',{style:'currency',currency:'ngn'})}</td>
                <td className="px-4 py-2 border-b">{format(new Date(acc.registrationDate),'yyyy-MM-dd')}</td>
                <td className="px-4 py-2 border-b">{acc.daysFromReg}</td>
                <td className="px-4 py-2 border-b">{acc.status}</td>
                <td className="px-4 py-2 border-b">
                  <Link to={`/registered-accounts/edit/${acc._id}`} className="px-2 py-1 bg-blue-100 rounded hover:bg-blue-200 mr-1">✏️</Link>
                  <button onClick={() => window.confirm('Delete?') && console.log('delete', acc._id)} className="px-2 py-1 bg-red-100 rounded hover:bg-red-200">🗑️</button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="9" className="py-4 text-center">No records found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-between items-center">
        <span>Page {currentPage} of {totalPages}</span>
        <div className="flex gap-2">
          <button disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => p - 1)} className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50">Prev</button>
          <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)} className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50">Next</button>
        </div>
      </div>
    </div>
  );
}
