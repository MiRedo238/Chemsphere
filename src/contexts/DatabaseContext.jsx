// DatabaseContext.jsx
import { createContext, useState, useEffect, useContext, useRef } from 'react';
import {
  getChemicals,
  getUsageLogs,
  addAuditLog
} from '../services/database';
import {
  createChemical as apiCreateChemical,
  updateChemical as apiUpdateChemical,
  deleteChemical as apiDeleteChemical,
  createEquipment as apiCreateEquipment,
  updateEquipment as apiUpdateEquipment,
  deleteEquipment as apiDeleteEquipment,
  logChemicalUsage as apiLogChemicalUsage,
  getAuditLogs as apiGetAuditLogs,
  getEquipment as apiGetEquipment
} from '../services/api';
import { updateChemicalUsageLog as apiUpdateChemicalUsageLog, deleteChemicalUsageLog as apiDeleteChemicalUsageLog } from '../services/usageLogService';
import { updateChemicalQuantity as apiUpdateChemicalQuantity } from '../services/chemicalService';
import { supabase } from '../lib/supabase/supabaseClient';

export const DatabaseContext = createContext();

export function DatabaseProvider({ children }) {
  const [chemicals, setChemicals] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [usageLogs, setUsageLogs] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [_lastFetched, setLastFetched] = useState({});
  const subsInitializedRef = useRef(false);

  // Optimistic mode: do not automatically refresh cached data on a timeout.
  // Data is fetched on first load and only refreshed on explicit mutations.

  // ✅ Fetch chemicals (with cache + pagination)
  const fetchChemicals = async (force = false) => {
    console.debug('DatabaseContext.fetchChemicals called', { force });
    if (!force && chemicals.length > 0) {
      // Serve cached data — optimistic behaviour
      return chemicals;
    }

    try {
      setLoading(true);
      setError(null);
      // `getChemicals` in `services/database` returns { data, error }
      const result = await getChemicals();
      const data = Array.isArray(result) ? result : (result && result.data) ? result.data : [];

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
    console.debug('DatabaseContext.fetchEquipment called', { force });
    if (!force && equipment.length > 0) return equipment;

    try {
      setLoading(true);
      const data = await apiGetEquipment();
      setEquipment(data || []);
      setLastFetched(prev => ({ ...prev, equipment: Date.now() }));
      return data || [];
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
    console.debug('DatabaseContext.fetchUsageLogs called', { force });
    if (!force && usageLogs.length > 0) return usageLogs;

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
    console.debug('DatabaseContext.fetchAuditLogs called', { force, page, pageSize });
    if (!force && auditLogs.length > 0) return auditLogs;

    try {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const data = await apiGetAuditLogs(from, to);
      setAuditLogs(data || []);
      setLastFetched(prev => ({ ...prev, auditLogs: Date.now() }));
      return data || [];
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      return auditLogs;
    }
  };

  // ✅ Add new audit log (optimistic: append locally and let server confirm)
  const addAuditLogEntry = async (logData) => {
    const temp = { id: `temp-${Date.now()}`, ...logData, created_at: new Date().toISOString() };
    setAuditLogs(prev => [temp, ...prev]);
    try {
      const result = await addAuditLog(logData);
      // Refresh only the audit logs list entry if server returns data
      await fetchAuditLogs(true);
      return result;
    } catch (err) {
      console.error('Error adding audit log:', err);
      // rollback optimistic add
      setAuditLogs(prev => prev.filter(a => a.id !== temp.id));
      throw err;
    }
  };

  // Optimistic create/update/delete helpers for chemicals
  // Create chemical: by default perform server-first flow (no optimistic UI)
  // Pass { optimistic: true } as second arg to enable optimistic insertion.
  const createChemical = async (chemicalData, { optimistic = false } = {}) => {
    const tempId = `temp-${Date.now()}`;
    const temp = { ...chemicalData, id: tempId };

    if (optimistic) setChemicals(prev => [temp, ...prev]);

    try {
      const created = await apiCreateChemical(chemicalData);
      console.debug('createChemical: server response', created);

      // If server returned an unexpected shape, refresh full chemicals list
      if (!created || (typeof created === 'object' && !created.id)) {
        console.warn('createChemical: unexpected server response, refreshing cache', created);
        await fetchChemicals(true);
        return created;
      }

      // Refresh the cache from server to ensure canonical state
      await fetchChemicals(true);

      // If optimistic, replace temp; otherwise the refreshed cache will include the new item
      if (optimistic) {
        setChemicals(prev => prev.map(c => (c.id === tempId ? created : c)));
      }

      return created;
    } catch (err) {
      // rollback optimistic insert if used
      if (optimistic) setChemicals(prev => prev.filter(c => c.id !== tempId));
      console.error('Failed to create chemical:', err);
      try {
        const message = err?.message || JSON.stringify(err);
        console.debug('createChemical error message:', message);
      } catch (e) {
        console.debug('createChemical: error stringify failed', e);
      }
      // Ensure UI reflects server state
      try {
        await fetchChemicals(true);
      } catch (e) {
        console.debug('createChemical: fetchChemicals failed after create error', e);
      }
      throw err;
    }
  };

  const updateChemical = async (id, updates) => {
    const prevItem = chemicals.find(c => c.id === id);
    if (!prevItem) throw new Error('Chemical not found in cache');
    const updated = { ...prevItem, ...updates };
    setChemicals(prev => prev.map(c => (c.id === id ? updated : c)));
    try {
      const serverUpdated = await apiUpdateChemical(id, updates);
      setChemicals(prev => prev.map(c => (c.id === id ? serverUpdated : c)));
      return serverUpdated;
    } catch (err) {
      // rollback
      setChemicals(prev => prev.map(c => (c.id === id ? prevItem : c)));
      console.error('Failed to update chemical:', err);
      throw err;
    }
  };

  const deleteChemical = async (id) => {
    const prevItem = chemicals.find(c => c.id === id);
    setChemicals(prev => prev.filter(c => c.id !== id));
    try {
      await apiDeleteChemical(id);
      return true;
    } catch (err) {
      // rollback
      setChemicals(prev => [prevItem, ...prev]);
      console.error('Failed to delete chemical:', err);
      throw err;
    }
  };

  // Equipment optimistic helpers
  const createEquipment = async (data) => {
    const tempId = `temp-${Date.now()}`;
    const temp = { ...data, id: tempId, type: 'equipment' };
    setEquipment(prev => [temp, ...prev]);
    try {
      const created = await apiCreateEquipment(data);
      setEquipment(prev => prev.map(e => (e.id === tempId ? { ...created, type: 'equipment' } : e)));
      return created;
    } catch (err) {
      setEquipment(prev => prev.filter(e => e.id !== tempId));
      console.error('Failed to create equipment:', err);
      throw err;
    }
  };

  const updateEquipment = async (id, updates) => {
    const prevItem = equipment.find(e => e.id === id);
    if (!prevItem) throw new Error('Equipment not found in cache');
    const updated = { ...prevItem, ...updates };
    setEquipment(prev => prev.map(e => (e.id === id ? updated : e)));
    try {
      const serverUpdated = await apiUpdateEquipment(id, updates);
      setEquipment(prev => prev.map(e => (e.id === id ? { ...serverUpdated, type: 'equipment' } : e)));
      return serverUpdated;
    } catch (err) {
      setEquipment(prev => prev.map(e => (e.id === id ? prevItem : e)));
      console.error('Failed to update equipment:', err);
      throw err;
    }
  };

  const deleteEquipment = async (id) => {
    const prevItem = equipment.find(e => e.id === id);
    setEquipment(prev => prev.filter(e => e.id !== id));
    try {
      await apiDeleteEquipment(id);
      return true;
    } catch (err) {
      setEquipment(prev => [prevItem, ...prev]);
      console.error('Failed to delete equipment:', err);
      throw err;
    }
  };

  // Usage logs + chemical quantity update (optimistic)
  const logUsage = async (usageData) => {
    // Optimistic create: append a temporary log locally and replace on server response
    const tempId = `temp-${Date.now()}`;
    const temp = { id: tempId, ...usageData, created_at: new Date().toISOString() };
    setUsageLogs(prev => [temp, ...prev]);
    try {
      const created = await apiLogChemicalUsage(usageData);
      setUsageLogs(prev => prev.map(l => (l.id === tempId ? created : l)));
      return created;
    } catch (err) {
      // rollback
      setUsageLogs(prev => prev.filter(l => l.id !== tempId));
      console.error('Failed to log usage:', err);
      throw err;
    }
  };

  // Optimistic update/delete for usage logs
  const updateUsageLog = async (id, updates) => {
    const prevItem = usageLogs.find(u => u.id === id);
    if (!prevItem) throw new Error('Usage log not found in cache');
    const updated = { ...prevItem, ...updates };
    setUsageLogs(prev => prev.map(u => (u.id === id ? updated : u)));
    try {
      const serverUpdated = await apiUpdateChemicalUsageLog(id, updates);
      setUsageLogs(prev => prev.map(u => (u.id === id ? serverUpdated : u)));
      return serverUpdated;
    } catch (err) {
      // rollback
      setUsageLogs(prev => prev.map(u => (u.id === id ? prevItem : u)));
      console.error('Failed to update usage log:', err);
      throw err;
    }
  };

  const deleteUsageLog = async (id) => {
    const prevItem = usageLogs.find(u => u.id === id);
    setUsageLogs(prev => prev.filter(u => u.id !== id));
    try {
      await apiDeleteChemicalUsageLog(id);
      return true;
    } catch (err) {
      // rollback
      setUsageLogs(prev => [prevItem, ...prev]);
      console.error('Failed to delete usage log:', err);
      throw err;
    }
  };

  const updateChemicalQuantity = async (id, quantityUsed) => {
    const prevItem = chemicals.find(c => c.id === id);
    if (!prevItem) throw new Error('Chemical not found in cache');
    const newQuantity = Math.max(0, (prevItem.current_quantity || 0) - quantityUsed);
    setChemicals(prev => prev.map(c => (c.id === id ? { ...c, current_quantity: newQuantity } : c)));
    try {
      const serverUpdated = await apiUpdateChemicalQuantity(id, quantityUsed);
      // serverUpdated is full record; sync it
      setChemicals(prev => prev.map(c => (c.id === id ? serverUpdated : c)));
      return serverUpdated;
    } catch (err) {
      // rollback
      setChemicals(prev => prev.map(c => (c.id === id ? prevItem : c)));
      console.error('Failed to update chemical quantity:', err);
      throw err;
    }
  };

  // Import helpers (wrap API import and refresh cache)
  const importChemicals = async (dataArray) => {
    try {
      setLoading(true);
      // call the API import function directly
      const imported = await (await import('../services/api')).importChemicals(dataArray);
      // Refresh cached chemicals
      await fetchChemicals(true);
      return imported;
    } catch (err) {
      console.error('Failed to import chemicals:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const importEquipment = async (dataArray) => {
    try {
      setLoading(true);
      const imported = await (await import('../services/api')).importEquipment(dataArray);
      await fetchEquipment(true);
      return imported;
    } catch (err) {
      console.error('Failed to import equipment:', err);
      throw err;
    } finally {
      setLoading(false);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Supabase realtime subscriptions: update local cache only when DB changes
  useEffect(() => {
    // Prevent double subscription in React StrictMode / hot-reload
    if (subsInitializedRef.current) return;
    subsInitializedRef.current = true;
    // Helper to apply payload changes
    const applyPayload = (table, payload) => {
      const { eventType, new: newRow, old: oldRow } = payload;
      if (table === 'chemicals') {
        if (eventType === 'INSERT') {
          setChemicals(prev => {
            if (prev.find(p => p.id === newRow.id)) return prev;
            return [newRow, ...prev];
          });
        } else if (eventType === 'UPDATE') {
          setChemicals(prev => prev.map(p => (p.id === newRow.id ? newRow : p)));
        } else if (eventType === 'DELETE') {
          setChemicals(prev => prev.filter(p => p.id !== oldRow.id));
        }
      } else if (table === 'equipment') {
        if (eventType === 'INSERT') {
          setEquipment(prev => {
            if (prev.find(p => p.id === newRow.id)) return prev;
            return [newRow, ...prev];
          });
        } else if (eventType === 'UPDATE') {
          setEquipment(prev => prev.map(p => (p.id === newRow.id ? newRow : p)));
        } else if (eventType === 'DELETE') {
          setEquipment(prev => prev.filter(p => p.id !== oldRow.id));
        }
      } else if (table === 'usage_logs') {
        if (eventType === 'INSERT') {
          setUsageLogs(prev => [newRow, ...prev]);
        } else if (eventType === 'UPDATE') {
          setUsageLogs(prev => prev.map(p => (p.id === newRow.id ? newRow : p)));
        } else if (eventType === 'DELETE') {
          setUsageLogs(prev => prev.filter(p => p.id !== oldRow.id));
        }
      } else if (table === 'audit_logs') {
        if (eventType === 'INSERT') {
          setAuditLogs(prev => [newRow, ...prev]);
        } else if (eventType === 'UPDATE') {
          setAuditLogs(prev => prev.map(p => (p.id === newRow.id ? newRow : p)));
        } else if (eventType === 'DELETE') {
          setAuditLogs(prev => prev.filter(p => p.id !== oldRow.id));
        }
      }
    };

    // Subscribe using the new channels API where available
    try {
      console.log('📡 Setting up realtime subscriptions for chemicals/equipment/usage/audit');
      const chemicalChannel = supabase
        .channel('public:chemicals')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'chemicals' }, (payload) => {
          applyPayload('chemicals', payload);
        })
        .subscribe();

      const equipmentChannel = supabase
        .channel('public:equipment')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'equipment' }, (payload) => {
          applyPayload('equipment', payload);
        })
        .subscribe();

      const usageChannel = supabase
        .channel('public:usage_logs')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'usage_logs' }, (payload) => {
          applyPayload('usage_logs', payload);
        })
        .subscribe();

      const auditChannel = supabase
        .channel('public:audit_logs')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_logs' }, (payload) => {
          applyPayload('audit_logs', payload);
        })
        .subscribe();

      return () => {
        subsInitializedRef.current = false;
        // use optional chaining to unsubscribe safely
        try {
          chemicalChannel?.unsubscribe?.();
        } catch {
          // ignore
        }
        try {
          equipmentChannel?.unsubscribe?.();
        } catch {
          // ignore
        }
        try {
          usageChannel?.unsubscribe?.();
        } catch {
          // ignore
        }
        try {
          auditChannel?.unsubscribe?.();
        } catch {
          // ignore
        }
      };
    } catch (err) {
      console.warn('Realtime subscription setup failed', err);
      return undefined;
    }
  }, []);

  return (
    <DatabaseContext.Provider
      value={{
        chemicals,
        setChemicals,
        fetchChemicals,
        createChemical,
        updateChemical,
        deleteChemical,
        refreshChemicals,
        equipment,
        setEquipment,
        fetchEquipment,
        createEquipment,
        updateEquipment,
        deleteEquipment,
        usageLogs,
        setUsageLogs,
        logUsage,
        fetchUsageLogs,
        updateUsageLog,
        deleteUsageLog,
        auditLogs,
        setAuditLogs,
        fetchAuditLogs,
        addAuditLog: addAuditLogEntry,
        importChemicals,
        importEquipment,
        updateChemicalQuantity,
        loading,
        error
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
}
