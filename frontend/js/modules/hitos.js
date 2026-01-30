
const HitosModule = {
    init: async () => {
        const data = await API.get('/hitos');
        HitosModule.render(data);
        HitosModule.setupEvents();
    },

    setupEvents: () => {
        const btn = document.getElementById('btnNewHitoGlobal');
        if (btn) {
            // Remove previous event listeners to avoid dupes if init called multiple times
            const newBtn = btn.cloneNode(true);
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

    render: (data) => {
        const tbody = document.getElementById('hitosTableBody');
        tbody.innerHTML = '';

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center p-4">No hay hitos registrados.</td></tr>';
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
        // Load plan activities
        const select = document.getElementById('hitoPlanSelect');
        select.innerHTML = '<option value="">Cargando...</option>';

        // Fetch plans if not in window.appData (or fetch anyway to be fresh)
        // Ideally we cache this or use a lightweight endpoint dropdown
        const plans = await API.get('/plan-maestro');

        select.innerHTML = '<option value="">Seleccione Actividad...</option>';
        if (plans) {
            plans.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                // Truncate name
                const name = p.task_name.length > 50 ? p.task_name.substring(0, 50) + '...' : p.task_name;
                opt.textContent = `${p.activity_code} - ${name}`;
                select.appendChild(opt);
            });
        }

        // Reset fields
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
            // Reload list
            const data = await API.get('/hitos');
            HitosModule.render(data);
        } else {
            alert("Error al crear hito");
        }
    }
};
