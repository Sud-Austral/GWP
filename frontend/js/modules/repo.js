
const RepoModule = {
    data: [],

    init: async () => {
        Utils.renderBreadcrumbs(['Inicio', 'Biblioteca Estratégica']);
        await RepoModule.loadData();
        RepoModule.setupEvents();
        RepoModule.setupFilters();
    },

    loadData: async () => {
        const container = document.getElementById('repoGrid');
        if (container) {
            // Skeleton Loader
            const skeletonCard = `
                <div class="bg-white rounded-xl border border-slate-100 p-5 animate-pulse h-64 flex flex-col">
                    <div class="flex items-center gap-4 mb-4">
                        <div class="w-10 h-10 bg-slate-200 rounded-lg"></div>
                        <div class="flex-1 space-y-2">
                            <div class="h-3 bg-slate-200 rounded w-1/3"></div>
                            <div class="h-4 bg-slate-200 rounded w-3/4"></div>
                        </div>
                    </div>
                    <div class="space-y-2 mb-6">
                        <div class="h-2 bg-slate-200 rounded"></div>
                        <div class="h-2 bg-slate-200 rounded"></div>
                        <div class="h-2 bg-slate-200 rounded w-5/6"></div>
                    </div>
                    <div class="mt-auto pt-4 border-t border-slate-50 flex justify-between">
                         <div class="h-3 bg-slate-200 rounded w-1/4"></div>
                         <div class="h-6 bg-slate-200 rounded w-8"></div>
                    </div>
                </div>
            `;
            container.innerHTML = Array(6).fill(skeletonCard).join('');
        }

        try {
            const data = await API.get('/repositorio');
            RepoModule.data = data || [];
            RepoModule.populateTags();
            RepoModule.populateYears();
            RepoModule.populateInstitutions();
            RepoModule.render(RepoModule.data);

        } catch (e) {
            console.error(e);
            if (container) container.innerHTML = '<div class="text-red-500 text-center">Error cargando repositorio</div>';
        }
    },

    populateTags: () => {
        const select = document.getElementById('repoFilterTags');
        if (!select) return;

        // Extract unique tags
        const tags = new Set();
        RepoModule.data.forEach(item => {
            if (item.etiquetas) {
                item.etiquetas.toString().split(',').forEach(t => {
                    const clean = t.trim();
                    if (clean) tags.add(clean);
                });
            }
        });

        const sorted = Array.from(tags).sort();

        // Populate
        select.innerHTML = '<option value="">Todas</option>';
        sorted.forEach(t => {
            select.innerHTML += `<option value="${t}">${t}</option>`;
        });
    },

    populateYears: () => {
        const select = document.getElementById('repoFilterYear');
        if (!select) return;

        // Extract unique years from fecha_publicacion
        const years = new Set();
        RepoModule.data.forEach(item => {
            if (item.fecha_publicacion) {
                const year = item.fecha_publicacion.substring(0, 4);
                if (year && /^\d{4}$/.test(year)) {
                    years.add(year);
                }
            }
        });

        // Sort descending (newest first)
        const sorted = Array.from(years).sort((a, b) => b - a);

        // Populate
        select.innerHTML = '<option value="">Todos</option>';
        sorted.forEach(y => {
            select.innerHTML += `<option value="${y}">${y}</option>`;
        });
    },

    populateInstitutions: () => {
        const select = document.getElementById('repoFilterOrigin');
        if (!select) return;

        const origins = new Set();
        RepoModule.data.forEach(item => {
            if (item.fuente_origen) {
                // Split by comma if multiple origins might be present, or just take whole string
                item.fuente_origen.split(',').forEach(o => {
                    const clean = o.trim();
                    if (clean) origins.add(clean);
                });
            }
        });

        const sorted = Array.from(origins).sort();

        select.innerHTML = '<option value="">Todas</option>';
        sorted.forEach(o => {
            select.innerHTML += `<option value="${o}">${o}</option>`;
        });
    },

    // Simplified clearing
    clearFilters: () => {
        ['repoSearch', 'repoFilterType', 'repoFilterSourceType', 'repoFilterOrigin', 'repoFilterYear', 'repoFilterTags']
            .forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
        // Trigger change
        const evt = new Event('input');
        const input = document.getElementById('repoSearch');
        if (input) input.dispatchEvent(evt);
        else RepoModule.render(RepoModule.data);
    },

    setupFilters: () => {
        if (RepoModule._filtersSetup) return;
        RepoModule._filtersSetup = true;

        const inputs = [
            'repoSearch', 'repoFilterType', 'repoFilterSourceType',
            'repoFilterOrigin', 'repoFilterYear', 'repoFilterTags'
        ];

        const filter = () => {
            const fSearch = document.getElementById('repoSearch')?.value.toLowerCase() || '';
            const fType = document.getElementById('repoFilterType')?.value.toLowerCase() || '';
            const fSrcType = document.getElementById('repoFilterSourceType')?.value.toLowerCase() || '';
            const fOrigin = document.getElementById('repoFilterOrigin')?.value.toLowerCase() || '';
            const fYear = document.getElementById('repoFilterYear')?.value || '';
            const fTag = document.getElementById('repoFilterTags')?.value.toLowerCase() || '';

            const filtered = RepoModule.data.filter(item => {
                // Search: Title, Desc, Tags, Key Points
                const textMatch = !fSearch ||
                    (item.titulo || '').toLowerCase().includes(fSearch) ||
                    (item.descripcion || '').toLowerCase().includes(fSearch) ||
                    (item.etiquetas || '').toLowerCase().includes(fSearch) ||
                    (item.puntos_clave || '').toLowerCase().includes(fSearch);

                const typeMatch = !fType || (item.tipo_documento || '').toLowerCase() === fType || (item.tipo_documento || '').toLowerCase().includes(fType);

                const srcTypeMatch = !fSrcType || (item.tipo_fuente || '').toLowerCase() === fSrcType;

                const originMatch = !fOrigin || (item.fuente_origen || '').toLowerCase().includes(fOrigin);

                // Exact tag match (within CSV string)
                const tagsMatch = !fTag || (item.etiquetas || '').toLowerCase().split(',').map(t => t.trim()).includes(fTag);

                let yearMatch = true;
                if (fYear && item.fecha_publicacion) {
                    const y = item.fecha_publicacion.substring(0, 4); // ISO YYYY-
                    yearMatch = y === fYear;
                } else if (fYear && !item.fecha_publicacion) {
                    yearMatch = false;
                }

                return textMatch && typeMatch && srcTypeMatch && originMatch && yearMatch && tagsMatch;
            });

            // Visual Chips
            const activeValObj = {
                repoFilterType: document.getElementById('repoFilterType')?.value,
                repoFilterSourceType: document.getElementById('repoFilterSourceType')?.value,
                repoFilterOrigin: document.getElementById('repoFilterOrigin')?.value,
                repoFilterYear: document.getElementById('repoFilterYear')?.value,
                repoFilterTags: document.getElementById('repoFilterTags')?.value,
                repoSearch: document.getElementById('repoSearch')?.value
            };
            const filterConfig = [
                { id: 'repoFilterType' }, { id: 'repoFilterSourceType' }, { id: 'repoFilterOrigin' },
                { id: 'repoFilterYear' }, { id: 'repoFilterTags' },
                { id: 'repoSearch' }
            ];
            Utils.updateActiveTags('repoActiveChips', filterConfig, activeValObj);

            RepoModule.render(filtered);
            RepoModule.setFilteredDocsForChat(filtered);
        };

        inputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', filter);
            }
        });
    },

    render: (data) => {
        const container = document.getElementById('repoGrid');
        if (!container) return;

        // Update stats card
        RepoModule.updateStats(data);

        if (!data || data.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center p-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                    <i class="fas fa-book-open text-4xl text-slate-300 mb-4"></i>
                    <h3 class="text-lg font-medium text-slate-600">Repositorio Vacío</h3>
                    <p class="text-slate-400 text-sm mt-1">No hay documentos que coincidan con la búsqueda.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = data.map(item => RepoModule.renderCard(item)).join('');
    },

    updateStats: (filteredData) => {
        const countEl = document.getElementById('repoTotalCount');
        const infoEl = document.getElementById('repoFilterInfo');

        if (countEl) {
            const count = filteredData ? filteredData.length : 0;
            // Animate count
            if (Utils.animateValue) {
                Utils.animateValue('repoTotalCount', 0, count, 500);
            } else {
                countEl.textContent = count;
            }
        }

        if (infoEl) {
            const total = RepoModule.data.length;
            const filtered = filteredData ? filteredData.length : 0;

            if (filtered === total) {
                infoEl.textContent = 'Mostrando todos los documentos';
            } else {
                infoEl.innerHTML = `Mostrando <strong>${filtered}</strong> de <strong>${total}</strong> documentos`;
            }
        }
    },

    renderCard: (item) => {
        const isUrl = !!item.enlace_externo;
        const hasFile = !!item.ruta_archivo;

        // Icon & Colors
        let typeInfo = { color: 'blue', icon: 'fa-file-alt', label: 'Documento' };
        const t = (item.tipo_documento || '').toLowerCase();
        if (t.includes('ley')) typeInfo = { color: 'orange', icon: 'fa-balance-scale', label: 'Ley' };
        else if (t.includes('decreto')) typeInfo = { color: 'amber', icon: 'fa-gavel', label: 'Decreto' };
        else if (t.includes('informe')) typeInfo = { color: 'indigo', icon: 'fa-chart-pie', label: 'Informe' };
        else if (t.includes('acta')) typeInfo = { color: 'emerald', icon: 'fa-users', label: 'Acta' };
        else if (t.includes('manual')) typeInfo = { color: 'cyan', icon: 'fa-book', label: 'Manual' };
        else if (t.includes('paper')) typeInfo = { color: 'violet', icon: 'fa-graduation-cap', label: 'Paper' };

        const colorClass = `bg-${typeInfo.color}-50 text-${typeInfo.color}-600 border-${typeInfo.color}-100`;

        // Status Badge
        const status = item.estado_procesamiento || 'Pendiente';

        // Tags
        const tags = item.etiquetas ? item.etiquetas.split(',').map(tag =>
            `<span class="px-2 py-0.5 rounded-full bg-white border border-slate-200 text-[10px] font-medium text-slate-500 uppercase tracking-wide shadow-sm">${tag.trim()}</span>`
        ).join('') : '';

        // Main Action
        let mainAction = '';
        if (hasFile) {
            const url = `${API.BASE}/uploads/${item.ruta_archivo}`;
            const isPreviewable = /\.(pdf|jpg|png)$/i.test(item.ruta_archivo);

            mainAction = `
                <div class="flex gap-2 w-full mt-4">
                    <a href="${url}" target="_blank" class="flex-1 btn btn-sm btn-outline justify-center border-slate-200 text-slate-600 hover:bg-slate-50" title="Descargar">
                        <i class="fas fa-download mr-1"></i> Descargar
                    </a>
                    ${isPreviewable ? `
                    <button onclick="Utils.previewFile('${url}', '${item.titulo}')" class="flex-1 btn btn-sm btn-primary justify-center bg-${typeInfo.color}-600 hover:bg-${typeInfo.color}-700 border-none text-white shadow-md shadow-${typeInfo.color}-200">
                        <i class="fas fa-eye mr-1"></i> Ver
                    </button>` : ''}
                </div>
            `;
        } else if (isUrl) {
            mainAction = `
                <div class="w-full mt-4">
                    <a href="${item.enlace_externo}" target="_blank" class="btn btn-sm w-full btn-primary justify-center bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200">
                        <i class="fas fa-external-link-alt mr-1"></i> Abrir Enlace
                    </a>
                </div>
            `;
        }

        // Parse Key Points
        let keyPointsHtml = '';
        if (item.puntos_clave) {
            let points = [];
            let raw = item.puntos_clave.trim();

            try {
                // Try JSON
                points = JSON.parse(raw);
            } catch (e) {
                // Try Postgres Array Format { "item1", "item2" } or {item1,item2}
                if (raw.startsWith('{') && raw.endsWith('}')) {
                    // Primitive parse for PSQL arrays if they come as string
                    // Remove braces
                    const inner = raw.substring(1, raw.length - 1);
                    // Split by comma respecting quotes is hard regex, simple split for now or regex
                    // Better: assuming backend sends JSON if possible, but if raw text:
                    // Simple hack for quoted strings:
                    points = inner.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
                    points = points.map(p => p.replace(/^"|"$/g, '').trim()).filter(p => p);
                } else {
                    // Plain text bullets
                    points = raw.split('\n').filter(p => p.trim().length > 0);
                }
            }

            if (Array.isArray(points) && points.length > 0) {
                keyPointsHtml = `
                    <div class="mt-3 bg-indigo-50 rounded-lg p-3 border border-indigo-100">
                        <h4 class="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-2">Puntos Clave</h4>
                        <ul class="list-disc list-inside text-xs text-slate-600 space-y-1">
                            ${points.slice(0, 3).map(p => `<li>${p}</li>`).join('')}
                            ${points.length > 3 ? `<li class="italic text-slate-400 text-[10px]">+${points.length - 3} más...</li>` : ''}
                        </ul>
                    </div>
                 `;
            }
        }

        return `
            <div class="repo-card group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full relative overflow-hidden">
                <!-- Top Decoration -->
                <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-${typeInfo.color}-400 to-${typeInfo.color}-600"></div>

                <div class="p-5 flex flex-col h-full">
                    <!-- Header -->
                    <div class="flex justify-between items-start gap-4 mb-3">
                        <div class="w-10 h-10 rounded-xl flex items-center justify-center ${colorClass} bg-opacity-40 border shrink-0 shadow-sm">
                            <i class="fas ${typeInfo.icon} text-lg"></i>
                        </div>
                        <div class="flex-grow min-w-0">
                            <div class="flex items-center gap-2 mb-1">
                                <span class="text-[10px] font-bold text-${typeInfo.color}-600 uppercase tracking-wider bg-${typeInfo.color}-50 px-2 py-0.5 rounded border border-${typeInfo.color}-100">
                                    ${typeInfo.label}
                                </span>
                                <span class="text-[10px] font-bold text-slate-400 uppercase border border-slate-100 px-2 py-0.5 rounded bg-slate-50">
                                    ${status}
                                </span>
                            </div>
                            <h3 class="font-bold text-slate-800 text-sm leading-snug line-clamp-2 group-hover:text-${typeInfo.color}-600 transition-colors" title="${item.titulo}">
                                ${item.titulo}
                            </h3>
                        </div>
                        
                        <!-- Header Actions -->
                         <div class="flex flex-col gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity absolute top-4 right-4 bg-white p-1 rounded-lg shadow-sm border border-slate-100">
                            <button onclick="RepoModule.edit(${item.id})" class="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-100 text-slate-400 hover:text-blue-500 transition-colors" title="Editar"><i class="fas fa-pencil-alt text-xs"></i></button>
                            <button onclick="RepoModule.delete(${item.id})" class="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-100 text-slate-400 hover:text-red-500 transition-colors" title="Eliminar"><i class="fas fa-trash text-xs"></i></button>
                        </div>
                    </div>

                    <!-- Description -->
                    <div class="mb-4 relative group/desc">
                        <div id="desc-${item.id}" class="text-xs text-slate-500 line-clamp-3 leading-relaxed transition-all duration-300">
                            <span class="font-medium text-slate-700 block mb-1 uppercase text-[10px] tracking-widest">Resumen:</span>
                            ${item.descripcion || 'Sin descripción disponible.'}
                        </div>
                        ${(item.descripcion && item.descripcion.length > 100) ? `
                        <button onclick="document.getElementById('desc-${item.id}').classList.toggle('line-clamp-3'); this.innerHTML = this.innerHTML.includes('Ver más') ? 'Ver menos' : 'Ver más';" 
                            class="text-[10px] font-bold text-blue-500 hover:text-blue-700 mt-1 focus:outline-none">
                            Ver más
                        </button>` : ''}
                    </div>

                    <!-- Insight Box -->
                    ${keyPointsHtml}

                    <div class="flex-grow"></div>

                    <!-- Tags & Source -->
                    <div class="flex flex-wrap gap-2 mt-4 mb-2">
                        ${tags}
                    </div>

                    <div class="pt-3 mt-2 border-t border-slate-50 flex items-center justify-between text-xs text-slate-400 font-medium">
                        <div class="flex items-center gap-2">
                            <i class="far fa-calendar-alt"></i> <span>${item.fecha_publicacion ? item.fecha_publicacion.substring(0, 4) : 'N/A'}</span>
                            <span class="text-slate-200">|</span>
                            <span>${item.fuente_origen || 'Origen Desc.'}</span>
                        </div>
                    </div>

                    <!-- Actions Area -->
                   ${mainAction}
                </div>
            </div>
        `;
    },

    edit: (id) => {
        const item = RepoModule.data.find(d => d.id === id);
        if (!item) return;

        const form = document.getElementById('repoForm');
        form.reset();

        let idInput = document.getElementById('repoId');
        if (!idInput) {
            idInput = document.createElement('input');
            idInput.type = 'hidden';
            idInput.id = 'repoId';
            form.appendChild(idInput);
        }
        idInput.value = item.id;

        Array.from(form.elements).forEach(el => {
            if (el.name && item[el.name] !== undefined && item[el.name] !== null) {
                el.value = item[el.name];
            }
        });

        const titleParams = document.querySelector('#repoModal .modal-title');
        if (titleParams) titleParams.textContent = 'Editar Documento';

        Utils.openModal('repoModal');
    },

    setupEvents: () => {
        document.getElementById('btnNewRepoDoc')?.addEventListener('click', () => {
            const form = document.getElementById('repoForm');
            form.reset();
            const idInput = document.getElementById('repoId');
            if (idInput) idInput.value = '';

            const titleParams = document.querySelector('#repoModal .modal-title');
            if (titleParams) titleParams.textContent = 'Agregar a Biblioteca';

            Utils.openModal('repoModal');
        });

        // Handle Form Submit
        const form = document.getElementById('repoForm');
        if (form) {
            // Remove listeners trick
            const newForm = form.cloneNode(true);
            form.parentNode.replaceChild(newForm, form);

            newForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await RepoModule.save();
            });
        }
    },

    save: async () => {
        const form = document.getElementById('repoForm');
        const idInput = document.getElementById('repoId');
        const id = (idInput && idInput.value) ? idInput.value : null;

        // Button Loading State
        const btn = form.querySelector('button[type="submit"]');
        const originalText = btn ? btn.innerHTML : 'Guardar';
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Guardando...';
        }

        try {
            const token = localStorage.getItem('token');
            let res;

            if (id) {
                // PUT
                const payload = {};
                Array.from(form.elements).forEach(el => {
                    if (el.name && el.name !== 'file' && el.value) payload[el.name] = el.value;
                });
                res = await fetch(`${API.BASE}/repositorio/${id}`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } else {
                // POST
                const formData = new FormData(form);
                if (!formData.get('fecha_publicacion')) formData.delete('fecha_publicacion');
                res = await fetch(`${API.BASE}/repositorio`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });
            }

            const json = await res.json();

            if (res.ok) {
                Utils.closeModal('repoModal');
                form.reset();
                if (idInput) idInput.value = '';
                RepoModule.loadData();
                Utils.showToast('Documento guardado correctamente', 'success');
            } else {
                Utils.showToast("Error: " + (json.error || 'Error desconocido'), 'error');
            }

        } catch (e) {
            Utils.showToast('Error de conexión', 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        }
    },

    delete: async (id) => {
        if (!confirm("¿Eliminar este documento del repositorio?")) return;
        try {
            await API.delete(`/repositorio/${id}`);
            RepoModule.loadData();
            Utils.showToast('Documento eliminado', 'success');
        } catch (e) { Utils.showToast("Error eliminando", 'error'); }
    },

    // ========== Chat Delegation to ChatModule ==========
    toggleChat: () => ChatModule.toggleChat(),
    sendChat: () => ChatModule.sendChat(),
    downloadChat: () => ChatModule.downloadChat(),
    generateExecutiveSummary: () => ChatModule.generateExecutiveSummary(),
    setFilteredDocsForChat: (docs) => ChatModule.setFilteredDocs(docs)
};

// Initialize ChatModule with RepoModule data source
document.addEventListener('DOMContentLoaded', () => {
    if (window.ChatModule) {
        ChatModule.setDataSource(() => RepoModule.data);
    }
});
