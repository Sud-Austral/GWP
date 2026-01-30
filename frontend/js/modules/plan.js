
const PlanModule = {
    init: async () => {
        PlanModule.loadData();
        PlanModule.setupEvents();
    },

    loadData: async () => {
        const data = await API.get('/plan-maestro');
        if (data) {
            window.appData = window.appData || {};
            window.appData.plan = data;

            // Cascading Filters Setup
            Utils.setupCascadingFilters({
                data: data,
                filters: [
                    { id: 'filterProduct', key: 'product_code' },
                    { id: 'filterResp', key: 'primary_responsible' },
                    { id: 'filterStatus', key: 'estado' }
                    // Note: Search Input logic is complex for 1:1 key. 
                    // We leave it out of cascade for now or handle separately?
                    // Let's keep Search separate listener to just filter the result of Cascade?
                    // Or pass it as custom filter. 
                    // For simplicity, let's keep Dropdowns cascading mainly.
                ],
                onFilter: (filtered) => {
                    // Apply Search Text Filter manually on top
                    const search = document.getElementById('searchPlan')?.value.toLowerCase();
                    const final = !search ? filtered : filtered.filter(item =>
                        (item.task_name || '').toLowerCase().includes(search) ||
                        (item.activity_code || '').toLowerCase().includes(search)
                    );
                    PlanModule.renderTable(final);
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

    renderTable: (data) => {
        const tbody = document.getElementById('planTableBody');
        tbody.innerHTML = '';

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center p-4">No hay actividades registradas.</td></tr>';
            return;
        }

        data.forEach(item => {
            const tr = document.createElement('tr');

            let statusClass = 'status-pendiente';
            if (item.status === 'En Progreso') statusClass = 'status-progreso';
            if (item.status === 'Completado' || item.status === 'Listo') statusClass = 'status-listo';

            // Format dates
            const start = item.fecha_inicio ? Utils.formatDate(item.fecha_inicio) : '-';
            const end = item.fecha_fin ? Utils.formatDate(item.fecha_fin) : '-';

            tr.innerHTML = `
                <td class="code-cell">${item.activity_code || '-'}</td>
                <td>
                    <div style="font-weight: 500;">${item.task_name || 'Sin nombre'}</div>
                    <div class="meta-text">${item.product_code || ''}</div>
                </td>
                <td>
                    <span class="role-badge">${item.primary_responsible || '-'}</span>
                </td>
                <td><span class="status-badge ${statusClass}">${item.status || 'Pendiente'}</span></td>
                <td class="date-cell">
                    <div>${start}</div>
                    <div>${end}</div>
                </td>
                 <td class="text-center">
                    ${item.has_file_uploaded
                    ? '<i class="fas fa-file-alt" style="color:#2563eb;" title="Documento cargado"></i>'
                    : '<i class="far fa-file" style="color:#cbd5e1;" title="Sin documento"></i>'}
                </td>
                <td>
                    <div class="action-cell">
                        <button class="btn btn-sm btn-icon" onclick="PlanModule.edit(${item.id})">
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

        const form = document.getElementById('planForm');
        if (form) {
            form.addEventListener('submit', async (e) => {
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
        const form = document.getElementById('activityForm');
        form.reset();
        document.getElementById('actId').value = '';
        document.getElementById('activityModalTitle').textContent = 'Nueva Actividad';

        const extraSec = document.getElementById('extrasSection');
        extraSec.classList.add('hidden');
        document.getElementById('fileStatus').textContent = '';
        document.getElementById('docFile').value = '';

        if (id && window.appData.plan) {
            const item = window.appData.plan.find(i => i.id === id);
            if (item) {
                document.getElementById('actId').value = item.id;
                document.getElementById('actCode').value = item.activity_code || '';
                document.getElementById('actProduct').value = item.product_code || '';
                document.getElementById('actName').value = item.task_name || '';
                document.getElementById('actResp').value = item.primary_responsible || '';
                document.getElementById('actStatus').value = item.status || 'Pendiente';

                // Set dates specifically for input[type=date]
                if (item.fecha_inicio) document.getElementById('actStart').value = item.fecha_inicio.split('T')[0];
                if (item.fecha_fin) document.getElementById('actEnd').value = item.fecha_fin.split('T')[0];

                document.getElementById('activityModalTitle').textContent = 'Editar Actividad';

                // Show extras
                extraSec.classList.remove('hidden');

                if (item.has_file_uploaded) {
                    document.getElementById('fileStatus').innerHTML = '<i class="fas fa-check text-green-500"></i> Archivo cargado previamente';
                }

                // Load hitos
                await PlanModule.loadHitos(item.id);
            }
        }

        Utils.openModal('activityModal');
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
            fecha_fin: document.getElementById('actEnd').value || null
        };

        let res;
        if (id) {
            res = await API.put(`/plan-maestro/${id}`, payload);
        } else {
            res = await API.post('/plan-maestro', payload);
        }

        if (res && (res.message || res.id)) {
            if (!id && res.id) {
                // If newly created, maybe switch to edit mode to allow adding hitos?
                // For now just close
                Utils.closeModal('activityModal');
            } else {
                Utils.closeModal('activityModal');
            }
            PlanModule.loadData();
        } else {
            alert('Error al guardar');
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
            alert("Nombre del hito requerido");
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
            alert("Error al crear hito");
        }
    },

    // --- DOCUMENTS ---
    uploadFile: async () => {
        const planId = document.getElementById('actId').value;
        const fileInput = document.getElementById('docFile');
        const file = fileInput.files[0];

        if (!planId || !file) {
            alert("Seleccione un archivo primero");
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
                alert("Error: " + json.error);
            }
        } catch (e) {
            alert("Error de red al subir archivo");
        }
    }
};
