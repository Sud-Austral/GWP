
const ObservacionesModule = {
    data: [],

    init: async () => {
        const container = document.getElementById('obsGrid');
        if (container) {
            const skeleton = `
                <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex gap-4 mb-4 animate-pulse">
                    <div class="w-10 h-10 rounded-full bg-slate-200 shrink-0"></div>
                    <div class="flex-1 space-y-3">
                        <div class="flex justify-between">
                            <div class="h-4 bg-slate-200 rounded w-1/3"></div>
                            <div class="h-4 bg-slate-200 rounded w-20"></div>
                        </div>
                        <div class="h-3 bg-slate-200 rounded w-1/4"></div>
                        <div class="h-20 bg-slate-200 rounded-tr-2xl rounded-br-2xl rounded-bl-2xl"></div>
                    </div>
                </div>`;
            container.innerHTML = Array(4).fill(skeleton).join('');
        }

        Utils.renderBreadcrumbs(['Inicio', 'Bitácora de Observaciones']);

        const data = await API.get('/observaciones?t=' + Date.now());
        ObservacionesModule.data = data || [];

        Utils.setupCascadingFilters({
            data: ObservacionesModule.data,
            filters: [
                { id: 'obsFilterProduct', key: 'product_code' },
                { id: 'obsFilterResp', key: 'primary_responsible' }, // Activity Responsible
                { id: 'obsFilterStatus', key: 'status' } // Activity Status
            ],
            chipsContainerId: 'obsActiveChips',
            search: {
                id: 'obsSearch',
                keys: ['texto', 'usuario_nombre', 'task_name', 'activity_code']
            },
            onFilter: (filtered) => {
                ObservacionesModule.render(filtered);
            }
        });

        ObservacionesModule.setupEvents();
    },

    setupEvents: () => {
        // Eventos adicionales si fueran necesarios
    },

    render: (data) => {
        const container = document.getElementById('obsGrid');
        if (!container) return;

        if (!data || data.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center p-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                    <i class="far fa-comments text-4xl text-slate-300 mb-4"></i>
                    <h3 class="text-lg font-medium text-slate-600">Sin Observaciones</h3>
                    <p class="text-slate-400 text-sm mt-1">No hay comentarios registrados con los filtros actuales.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = data.map(obs => ObservacionesModule.renderCard(obs)).join('');
    },

    // Legacy support for reload
    loadData: () => ObservacionesModule.init(),

    renderCard: (obs) => {
        // Initials & Color
        const initials = obs.usuario_nombre ? obs.usuario_nombre.charAt(0).toUpperCase() : '?';
        const date = Utils.formatDate(obs.created_at);

        // Colors
        const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-indigo-500'];
        const colorIndex = (obs.usuario_nombre || '').length % colors.length;
        const finalColor = colors[colorIndex];

        // Safe text for onclick
        const safeText = (obs.texto || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');

        return `
            <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex gap-4 mb-4 transition-all hover:shadow-md">
                <!-- Avatar -->
                <div class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0 ${finalColor} shadow-sm">
                    ${initials}
                </div>
                
                <!-- Content -->
                <div class="flex-1">
                    <!-- Header -->
                    <div class="flex justify-between items-start mb-2">
                        <div>
                            <span class="font-bold text-slate-800 text-sm">${obs.usuario_nombre || 'Usuario'}</span>
                            <span class="text-slate-400 text-xs ml-1">comentó en</span>
                            <span 
                                onclick="PlanModule.edit(${obs.plan_id})" 
                                class="cursor-pointer text-indigo-600 font-semibold text-xs ml-1 hover:underline"
                                title="Ir a la actividad"
                            >
                                ${obs.activity_code || 'Actividad'}
                            </span>
                        </div>
                        <div class="flex items-center gap-3">
                            <span class="text-xs text-slate-300 font-medium">${date}</span>
                            <div class="flex gap-2 opacity-50 hover:opacity-100 transition-opacity">
                                <button onclick="ObservacionesModule.editComment(${obs.id}, '${safeText}')" class="text-slate-400 hover:text-blue-500 transition-colors" title="Editar"><i class="fas fa-pencil-alt"></i></button>
                                <button onclick="ObservacionesModule.deleteComment(${obs.id})" class="text-slate-400 hover:text-red-500 transition-colors" title="Eliminar"><i class="fas fa-trash-alt"></i></button>
                            </div>
                        </div>
                    </div>

                    <!-- Task Context -->
                    <div class="mb-3 text-xs text-slate-500 font-medium flex items-center gap-2">
                        <i class="fas fa-tasks text-slate-300"></i>
                        <span>${obs.task_name || 'Sin nombre de tarea'}</span>
                    </div>
                    
                    <!-- Bubble Comment -->
                    <div class="bg-slate-50 p-4 rounded-tr-2xl rounded-br-2xl rounded-bl-2xl border border-slate-100 text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                        ${obs.texto}
                    </div>
                </div>
            </div>
        `;
    },

    editComment: async (id, currentText) => {
        const newText = prompt("Editar observación:", currentText);
        if (newText && newText !== currentText) {
            try {
                const res = await API.put(`/observaciones/${id}`, { texto: newText });
                if (res && !res.error) {
                    ObservacionesModule.loadData();
                    Utils.showToast('Comentario editado', 'success');
                } else {
                    Utils.showToast("No tienes permiso o hubo un error.", 'error');
                }
            } catch (e) { Utils.showToast("Error al editar", 'error'); }
        }
    },

    deleteComment: async (id) => {
        if (!confirm("¿Seguro que deseas eliminar esta observación?")) return;
        try {
            const res = await API.delete(`/observaciones/${id}`);
            if (res && !res.error) {
                ObservacionesModule.loadData();
                Utils.showToast('Comentario eliminado', 'success');
            } else {
                Utils.showToast("No tienes permiso o hubo un error.", 'error');
            }
        } catch (e) { Utils.showToast("Error al eliminar", 'error'); }
    }
};
