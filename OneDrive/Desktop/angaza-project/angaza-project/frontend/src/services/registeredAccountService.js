// frontend/src/services/registeredAccountService.js
import api from './api';

// GET all registered accounts
export const getRegisteredAccounts = (params = {}) => {
    // Convert params object to URL query string
    const queryString = new URLSearchParams(
      Object.entries(params).filter(([_, value]) => value !== undefined)
    ).toString();
    
    return api.get(`/registered-accounts${queryString ? `?${queryString}` : ''}`);
  };
// GET one account by account number
export const getRegisteredAccount = (accountNumber) =>
  api.get(`/registered-accounts/${accountNumber}`);

// GET detailed account by number (alias)
export const getRegisteredAccountDetail = (accountNumber) =>
  api.get(`/registered-accounts/${accountNumber}`);

// SYNC accounts with external source (e.g., Angaza)
export const syncRegisteredAccounts = () =>
  api.post('/registered-accounts/sync');

// DELETE a registered account
export const deleteRegisteredAccount = (accountNumber) =>
  api.delete(`/registered-accounts/${accountNumber}`);

// UPDATE a registered account
export const updateRegisteredAccount = (accountNumber, updatedData) =>
  api.put(`/registered-accounts/${accountNumber}`, updatedData);

// UPLOAD a CSV file for bulk sync
export const uploadCsv = (formData) => {
  return api.post('/registered-accounts/upload-csv', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
};