/**
 * DataStore — Single Source of Truth
 * 
 * Patrón Observer centralizado para datos compartidos.
 * Evita data fragmentation entre módulos (PlanModule, GanttModule, 
 * CalendarModule, StatsModule, HitosModule, DocumentsModule).
 * 
 * USO:
 *   - Lectura:     DataStore.plan          (getter directo)
 *   - Mutación:    await DataStore.refreshPlan()
 *   - Suscripción: DataStore.on('plan:updated', (data) => { ... })
 *   - Desuscribir: DataStore.off('plan:updated', handler)
 */
const DataStore = {

    // ─── Estado interno ──────────────────────────────────────────
    _state: {
        plan: [],
        hitos: [],
        repositorio: []
    },

    _listeners: {},

    // ─── Getters (read-only access) ──────────────────────────────
    get plan() { return this._state.plan; },
    get hitos() { return this._state.hitos; },
    get repositorio() { return this._state.repositorio; },

    // ─── Event Bus ───────────────────────────────────────────────
    on(event, callback) {
        if (!this._listeners[event]) this._listeners[event] = [];
        this._listeners[event].push(callback);
    },

    off(event, callback) {
        if (!this._listeners[event]) return;
        this._listeners[event] = this._listeners[event].filter(cb => cb !== callback);
    },

    _emit(event, data) {
        (this._listeners[event] || []).forEach(cb => {
            try { cb(data); } catch (e) { console.error(`[DataStore] Error in ${event} listener:`, e); }
        });
    },

    // ─── Data Refresh Methods ────────────────────────────────────

    /**
     * Refresca datos del Plan Maestro desde la API.
     * Notifica a todos los suscriptores de 'plan:updated'.
     */
    refreshPlan: async () => {
        try {
            const data = await API.get('/plan-maestro?t=' + Date.now());
            if (data) {
                DataStore._state.plan = data;
                // Backward compat: mantener window.appData.plan sincronizado
                window.appData = window.appData || {};
                window.appData.plan = data;
                DataStore._emit('plan:updated', data);
            }
            return data;
        } catch (e) {
            console.error('[DataStore] Error refreshing plan:', e);
            return null;
        }
    },

    /**
     * Refresca Hitos desde la API.
     * Notifica a todos los suscriptores de 'hitos:updated'.
     */
    refreshHitos: async () => {
        try {
            const data = await API.get('/hitos?t=' + Date.now());
            if (data) {
                DataStore._state.hitos = data;
                DataStore._emit('hitos:updated', data);
            }
            return data;
        } catch (e) {
            console.error('[DataStore] Error refreshing hitos:', e);
            return [];
        }
    },

    /**
     * Refresca Repositorio desde la API.
     * Notifica a todos los suscriptores de 'repo:updated'.
     */
    refreshRepo: async () => {
        try {
            const data = await API.get('/repositorio');
            if (data) {
                DataStore._state.repositorio = data;
                DataStore._emit('repo:updated', data);
            }
            return data;
        } catch (e) {
            console.error('[DataStore] Error refreshing repo:', e);
            return [];
        }
    },

    /**
     * Refresca Plan + Hitos en paralelo.
     * Útil para vistas que necesitan ambos datasets (Gantt, Calendar).
     */
    refreshAll: async () => {
        const [plan, hitos] = await Promise.all([
            DataStore.refreshPlan(),
            DataStore.refreshHitos()
        ]);
        return { plan, hitos };
    },

    /**
     * Busca un item del plan por ID (lectura desde la fuente central).
     */
    findPlanItem: (id) => {
        return DataStore._state.plan.find(i => i.id === id) || null;
    }
};
