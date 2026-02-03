
const GanttModule = {
    state: {
        isDragging: false,
        startX: 0,
        scrollLeft: 0,
        zoom: 'month', // 'month', 'compact'
        data: [],
        filteredData: [],
        minDate: null,
        maxDate: null,
        filters: { product: '', resp: '' }
    },

    init: async () => {
        const container = document.getElementById('ganttChart');
        container.innerHTML = '<div class="text-center p-4">Cargando...</div>';

        Utils.renderBreadcrumbs(['Inicio', 'Carta Gantt Global']);

        // Always fetch fresh data to define single source of truth from Server
        const data = await API.get('/plan-maestro?t=' + Date.now());
        window.appData = window.appData || {};
        window.appData.plan = data;

        GanttModule.state.data = data || [];

        // Cascading Filters
        Utils.setupCascadingFilters({
            data: GanttModule.state.data,
            filters: [
                { id: 'ganttFilterProduct', key: 'product_code' },
                { id: 'ganttFilterResp', key: 'primary_responsible' },
                { id: 'ganttFilterStatus', key: 'status' }
            ],
            chipsContainerId: 'ganttActiveChips',
            search: {
                id: 'ganttSearch',
                keys: ['task_name', 'activity_code']
            },
            onFilter: (filtered) => {
                GanttModule.state.filteredData = filtered;
                GanttModule.calcDateRange();
                GanttModule.render();
            }
        });

        GanttModule.setupInteractions();
    },

    clearFilters: () => {
        const ids = ['ganttFilterProduct', 'ganttFilterResp', 'ganttFilterStatus', 'ganttSearch'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        GanttModule.applyFilters();
    },

    applyFilters: () => {
        const fProd = document.getElementById('ganttFilterProduct')?.value.toLowerCase() || '';
        const fResp = document.getElementById('ganttFilterResp')?.value.toLowerCase() || '';
        const fStat = document.getElementById('ganttFilterStatus')?.value.toLowerCase() || '';
        const fSearch = document.getElementById('ganttSearch')?.value.toLowerCase() || '';

        const raw = GanttModule.state.data;
        GanttModule.state.filteredData = raw.filter(item => {
            const matchesProd = !fProd || (item.product_code || '').toLowerCase().includes(fProd);
            const matchesResp = !fResp || (item.primary_responsible || '').toLowerCase().includes(fResp);
            const matchesStat = !fStat || (item.status || '').toLowerCase() === fStat; // Exact match for status
            // Search in Name OR Code
            const matchesSearch = !fSearch ||
                (item.task_name || '').toLowerCase().includes(fSearch) ||
                (item.activity_code || '').toLowerCase().includes(fSearch);

            return matchesProd && matchesResp && matchesStat && matchesSearch && item.fecha_inicio && item.fecha_fin;
        });

        GanttModule.calcDateRange();
        GanttModule.render();
    },

    calcDateRange: () => {
        const data = GanttModule.state.filteredData;
        if (data.length === 0) return;

        // Find min and max dates
        let min = new Date('2099-12-31');
        let max = new Date('1970-01-01');

        data.forEach(item => {
            const start = new Date(item.fecha_inicio);
            const end = new Date(item.fecha_fin);
            if (start < min) min = start;
            if (end > max) max = end;
        });

        // Add buffer (1 month before, 1 month after)
        min = new Date(min.getFullYear(), min.getMonth() - 1, 1);
        max = new Date(max.getFullYear(), max.getMonth() + 2, 0); // End of next month

        GanttModule.state.minDate = min;
        GanttModule.state.maxDate = max;
    },

    render: () => {
        const container = document.getElementById('ganttChart');
        const data = GanttModule.state.filteredData;

        if (data.length === 0) {
            container.innerHTML = '<div class="text-center p-4">No hay datos para mostrar con los filtros actuales.</div>';
            return;
        }

        const minDate = GanttModule.state.minDate;
        const maxDate = GanttModule.state.maxDate;
        const zoom = GanttModule.state.zoom || 'month';

        // Generate time periods based on zoom level
        const periods = [];
        let curr = new Date(minDate);
        let colWidth = 100; // default width per column

        switch (zoom) {
            case 'day':
                colWidth = 40;
                while (curr <= maxDate) {
                    periods.push({
                        label: curr.toLocaleDateString('es', { day: '2-digit', month: 'short' }),
                        date: new Date(curr),
                        key: curr.toISOString().split('T')[0]
                    });
                    curr.setDate(curr.getDate() + 1);
                }
                break;

            case 'week':
                colWidth = 80;
                // Align to Monday
                const firstMonday = new Date(curr);
                firstMonday.setDate(curr.getDate() - curr.getDay() + 1);
                curr = firstMonday;
                while (curr <= maxDate) {
                    const weekEnd = new Date(curr);
                    weekEnd.setDate(curr.getDate() + 6);
                    periods.push({
                        label: `${curr.getDate()}/${curr.getMonth() + 1} - ${weekEnd.getDate()}/${weekEnd.getMonth() + 1}`,
                        date: new Date(curr),
                        key: `W${curr.toISOString().split('T')[0]}`
                    });
                    curr.setDate(curr.getDate() + 7);
                }
                break;

            case 'quarter':
                colWidth = 150;
                curr = new Date(minDate.getFullYear(), Math.floor(minDate.getMonth() / 3) * 3, 1);
                while (curr <= maxDate) {
                    const q = Math.floor(curr.getMonth() / 3) + 1;
                    periods.push({
                        label: `T${q} ${curr.getFullYear()}`,
                        date: new Date(curr),
                        key: `Q${q}-${curr.getFullYear()}`
                    });
                    curr.setMonth(curr.getMonth() + 3);
                }
                break;

            case 'month':
            default:
                colWidth = 100;
                while (curr <= maxDate) {
                    periods.push({
                        label: curr.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }),
                        date: new Date(curr),
                        key: `${curr.getFullYear()}-${curr.getMonth()}`
                    });
                    curr.setMonth(curr.getMonth() + 1);
                }
                break;
        }

        const numPeriods = periods.length;
        const tableMinWidth = (numPeriods * colWidth) + 300 + 'px';

        let gridHtml = `
            <div class="gantt-toolbar">
                <div class="flex gap-2 items-center">
                    <button class="btn btn-sm btn-secondary" onclick="GanttModule.scrollToToday()">
                        <i class="far fa-calendar-check"></i> Hoy
                    </button>
                    <div class="text-sm text-slate-500">
                        Mostrando ${data.length} actividades | Escala: <strong>${zoom}</strong>
                    </div>
                </div>
                <div class="text-sm font-bold text-slate-500">
                    ${minDate.toLocaleDateString()} - ${maxDate.toLocaleDateString()}
                </div>
            </div>

            <div class="gantt-scroll-container" id="ganttScrollArea">
                <div class="gantt-table" style="grid-template-columns: 240px repeat(${numPeriods}, ${colWidth}px); min-width: ${tableMinWidth};">
                    
                    <!-- Header -->
                    <div class="gantt-header-cell">Actividad</div>
                    ${periods.map(p => `<div class="gantt-header-cell text-capitalize" style="font-size: ${zoom === 'day' ? '10px' : '12px'}">${p.label}</div>`).join('')}

                    <!-- Current Date line can only be drawn if "today" is in range -->
                    ${GanttModule.getTodayLine(periods)}
        `;

        data.forEach(item => {
            gridHtml += GanttModule.renderRow(item, minDate, maxDate);
        });

        gridHtml += `
            <div id="ganttTooltip" class="gantt-tooltip"></div>
            </div></div>
        `;

        container.innerHTML = `<div class="gantt-view-container">${gridHtml}</div>`;

        // Re-attach interactions after re-render
        GanttModule.setupInteractions();
    },

    renderRow: (item, minDate, maxDate) => {
        const start = new Date(item.fecha_inicio);
        const end = new Date(item.fecha_fin);
        const totalSpan = maxDate - minDate;

        let leftPct = ((start - minDate) / totalSpan) * 100;
        let widthPct = ((end - start) / totalSpan) * 100;

        if (leftPct < 0) { widthPct += leftPct; leftPct = 0; }
        if (widthPct < 0) widthPct = 0;

        let barClass = 'bar-planned'; // Gray/Default
        const status = (item.status || '').toUpperCase();

        if (status === 'COMPLETADO' || status === 'FINALIZADO' || status === 'LISTO') barClass = 'bar-completed'; // Green
        else if (status === 'EN PROGRESO' || status === 'EJECUCIÓN') barClass = 'bar-active'; // Blue
        else if (status === 'PENDIENTE') barClass = 'bar-pending'; // Red Explicit
        else {
            // If delayed check
            const now = new Date();
            if (end < now) barClass = 'bar-late';
        }

        // Grid lines matching dynamic months length
        // To be simpler, we just use empty cells corresponding to months.
        // Actually since we use 1 continuous bar container, we need empty cells in background for visual grid.
        // Or simpler, just rely on grid-column lines.
        // The background grid is tricky with variable content.
        // We will just put ONE big cell for the timeline row and use percentage.

        // Count filtered months
        const numMonths = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24 * 30));

        // We render background lines separately? 
        // No, Gantt row structure:
        // [Activity] [Timeline Wrapper (spanning all cols)]

        const gridLines = Array(numMonths).fill('<div style="flex:1; border-right:1px solid #f8fafc;"></div>').join('');

        // Calculate duration text
        const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        const durationText = diffDays > 30 ? `${Math.round(diffDays / 30)} m` : `${diffDays} d`;

        return `
            <div class="gantt-row-group" style="display: contents;">
                 <div class="gantt-activity-cell" onclick="PlanModule.viewDetails(${item.id})" style="cursor: pointer;">
                    <div class="activity-info">
                        <span class="activity-code">${item.activity_code.substring(0, 12)}</span>
                        <span class="activity-name">${item.task_name}</span>
                    </div>
                 </div>
                 
                 <div class="gantt-timeline-wrapper" style="grid-column: 2 / -1; position: relative; display: flex; align-items: center; border-bottom: 1px solid #f1f5f9; height: 40px;">
                     <!-- Bar -->
                     <div class="gantt-bar-container ${barClass}" 
                          style="left: ${leftPct}%; width: ${Math.max(0.5, widthPct)}%; z-index: 2;"
                          onmouseenter="GanttModule.showTooltip(event, '${item.task_name}', '${Utils.formatDate(item.fecha_inicio)}', '${Utils.formatDate(item.fecha_fin)}', '${item.status}', '${item.primary_responsible}')"
                          onmouseleave="GanttModule.hideTooltip()"
                          onclick="PlanModule.viewDetails(${item.id})"
                     >
                        ${durationText}
                     </div>
                     <!-- Bg lines (approximate) -->
                     <div style="position:absolute; width:100%; height:100%; display:flex; pointer-events:none; z-index:0;">
                        ${gridLines}
                     </div>
                 </div>
            </div>
        `;
    },

    getTodayLine: (months) => {
        const now = new Date();
        const min = GanttModule.state.minDate;
        const max = GanttModule.state.maxDate;

        if (now < min || now > max) return '';

        const pct = ((now - min) / (max - min)) * 100;

        return `
            <div style="grid-column: 2 / -1; grid-row: 2 / 1000; position: relative; pointer-events: none; width: 100%; height: 100%; z-index: 0;">
                <div class="current-date-line" style="left: ${pct}%;"></div>
                <div class="current-date-tag" style="left: ${pct}%; top: -5px;">Hoy</div>
            </div>
        `;
    },

    setupInteractions: () => {
        const scrollArea = document.getElementById('ganttScrollArea');
        if (!scrollArea) return;

        const state = GanttModule.state;
        scrollArea.addEventListener('mousedown', (e) => {
            state.isDragging = true;
            state.startX = e.pageX - scrollArea.offsetLeft;
            state.scrollLeft = scrollArea.scrollLeft;
            scrollArea.style.cursor = 'grabbing';
        });
        scrollArea.addEventListener('mouseleave', () => {
            state.isDragging = false;
            scrollArea.style.cursor = 'grab';
        });
        scrollArea.addEventListener('mouseup', () => {
            state.isDragging = false;
            scrollArea.style.cursor = 'grab';
        });
        scrollArea.addEventListener('mousemove', (e) => {
            if (!state.isDragging) return;
            e.preventDefault();
            const x = e.pageX - scrollArea.offsetLeft;
            const walk = (x - state.startX) * 1.5;
            scrollArea.scrollLeft = state.scrollLeft - walk;
        });

        // #23 - Setup Zoom Controls
        GanttModule.setupZoomControls();
    },

    // #23 - Zoom Controls Setup
    setupZoomControls: () => {
        const container = document.getElementById('ganttZoomControls');
        if (!container) return;

        container.querySelectorAll('.gantt-zoom-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const zoom = btn.dataset.zoom;
                GanttModule.state.zoom = zoom;

                container.querySelectorAll('.gantt-zoom-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                GanttModule.render();
            });
        });
    },

    // #26 - Render Progress Summary Bar
    renderMinimap: () => {
        const container = document.getElementById('ganttMinimapContainer');
        if (!container) return;

        const data = GanttModule.state.filteredData;
        if (!data || data.length === 0) {
            container.innerHTML = '';
            return;
        }

        // Calculate status counts
        let completed = 0, inProgress = 0, pending = 0, planned = 0;

        data.forEach(item => {
            const status = (item.status || '').toUpperCase();
            if (status === 'COMPLETADO' || status === 'FINALIZADO' || status === 'LISTO') {
                completed++;
            } else if (status === 'EN PROGRESO' || status === 'EJECUCIÓN') {
                inProgress++;
            } else if (status === 'PENDIENTE' || status === 'ATRASADO') {
                pending++;
            } else {
                planned++;
            }
        });

        const total = data.length;
        const pctCompleted = ((completed / total) * 100).toFixed(1);
        const pctInProgress = ((inProgress / total) * 100).toFixed(1);
        const pctPending = ((pending / total) * 100).toFixed(1);
        const pctPlanned = ((planned / total) * 100).toFixed(1);

        container.innerHTML = `
            <div class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                <div class="flex items-center justify-between mb-3">
                    <span class="text-sm font-bold text-slate-700">Progreso General del Proyecto</span>
                    <span class="text-sm text-slate-500">${total} actividades</span>
                </div>
                <div class="flex h-6 rounded-lg overflow-hidden bg-slate-100">
                    ${completed > 0 ? `<div class="bg-emerald-500 flex items-center justify-center" style="width: ${pctCompleted}%">
                        <span class="text-[10px] font-bold text-white">${pctCompleted > 8 ? pctCompleted + '%' : ''}</span>
                    </div>` : ''}
                    ${inProgress > 0 ? `<div class="bg-blue-500 flex items-center justify-center" style="width: ${pctInProgress}%">
                        <span class="text-[10px] font-bold text-white">${pctInProgress > 8 ? pctInProgress + '%' : ''}</span>
                    </div>` : ''}
                    ${pending > 0 ? `<div class="bg-red-500 flex items-center justify-center" style="width: ${pctPending}%">
                        <span class="text-[10px] font-bold text-white">${pctPending > 8 ? pctPending + '%' : ''}</span>
                    </div>` : ''}
                    ${planned > 0 ? `<div class="bg-slate-300 flex items-center justify-center" style="width: ${pctPlanned}%">
                        <span class="text-[10px] font-bold text-slate-600">${pctPlanned > 8 ? pctPlanned + '%' : ''}</span>
                    </div>` : ''}
                </div>
                <div class="flex justify-between mt-2 text-xs text-slate-500">
                    <span><strong class="text-emerald-600">${completed}</strong> Completadas</span>
                    <span><strong class="text-blue-600">${inProgress}</strong> En Progreso</span>
                    <span><strong class="text-red-600">${pending}</strong> Pendientes</span>
                    <span><strong class="text-slate-600">${planned}</strong> Planificadas</span>
                </div>
            </div>
        `;
    },

    // Update info display
    updateInfo: () => {
        const info = document.getElementById('ganttInfo');
        if (!info) return;

        const data = GanttModule.state.filteredData;
        const minDate = GanttModule.state.minDate;
        const maxDate = GanttModule.state.maxDate;

        if (minDate && maxDate) {
            info.textContent = `${data.length} tareas | ${minDate.toLocaleDateString('es')} - ${maxDate.toLocaleDateString('es')}`;
        }
    },

    // --- TOOLTIP ---
    showTooltip: (e, name, start, end, status, resp) => {
        const tip = document.getElementById('ganttTooltip');
        tip.innerHTML = `
            <div class="font-bold mb-1" style="color:white; border-bottom:1px solid #334155; padding-bottom:4px;">${name}</div>
            <div class="gantt-tooltip-row"><span class="gantt-tooltip-label">Inicio:</span> ${start}</div>
            <div class="gantt-tooltip-row"><span class="gantt-tooltip-label">Fin:</span> ${end}</div>
            <div class="gantt-tooltip-row"><span class="gantt-tooltip-label">Estado:</span> ${status}</div>
            <div class="gantt-tooltip-row"><span class="gantt-tooltip-label">Resp:</span> ${resp}</div>
        `;
        tip.style.display = 'block';

        const x = e.clientX + 10;
        const windowW = window.innerWidth;
        if (x + 250 > windowW) {
            tip.style.left = (x - 260) + 'px';
        } else {
            tip.style.left = x + 'px';
        }
        tip.style.top = e.clientY + 10 + 'px';
    },

    hideTooltip: () => {
        const tip = document.getElementById('ganttTooltip');
        if (tip) tip.style.display = 'none';
    },

    scrollToToday: () => {
        const scroll = document.getElementById('ganttScrollArea');
        if (scroll) {
            // Calculate position of today relative to date range
            const now = new Date();
            const minDate = GanttModule.state.minDate;
            const maxDate = GanttModule.state.maxDate;

            if (minDate && maxDate && now >= minDate && now <= maxDate) {
                const totalSpan = maxDate - minDate;
                const todayPos = (now - minDate) / totalSpan;
                scroll.scrollLeft = (scroll.scrollWidth * todayPos) - (scroll.clientWidth / 2);
            } else {
                scroll.scrollLeft = scroll.scrollWidth / 2;
            }
        }
    }
};

// Override render to include new features
const originalRender = GanttModule.render;
GanttModule.render = function () {
    originalRender.call(this);
    GanttModule.renderMinimap();
    GanttModule.updateInfo();
};

window.renderGantt = () => {
    GanttModule.init();
};

