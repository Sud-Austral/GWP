
const DocumentsModule = {
    init: async () => {
        const data = await API.get('/documentos');
        DocumentsModule.render(data);
        DocumentsModule.setupEvents();
    },

    setupEvents: () => {
        const btn = document.getElementById('btnNewDocGlobal');
        if (btn) {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.addEventListener('click', DocumentsModule.openModal);
        }

        const form = document.getElementById('docGlobalForm');
        if (form) {
            const newForm = form.cloneNode(true);
            form.parentNode.replaceChild(newForm, form);
            newForm.addEventListener('submit', DocumentsModule.upload);
        }
    },

    render: (data) => {
        const tbody = document.getElementById('docsTableBody');
        tbody.innerHTML = '';

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center p-4">No hay documentos subidos.</td></tr>';
            return;
        }

        data.forEach(d => {
            const tr = document.createElement('tr');

            // Build real URL
            // Assuming API.BASE is like https://ip:port or http://ip:port
            // We need to construct the download URL.
            // d.ruta_archivo is just the filename now (e.g. "file.pdf")
            const fileUrl = `${API.BASE}/uploads/${d.ruta_archivo}`;
            const isPdf = d.nombre_archivo.toLowerCase().endsWith('.pdf');

            tr.innerHTML = `
                <td>
                    <div style="font-weight:600; color:#2563eb;">
                        <i class="fas ${isPdf ? 'fa-file-pdf' : 'fa-file-alt'}"></i> ${d.nombre_archivo}
                    </div>
                </td>
                 <td>
                    <div>${d.activity_code || '-'}</div>
                    <div style="font-size:0.8rem;">${d.task_name || ''}</div>
                </td>
                <td>${d.uploader || '-'}</td>
                <td>${Utils.formatDate(d.created_at)}</td>
                <td>
                    <div class="flex gap-2">
                        <a href="${fileUrl}" target="_blank" class="btn btn-sm btn-secondary" title="Descargar">
                            <i class="fas fa-download"></i>
                        </a>
                        ${isPdf ? `
                        <button class="btn btn-sm btn-primary" onclick="DocumentsModule.preview('${fileUrl}')" title="Ver PDF">
                            <i class="fas fa-eye"></i>
                        </button>
                        ` : ''}
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    openModal: async () => {
        // Load plan activities
        const select = document.getElementById('docPlanSelect');
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

        document.getElementById('docGlobalFile').value = '';
        Utils.openModal('docGlobalModal');
    },

    upload: async (e) => {
        e.preventDefault();
        const planId = document.getElementById('docPlanSelect').value;
        const fileInput = document.getElementById('docGlobalFile');
        const file = fileInput.files[0];

        if (!planId || !file) {
            alert("Seleccione actividad y archivo");
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('plan_id', planId);

        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API.BASE}/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const json = await res.json();

            if (res.ok) {
                Utils.closeModal('docGlobalModal');
                const data = await API.get('/documentos');
                DocumentsModule.render(data);
            } else {
                alert("Error: " + json.error);
            }
        } catch (err) {
            alert("Error de red");
        }
    },

    preview: (url) => {
        // Simple modal implementation for preview
        let modal = document.getElementById('previewModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'previewModal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 90%; height: 90vh; display:flex; flex-direction:column;">
                    <header class="modal-header">
                        <h2 class="modal-title">Vista Previa</h2>
                        <button class="close-btn" onclick="document.getElementById('previewModal').classList.remove('show')">&times;</button>
                    </header>
                    <div style="flex:1; background:#eee;">
                         <iframe id="previewFrame" style="width:100%; height:100%; border:none;"></iframe>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        document.getElementById('previewFrame').src = url;
        modal.classList.add('show');
    }
};
