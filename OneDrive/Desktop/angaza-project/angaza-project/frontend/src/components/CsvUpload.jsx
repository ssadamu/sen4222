import React, { useState } from 'react';
import { uploadCsv } from '../services/registeredAccountService';

function CsvUpload({ onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState(null);
  const [errors, setErrors] = useState([]);

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!file || !file.name.endsWith('.csv')) {
      return setMessage('Please select a valid CSV file.');
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await uploadCsv(formData);
      setMessage(`✅ Upload complete: ${res.data.newRecords} new, ${res.data.updatedRecords} updated`);
      setErrors(res.data.errors || []);
      onUploadSuccess && onUploadSuccess();
    } catch (err) {
      setMessage('❌ Upload failed: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="bg-white p-4 border rounded shadow-sm mb-6">
      <h2 className="text-lg font-semibold mb-2">Upload CSV File</h2>
      <form onSubmit={handleUpload} className="flex items-center gap-4 flex-wrap">
        <input
          type="file"
          accept=".csv"
          onChange={(e) => setFile(e.target.files[0])}
          className="border px-3 py-2 rounded"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Upload
        </button>
      </form>
      {message && <div className="mt-3 text-sm text-gray-700">{message}</div>}
      {errors.length > 0 && (
        <div className="mt-3 text-sm text-red-600">
          <strong>Validation Errors:</strong>
          <ul className="list-disc pl-6">
            {errors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default CsvUpload;
