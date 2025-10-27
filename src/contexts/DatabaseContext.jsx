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
  const [lastFetched, setLastFetched] = useState({});

  // Cache timeout (5 minutes)
  const CACHE_TIMEOUT = 1000 * 60 * 5;

  // ✅ Cached Fetch Helper
  const shouldRefetch = (key) => {
    const now = Date.now();
    const last = lastFetched[key];
    return !last || now - last > CACHE_TIMEOUT;
  };

  // ✅ Fetch chemicals (with cache + pagination)
  const fetchChemicals = async (force = false, page = 1, pageSize = 100) => {
    if (!force && chemicals.length > 0 && !shouldRefetch('chemicals')) {
      return chemicals;
    }

    try {
      setLoading(true);
      setError(null);
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const result = await getChemicals(from, to); // should support .range(from,to)
      const data = result.data || [];

      setChemicals(data);
      setLastFetched(prev => ({ ...prev, chemicals: Date.now() }));
      return data;
    } catch (err) {
      console.error('Error fetching chemicals:', err);
      setError('Failed to fetch chemicals.');
      return chemicals;
    } finally {
      setLoading(false);
    }
  };

  const refreshChemicals = async () => {
    return await fetchChemicals(true);
  };

  // ✅ Fetch equipment (with cache)
  const fetchEquipment = async (force = false) => {
    if (!force && equipment.length > 0 && !shouldRefetch('equipment')) {
      return equipment;
    }

    try {
      setLoading(true);
      const result = await getEquipment();
      const data = result.data || [];

      setEquipment(data);
      setLastFetched(prev => ({ ...prev, equipment: Date.now() }));
      return data;
    } catch (err) {
      console.error('Error fetching equipment:', err);
      setError('Failed to fetch equipment.');
      return equipment;
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fetch usage logs (with cache)
  const fetchUsageLogs = async (force = false) => {
    if (!force && usageLogs.length > 0 && !shouldRefetch('usageLogs')) {
      return usageLogs;
    }

    try {
      const result = await getUsageLogs();
      const data = result.data || [];
      setUsageLogs(data);
      setLastFetched(prev => ({ ...prev, usageLogs: Date.now() }));
      return data;
    } catch (err) {
      console.error('Error fetching usage logs:', err);
      return usageLogs;
    }
  };

  // ✅ Fetch audit logs (with cache)
  const fetchAuditLogs = async (force = false, page = 1, pageSize = 100) => {
    if (!force && auditLogs.length > 0 && !shouldRefetch('auditLogs')) {
      return auditLogs;
    }

    try {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const result = await getAuditLogs(from, to);
      const data = result.data || [];

      setAuditLogs(data);
      setLastFetched(prev => ({ ...prev, auditLogs: Date.now() }));
      return data;
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      return auditLogs;
    }
  };

  // ✅ Add new audit log and refresh cache
  const addAuditLogEntry = async (logData) => {
    try {
      const result = await addAuditLog(logData);
      await fetchAuditLogs(true); // force refresh after new log
      return result;
    } catch (err) {
      console.error('Error adding audit log:', err);
      throw err;
    }
  };

  // ✅ Initial load (once)
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        // Run in parallel (with caching)
        const [chemRes, equipRes, usageRes, auditRes] = await Promise.allSettled([
          fetchChemicals(true),
          fetchEquipment(true),
          fetchUsageLogs(true),
          fetchAuditLogs(true)
        ]);

        if (chemRes.status === 'rejected') console.warn('Failed to fetch chemicals');
        if (equipRes.status === 'rejected') console.warn('Failed to fetch equipment');
        if (usageRes.status === 'rejected') console.warn('Failed to fetch usage logs');
        if (auditRes.status === 'rejected') console.warn('Failed to fetch audit logs');
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load some data.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return (
    <DatabaseContext.Provider
      value={{
        chemicals,
        setChemicals,
        fetchChemicals,
        addChemical,
        refreshChemicals,
        equipment,
        setEquipment,
        fetchEquipment,
        usageLogs,
        setUsageLogs,
        addUsageLog,
        fetchUsageLogs,
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
