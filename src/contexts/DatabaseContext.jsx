// DatabaseContext.jsx
import { createContext, useState, useEffect, useContext } from 'react';
import {
  getChemicals,
  addChemical,
  getEquipment,
  addUsageLog,
  getUsageLogs,
  getAuditLogs,
  addAuditLog
} from '../services/database';

export const DatabaseContext = createContext();

export function DatabaseProvider({ children }) {
  const [chemicals, setChemicals] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [usageLogs, setUsageLogs] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Define fetchChemicals function
  const fetchChemicals = async () => {
    try {
      const result = await getChemicals();
      setChemicals(result.data || []);
    } catch (err) {
      console.error('Error fetching chemicals:', err);
      throw err;
    }
  };

  // Define fetchEquipment function
  const fetchEquipment = async () => {
    try {
      const result = await getEquipment();
      setEquipment(result.data || []);
    } catch (err) {
      console.error('Error fetching equipment:', err);
      throw err;
    }
  };

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
          getAuditLogs()
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
        fetchChemicals, 
        addChemical,
        equipment,
        setEquipment,
        fetchEquipment,
        usageLogs,
        setUsageLogs,
        addUsageLog,
        auditLogs,
        setAuditLogs,
        fetchAuditLogs,
        addAuditLog: addAuditLogEntry,
        loading,
        error
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
}