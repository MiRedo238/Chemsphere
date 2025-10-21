import { createContext, useState, useEffect } from 'react';
import {
  getChemicals,
  addChemical,
  getEquipment,
  addUsageLog,
  getUsageLogs,
  getAuditLogs
} from '../services/database';

export const DatabaseContext = createContext();

export function DatabaseProvider({ children }) {
  const [chemicals, setChemicals] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [usageLogs, setUsageLogs] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        
        // Use Promise.allSettled to handle individual failures
        const [chemicalsResult, equipmentResult, usageLogsResult, auditLogsResult] = await Promise.allSettled([
          getChemicals(),
          getEquipment(),
          getUsageLogs(),
          getAuditLogs()
        ]);

        // Handle each result individually
        setChemicals(chemicalsResult.status === 'fulfilled' ? (chemicalsResult.value.data || []) : []);
        setEquipment(equipmentResult.status === 'fulfilled' ? (equipmentResult.value.data || []) : []);
        setUsageLogs(usageLogsResult.status === 'fulfilled' ? (usageLogsResult.value.data || []) : []);
        setAuditLogs(auditLogsResult.status === 'fulfilled' ? (auditLogsResult.value.data || []) : []);

        // Log any errors but don't block the app
        if (chemicalsResult.status === 'rejected') console.warn('Failed to fetch chemicals:', chemicalsResult.reason);
        if (equipmentResult.status === 'rejected') console.warn('Failed to fetch equipment:', equipmentResult.reason);
        if (usageLogsResult.status === 'rejected') console.warn('Failed to fetch usage logs:', usageLogsResult.reason);
        if (auditLogsResult.status === 'rejected') console.warn('Failed to fetch audit logs:', auditLogsResult.reason);

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
        loading,
        error
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
}