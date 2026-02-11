
const HitosModule = {
    data: [],
    editingId: null,

    init: async () => {
        const tbody = document.getElementById('hitosTableBody');
        if (tbody) {
            const skeletonRow = `
                <tr class="animate-pulse border-b border-slate-50">
                    <td class="p-4"><div class="h-4 bg-slate-100 rounded w-24"></div></td>
                    <td class="p-4"><div class="h-4 bg-slate-100 rounded w-32"></div></td>
                    <td class="p-4"><div class="h-4 bg-slate-100 rounded w-40"></div></td>
                    <td class="p-4"><div class="h-4 bg-slate-100 rounded w-20"></div></td>
                    <td class="p-4"><div class="h-4 bg-slate-100 rounded w-16"></div></td>
                </tr>`;
            tbody.innerHTML = Array(5).fill(skeletonRow).join('');
        }

        Utils.renderBreadcrumbs(['Inicio', 'Hitos e Inspectores']);

        const data = await DataStore.refreshHitos();
        HitosModule.data = data || [];

        Utils.setupCascadingFilters({
            data: HitosModule.data,
            filters: [
                { id: 'hitoFilterProduct', key: 'product_code' },
                { id: 'hitoFilterResp', key: 'primary_responsible' }, // Assuming backend provides this
                { id: 'hitoFilterStatus', key: 'estado' }
            ],
            chipsContainerId: 'hitosActiveChips',
            search: {
                id: 'hitoSearch',
                keys: ['nombre', 'task_name', 'activity_code']
            },
            onFilter: (filtered) => {
                HitosModule.render(filtered);
            }
        });

        HitosModule.setupEvents();
    },

    setupEvents: () => {
        const btn = document.getElementById('btnNewHitoGlobal');
        if (btn) {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.addEventListener('click', () => HitosModule.openModal());
        }

        const form = document.getElementById('hitoGlobalForm');
        if (form) {
            const newForm = form.cloneNode(true);
            form.parentNode.replaceChild(newForm, form);
            newForm.addEventListener('submit', HitosModule.save);
        }
    },

    render: (data) => {
        const tbody = document.getElementById('hitosTableBody');
        tbody.innerHTML = '';

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center p-8 text-slate-400 italic">No hay hitos registrados con los filtros actuales.</td></tr>';
            return;
        }

        data.forEach(h => {
            const tr = document.createElement('tr');
            const status = h.estado || 'Pendiente';

            // Define colors for select border/text based on status
            let statusColor = 'text-slate-600 bg-slate-50 border-slate-200';
            if (status === 'Completado') statusColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
            else if (status === 'En Progreso') statusColor = 'text-blue-700 bg-blue-50 border-blue-200';
            else if (status === 'Pendiente') statusColor = 'text-amber-700 bg-amber-50 border-amber-200';

            tr.innerHTML = `
                <td>
                    <div style="font-weight:700; color:#334155;">${h.nombre}</div>
                    <div style="font-size:0.85rem; color:#94a3b8;">${h.descripcion || ''}</div>
                </td>
                <td style="font-weight:500; color:#64748b;">${Utils.formatDate(h.fecha_estimada)}</td>
                <td>
                    <div class="font-bold text-slate-700 text-xs bg-slate-100 px-2 py-1 rounded inline-block mb-1">${h.activity_code || '-'}</div>
                    <div style="font-size:0.8rem; color:#475569; font-weight:500;">${h.task_name || ''}</div>
                </td>
                 <td>
                    <select onchange="HitosModule.updateStatus(${h.id}, this.value)" 
                        class="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-lg border focus:ring-2 focus:ring-opacity-50 outline-none cursor-pointer transition-colors ${statusColor}"
                        style="appearance:none; padding-right:2rem; background-image:url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%236b7280%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E'); background-repeat:no-repeat; background-position:right .7em top 50%; background-size:.65em auto;">
                        <option value="Pendiente" ${status === 'Pendiente' ? 'selected' : ''}>PENDIENTE</option>
                        <option value="En Progreso" ${status === 'En Progreso' ? 'selected' : ''}>EN PROGRESO</option>
                        <option value="Completado" ${status === 'Completado' ? 'selected' : ''}>COMPLETADO</option>
                    </select>
                 </td>
                 <td>
                    <div class="flex gap-2">
                        <button class="btn-icon text-blue-600" onclick="HitosModule.openModal(${h.id})" title="Editar">
                            <i class="fas fa-pencil-alt"></i>
                        </button>
                         <button class="btn-icon text-red-500" onclick="HitosModule.delete(${h.id})" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    updateStatus: async (id, newStatus) => {
        try {
            await API.put(`/hitos/${id}`, { estado: newStatus });
            Utils.showToast(`Estado actualizado: ${newStatus}`, 'success');

            // Update local data to reflect change without full reload if possible, 
            // but we need to update the color class of the select.
            // Simplest way is to refresh the data and re-render or
            // find the specific row.
            // Let's re-fetch to ensure sync or just update local state.
            const h = HitosModule.data.find(x => x.id === id);
            if (h) h.estado = newStatus;

            // Re-render filtering to update colors (but maybe annoying UX if list jumps)
            // Just update colors of the specific element?
            // Re-rendering is safer to verify `onFilter` logic is respecting new state
            // Let's just re-apply current filters
            const activeData = HitosModule.data; // Ideally should be filteredData
            // Trigger filter update again
            const filterInput = document.getElementById('hitoSearch');
            if (filterInput) filterInput.dispatchEvent(new Event('input'));
            else HitosModule.render(HitosModule.data); // Fallback

        } catch (e) {
            console.error(e);
            Utils.showToast('Error al actualizar estado', 'error');
        }
    },

    openModal: async (id = null) => {
        HitosModule.editingId = id;

        // Reset Form
        document.getElementById('hitoGlobalName').value = '';
        document.getElementById('hitoGlobalDate').value = '';
        document.getElementById('hitoGlobalDesc').value = '';

        // Try to change title if possible, though simple modal might not have id for title
        const modal = document.getElementById('hitoGlobalModal');
        const title = modal.querySelector('h3') || modal.querySelector('h2');
        if (title) title.textContent = id ? 'Editar Hito' : 'Nuevo Hito';

        // Load Plans for Select
        const select = document.getElementById('hitoPlanSelect');
        select.innerHTML = '<option value="">Cargando...</option>';
        const plans = DataStore.plan.length > 0 ? DataStore.plan : await DataStore.refreshPlan();

        select.innerHTML = '<option value="">Seleccione Actividad...</option>';
        if (plans) {
            plans.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                const name = p.task_name.length > 50 ? p.task_name.substring(0, 50) + '...' : p.task_name;
                opt.textContent = `${p.activity_code} - ${name}`;
                select.appendChild(opt);
            });
        }

        // If Editing, Fill Data
        if (id) {
            const hito = HitosModule.data.find(h => h.id === id);
            if (hito) {
                document.getElementById('hitoGlobalName').value = hito.nombre;
                document.getElementById('hitoGlobalDate').value = Utils.formatDateForInput(hito.fecha_estimada);
                document.getElementById('hitoGlobalDesc').value = hito.descripcion || '';
                select.value = hito.plan_maestro_id;
            }
        }

        Utils.openModal('hitoGlobalModal');
    },

    delete: async (id) => {
        if (!confirm('¿Eliminar hito permanentemente?')) return;
        try {
            await API.delete(`/hitos/${id}`);
            HitosModule.init(); // Refresh list
            Utils.showToast('Hito eliminado correctamente', 'success');
        } catch (e) { Utils.showToast('Error eliminando hito', 'error'); }
    },

    save: async (e) => {
        e.preventDefault();
        const planId = document.getElementById('hitoPlanSelect').value;
        const nombre = document.getElementById('hitoGlobalName').value;
        const fecha = document.getElementById('hitoGlobalDate').value;
        const desc = document.getElementById('hitoGlobalDesc').value;

        if (!planId) { Utils.showToast("Debe seleccionar una actividad", 'error'); return; }

        const payload = {
            plan_maestro_id: planId,
            nombre: nombre,
            fecha_estimada: fecha || null,
            descripcion: desc,
            // Status is not in create modal usually, defaulting to existing or Pendiente
            estado: HitosModule.editingId ? (HitosModule.data.find(h => h.id === HitosModule.editingId)?.estado) : 'Pendiente'
        };

        try {
            if (HitosModule.editingId) {
                await API.put(`/hitos/${HitosModule.editingId}`, payload);
            } else {
                await API.post('/hitos', payload);
            }
            Utils.closeModal('hitoGlobalModal');
            HitosModule.init();
            Utils.showToast('Hito guardado correctamente', 'success');
        } catch (e) { Utils.showToast("Error guardando hito", 'error'); }
    }
};
