
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
        return isNaN(date) ? dateString : date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
    setupCascadingFilters: (config) => {
        const { data, filters, onFilter } = config;

        const applyParams = () => {
            // 1. Get current values
            const activeValues = {};
            filters.forEach(f => {
                const el = document.getElementById(f.id);
                if (el) activeValues[f.id] = el.value;
            });

            // 2. Filter Main Data (Intersection of all active filters)
            const filteredData = data.filter(item => {
                return filters.every(f => {
                    const val = activeValues[f.id];
                    if (!val) return true; // No filter active for this field

                    // Specific logic for product/resp strings
                    const itemVal = (item[f.key] || '').toString().toLowerCase();
                    const filterVal = val.toLowerCase();

                    // Loose matching for codes/names, exact for status usually
                    // But if select options are exact values from data, exact match is safer.
                    // However, we populated selects with exact values.
                    // Let's try exact match first, if item is string and includes.
                    return itemVal.includes(filterVal);
                });
            });

            // 3. Update Options for EACH filter based on others
            filters.forEach(targetF => {
                // To find available options for targetF, we filter by ALL OTHERS except targetF
                // This allows the user to see other available options in this category given the other constraints
                const contextData = data.filter(item => {
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
                    // We need label logic... defaulting to 'Todos' based on placeholder logic or custom map
                    // Simple hack: read the first option text of current select usually "Producto: Todos"
                    const defaultLabel = el.options[0]?.text || 'Todos';
                    Utils.populateSelect(targetF.id, options, defaultLabel, currentVal);
                }
            });

            // 4. Trigger Callback with final filtered data
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

                // If it's a text input search, use keyup
                if (newEl.tagName === 'INPUT') {
                    newEl.addEventListener('keyup', applyParams);
                }
            }
        });

        // Initial Run
        applyParams();
    }
};

window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('show');
    }
});
