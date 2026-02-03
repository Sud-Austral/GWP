
const Utils = {
    checkAuth: () => {
        if (!localStorage.getItem('token')) {
            window.location.href = 'index.html';
            return false;
        }
        return true;
    },
    getUser: () => JSON.parse(localStorage.getItem('user')),

    formatDate: (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        if (isNaN(date)) return dateString;
        // Use UTC methods to avoid timezone shifting
        const day = String(date.getUTCDate()).padStart(2, '0');
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const year = date.getUTCFullYear();
        return `${day}/${month}/${year}`;
    },

    // NEW: Helper for date inputs (YYYY-MM-DD)
    formatDateForInput: (dateInput) => {
        if (!dateInput) return '';
        // Check if it matches simplistic YYYY-MM-DD to avoid Date parsing issues
        if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
            return dateInput;
        }

        const date = new Date(dateInput);
        if (isNaN(date.getTime())) return '';

        // Use UTC to keep the server date exactly
        const yyyy = date.getUTCFullYear();
        const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(date.getUTCDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    },

    openModal: (modalId) => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('show');
        }
    },

    closeModal: (modalId) => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('show');
        }
    },

    clearFilters: () => {
        // Find all select inputs in filter cards and reset them
        document.querySelectorAll('.filter-card select, .filter-card input').forEach(el => {
            el.value = '';
        });

        // Trigger generic updates
        const currentView = window.currentView || 'plan';
        if (currentView === 'plan' && PlanModule) PlanModule.loadData(); // Re-init to full reset
        else if (currentView === 'gantt' && GanttModule) GanttModule.init();
        else if (currentView === 'hitos' && HitosModule) HitosModule.init();
        else if (currentView === 'documents' && DocumentsModule) DocumentsModule.init();
    },

    getUniqueValues: (data, key) => {
        if (!data || !Array.isArray(data)) return [];
        const unique = new Set();
        data.forEach(item => {
            const val = item[key];
            if (val) unique.add(val.toString().trim());
        });
        return Array.from(unique).sort();
    },

    populateSelect: (selectId, options, defaultLabel = 'Todos', selectedValue = null) => {
        const sel = document.getElementById(selectId);
        if (!sel) return;

        const current = selectedValue !== null ? selectedValue : sel.value;

        sel.innerHTML = `<option value="">${defaultLabel}</option>`;
        options.forEach(opt => {
            sel.innerHTML += `<option value="${opt}">${opt}</option>`;
        });

        // Try to restore selection if it exists in new options
        if (current && options.includes(current)) {
            sel.value = current;
        } else {
            sel.value = "";
        }
    },

    // --- CASCADING FILTERS LOGIC ---
    // config = { data: [], filters: [ {id, key}, {id, key} ], onFilter: (filteredData) => {} }
    // --- CASCADING FILTERS LOGIC ---
    // config = { data: [], filters: [ {id, key}, {id, key} ], onFilter: (filteredData) => {} }
    setupCascadingFilters: (config) => {
        const { data, filters, search, onFilter, chipsContainerId } = config;

        const applyParams = () => {
            // 1. Get current values
            const activeValues = {};
            filters.forEach(f => {
                const el = document.getElementById(f.id);
                if (el) activeValues[f.id] = el.value;
            });

            // Get Search Value
            let searchTerm = '';
            if (search && search.id) {
                const el = document.getElementById(search.id);
                if (el) searchTerm = el.value.toLowerCase();
            }

            // 2. Filter Main Data (Intersection of all active filters + Search)
            const filteredData = data.filter(item => {
                // Check Search
                if (searchTerm && search.keys) {
                    const matchesSearch = search.keys.some(k => {
                        const val = (item[k] || '').toString().toLowerCase();
                        return val.includes(searchTerm);
                    });
                    if (!matchesSearch) return false;
                }

                // Check Dropdowns
                return filters.every(f => {
                    const val = activeValues[f.id];
                    if (!val) return true; // No filter active for this field

                    const itemVal = (item[f.key] || '').toString().toLowerCase();
                    const filterVal = val.toLowerCase();
                    return itemVal.includes(filterVal);
                });
            });

            // 3. Update Options for EACH filter based on others
            filters.forEach(targetF => {
                // To find available options for targetF, we filter by ALL OTHERS except targetF
                const contextData = data.filter(item => {
                    // Check Search first
                    if (searchTerm && search.keys) {
                        const matchesSearch = search.keys.some(k => {
                            const val = (item[k] || '').toString().toLowerCase();
                            return val.includes(searchTerm);
                        });
                        if (!matchesSearch) return false;
                    }

                    return filters.every(otherF => {
                        if (otherF.id === targetF.id) return true; // Ignore self
                        const val = activeValues[otherF.id];
                        if (!val) return true;

                        const itemVal = (item[otherF.key] || '').toString().toLowerCase();
                        const filterVal = val.toLowerCase();
                        return itemVal.includes(filterVal);
                    });
                });

                // Extract valid options for this field from contextData
                const options = Utils.getUniqueValues(contextData, targetF.key);

                // Repopulate, keeping current value if possible
                const el = document.getElementById(targetF.id);
                if (el) {
                    const currentVal = activeValues[targetF.id];
                    // Simple hack: read the first option text of current select usually "Producto: Todos"
                    // If element is select
                    if (el.tagName === 'SELECT') {
                        const defaultLabel = el.options[0]?.text || 'Todos';
                        Utils.populateSelect(targetF.id, options, defaultLabel, currentVal);
                    }
                }
            });

            // 4. Update Chips
            if (chipsContainerId) {
                Utils.updateActiveTags(chipsContainerId, filters, activeValues, applyParams);
            }

            // 5. Trigger Callback with final filtered data
            if (onFilter) onFilter(filteredData);
        };

        // Attach Listeners
        filters.forEach(f => {
            const el = document.getElementById(f.id);
            if (el) {
                // Remove old listeners to avoid stacking
                const newEl = el.cloneNode(true);
                el.parentNode.replaceChild(newEl, el);
                newEl.addEventListener('change', applyParams);
            }
        });

        if (search && search.id) {
            const el = document.getElementById(search.id);
            if (el) {
                const newEl = el.cloneNode(true);
                el.parentNode.replaceChild(newEl, el);
                newEl.addEventListener('input', applyParams);
            }
        }

        // Initial Run
        applyParams();
    },

    refreshCurrentView: () => {
        const currentView = document.querySelector('.nav-item.active').dataset.view;
        console.log("Refreshing view:", currentView);
        if (currentView === 'dashboard' && window.StatsModule) StatsModule.init();
        else if (currentView === 'plan' && window.PlanModule) PlanModule.init();
        else if (currentView === 'users' && window.UsersModule) UsersModule.init();
        else if (currentView === 'calendar' && window.CalendarModule) CalendarModule.init();
        else if (currentView === 'hitos' && window.HitosModule) HitosModule.init();
        else if (currentView === 'observaciones' && window.ObservacionesModule) ObservacionesModule.init();
        else if (currentView === 'documents' && window.DocumentsModule) DocumentsModule.init();
        else if (currentView === 'repo' && window.RepoModule) RepoModule.loadData();
    },

    previewFile: (url, title = 'Vista Previa') => {
        let modal = document.getElementById('globalPreviewModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'globalPreviewModal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content" style="width:90%; height:90%; max-width:1200px; display:flex; flex-direction:column;">
                    <header class="modal-header">
                        <h2 class="modal-title" id="previewTitle">Vista Previa</h2>
                        <button class="close-btn" onclick="document.getElementById('globalPreviewModal').style.display='none'">&times;</button>
                    </header>
                    <div style="flex:1; background:#f1f5f9; padding:10px; border-radius:4px; display:flex; justify-content:center; align-items:center;">
                         <iframe id="previewFrame" style="width:100%; height:100%; border:none; background:white;"></iframe>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        document.getElementById('previewTitle').textContent = title;
        document.getElementById('previewFrame').src = url;
        modal.style.display = 'flex';
    },

    initTabs: () => {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            // Avoid double binding
            if (btn.dataset.bound) return;
            btn.dataset.bound = true;

            btn.addEventListener('click', () => {
                const target = btn.dataset.target;

                // Toggle Buttons
                const parent = btn.parentElement;
                parent.querySelectorAll('.tab-btn').forEach(b => {
                    b.classList.remove('active'); // CSS class control
                    // Inline styles reset
                    b.style.color = '#64748b';
                    b.style.borderBottom = '2px solid transparent';
                });

                // Active state
                btn.classList.add('active');
                btn.style.color = '#3b82f6';
                btn.style.borderBottom = '2px solid #3b82f6';

                // Toggle Content
                // Find common ancestor for panes? Usually modal-content
                const modalContent = btn.closest('.modal-content');
                if (modalContent) {
                    modalContent.querySelectorAll('.tab-pane').forEach(p => p.classList.add('hidden'));
                    const pane = modalContent.querySelector('#' + target);
                    if (pane) pane.classList.remove('hidden');
                }
            });
        });
    },

    showToast: (message, type = 'success') => {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'fixed bottom-6 right-6 z-[9999] flex flex-col gap-3';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        const colors = type === 'success' ? 'bg-emerald-500' : (type === 'error' ? 'bg-red-500' : 'bg-blue-500');
        const icon = type === 'success' ? 'fa-check-circle' : (type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle');

        toast.className = `${colors} text-white px-6 py-3 rounded-xl shadow-lg shadow-black/10 flex items-center gap-3 transform transition-all duration-300 translate-y-10 opacity-0`;
        toast.innerHTML = `<i class="fas ${icon} text-lg"></i> <span class="font-medium text-sm">${message}</span>`;

        container.appendChild(toast);

        // Animate In
        requestAnimationFrame(() => {
            toast.classList.remove('translate-y-10', 'opacity-0');
        });

        // Remove
        setTimeout(() => {
            toast.classList.add('opacity-0', 'translate-y-2');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    renderBreadcrumbs: (crumbs) => {
        const container = document.getElementById('breadcrumbs-container');
        if (!container) return;

        const html = crumbs.map((c, i) => {
            const isLast = i === crumbs.length - 1;
            const style = isLast ? 'font-bold text-slate-800' : 'text-slate-400 hover:text-blue-500 cursor-pointer transition-colors';
            // Simple span if last, otherwise button/link logic ideally
            return `<span class="${style}">${c}</span>`;
        }).join('<span class="mx-2 text-slate-300">/</span>');

        container.innerHTML = html;
        container.classList.remove('hidden');
    },

    clearFilters: () => {
        const view = window.currentView || 'dashboard';
        let ids = [];

        if (view === 'repo') {
            if (window.RepoModule) { RepoModule.clearFilters(); return; }
        } else if (view === 'plan') {
            ids = ['searchPlan', 'filterProduct', 'filterResp', 'filterStatus'];
        } else if (view === 'hitos') {
            ids = ['hitoSearch', 'hitoFilterProduct', 'hitoFilterResp', 'hitoFilterStatus'];
        } else if (view === 'observaciones') {
            ids = ['obsSearch', 'obsFilterProduct', 'obsFilterResp', 'obsFilterStatus'];
        } else if (view === 'documents') {
            ids = ['docSearch', 'docFilterProduct', 'docFilterResp', 'docFilterStatus'];
        } else if (view === 'gantt') {
            if (window.GanttModule) { GanttModule.clearFilters(); return; }
        }

        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.value = '';
                el.dispatchEvent(new Event('change'));
                el.dispatchEvent(new Event('input'));
            }
        });
    },

    updateActiveTags: (containerId, filters, activeValues, refreshCallback) => {
        const container = document.getElementById(containerId);
        if (!container) return;

        let html = '';
        filters.forEach(f => {
            const val = activeValues[f.id];
            if (val) {
                // Try to get label from select option if available
                const el = document.getElementById(f.id);
                let label = val; // Default to value
                let fieldName = f.id.replace('filter', '').replace('repo', '').replace('Filter', '');

                if (el && el.tagName === 'SELECT') {
                    // Try to find the option text
                    for (let i = 0; i < el.options.length; i++) {
                        if (el.options[i].value === val) {
                            label = el.options[i].text;
                            break;
                        }
                    }
                }

                // Add Chip
                html += `
                    <div class="inline-flex items-center bg-blue-50 border border-blue-100 text-blue-600 text-[11px] font-bold px-3 py-1 rounded-full gap-2 transition-all hover:bg-blue-100 hover:border-blue-200 shadow-sm animate-fade-in-up">
                        <span class="opacity-60 uppercase tracking-wider text-[9px]">${fieldName}:</span>
                        <span>${label}</span>
                        <button onclick="document.getElementById('${f.id}').value=''; document.getElementById('${f.id}').dispatchEvent(new Event('change'));" 
                            class="hover:text-red-500 w-4 h-4 flex items-center justify-center rounded-full transition-colors ml-1">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `;
            }
        });

        container.innerHTML = html;
        if (html) container.classList.remove('hidden');
        else container.classList.add('hidden');
    }
};

window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('show');
    }
});
