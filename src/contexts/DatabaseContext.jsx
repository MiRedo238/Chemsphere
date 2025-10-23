import { createContext, useState, useEffect, useContext } from 'react';
import {
  getChemicals,
  addChemical,
  getEquipment,
  addUsageLog,
  getUsageLogs,
  getAuditLogs,
  addAuditLog // Make sure this is imported
} from '../services/database';

export const DatabaseContext = createContext();

export function DatabaseProvider({ children }) {
  const [chemicals, setChemicals] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [usageLogs, setUsageLogs] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
 
  // Function to refresh audit logs
  const fetchAuditLogs = async () => {
    try {
      const result = await getAuditLogs();
      setAuditLogs(result.data || []);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    }
  };

  // Function to add audit log
  const addAuditLogEntry = async (logData) => {
    try {
      const result = await addAuditLog(logData);
      // Refresh audit logs after adding new one
      await fetchAuditLogs();
      return result;
    } catch (err) {
      console.error('Error adding audit log:', err);
      throw err;
    }
  };

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        
        const [chemicalsResult, equipmentResult, usageLogsResult, auditLogsResult] = await Promise.allSettled([
          getChemicals(),
          getEquipment(),
          getUsageLogs(),
          getAuditLogs() // Make sure this is called
        ]);

        setChemicals(chemicalsResult.status === 'fulfilled' ? (chemicalsResult.value.data || []) : []);
        setEquipment(equipmentResult.status === 'fulfilled' ? (equipmentResult.value.data || []) : []);
        setUsageLogs(usageLogsResult.status === 'fulfilled' ? (usageLogsResult.value.data || []) : []);
        setAuditLogs(auditLogsResult.status === 'fulfilled' ? (auditLogsResult.value.data || []) : []);

        if (auditLogsResult.status === 'rejected') {
          console.warn('Failed to fetch audit logs:', auditLogsResult.reason);
        }

      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load some data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);
  

  return (
    <DatabaseContext.Provider
      value={{
        chemicals,
        setChemicals,
        addChemical,
        equipment,
        setEquipment,
        usageLogs,
        setUsageLogs,
        addUsageLog,
        auditLogs,
        setAuditLogs,
        fetchAuditLogs, // Add this function
        addAuditLog: addAuditLogEntry, // Add this function
        loading,
        error
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
}