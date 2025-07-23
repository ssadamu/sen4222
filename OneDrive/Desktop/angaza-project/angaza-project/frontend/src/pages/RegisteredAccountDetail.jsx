import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getRegisteredAccountDetail } from '../services/registeredAccounts';
import { format } from 'date-fns';

const RegisteredAccountDetail = () => {
  const { accountNumber } = useParams();

  const {
    data: account,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['registeredAccountDetail', accountNumber],
    queryFn: () => getRegisteredAccountDetail(accountNumber).then((res) => res.data),
    enabled: !!accountNumber,
  });

  if (isLoading) return <div className="p-4">Loading account details...</div>;
  if (isError) return <div className="p-4 text-red-500">Error: {error.message}</div>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Account Details: {account.accountNumber}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p><strong>Client Name:</strong> {account.clientName}</p>
          <p><strong>Status:</strong> {account.status}</p>
          <p><strong>Pricing Group:</strong> {account.pricingGroupId?.name || 'N/A'}</p>
        </div>
        <div>
          <p><strong>Total Paid:</strong> {account.totalPaid?.toLocaleString() || 0}</p>
          <p><strong>Registration Date:</strong> {account.registrationDate ? format(new Date(account.registrationDate), 'yyyy-MM-dd') : 'N/A'}</p>
          <p><strong>Days Since Registration:</strong> {account.daysFromReg}</p>
        </div>
      </div>

      {account?.images?.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Images</h3>
          <div className="flex gap-4 flex-wrap">
            {account.images.map((url, idx) => (
              <img key={idx} src={url} alt={`Account image ${idx + 1}`} className="w-40 h-40 object-cover rounded shadow" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisteredAccountDetail;