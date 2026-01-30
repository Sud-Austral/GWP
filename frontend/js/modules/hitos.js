
const HitosModule = {
    data: [], // Store raw data for filtering

    init: async () => {
        const data = await API.get('/hitos');
        HitosModule.data = data || [];

        // Cascading Filters
        Utils.setupCascadingFilters({
            data: HitosModule.data,
            filters: [
                { id: 'hitoFilterProduct', key: 'product_code' },
                { id: 'hitoFilterStatus', key: 'estado' }
            ],
            onFilter: (filtered) => {
                HitosModule.render(filtered);
            }
        });

        HitosModule.setupEvents();
    },

    setupEvents: () => {
        const btn = document.getElementById('btnNewHitoGlobal');
        if (btn) {
            const newBtn = btn.cloneNode(true); // crude event clear
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.addEventListener('click', HitosModule.openModal);
        }

        const form = document.getElementById('hitoGlobalForm');
        if (form) {
            const newForm = form.cloneNode(true);
            form.parentNode.replaceChild(newForm, form);
            newForm.addEventListener('submit', HitosModule.save);
        }
    },

    applyFilters: () => {
        const fProd = document.getElementById('hitoFilterProduct')?.value.toLowerCase();
        const fStatus = document.getElementById('hitoFilterStatus')?.value;

        const filtered = HitosModule.data.filter(h => {
            const mProd = !fProd || (h.product_code || h.activity_code || '').toLowerCase().includes(fProd);
            const mStatus = !fStatus || (h.estado === fStatus);
            return mProd && mStatus;
        });

        HitosModule.render(filtered);
    },

    render: (data) => {
        const tbody = document.getElementById('hitosTableBody');
        tbody.innerHTML = '';

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center p-4">No hay hitos registrados con los filtros actuales.</td></tr>';
            return;
        }

        data.forEach(h => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div style="font-weight:600;">${h.nombre}</div>
                    <div style="font-size:0.85rem; color:#64748b;">${h.descripcion || ''}</div>
                </td>
                <td>${Utils.formatDate(h.fecha_estimada)}</td>
                <td>
                    <div>${h.activity_code || '-'}</div>
                    <div style="font-size:0.8rem;">${h.task_name || ''}</div>
                </td>
                 <td>
                    <span class="status-badge ${h.estado === 'Completado' ? 'status-listo' : 'status-pendiente'}">
                        ${h.estado || 'Pendiente'}
                    </span>
                 </td>
            `;
            tbody.appendChild(tr);
        });
    },

    openModal: async () => {
        const select = document.getElementById('hitoPlanSelect');
        select.innerHTML = '<option value="">Cargando...</option>';

        const plans = await API.get('/plan-maestro');

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

        document.getElementById('hitoGlobalName').value = '';
        document.getElementById('hitoGlobalDate').value = '';
        document.getElementById('hitoGlobalDesc').value = '';

        Utils.openModal('hitoGlobalModal');
    },

    save: async (e) => {
        e.preventDefault();
        const planId = document.getElementById('hitoPlanSelect').value;
        const nombre = document.getElementById('hitoGlobalName').value;
        const fecha = document.getElementById('hitoGlobalDate').value;
        const desc = document.getElementById('hitoGlobalDesc').value;

        if (!planId) {
            alert("Debe seleccionar una actividad");
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
            Utils.closeModal('hitoGlobalModal');
            // Re-init to fetch fresh data
            HitosModule.init();
        } else {
            alert("Error al crear hito");
        }
    }
};
