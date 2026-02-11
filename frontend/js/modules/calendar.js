
const CalendarModule = {
    events: [],
    currentView: 'month',

    state: {
        showHistory: false
    },

    init: async () => {
        Utils.renderBreadcrumbs(['Inicio', 'Calendario de Hitos']);

        // Fetch via centralized DataStore (single source of truth)
        const { plan, hitos } = await DataStore.refreshAll();

        const events = [];

        // Process Plan Activities (End Dates)
        if (plan && Array.isArray(plan)) {
            plan.forEach(p => {
                if (p.fecha_fin) {
                    events.push({
                        date: new Date(p.fecha_fin),
                        title: p.task_name,
                        code: p.activity_code,
                        type: 'entrega', // classification
                        original: p
                    });
                }
            });
        }

        // Process Hitos
        if (hitos && Array.isArray(hitos)) {
            hitos.forEach(h => {
                if (h.fecha_estimada) {
                    events.push({
                        date: new Date(h.fecha_estimada),
                        title: h.nombre,
                        code: h.activity_code || 'HITO',
                        type: 'hito',
                        original: h
                    });
                }
            });
        }

        // Sort by Date Ascending
        events.sort((a, b) => a.date - b.date);
        CalendarModule.events = events;

        // Render Buttons Logic Injection (Simple Hack since buttons are static in HTML usually)
        // But checking dashboard.html, buttons might be there.
        // Let's inject a button if missing?
        // Better: Update render to manage button state if it exists, or inject it.
        CalendarModule.render('month');
    },

    toggleHistory: () => {
        CalendarModule.state.showHistory = !CalendarModule.state.showHistory;
        const btn = document.getElementById('btnCalHistory');
        if (btn) {
            btn.classList.toggle('btn-secondary');
            btn.classList.toggle('text-blue-600'); // Optional visual
            // btn.classList.toggle('btn-primary'); // Maybe just keep secondary but change icon/text
            // Keeping secondary creates consistency with neighbor buttons
            btn.innerHTML = CalendarModule.state.showHistory ? '<i class="fas fa-eye-slash"></i> Ocultar Histórico' : '<i class="fas fa-history"></i> Ver Histórico';
        }

        Utils.showToast(CalendarModule.state.showHistory ? 'Mostrando todo el historial' : 'Mostrando eventos recientes', 'info');
        CalendarModule.render(CalendarModule.currentView);
    },

    render: (view = 'month') => {
        CalendarModule.currentView = view;
        const container = document.getElementById('calendarView');
        if (!container) return;

        // Toggle Buttons State
        const btnMonth = document.getElementById('btnCalMonth');
        const btnWeek = document.getElementById('btnCalWeek');
        const btnAgenda = document.getElementById('btnCalAgenda');

        // Reset all to secondary
        [btnMonth, btnWeek, btnAgenda].forEach(btn => {
            if (btn) {
                btn.classList.remove('btn-primary');
                btn.classList.add('btn-secondary');
            }
        });

        // Set active button
        if (view === 'month') {
            btnMonth?.classList.replace('btn-secondary', 'btn-primary');
            CalendarModule.renderMonthView(container);
        } else if (view === 'week') {
            btnWeek?.classList.replace('btn-secondary', 'btn-primary');
            CalendarModule.renderWeekView(container);
        } else {
            btnAgenda?.classList.replace('btn-secondary', 'btn-primary');
            CalendarModule.renderAgendaView(container);
        }
    },

    // #21 - Weekly View
    renderWeekView: (container) => {
        const offset = CalendarModule.weekOffset || 0;
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay() + 1 + (offset * 7)); // Monday + offset

        const days = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(startOfWeek);
            d.setDate(startOfWeek.getDate() + i);
            days.push(d);
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Filter events for this week
        const weekEnd = new Date(days[6]);
        weekEnd.setHours(23, 59, 59, 999);

        let events = CalendarModule.events;
        if (!CalendarModule.state.showHistory) {
            events = events.filter(e => e.date >= today);
        }

        const weekEvents = events.filter(e => {
            const d = new Date(e.date);
            d.setHours(0, 0, 0, 0);
            return d >= startOfWeek && d <= weekEnd;
        });

        container.innerHTML = `
            <div class="mb-4 flex justify-between items-center">
                <button class="btn btn-sm btn-outline" onclick="CalendarModule.navigateWeek(-1)">
                    <i class="fas fa-chevron-left"></i> Semana Anterior
                </button>
                <h3 class="text-lg font-bold text-slate-700">
                    ${startOfWeek.toLocaleDateString('es', { day: 'numeric', month: 'long' })} - 
                    ${days[6].toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}
                </h3>
                <button class="btn btn-sm btn-outline" onclick="CalendarModule.navigateWeek(1)">
                    Semana Siguiente <i class="fas fa-chevron-right"></i>
                </button>
            </div>
            <div class="grid grid-cols-7 gap-2">
                ${days.map(d => {
            const isToday = d.toDateString() === today.toDateString();
            const dayEvents = weekEvents.filter(e => {
                const ed = new Date(e.date);
                ed.setHours(0, 0, 0, 0);
                return ed.toDateString() === d.toDateString();
            });

            return `
                        <div class="min-h-[200px] p-3 rounded-xl border ${isToday ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-100'}">
                            <div class="text-center mb-3">
                                <div class="text-xs text-slate-400 uppercase">${d.toLocaleDateString('es', { weekday: 'short' })}</div>
                                <div class="text-xl font-bold ${isToday ? 'text-blue-600' : 'text-slate-700'}">${d.getDate()}</div>
                            </div>
                            <div class="space-y-2">
                                ${dayEvents.length > 0 ? dayEvents.map(e => `
                                    <div class="text-xs p-2 rounded-lg ${e.type === 'hito' ? 'bg-amber-100 text-amber-800 border-l-2 border-amber-500' : 'bg-blue-100 text-blue-800 border-l-2 border-blue-500'}">
                                        <div class="font-bold truncate">${e.title}</div>
                                        <div class="opacity-70">${e.code}</div>
                                    </div>
                                `).join('') : '<div class="text-xs text-slate-300 text-center italic">Sin eventos</div>'}
                            </div>
                        </div>
                    `;
        }).join('')}
            </div>
        `;
    },

    navigateWeek: (direction) => {
        // Store current week start and navigate
        CalendarModule.weekOffset = (CalendarModule.weekOffset || 0) + direction;
        CalendarModule.render('week');
    },

    renderMonthView: (container) => {
        if (CalendarModule.events.length === 0) {
            container.innerHTML = '<div class="text-center p-4 text-slate-500">No hay hitos ni fechas programadas.</div>';
            return;
        }

        // Filter Past/Future
        const now = new Date();
        const currentMonthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

        let displayEvents = CalendarModule.events;
        if (!CalendarModule.state.showHistory) {
            displayEvents = displayEvents.filter(e => {
                const key = `${e.date.getUTCFullYear()}-${String(e.date.getUTCMonth() + 1).padStart(2, '0')}`;
                return key >= currentMonthKey;
            });
        }

        if (displayEvents.length === 0) {
            container.innerHTML = '<div class="text-center p-4 text-slate-500">No hay eventos para mostrar (vencidos o futuros).</div>';
            return;
        }

        // Group by Month (YYYY-MM to sort correctly)
        const groups = {};
        displayEvents.forEach(e => {
            const key = `${e.date.getUTCFullYear()}-${String(e.date.getUTCMonth() + 1).padStart(2, '0')}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(e);
        });

        // Grid Layout
        let html = '<div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap:1.5rem;">';

        Object.keys(groups).sort().forEach(key => { // ISO keys sort correctly
            const monthEvents = groups[key];
            const dateObj = monthEvents[0].date;
            // Use UTC timezone for display
            const monthName = dateObj.toLocaleDateString('es-ES', { month: 'long', year: 'numeric', timeZone: 'UTC' });

            html += `
                <div style="background:white; border:1px solid #e2e8f0; border-radius:1rem; padding:1.5rem; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                    <h3 style="font-weight:700; font-size:1.1rem; margin:0 0 1rem 0; text-transform:capitalize; color:#1e293b; padding-bottom:0.75rem; border-bottom:2px solid #f1f5f9;">
                        ${monthName}
                    </h3>
                    <div style="display:flex; flex-direction:column; gap:0.75rem;">
                        ${monthEvents.map(e => CalendarModule.renderCard(e)).join('')}
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    },

    renderAgendaView: (container) => {
        // Filter Past/Future (Same logic as Month)
        const now = new Date();
        const currentMonthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

        let displayEvents = CalendarModule.events;
        if (!CalendarModule.state.showHistory) {
            displayEvents = displayEvents.filter(e => {
                const key = `${e.date.getUTCFullYear()}-${String(e.date.getUTCMonth() + 1).padStart(2, '0')}`;
                return key >= currentMonthKey;
            });
        }

        if (displayEvents.length === 0) {
            container.innerHTML = '<div class="text-center p-4 text-slate-500">No hay hitos ni fechas programadas (ajuste filtros o historial).</div>';
            return;
        }

        // List Layout Day by Day
        // Group by Day
        const days = {};
        displayEvents.forEach(e => {
            const key = `${e.date.getUTCFullYear()}-${String(e.date.getUTCMonth() + 1).padStart(2, '0')}-${String(e.date.getUTCDate()).padStart(2, '0')}`;
            if (!days[key]) days[key] = [];
            days[key].push(e);
        });

        let html = '<div style="max-width: 800px; margin: 0 auto; display:flex; flex-direction:column; gap:1rem;">';

        Object.keys(days).sort().forEach(dayKey => {
            const dayEvents = days[dayKey];
            const dateObj = dayEvents[0].date;

            // Format: "Lunes, 25 de Enero" (Using UTC)
            const dayLabel = dateObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
            // Secondary format also UTC
            const shortDate = dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', timeZone: 'UTC' });

            html += `
                <div style="display:flex; gap:1.5rem;">
                     <div style="flex:0 0 120px; text-align:right; padding-top:1rem;">
                        <div style="font-weight:700; text-transform:capitalize; font-size:1rem; color:#334155;">${dayLabel.split(',')[0]}</div>
                        <div style="font-size:0.9rem; color:#64748b;">${shortDate}</div>
                     </div>
                     
                     <div style="flex:1; border-left: 2px solid #e2e8f0; padding-left:1.5rem; padding-bottom:1.5rem;">
                         <div style="display:flex; flex-direction:column; gap:0.75rem; padding-top:0.5rem;">
                            ${dayEvents.map(e => CalendarModule.renderCard(e, true)).join('')}
                         </div>
                     </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    },

    // Shared Card Component
    renderCard: (e, isAgenda = false) => {
        const isHito = e.type === 'hito';
        const color = isHito ? '#8b5cf6' : '#2563eb'; // Violet for Hito, Blue for Entregas
        const bgColor = isHito ? '#f5f3ff' : '#eff6ff';
        const icon = isHito ? '<i class="fas fa-flag"></i>' : '<i class="fas fa-check-circle"></i>';

        return `
            <div style="background:${bgColor}; border-left:4px solid ${color}; padding:0.75rem; border-radius:0.5rem; display:flex; gap:0.75rem; align-items:flex-start;">
                <div style="color:${color}; margin-top:2px;">${icon}</div>
                <div>
                     <div style="font-size:0.75rem; font-weight:700; color:${color}; margin-bottom:2px;">
                        ${isAgenda ? '' : `Día ${e.date.getUTCDate()} - `} ${e.code || 'S/C'}
                     </div>
                     <div style="font-size:0.9rem; font-weight:600; color:#1e293b; line-height:1.2;">${e.title}</div>
                     <div style="font-size:0.75rem; color:#64748b; margin-top:2px;">${isHito ? 'Hito Importante' : 'Entrega Actividad'}</div>
                </div>
            </div>
        `;
    }
};
