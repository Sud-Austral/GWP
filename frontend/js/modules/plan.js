
const PlanModule = {
    init: async () => {
        Utils.renderBreadcrumbs(['Inicio', 'Gestión de Actividades']);
        PlanModule.loadData();
        PlanModule.setupEvents();
    },


    loadData: async () => {
        // Visual feedback ensuring user sees update is happening
        const tbody = document.querySelector('#planTable tbody');
        if (tbody) {
            const skeletonRow = `
                <tr class="animate-pulse border-b border-slate-50">
                    <td class="p-4"><div class="h-4 bg-slate-100 rounded w-12"></div></td>
                    <td class="p-4"> 
                        <div class="space-y-2">
                            <div class="h-4 bg-slate-100 rounded w-3/4"></div>
                            <div class="h-3 bg-slate-100 rounded w-1/2"></div>
                        </div>
                    </td>
                    <td class="p-4"><div class="h-4 bg-slate-100 rounded w-20"></div></td>
                    <td class="p-4"><div class="h-8 w-8 rounded-full bg-slate-100"></div></td>
                    <td class="p-4"><div class="h-4 bg-slate-100 rounded w-24"></div></td>
                    <td class="p-4"><div class="h-6 bg-slate-100 rounded-full w-20"></div></td>
                    <td class="p-4"><div class="h-8 w-20 bg-slate-100 rounded"></div></td>
                </tr>
            `;
            tbody.innerHTML = Array(10).fill(skeletonRow).join('');
        }

        // Fetch via centralized DataStore (single source of truth)
        const data = await DataStore.refreshPlan();
        if (data) {

            // Cascading Filters Setup
            Utils.setupCascadingFilters({
                data: data,
                filters: [
                    { id: 'filterProduct', key: 'product_code' },
                    { id: 'filterResp', key: 'primary_responsible' },
                    { id: 'filterStatus', key: 'status' }
                ],
                chipsContainerId: 'planActiveChips',
                onFilter: (filtered) => {
                    // Apply Search Text Filter manually on top
                    const search = document.getElementById('searchPlan')?.value.toLowerCase();
                    const final = !search ? filtered : filtered.filter(item =>
                        (item.task_name || '').toLowerCase().includes(search) ||
                        (item.activity_code || '').toLowerCase().includes(search)
                    );
                    PlanModule.renderTable(final);

                    // Update chips for Search input too? 
                    // Search is separate from cascading config usually, but we can fake it?
                    // Actually, let's keep it simple. The Cascading helper handles chips for specific filters passed.
                    // For Search, we might need a custom approach or include it as a filter with special handling.
                    // Utils logic: `filters.forEach`. 
                    // If we want Breadcrumbs to show search, we need to pass search ID to helper maybe?
                    // The helper loops filters. I won't overcomplicate now.
                }
            });

            // Dictionary Search Listener (non-cascading input triggers redraw)
            document.getElementById('searchPlan')?.addEventListener('keyup', () => {
                // Trigger change on one of the dropdowns to force re-eval? 
                // Or just re-run render using current cascade state?
                // The cascade "onFilter" runs when dropdowns change.
                document.getElementById('filterProduct').dispatchEvent(new Event('change'));
            });
        }
    },


    deleteHito: async (hitoId, planId) => {
        if (!confirm('¿Eliminar este hito?')) return;
        try {
            await API.delete(`/hitos/${hitoId}`);
            PlanModule.viewDetails(planId);
        } catch (e) { Utils.showToast('Error eliminando hito', 'error'); }
    },

    enableEditHito: (hitoId, nombre, fecha, estado, planId) => {
        const row = document.getElementById(`hito-row-${hitoId}`);
        // row.children[1] is view div (children[0] is the timeline dot)
        const mainDiv = row.children[1];
        const editDiv = row.children[2];

        mainDiv.style.display = 'none';
        editDiv.style.display = 'block';

        editDiv.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:12px;">
                <input type="text" id="edit-hito-name-${hitoId}" value="${nombre}" style="width:100%; border:1px solid #cbd5e1; padding:8px; border-radius:8px; font-size:0.9rem;" placeholder="Nombre del hito">
                
                <div style="display:flex; gap:12px;">
                    <input type="date" id="edit-hito-date-${hitoId}" value="${fecha}" style="flex:1; border:1px solid #cbd5e1; padding:8px; border-radius:8px;">
                    <select id="edit-hito-status-${hitoId}" style="flex:1; border:1px solid #cbd5e1; padding:8px; border-radius:8px;">
                        <option value="Pendiente" ${estado === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
                        <option value="Completado" ${estado === 'Completado' ? 'selected' : ''}>Completado</option>
                    </select>
                </div>

                <div style="display:flex; justify-content:flex-end; gap:8px;">
                    <button onclick="PlanModule.cancelEditHito(${hitoId})" style="padding:6px 16px; border:1px solid #cbd5e1; background:white; color:#64748b; border-radius:6px; cursor:pointer;">Cancelar</button>
                    <button onclick="PlanModule.saveHito(${hitoId}, ${planId})" style="padding:6px 16px; border:none; background:#2563eb; color:white; border-radius:6px; cursor:pointer;">Guardar</button>
                </div>
            </div>
        `;
    },

    cancelEditHito: (hitoId) => {
        const row = document.getElementById(`hito-row-${hitoId}`);
        row.children[1].style.display = 'block';
        row.children[2].style.display = 'none';
    },

    saveHito: async (hitoId, planId) => {
        const nombre = document.getElementById(`edit-hito-name-${hitoId}`).value;
        const fecha = document.getElementById(`edit-hito-date-${hitoId}`).value;
        const estado = document.getElementById(`edit-hito-status-${hitoId}`).value;

        try {
            await API.put(`/hitos/${hitoId}`, { nombre, fecha_estimada: fecha, estado });
            PlanModule.viewDetails(planId);
        } catch (e) { Utils.showToast('Error actualizando hito', 'error'); }
    },

    renderTable: (data) => {
        const tbody = document.querySelector('#planTable tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center p-8 text-slate-400 italic">No hay actividades registradas.</td></tr>';
            return;
        }

        data.forEach(item => {
            const tr = document.createElement('tr');

            // New Status Logic
            // New Status Logic
            let badgeClass = 'badge badge-red'; // Default to red for Pendiente
            if (item.status === 'En Progreso' || item.status === 'Ejecución') badgeClass = 'badge badge-blue';
            else if (item.status === 'Completado' || item.status === 'Listo' || item.status === 'Finalizado') badgeClass = 'badge badge-green';
            else if (item.status === 'Retrasado') badgeClass = 'badge badge-red';
            // If explicit Pendiente, it stays red. If explicit gray needed, we lack a status for it now.

            // Format dates
            const start = item.fecha_inicio ? Utils.formatDate(item.fecha_inicio) : '-';
            const end = item.fecha_fin ? Utils.formatDate(item.fecha_fin) : '-';

            // Extra infos
            const weekRange = (item.week_start && item.week_end) ? `S${item.week_start}-S${item.week_end}` : '';
            const typeTag = item.type_tag ? `<span class="badge badge-purple" style="font-size:0.65rem; padding:2px 8px;">${item.type_tag}</span>` : '';
            const depCode = item.dependency_code ? `<div style="font-size:0.75rem; color:#64748b; margin-top:4px; display:flex; align-items:center; gap:4px;"><i class="fas fa-link text-xs"></i> ${item.dependency_code}</div>` : '';
            const role = item.primary_role ? `<div class="text-xs text-slate-500 font-medium">${item.primary_role}</div>` : '';
            const coResp = item.co_responsibles ? `<div class="text-xs text-slate-400 mt-1" title="${item.co_responsibles}"><i class="fas fa-users"></i> ${item.co_responsibles.substring(0, 15)}${item.co_responsibles.length > 15 ? '...' : ''}</div>` : '';
            const evidence = item.evidence_requirement ? `<div class="text-xs mt-1 text-emerald-600 font-medium flex items-center gap-1"><i class="fas fa-search-dollar"></i> Req</div>` : '';

            tr.innerHTML = `
                <td class="font-bold text-slate-700">
                    <div style="background:#f1f5f9; display:inline-block; padding:2px 8px; border-radius:6px; font-size:0.8rem;">${item.activity_code || '-'}</div>
                    ${depCode}
                </td>
                <td>
                    <div class="font-bold text-slate-800 text-sm mb-1">${item.task_name || 'Sin nombre'} ${typeTag}</div>
                    <div class="flex items-center gap-2 text-xs text-slate-500">
                        <span class="font-medium bg-slate-50 px-2 py-0.5 rounded border border-slate-100">${item.product_code || '-'}</span> 
                        ${weekRange ? `<span class="text-slate-300">•</span> <span class="text-slate-500">${weekRange}</span>` : ''}
                    </div>
                    ${evidence}
                </td>
                <td>
                    <div class="font-semibold text-slate-700 text-sm">${item.primary_responsible || '-'}</div>
                    ${role}
                    ${coResp}
                </td>
                <td><span class="${badgeClass}">${item.status || 'Pendiente'}</span></td>
                <td>
                    <div class="text-xs font-medium text-slate-600">${start}</div>
                    <div class="text-xs text-slate-400">a ${end}</div>
                </td>
                 <td class="text-center">
                    ${item.has_file_uploaded
                    ? '<div style="width:32px; height:32px; background:#eff6ff; border-radius:8px; display:inline-flex; align-items:center; justify-content:center; color:#2563eb;"><i class="fas fa-paperclip"></i></div>'
                    : '<div style="width:32px; height:32px; background:#f8fafc; border-radius:8px; display:inline-flex; align-items:center; justify-content:center; color:#cbd5e1;"><i class="fas fa-minus"></i></div>'}
                </td>
                <td>
                    <div class="flex gap-1 justify-center">
                        <button class="btn-icon text-blue-600" onclick="PlanModule.viewDetails(${item.id})" title="Mirar Detalle">
                             <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-icon text-slate-500" onclick="PlanModule.edit(${item.id})" title="Editar">
                            <i class="fas fa-pencil-alt"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    setupEvents: () => {
        const btn = document.getElementById('btnNewActivity');
        if (btn) btn.addEventListener('click', () => PlanModule.openModal());

        const form = document.getElementById('activityForm');
        if (form) {
            // Remove previous listeners using clone trick or just direct
            const newForm = form.cloneNode(true);
            form.parentNode.replaceChild(newForm, form);

            newForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await PlanModule.save();
            });
        }
    },

    applyFilters: () => {
        const search = document.getElementById('searchPlan')?.value.toLowerCase();
        const prod = document.getElementById('filterProduct')?.value.toLowerCase();
        const resp = document.getElementById('filterResp')?.value.toLowerCase();
        const status = document.getElementById('filterStatus')?.value;
        const rows = document.querySelectorAll('#planTableBody tr');

        rows.forEach(row => {
            const text = row.innerText.toLowerCase();
            // Need robust selecting. Assuming rendering structure remains.
            // But relying on DOM text is fragile. Better Filter data array and re-render.
            // However, to keep it simple and preserve existing DOM logic:

            // Re-implementing correctly based on current DOM structure:
            const rowCode = row.cells[0]?.innerText.toLowerCase() || '';
            const rowName = row.cells[1]?.innerText.toLowerCase() || '';
            const rowResp = row.cells[2]?.innerText.toLowerCase() || '';
            const rowStatus = row.cells[3]?.innerText || '';

            const matchesSearch = !search || rowCode.includes(search) || rowName.includes(search);
            // Product filter: check code or meta text
            const matchesProd = !prod || rowCode.includes(prod) || rowName.includes(prod);
            const matchesResp = !resp || rowResp.includes(resp);
            const matchesStatus = !status || rowStatus.includes(status);

            if (matchesSearch && matchesProd && matchesResp && matchesStatus) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    },

    openModal: async (id = null) => {
        let form = document.getElementById('activityForm');

        // Guarantee submit handler exists (critical when accessed from Gantt/Calendar without Plan init)
        const freshForm = form.cloneNode(true);
        form.parentNode.replaceChild(freshForm, form);
        freshForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await PlanModule.save();
        });
        form = freshForm;

        form.reset();
        document.getElementById('actId').value = '';
        document.getElementById('activityModalTitle').textContent = 'Nueva Actividad';

        const extraSec = document.getElementById('extrasSection');
        extraSec.classList.add('hidden');
        document.getElementById('fileStatus').textContent = '';
        document.getElementById('docFile').value = '';

        if (id && DataStore.plan.length > 0) {
            const item = DataStore.findPlanItem(id);
            if (item) {
                document.getElementById('actId').value = item.id;
                document.getElementById('actCode').value = item.activity_code || '';
                document.getElementById('actProduct').value = item.product_code || '';
                document.getElementById('actName').value = item.task_name || '';
                document.getElementById('actResp').value = item.primary_responsible || '';
                document.getElementById('actStatus').value = item.status || 'Pendiente';

                // New Fields
                document.getElementById('actRole').value = item.primary_role || '';
                document.getElementById('actCoResp').value = item.co_responsibles || '';
                document.getElementById('actWeekStart').value = item.week_start || '';
                document.getElementById('actWeekEnd').value = item.week_end || '';
                document.getElementById('actTypeTag').value = item.type_tag || '';
                document.getElementById('actDepCode').value = item.dependency_code || '';
                document.getElementById('actEvidence').value = item.evidence_requirement || '';

                // Set dates specifically for input[type=date]
                // Use helper to handle different date formats (ISO, RFC1123, etc)
                if (item.fecha_inicio) document.getElementById('actStart').value = Utils.formatDateForInput(item.fecha_inicio);
                if (item.fecha_fin) document.getElementById('actEnd').value = Utils.formatDateForInput(item.fecha_fin);

                document.getElementById('activityModalTitle').textContent = 'Editar Actividad';

                // Show extras
                extraSec.classList.remove('hidden');

                if (item.has_file_uploaded) {
                    document.getElementById('fileStatus').innerHTML = '<i class="fas fa-check text-green-500"></i> Archivo cargado previamente';
                }

                // --- FIX: Load tangential data immediately ---
                PlanModule.loadHitos(item.id);
                PlanModule.loadModalObs(item.id);
            }
        }

        Utils.openModal('activityModal');
    },

    init: async () => {

        // Load data
        await PlanModule.loadData();

        // Events
        PlanModule.setupEvents();

        // Utils
        // Utils.initCascadingDropdowns(); // Removed: Not defined in Utils
        Utils.initTabs();
    },

    loadModalObs: async (id) => {
        const container = document.getElementById('modalObsList');
        if (!container) return;
        container.innerHTML = '<div class="text-center text-slate-400 text-xs">Cargando...</div>';
        try {
            const obs = await API.get(`/plan-maestro/${id}/observaciones`);
            if (obs && obs.length > 0) {
                container.innerHTML = obs.map(o => `
                    <div class="mb-2 pb-2 border-b border-slate-100 last:border-0 last:mb-0 last:pb-0">
                        <div class="flex justify-between items-baseline mb-1">
                             <span class="font-bold text-slate-700 text-xs">${o.usuario_nombre || o.usuario_username || 'User'}</span>
                             <span class="text-[10px] text-slate-400">${Utils.formatDate(o.created_at)}</span>
                        </div>
                        <div class="text-slate-600 text-xs leading-snug">${o.texto}</div>
                    </div>
                `).join('');
            } else {
                container.innerHTML = '<div class="text-center text-slate-400 text-xs py-2">Sin observaciones</div>';
            }
        } catch (e) { container.innerHTML = 'Error'; }
    },

    addObsFromModal: async () => {
        const id = document.getElementById('actId').value;
        const txtInput = document.getElementById('modalNewObs');
        const txt = txtInput.value;
        if (!id || !txt.trim()) return;

        try {
            await API.post(`/plan-maestro/${id}/observaciones`, { texto: txt });
            txtInput.value = '';
            PlanModule.loadModalObs(id);
        } catch (e) { Utils.showToast('Error agregando observación', 'error'); }
    },

    edit: (id) => {
        PlanModule.openModal(id);
    },

    save: async () => {
        const id = document.getElementById('actId').value;
        const payload = {
            activity_code: document.getElementById('actCode').value,
            product_code: document.getElementById('actProduct').value,
            task_name: document.getElementById('actName').value,
            primary_responsible: document.getElementById('actResp').value,
            status: document.getElementById('actStatus').value,
            fecha_inicio: document.getElementById('actStart').value || null,
            fecha_fin: document.getElementById('actEnd').value || null,

            // New Fields
            primary_role: document.getElementById('actRole').value,
            co_responsibles: document.getElementById('actCoResp').value,
            week_start: parseInt(document.getElementById('actWeekStart').value) || null,
            week_end: parseInt(document.getElementById('actWeekEnd').value) || null,
            type_tag: document.getElementById('actTypeTag').value,
            dependency_code: document.getElementById('actDepCode').value,
            evidence_requirement: document.getElementById('actEvidence').value
        };

        let res;
        if (id) {
            res = await API.put(`/plan-maestro/${id}`, payload);
        } else {
            res = await API.post('/plan-maestro', payload);
        }

        if (res && (res.message || res.id)) {
            if (!id && res.id) {
                Utils.closeModal('activityModal');
            } else {
                Utils.closeModal('activityModal');
            }
            Utils.showToast('Actividad guardada correctamente', 'success');
            // Reload via DataStore — all subscribed modules auto-sync
            await PlanModule.loadData();
        } else {
            console.error("Save Error:", res);
            Utils.showToast('Error al guardar: ' + (res?.error || 'Error desconocido'), 'error');
        }
    },

    // --- HITOS ---
    loadHitos: async (planId) => {
        const listDiv = document.getElementById('modalHitosList');
        listDiv.innerHTML = '<div class="text-sm text-center">Cargando...</div>';

        const hitos = await API.get(`/plan-maestro/${planId}/hitos`);
        listDiv.innerHTML = '';

        if (!hitos || hitos.length === 0) {
            listDiv.innerHTML = '<div class="text-sm text-slate-400 italic">No hay hitos registrados.</div>';
            return;
        }

        hitos.forEach(h => {
            const div = document.createElement('div');
            // Simplified styling
            div.style.cssText = "padding: 8px; border: 1px solid #eee; border-radius: 4px; background: white; margin-bottom: 4px;";
            div.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="font-weight:600; font-size:0.85rem;">${h.nombre}</div>
                    <div style="font-size:0.75rem; color:#64748b;">${Utils.formatDate(h.fecha_estimada)}</div>
                </div>
                <div style="font-size:0.8rem; color:#475569;">${h.descripcion || ''}</div>
            `;
            listDiv.appendChild(div);
        });
    },

    addHito: async () => {
        const planId = document.getElementById('actId').value;
        if (!planId) return; // Should not happen if visible

        const nombre = document.getElementById('newHitoName').value;
        const fecha = document.getElementById('newHitoDate').value;
        const desc = document.getElementById('newHitoDesc').value;

        if (!nombre) {
            Utils.showToast("Nombre del hito requerido", 'error');
            return;
        }

        const payload = {
            plan_maestro_id: planId,
            nombre: nombre,
            fecha_estimada: fecha || null,
            descripcion: desc
        };

        const res = await API.post('/hitos', payload);
        if (res && res.id) {
            // Clear form
            document.getElementById('newHitoName').value = '';
            document.getElementById('newHitoDate').value = '';
            document.getElementById('newHitoDesc').value = '';
            // Reload list
            PlanModule.loadHitos(planId);
        } else {
            Utils.showToast('Error al crear hito', 'error');
        }
    },

    // --- DOCUMENTS ---
    uploadFile: async () => {
        const planId = document.getElementById('actId').value;
        const fileInput = document.getElementById('docFile');
        const file = fileInput.files[0];

        if (!planId || !file) {
            Utils.showToast('Seleccione un archivo primero', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('plan_id', planId);

        // Manual fetch for FormData since API wrapper might default to JSON
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API.BASE}/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                    // No Content-Type header so browser sets boundary
                },
                body: formData
            });
            const json = await res.json();

            if (res.ok) {
                document.getElementById('fileStatus').innerHTML = '<i class="fas fa-check text-green-500"></i> Subido exitosamente';
                fileInput.value = ''; // clear
                PlanModule.loadData(); // Update row icon
            } else {
                Utils.showToast('Error: ' + json.error, 'error');
            }
        } catch (e) {
            Utils.showToast('Error de red al subir archivo', 'error');
        }
    },

    viewDetails: async (id) => {
        if (!DataStore.plan.length) return;
        const item = DataStore.findPlanItem(id);
        if (!item) return;

        // --- PALETA DE COLORES TIPO DASHBOARD ---
        const Colors = {
            primary: 'linear-gradient(135deg, #4361EE 0%, #3F37C9 100%)',
            cardBg: '#ffffff',
            iconBg: {
                blue: '#e0f2fe', iconBlue: '#0284c7',
                green: '#dcfce7', iconGreen: '#16a34a',
                purple: '#f3e8ff', iconPurple: '#9333ea',
                orange: '#ffedd5', iconOrange: '#ea580c',
                red: '#fee2e2', iconRed: '#dc2626'
            }
        };

        // --- HELPER PARA TARJETAS DE DATOS ---
        const CardField = (label, value, iconClass, colorTheme = 'blue') => {
            const bg = Colors.iconBg[colorTheme] || '#f1f5f9';
            const txt = Colors.iconBg['icon' + colorTheme.charAt(0).toUpperCase() + colorTheme.slice(1)] || '#64748b';
            return `
            <div style="background:white; border-radius:16px; padding:16px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); display:flex; align-items:center; gap:16px; border:1px solid #f1f5f9;">
                <div style="width:48px; height:48px; border-radius:12px; background:${bg}; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                    <i class="fas ${iconClass}" style="color:${txt}; font-size:1.2rem;"></i>
                </div>
                <div>
                    <div style="font-size:0.75rem; color:#94a3b8; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">${label}</div>
                    <div style="font-size:0.95rem; color:#1e293b; font-weight:700; line-height:1.2;">
                        ${value || '<span style="color:#cbd5e1; font-weight:400;">N/A</span>'}
                    </div>
                </div>
            </div>
            `;
        };

        // 1. POPULATE GENERAL INFO
        const genDiv = document.getElementById('detailGeneral');

        let statusStyle = 'background:#f1f5f9; color:#64748b;';
        if (item.status === 'Completado' || item.status === 'Finalizado') statusStyle = 'background:#dcfce7; color:#16a34a;box-shadow: 0 4px 6px rgba(22, 163, 74, 0.2);';
        else if (item.status === 'En Progreso' || item.status === 'Ejecución') statusStyle = 'background:#dbeafe; color:#2563eb;box-shadow: 0 4px 6px rgba(37, 99, 235, 0.2);';
        else if (item.status === 'Retrasado' || item.status === 'Pendiente') statusStyle = 'background:#fee2e2; color:#dc2626;box-shadow: 0 4px 6px rgba(220, 38, 38, 0.2);';

        genDiv.style.display = 'block';
        genDiv.innerHTML = `
            <!-- HEADER HERO -->
            <div style="background:${Colors.primary}; margin:-1.5rem -1.5rem 2rem -1.5rem; padding:2rem; color:white; border-radius: 0 0 24px 24px; box-shadow: 0 10px 30px -10px rgba(67, 97, 238, 0.4); position:relative; overflow:hidden;">
                <!-- Decorative Circles -->
                <div style="position:absolute; top:-20px; right:-20px; width:150px; height:150px; background:rgba(255,255,255,0.1); border-radius:50%;"></div>
                <div style="position:absolute; bottom:-40px; left:20px; width:100px; height:100px; background:rgba(255,255,255,0.1); border-radius:50%;"></div>
                
                <div style="display:flex; justify-content:space-between; align-items:start; position:relative; z-index:1;">
                    <div>
                        <div style="display:flex; gap:8px; align-items:center; margin-bottom:12px;">
                            <span style="background:rgba(255,255,255,0.25); padding:4px 12px; border-radius:20px; font-size:0.75rem; font-weight:700; letter-spacing:1px; backdrop-filter:blur(4px);">${item.activity_code || 'S/C'}</span>
                            <span style="background:rgba(255,255,255,0.2); padding:4px 10px; border-radius:20px; font-size:0.75rem; font-weight:600;">${item.type_tag || 'GEN'}</span>
                        </div>
                        <h2 style="font-size:1.75rem; font-weight:800; line-height:1.2; margin:0; margin-bottom:0.5rem; text-shadow: 0 2px 4px rgba(0,0,0,0.1); max-width:600px;">${item.task_name}</h2>
                    </div>
                    <div style="flex-shrink:0;">
                        <div style="display:flex; gap:10px; align-items:center;">
                            <span style="padding:8px 20px; border-radius:30px; font-size:0.85rem; font-weight:800; text-transform:uppercase; letter-spacing:0.5px; ${statusStyle} background:white;">
                                ${item.status || 'Pendiente'}
                            </span>
                             <button onclick="PlanModule.edit(${item.id}); Utils.closeModal('detailModal');" 
                                style="width:40px; height:40px; border-radius:50%; background:rgba(255,255,255,0.2); border:1px solid rgba(255,255,255,0.3); color:white; cursor:pointer; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(4px); transition:all 0.2s;"
                                onmouseover="this.style.background='rgba(255,255,255,0.4)'; this.style.transform='scale(1.1)'"
                                onmouseout="this.style.background='rgba(255,255,255,0.2)'; this.style.transform='scale(1)'"
                                title="Editar Datos Principales">
                                <i class="fas fa-pencil-alt"></i>
                            </button>
                        </div>
                    </div>
                </div>
                
                ${item.evidence_requirement ? `
                <div style="margin-top:20px; background:rgba(0,0,0,0.2); backdrop-filter:blur(10px); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:12px 16px; display:inline-flex; align-items:center; gap:12px;">
                    <i class="fas fa-calendar-check" style="color:#fbbf24; font-size:1.2rem;"></i>
                    <div style="border-left:1px solid rgba(255,255,255,0.2); padding-left:12px;">
                        <div style="font-size:0.7rem; opacity:0.8; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">Requisito de Entrega</div>
                        <div style="font-size:0.95rem; font-weight:600;">${item.evidence_requirement}</div>
                    </div>
                </div>
                ` : ''}
            </div>

            <!-- INFO GRID -->
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:16px; padding:0 8px;">
                ${CardField('Producto', item.product_code, 'fa-box', 'purple')}
                ${CardField('Responsable', item.primary_responsible, 'fa-user-tie', 'blue')}
                ${CardField('Rol / Cargo', item.primary_role, 'fa-id-badge', 'green')}
                ${CardField('Co-Responsables', item.co_responsibles, 'fa-users', 'orange')}
                ${CardField('Fecha Inicio', Utils.formatDate(item.fecha_inicio), 'fa-calendar-check', 'green')}
                ${CardField('Fecha Fin', Utils.formatDate(item.fecha_fin), 'fa-flag-checkered', 'red')}
                ${CardField('Semana', `S${item.week_start} - S${item.week_end}`, 'fa-calendar-week', 'blue')}
                ${CardField('Dependencia', item.dependency_code, 'fa-project-diagram', 'purple')}
            </div>
        `;

        // 2. OPEN MODAL IMMEDIATELY
        Utils.openModal('detailModal');

        // 3. ASYNC LOAD OPTIMIZATION (Load all sections in parallel safe mode)

        // --- A. HITOS ---
        const hitosContainer = document.getElementById('detailHitosList');
        if (hitosContainer) {
            hitosContainer.innerHTML = '<div class="text-center p-4"><i class="fas fa-spinner fa-spin text-indigo-500"></i> <span class="text-slate-400 text-sm ml-2">Cargando hitos...</span></div>';

            // Non-blocking fetch
            API.get(`/plan-maestro/${item.id}/hitos`).then(hitos => {
                if (hitos && hitos.length > 0) {
                    hitosContainer.innerHTML = '<div class="grid grid-cols-1 md:grid-cols-2 gap-3">' + hitos.map(h => {
                        const status = h.status || h.estado || 'Pendiente';
                        let statusColor = 'text-slate-500 bg-slate-50 border-slate-200';
                        if (status === 'Completado') statusColor = 'text-green-700 bg-green-50 border-green-200';
                        else if (status === 'En Progreso') statusColor = 'text-blue-700 bg-blue-50 border-blue-200';
                        else if (status === 'Pendiente') statusColor = 'text-amber-700 bg-amber-50 border-amber-200';

                        return `
                            <div class="bg-white border border-slate-100 rounded-xl p-3 shadow-sm flex flex-col gap-2 group hover:shadow-md transition-shadow">
                                <div class="flex justify-between items-start">
                                    <div class="font-bold text-sm text-slate-700 leading-tight">${h.nombre}</div>
                                    <select onchange="PlanModule.updateHitoStatus(${h.id}, this.value, ${id})" 
                                        class="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg border ${statusColor} outline-none cursor-pointer hover:opacity-80 transition-opacity appearance-none"
                                        title="Cambiar estado">
                                        <option value="Pendiente" ${status === 'Pendiente' ? 'selected' : ''}>PENDIENTE</option>
                                        <option value="En Progreso" ${status === 'En Progreso' ? 'selected' : ''}>EN PROGRESO</option>
                                        <option value="Completado" ${status === 'Completado' ? 'selected' : ''}>COMPLETADO</option>
                                    </select>
                                </div>
                                <div class="text-xs text-slate-500 flex items-center gap-2">
                                    <i class="far fa-calendar"></i> ${Utils.formatDate(h.fecha_estimada)}
                                </div>
                                ${h.descripcion ? `<div class="text-xs text-slate-400 line-clamp-2">${h.descripcion}</div>` : ''}
                            </div>
                        `;
                    }).join('') + '</div>';
                } else {
                    hitosContainer.innerHTML = '<div class="text-sm text-slate-400 italic bg-slate-50 p-4 rounded-xl text-center">No hay hitos definidos para esta actividad.</div>';
                }
            }).catch(err => {
                hitosContainer.innerHTML = '<div class="text-sm text-red-400 bg-red-50 p-3 rounded-lg text-center">Error al cargar hitos</div>';
            });
        }

        // --- B. DOCUMENTOS ---
        const docsContainer = document.getElementById('detailDocsList');
        if (docsContainer) {
            docsContainer.className = "";
            docsContainer.style.cssText = "display:grid; gap:12px; padding:0 8px;";
            docsContainer.innerHTML = '<div class="text-center p-4"><i class="fas fa-spinner fa-spin text-amber-500"></i> <span class="text-slate-400 text-sm ml-2">Buscando evidencia...</span></div>';

            API.get(`/plan-maestro/${id}/documentos`).then(docs => {
                if (docs && docs.length > 0) {
                    docsContainer.innerHTML = docs.map(d => {
                        const isPdf = d.nombre_archivo.toLowerCase().endsWith('.pdf');
                        const isImg = /\.(jpg|jpeg|png|webp|gif)$/i.test(d.nombre_archivo);
                        const canPreview = isPdf || isImg;

                        let colors = { bg: '#f1f5f9', icon: '#94a3b8', text: 'fa-file' };
                        if (isPdf) colors = { bg: '#fee2e2', icon: '#dc2626', text: 'fa-file-pdf' };
                        else if (isImg) colors = { bg: '#f3e8ff', icon: '#9333ea', text: 'fa-file-image' };
                        else if (/\.(xls|xlsx|csv)$/i.test(d.nombre_archivo)) colors = { bg: '#dcfce7', icon: '#16a34a', text: 'fa-file-excel' };
                        else if (/\.(doc|docx)$/i.test(d.nombre_archivo)) colors = { bg: '#dbeafe', icon: '#2563eb', text: 'fa-file-word' };

                        const url = `${API.BASE}/uploads/${d.ruta_archivo}`;

                        return `
                        <div style="background:white; padding:12px; border-radius:16px; border:1px solid #f1f5f9; box-shadow:0 4px 15px rgba(0,0,0,0.03); display:flex; justify-content:space-between; align-items:center; transition:transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                             <div style="display:flex; align-items:center; gap:16px;">
                                <div style="width:50px; height:50px; border-radius:14px; background:${colors.bg}; display:flex; align-items:center; justify-content:center; font-size:1.5rem; color:${colors.icon};">
                                    <i class="fas ${colors.text}"></i>
                                </div>
                                <div>
                                    <div style="font-weight:700; color:#334155; font-size:0.95rem;">${d.nombre_archivo}</div>
                                    <div style="font-size:0.75rem; color:#94a3b8; margin-top:2px;">
                                        Subido por <span style="color:#64748b; font-weight:600;">${d.uploader || 'Anon'}</span> • ${Utils.formatDate(d.created_at)}
                                    </div>
                                </div>
                             </div>
                             <div style="display:flex; gap:8px;">
                                ${canPreview ? `
                                    <button onclick="Utils.previewFile('${url}', 'Vista Previa')" style="width:36px; height:36px; border-radius:10px; border:none; background:#f8fafc; color:#64748b; cursor:pointer; transition:all 0.2s;" title="Ver" onmouseover="this.style.background='#e0f2fe'; this.style.color='#0284c7';" onmouseout="this.style.background='#f8fafc'; this.style.color='#64748b';">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                ` : ''}
                                 <a href="${url}" download target="_blank" style="width:36px; height:36px; border-radius:10px; border:none; background:#f8fafc; color:#64748b; display:flex; align-items:center; justify-content:center; transition:all 0.2s;" title="Descargar" onmouseover="this.style.background='#dcfce7'; this.style.color='#16a34a';" onmouseout="this.style.background='#f8fafc'; this.style.color='#64748b';">
                                    <i class="fas fa-download"></i>
                                </a>
                                <button onclick="if(confirm('¿Borrar?')) { DocumentsModule.delete(${d.id}); setTimeout(()=>PlanModule.viewDetails(${id}), 500); }" style="width:36px; height:36px; border-radius:10px; border:none; background:#fff1f2; color:#e11d48; cursor:pointer;" title="Eliminar">
                                    <i class="fas fa-trash"></i>
                                </button>
                             </div>
                        </div>`;
                    }).join('');
                } else {
                    docsContainer.innerHTML = `
                        <div style="text-align:center; padding:30px; background:#f8fafc; border-radius:16px; border:1px dashed #cbd5e1;">
                            <i class="fas fa-folder-open" style="font-size:2rem; color:#cbd5e1; margin-bottom:10px;"></i>
                            <div style="color:#94a3b8; font-size:0.9rem;">Sin documentos adjuntos</div>
                        </div>
                     `;
                }
            }).catch(e => {
                docsContainer.innerHTML = '<div class="text-sm text-red-400 bg-red-50 p-3 rounded-lg text-center">Error al cargar documentos</div>';
            });
        }

        // --- C. OBSERVACIONES ---
        const obsContainer = document.getElementById('detailObsList');
        if (obsContainer) {
            obsContainer.className = "";
            obsContainer.style.cssText = "display:flex; flex-direction:column; gap:16px; padding:0 8px;";

            const formHtml = `
                <div style="background:#f8fafc; padding:12px; border-radius:12px; border:1px solid #e2e8f0; display:flex; gap:10px; align-items:start;">
                    <div style="width:32px; height:32px; border-radius:50%; background:#3b82f6; color:white; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                        <i class="fas fa-user" style="font-size:0.8rem;"></i>
                    </div>
                    <div style="flex:1;">
                        <textarea id="obsText" placeholder="Escribe una observación..." style="width:100%; border:1px solid #cbd5e1; border-radius:8px; padding:8px; font-size:0.9rem; min-height:60px; resize:vertical; margin-bottom:8px;"></textarea>
                        <div style="text-align:right;">
                            <button onclick="PlanModule.addObservacion(${id})" style="background:#3b82f6; color:white; border:none; padding:6px 16px; border-radius:6px; font-weight:600; cursor:pointer; font-size:0.85rem;">Comentar</button>
                        </div>
                    </div>
                </div>
            `;

            obsContainer.innerHTML = formHtml + '<div id="obsItemsList" class="mt-4 space-y-3"><div class="text-center p-4"><i class="fas fa-spinner fa-spin text-blue-500"></i> <span class="text-slate-400 text-sm ml-2">Cargando bitácora...</span></div></div>';

            API.get(`/plan-maestro/${id}/observaciones`).then(obs => {
                const itemsList = document.getElementById('obsItemsList');
                if (obs && obs.length > 0) {
                    itemsList.innerHTML = obs.map(o => `
                        <div style="display:flex; gap:12px;">
                            <div style="width:32px; height:32px; border-radius:50%; background:#f1f5f9; color:#64748b; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-weight:700; font-size:0.75rem;">
                                ${o.usuario_nombre ? o.usuario_nombre.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div style="background:white; padding:10px 14px; border-radius: 0 12px 12px 12px; border:1px solid #f1f5f9; box-shadow:0 2px 4px rgba(0,0,0,0.02); flex:1;">
                                <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                                    <div style="font-weight:700; color:#334155; font-size:0.85rem;">${o.usuario_nombre || o.usuario_username || 'Usuario'}</div>
                                    <div style="font-size:0.7rem; color:#94a3b8;">${Utils.formatDate(o.created_at)}</div>
                                </div>
                                <div style="color:#475569; font-size:0.9rem; white-space:pre-wrap; line-height:1.4;">${o.texto}</div>
                            </div>
                        </div>
                    `).join('');
                } else {
                    itemsList.innerHTML = '<div style="text-align:center; padding:10px; color:#94a3b8; font-size:0.85rem; font-style:italic;">No hay observaciones aún.</div>';
                }
            }).catch(e => {
                const itemsList = document.getElementById('obsItemsList');
                if (itemsList) itemsList.innerHTML = '<div class="text-sm text-red-400 text-center">Error al cargar bitácora</div>';
            });
        }
    },

    addObservacion: async (planId) => {
        const txt = document.getElementById('obsText').value;
        if (!txt.trim()) return;

        try {
            await API.post(`/plan-maestro/${planId}/observaciones`, { texto: txt });
            // Reload view to see new comment
            PlanModule.viewDetails(planId);
        } catch (e) {
            Utils.showToast('Error al agregar observación', 'error');
        }
    },

    updateHitoStatus: async (hitoId, newStatus, planId) => {
        try {
            // Updated to use 'estado' or 'status' depending on backend. app1.py lines 420 uses 'estado'.
            // But frontend typically uses status. Let's send 'estado' as per Python backend.
            await API.put(`/hitos/${hitoId}`, { estado: newStatus });

            Utils.showToast(`Hito actualizado a: ${newStatus}`, 'success');

            // Refresh details view background without closing if possible, 
            // but simpler to just reload the view to reflect color changes fully
            // or manually update class. Reload is safer.
            // We can use a specialized re-render if we want less flicker.
            // For now, reload details.
            // We delay slightly to allow toast to render
            // setTimeout(() => PlanModule.viewDetails(planId), 100);
            // Better: update the select border color instantly

            // Wait, if I reload viewDetails, it might flicker.
            // Since I used onchange in the select, visual value is already updated.
            // I should update the color classes of the parent div if I want perfection.
            // But re-calling viewDetails ensures data consistency.
            setTimeout(() => PlanModule.viewDetails(planId), 50);

            // Also invalidate Gantt data cache if any, or trigger reload if needed?
            // Gantt auto-fetches.
        } catch (e) {
            Utils.showToast('Error al actualizar hito', 'error');
            console.error(e);
        }
    }
};
