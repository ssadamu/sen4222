// frontend/src/services/registeredAccountService.js
import api from './api';

export const getRegisteredAccounts = () => api.get('/registered-accounts');

export const getRegisteredAccount = (accountNumber) =>
  api.get(`/registered-accounts/${accountNumber}`);

export const syncRegisteredAccounts = () => api.post('/registered-accounts/sync'); // or whichever route you used

export const getRegisteredAccountDetail = (accountNumber) => {
    return api.get(`/registered-accounts/${accountNumber}`);
  };
  
export const uploadCsv = (formData) =>
  api.post('/registered-accounts/upload-csv', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
