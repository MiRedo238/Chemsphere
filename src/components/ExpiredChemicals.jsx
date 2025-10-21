
import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { csvService } from '../services/csvService';
import { DatabaseContext } from '../contexts/DatabaseContext';


const ExpiredChemicals = () => {
  const { chemicals, loading } = useContext(DatabaseContext);
  const navigate = useNavigate();
  const error = '';

  const handleExportCSV = () => {
    try {
      const formattedData = chemicals.map(chemical => ({
        ...chemical,
        expiration_date: format(new Date(chemical.expiration_date), 'yyyy-MM-dd'),
        date_of_arrival: format(new Date(chemical.date_of_arrival), 'yyyy-MM-dd'),
        ghs_symbols: chemical.ghs_symbols?.join(', ') || ''
      }));
      csvService.generateCSV(formattedData, 'expired-chemicals.csv');
    } catch (err) {
      setError('Failed to export data');
      console.error(err);
    }
  };

  const handleChemicalClick = (id) => {
    navigate(`/chemicals/${id}`);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-full">Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Expired Chemicals</h1>
        <button
          onClick={handleExportCSV}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Export to CSV
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch Number</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiration Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Quantity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Safety Class</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {chemicals.map((chemical) => (
              <tr
                key={chemical.id}
                onClick={() => handleChemicalClick(chemical.id)}
                className="cursor-pointer hover:bg-gray-50"
              >
                <td className="px-6 py-4 whitespace-nowrap">{chemical.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{chemical.batch_number}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {format(new Date(chemical.expiration_date), 'yyyy-MM-dd')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{chemical.current_quantity}</td>
                <td className="px-6 py-4 whitespace-nowrap">{chemical.location}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                    ${
                      chemical.safety_class === 'moderate' ? 'bg-gray-100 text-gray-800' :
                      chemical.safety_class === 'toxic' ? 'bg-blue-100 text-blue-800' :
                      chemical.safety_class === 'corrosive' ? 'bg-purple-100 text-purple-800' :
                      chemical.safety_class === 'reactive' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }
                  `}>
                    {chemical.safety_class}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {chemicals.length === 0 && (
        <div className="text-center text-gray-500 mt-8">
          No expired chemicals found.
        </div>
      )}
    </div>
  );
};

export default ExpiredChemicals;