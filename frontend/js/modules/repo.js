
const RepoModule = {
    data: [],
    selectedIds: new Set(), // Nuevo: Selección manual
    lastFilteredData: [],   // Nuevo: Cache de filtro

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
            RepoModule.lastFilteredData = [...RepoModule.data]; // Init cache
            RepoModule.populateTags();
            RepoModule.populateYears();
            RepoModule.populateInstitutions();
            RepoModule.render(RepoModule.data);
            RepoModule.updateChatContext(); // Init chat

        } catch (e) {
            console.error(e);
            if (container) container.innerHTML = '<div class="text-red-500 text-center">Error cargando repositorio</div>';
        }
    },

    populateTags: () => {
        const select = document.getElementById('repoFilterTags');
        if (!select) return;

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
        select.innerHTML = '<option value="">Todas</option>';
        sorted.forEach(t => {
            select.innerHTML += `<option value="${t}">${t}</option>`;
        });
    },

    populateYears: () => {
        const select = document.getElementById('repoFilterYear');
        if (!select) return;

        const years = new Set();
        RepoModule.data.forEach(item => {
            if (item.fecha_publicacion) {
                const year = item.fecha_publicacion.substring(0, 4);
                if (year && /^\d{4}$/.test(year)) {
                    years.add(year);
                }
            }
        });

        const sorted = Array.from(years).sort((a, b) => b - a);
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

    clearFilters: () => {
        ['repoSearch', 'repoFilterType', 'repoFilterSourceType', 'repoFilterOrigin', 'repoFilterYear', 'repoFilterTags']
            .forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });

        // Clear selection too? Maybe not, allow selection to persist across filters.
        // RepoModule.selectedIds.clear(); 

        const evt = new Event('input');
        const input = document.getElementById('repoSearch');
        if (input) input.dispatchEvent(evt);
        else {
            RepoModule.lastFilteredData = RepoModule.data;
            RepoModule.render(RepoModule.data);
            RepoModule.updateChatContext();
        }
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
                const textMatch = !fSearch ||
                    (item.titulo || '').toLowerCase().includes(fSearch) ||
                    (item.descripcion || '').toLowerCase().includes(fSearch) ||
                    (item.etiquetas || '').toLowerCase().includes(fSearch) ||
                    (item.puntos_clave || '').toLowerCase().includes(fSearch);

                const typeMatch = !fType || (item.tipo_documento || '').toLowerCase() === fType || (item.tipo_documento || '').toLowerCase().includes(fType);
                const srcTypeMatch = !fSrcType || (item.tipo_fuente || '').toLowerCase() === fSrcType;
                const originMatch = !fOrigin || (item.fuente_origen || '').toLowerCase().includes(fOrigin);
                const tagsMatch = !fTag || (item.etiquetas || '').toLowerCase().split(',').map(t => t.trim()).includes(fTag);

                let yearMatch = true;
                if (fYear && item.fecha_publicacion) {
                    const y = item.fecha_publicacion.substring(0, 4);
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

            RepoModule.lastFilteredData = filtered;
            RepoModule.render(filtered);
            RepoModule.updateChatContext();
        };

        inputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', filter);
            }
        });
    },

    // Nueva lógica de contexto para el chat
    updateChatContext: () => {
        let docsToSend;
        const selectedDocs = RepoModule.data.filter(d => RepoModule.selectedIds.has(d.id));

        if (RepoModule.selectedIds.size > 0) {
            // Priority: Selected Documents
            docsToSend = selectedDocs;
        } else {
            // Fallback: All Filtered Documents
            docsToSend = RepoModule.lastFilteredData || RepoModule.data;
        }

        // Update Chat Module
        if (window.ChatModule) {
            ChatModule.setFilteredDocs(docsToSend);
        }

        // Update UI Context Label
        const contextLabel = document.getElementById('repoChatContext');
        if (contextLabel) {
            if (RepoModule.selectedIds.size > 0 && RepoModule.selectedIds.size <= 2) {
                // Modo Deep Dive
                const titles = selectedDocs.map(d => d.titulo).join(' y ');
                contextLabel.textContent = `Análisis profundo para ${titles}`;
                contextLabel.classList.add('text-indigo-600', 'font-bold');
                contextLabel.title = titles; // Tooltip for long titles
            } else {
                // Modo Biblioteca
                const count = docsToSend.length;
                contextLabel.textContent = `Chat con Biblioteca (${count} docs)`;
                contextLabel.classList.remove('text-indigo-600', 'font-bold');
                contextLabel.removeAttribute('title');
            }
        }

        // Show sticky notification if selection active
        RepoModule.updateSelectionUI();
    },

    // Toggle Selection
    toggleSelection: (id) => {
        if (RepoModule.selectedIds.has(id)) {
            RepoModule.selectedIds.delete(id);
        } else {
            if (RepoModule.selectedIds.size >= 2) {
                Utils.showToast("Máximo 2 documentos para Deep Dive", "warning");
                return;
            }
            RepoModule.selectedIds.add(id);
        }
        // Force re-render of current view to update checkboxes
        RepoModule.render(RepoModule.lastFilteredData || RepoModule.data);
        RepoModule.updateChatContext();
    },

    updateSelectionUI: () => {
        const count = RepoModule.selectedIds.size;
        const banner = document.getElementById('repoSelectionBanner');

        if (count > 0) {
            if (!banner) {
                const b = document.createElement('div');
                b.id = 'repoSelectionBanner';
                b.className = 'fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-4 z-50 animate-fade-in-up';
                b.innerHTML = `
                    <div class="flex items-center gap-2">
                        <i class="fas fa-check-circle text-emerald-400"></i>
                        <span class="font-bold text-sm"><span id="repoSelCount">0</span> seleccionados</span>
                    </div>
                    <div class="h-4 w-px bg-slate-600"></div>
                    <button onclick="RepoModule.clearSelection()" class="text-xs text-slate-300 hover:text-white hover:underline">Limpiar</button>
                    ${count <= 2 ?
                        `<button onclick="RepoModule.openChatWithContext()" class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1.5 rounded-full font-bold transition-colors ml-2 animate-pulse">
                            <i class="fas fa-robot mr-1"></i> Analizar Deep Dive
                        </button>` : ''
                    }
                `;
                document.body.appendChild(b);
            }
            document.getElementById('repoSelCount').textContent = count;
        } else {
            if (banner) banner.remove();
        }
    },

    clearSelection: () => {
        RepoModule.selectedIds.clear();
        RepoModule.render(RepoModule.lastFilteredData);
        RepoModule.updateChatContext();
    },

    openChatWithContext: () => {
        if (window.ChatModule) {
            ChatModule.toggleChat(true); // Open
        }
    },

    render: (data) => {
        const container = document.getElementById('repoGrid');
        if (!container) return;

        RepoModule.updateStats(data);

        if (!data || data.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center p-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                    <i class="fas fa-book-open text-4xl text-slate-300 mb-4"></i>
                    <h3 class="text-lg font-medium text-slate-600">Repositorio Vacío</h3>
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
            countEl.textContent = count;
        }

        if (infoEl) {
            const total = RepoModule.data.length;
            const filtered = filteredData ? filteredData.length : 0;
            const selected = RepoModule.selectedIds.size;

            if (selected > 0) {
                infoEl.innerHTML = `<span class="text-indigo-600 font-bold">Modo Selección: ${selected} documento(s)</span>`;
            } else if (filtered === total) {
                infoEl.textContent = 'Mostrando todos los documentos';
            } else {
                infoEl.innerHTML = `Mostrando <strong>${filtered}</strong> de <strong>${total}</strong> documentos`;
            }
        }
    },

    renderCard: (item) => {
        const isUrl = !!item.enlace_externo;
        const hasFile = !!item.ruta_archivo;
        const isSelected = RepoModule.selectedIds.has(item.id);

        // Colors & Icons logic (reused)
        let typeInfo = { color: 'blue', icon: 'fa-file-alt', label: 'Documento' };
        const t = (item.tipo_documento || '').toLowerCase();
        if (t.includes('ley')) typeInfo = { color: 'orange', icon: 'fa-balance-scale', label: 'Ley' };
        else if (t.includes('decreto')) typeInfo = { color: 'amber', icon: 'fa-gavel', label: 'Decreto' };
        else if (t.includes('informe')) typeInfo = { color: 'indigo', icon: 'fa-chart-pie', label: 'Informe' };
        else if (t.includes('acta')) typeInfo = { color: 'emerald', icon: 'fa-users', label: 'Acta' };
        // ... (rest of type logic same as before) ...
        const colorClass = `bg-${typeInfo.color}-50 text-${typeInfo.color}-600 border-${typeInfo.color}-100`;
        const status = item.estado_procesamiento || 'Pendiente';

        // Select Checkbox UI
        const checkIcon = isSelected ? 'fa-check-square text-indigo-600' : 'fa-square text-slate-300 group-hover:text-slate-400';
        const cardBorder = isSelected ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-slate-100';

        // Tags
        const tags = item.etiquetas ? item.etiquetas.split(',').map(tag =>
            `<span class="px-2 py-0.5 rounded-full bg-white border border-slate-200 text-[10px] font-medium text-slate-500 uppercase tracking-wide shadow-sm">${tag.trim()}</span>`
        ).join('') : '';

        // Actions
        let mainAction = '';
        if (hasFile) {
            const url = `${API.BASE}/uploads/${item.ruta_archivo}`;
            const isPreviewable = /\.(pdf|jpg|png)$/i.test(item.ruta_archivo);
            mainAction = `
                <div class="flex gap-2 w-full mt-4">
                    <a href="${url}" target="_blank" class="flex-1 btn btn-sm btn-outline justify-center border-slate-200 text-slate-600 hover:bg-slate-50">
                        <i class="fas fa-download mr-1"></i> Descargar
                    </a>
                    ${isPreviewable ? `
                    <button onclick="Utils.previewFile('${url}', '${item.titulo}')" class="flex-1 btn btn-sm btn-primary justify-center bg-${typeInfo.color}-600 hover:bg-${typeInfo.color}-700 border-none text-white">
                        <i class="fas fa-eye mr-1"></i> Ver
                    </button>` : ''}
                </div>
            `;
        } else if (isUrl) {
            mainAction = `
                <div class="w-full mt-4">
                    <a href="${item.enlace_externo}" target="_blank" class="btn btn-sm w-full btn-primary justify-center bg-blue-600 hover:bg-blue-700 text-white">
                        <i class="fas fa-external-link-alt mr-1"></i> Abrir Enlace
                    </a>
                </div>
            `;
        }

        return `
            <div class="repo-card group bg-white rounded-2xl border ${cardBorder} shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full relative overflow-hidden">
                <!-- Selection Overlay/Click Area -->
                 <div class="absolute top-4 right-4 z-10 cursor-pointer" onclick="RepoModule.toggleSelection(${item.id})">
                    <i class="far ${checkIcon} text-2xl transition-colors bg-white rounded"></i>
                </div>

                <!-- Top Decoration -->
                <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-${typeInfo.color}-400 to-${typeInfo.color}-600"></div>

                <div class="p-5 flex flex-col h-full">
                    <!-- Header -->
                    <div class="flex justify-between items-start gap-4 mb-3 pr-8">
                        <div class="w-10 h-10 rounded-xl flex items-center justify-center ${colorClass} bg-opacity-40 border shrink-0 shadow-sm">
                            <i class="fas ${typeInfo.icon} text-lg"></i>
                        </div>
                        <div class="flex-grow min-w-0">
                            <h3 class="font-bold text-slate-800 text-sm leading-snug line-clamp-2 group-hover:text-${typeInfo.color}-600 transition-colors" title="${item.titulo}">
                                ${item.titulo}
                            </h3>
                             <span class="text-[10px] font-bold text-${typeInfo.color}-600 uppercase tracking-wider mt-1 block">
                                ${typeInfo.label}
                            </span>
                        </div>
                    </div>

                    <!-- Description -->
                    <div class="mb-4 text-xs text-slate-500 line-clamp-3 leading-relaxed">
                        ${item.descripcion || 'Sin descripción disponible.'}
                    </div>

                    <div class="flex-grow"></div>

                    <!-- Tags -->
                    <div class="flex flex-wrap gap-2 mt-2 mb-2">
                        ${tags}
                    </div>

                     <div class="pt-3 mt-2 border-t border-slate-50 flex items-center justify-between text-xs text-slate-400 font-medium">
                        <div class="flex items-center gap-2">
                            <i class="far fa-calendar-alt"></i> <span>${item.fecha_publicacion ? item.fecha_publicacion.substring(0, 4) : 'N/A'}</span>
                             <span class="text-slate-200">|</span>
                            <span>${item.fuente_origen || 'Origen Desc.'}</span>
                        </div>
                        
                        <!-- Edit/Delete (visible on hover) -->
                        <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button onclick="RepoModule.edit(${item.id})" class="text-slate-400 hover:text-blue-500" title="Editar"><i class="fas fa-pencil-alt"></i></button>
                             <button onclick="RepoModule.delete(${item.id})" class="text-slate-400 hover:text-red-500" title="Eliminar"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>

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
            if (el.name && item[el.name] !== undefined && el.type !== 'file') el.value = item[el.name];
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

        const form = document.getElementById('repoForm');
        if (form) {
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
        const btn = form.querySelector('button[type="submit"]');
        const originalText = btn ? btn.innerHTML : 'Guardar';
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Guardando...'; }

        try {
            const token = localStorage.getItem('token');
            let res;
            if (id) {
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
                const formData = new FormData(form);
                if (!formData.get('fecha_publicacion')) formData.delete('fecha_publicacion');
                res = await fetch(`${API.BASE}/repositorio`, {
                    method: 'POST', body: formData, headers: { 'Authorization': `Bearer ${token}` }
                });
            }
            const json = await res.json();
            if (res.ok) {
                Utils.closeModal('repoModal');
                form.reset();
                if (idInput) idInput.value = '';
                RepoModule.loadData();
                Utils.showToast('Documento guardado', 'success');
            } else {
                Utils.showToast("Error: " + (json.error || 'Error'), 'error');
            }
        } catch (e) { Utils.showToast('Error de conexión', 'error'); }
        finally { if (btn) { btn.disabled = false; btn.innerHTML = originalText; } }
    },

    delete: async (id) => {
        if (!confirm("¿Eliminar documento?")) return;
        try {
            await API.delete(`/repositorio/${id}`);
            RepoModule.loadData();
            Utils.showToast('Eliminado', 'success');
        } catch (e) { Utils.showToast("Error eliminando", 'error'); }
    },

    toggleChat: () => ChatModule.toggleChat(),
    sendChat: () => ChatModule.sendChat(),
    downloadChat: () => ChatModule.downloadChat(),
    generateExecutiveSummary: () => ChatModule.generateExecutiveSummary(),
    setFilteredDocsForChat: (docs) => ChatModule.setFilteredDocs(docs)
};

document.addEventListener('DOMContentLoaded', () => {
    if (window.ChatModule) {
        ChatModule.setDataSource(() => RepoModule.data);
    }
});
