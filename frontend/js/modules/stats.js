
const StatsModule = {
    charts: {},

    init: async () => {
        // Start loader
        if (window.Enhancements) Enhancements.Loader.start();

        Utils.renderBreadcrumbs(['Inicio', 'Panel de Control']);

        // Ensure data exists
        if (!window.appData?.plan) {
            await PlanModule.loadData();
        }
        const plan = window.appData.plan || [];

        // Fetch milestones
        let hitosCount = 0;
        try {
            const hRes = await API.get('/hitos');
            hitosCount = hRes ? hRes.length : 0;
        } catch (e) { console.log('Error fetching hitos stats'); }

        StatsModule.renderKPIs(plan, hitosCount);
        StatsModule.renderProgressRing(plan);
        StatsModule.renderSparklines(plan);
        StatsModule.renderDeadlineAlert(plan);
        StatsModule.renderCharts(plan);
        StatsModule.renderBurndown(plan);
        StatsModule.renderComparison(plan);
        StatsModule.renderHeatmap(plan);
        StatsModule.renderUpcoming(plan);
        StatsModule.renderRecentActions(plan);

        // Trigger scroll animations
        if (window.Enhancements) {
            Enhancements.ScrollAnimations.refresh();
            Enhancements.Loader.done();
        }
    },

    renderKPIs: (data, hitosCount) => {
        const total = data.length;
        const done = data.filter(i => {
            const s = (i.status || '').toUpperCase();
            return s === 'COMPLETADO' || s === 'FINALIZADO' || s === 'LISTO';
        }).length;
        const process = data.filter(i => {
            const s = (i.status || '').toUpperCase();
            return s === 'EN PROGRESO' || s === 'EJECUCIÓN';
        }).length;

        Utils.animateValue('kpiTotal', 0, total, 1000);
        Utils.animateValue('kpiDone', 0, done, 1000);
        Utils.animateValue('kpiProcess', 0, process, 1000);
        Utils.animateValue('kpiMilestones', 0, hitosCount, 1000);
    },

    // #17 - Progress Ring
    renderProgressRing: (data) => {
        const container = document.getElementById('progressRingContainer');
        if (!container || !window.Enhancements) return;

        const total = data.length;
        const done = data.filter(i => {
            const s = (i.status || '').toUpperCase();
            return s === 'COMPLETADO' || s === 'FINALIZADO' || s === 'LISTO';
        }).length;

        const percentage = total > 0 ? (done / total) * 100 : 0;
        Enhancements.ProgressRing.create(container, percentage, 100, 8);
    },

    // #13 - Sparklines
    renderSparklines: (data) => {
        if (!window.Enhancements) return;

        // Generate mock weekly data (last 8 weeks)
        const generateWeeklyData = (baseValue, variance) => {
            return Array.from({ length: 8 }, () =>
                Math.max(0, Math.floor(baseValue + (Math.random() - 0.5) * variance))
            );
        };

        const total = data.length;
        const done = data.filter(i => ['COMPLETADO', 'FINALIZADO', 'LISTO'].includes((i.status || '').toUpperCase())).length;
        const process = data.filter(i => ['EN PROGRESO', 'EJECUCIÓN'].includes((i.status || '').toUpperCase())).length;

        const sparklineTotal = document.getElementById('sparklineTotal');
        const sparklineDone = document.getElementById('sparklineDone');
        const sparklineProgress = document.getElementById('sparklineProgress');
        const sparklineHitos = document.getElementById('sparklineHitos');

        if (sparklineTotal) Enhancements.Sparkline.create(sparklineTotal, generateWeeklyData(total / 4, 5));
        if (sparklineDone) Enhancements.Sparkline.create(sparklineDone, generateWeeklyData(done / 4, 3));
        if (sparklineProgress) Enhancements.Sparkline.create(sparklineProgress, generateWeeklyData(process / 4, 4));
        if (sparklineHitos) Enhancements.Sparkline.create(sparklineHitos, generateWeeklyData(2, 2));
    },

    // #19 - Deadline Alert
    renderDeadlineAlert: (data) => {
        const container = document.getElementById('deadlineAlertContainer');
        if (!container || !window.Enhancements) return;

        const now = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(now.getDate() + 7);

        const urgentCount = data.filter(i => {
            if (!i.fecha_fin) return false;
            const s = (i.status || '').toUpperCase();
            if (['COMPLETADO', 'FINALIZADO', 'LISTO'].includes(s)) return false;
            const d = new Date(i.fecha_fin);
            return d >= now && d <= nextWeek;
        }).length;

        Enhancements.DeadlineAlert.render(container, urgentCount, urgentCount > 3);
    },

    renderCharts: (data) => {
        // Status Chart (Doughnut)
        const statusCounts = {};
        data.forEach(i => {
            const s = i.status || 'PENDIENTE';
            statusCounts[s] = (statusCounts[s] || 0) + 1;
        });

        const ctxStatus = document.getElementById('chartStatus');
        if (ctxStatus) {
            if (StatsModule.charts.status) StatsModule.charts.status.destroy();

            StatsModule.charts.status = new Chart(ctxStatus, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(statusCounts),
                    datasets: [{
                        data: Object.values(statusCounts),
                        backgroundColor: Object.keys(statusCounts).map(k => {
                            k = k.toUpperCase();
                            if (k === 'COMPLETADO' || k === 'FINALIZADO') return '#22c55e';
                            if (k === 'EN PROGRESO') return '#3b82f6';
                            if (k === 'PENDIENTE') return '#ef4444';
                            if (k === 'RETRASADO') return '#b91c1c';
                            return '#94a3b8';
                        }),
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { usePointStyle: true, font: { family: 'Outfit' } } }
                    },
                    cutout: '70%'
                }
            });
        }

        // Product/Component Chart (Horizontal Bar)
        const productCounts = {};
        data.forEach(i => {
            const p = i.product || i.component || 'Sin Producto';
            productCounts[p] = (productCounts[p] || 0) + 1;
        });

        // Sort by count and take top 8
        const sortedProducts = Object.entries(productCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8);

        const ctxProduct = document.getElementById('chartProduct');
        if (ctxProduct) {
            if (StatsModule.charts.product) StatsModule.charts.product.destroy();

            StatsModule.charts.product = new Chart(ctxProduct, {
                type: 'bar',
                data: {
                    labels: sortedProducts.map(([k]) => k.length > 25 ? k.substring(0, 25) + '...' : k),
                    datasets: [{
                        label: 'Actividades',
                        data: sortedProducts.map(([, v]) => v),
                        backgroundColor: '#4361EE',
                        borderRadius: 6
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        x: { beginAtZero: true, grid: { borderDash: [2, 2] } },
                        y: { grid: { display: false } }
                    }
                }
            });
        }
    },

    // #14 - Burndown Chart
    renderBurndown: (data) => {
        const ctx = document.getElementById('chartBurndown');
        if (!ctx) return;

        if (StatsModule.charts.burndown) StatsModule.charts.burndown.destroy();

        const total = data.length;
        const days = 30;
        const labels = Array.from({ length: days }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (days - 1 - i));
            return d.toLocaleDateString('es', { day: '2-digit', month: 'short' });
        });

        // Ideal line
        const ideal = labels.map((_, i) => total - (total * i / (days - 1)));

        // Simulated actual progress (would be based on real completion dates)
        let remaining = total;
        const actual = labels.map((_, i) => {
            const completed = Math.floor(Math.random() * 3);
            remaining = Math.max(0, remaining - completed);
            return remaining;
        });

        StatsModule.charts.burndown = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Ideal',
                        data: ideal,
                        borderColor: '#cbd5e1',
                        borderDash: [5, 5],
                        fill: false,
                        tension: 0,
                        pointRadius: 0
                    },
                    {
                        label: 'Real',
                        data: actual,
                        borderColor: '#4361EE',
                        backgroundColor: 'rgba(67, 97, 238, 0.1)',
                        fill: true,
                        tension: 0.3,
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { intersect: false, mode: 'index' },
                plugins: {
                    legend: { position: 'bottom', labels: { font: { family: 'Outfit' } } }
                },
                scales: {
                    y: { beginAtZero: true, grid: { borderDash: [2, 2] } },
                    x: { grid: { display: false }, ticks: { maxTicksLimit: 10 } }
                }
            }
        });
    },

    // #15 - Monthly Comparison
    renderComparison: (data) => {
        const ctx = document.getElementById('chartComparison');
        if (!ctx) return;

        if (StatsModule.charts.comparison) StatsModule.charts.comparison.destroy();

        const labels = ['Nuevas', 'Completadas', 'En Progreso', 'Retrasadas'];

        // Mock data for previous and current month
        const previous = [12, 8, 15, 3];
        const current = [18, 14, 10, 2];

        StatsModule.charts.comparison = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Mes Anterior',
                        data: previous,
                        backgroundColor: '#e2e8f0',
                        borderRadius: 6
                    },
                    {
                        label: 'Mes Actual',
                        data: current,
                        backgroundColor: '#4361EE',
                        borderRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { font: { family: 'Outfit' } } }
                },
                scales: {
                    y: { beginAtZero: true, grid: { borderDash: [2, 2] } },
                    x: { grid: { display: false } }
                }
            }
        });
    },

    // #16 - Activity Heatmap
    renderHeatmap: (data) => {
        const container = document.getElementById('activityHeatmap');
        if (!container || !window.Enhancements) return;

        // Generate 4 weeks of mock activity data
        const weeklyData = [
            [2, 5, 3, 8, 4, 1, 0],
            [3, 6, 2, 7, 5, 2, 1],
            [4, 4, 5, 6, 3, 0, 0],
            [5, 7, 4, 9, 6, 2, 1]
        ];

        Enhancements.Charts.createHeatmap(container, weeklyData);
    },

    renderUpcoming: (data) => {
        const container = document.getElementById('statsUpcoming');
        if (!container) return;

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const future = new Date();
        future.setDate(now.getDate() + 30);

        const upcoming = data.filter(i => {
            if (!i.fecha_fin) return false;
            const s = (i.status || '').toUpperCase();
            if (s === 'COMPLETADO' || s === 'FINALIZADO' || s === 'LISTO') return false;
            const d = new Date(i.fecha_fin);
            return d >= now && d <= future;
        }).sort((a, b) => new Date(a.fecha_fin) - new Date(b.fecha_fin));

        if (upcoming.length === 0) {
            container.innerHTML = '<div class="p-6 text-center text-slate-400 text-sm">No hay vencimientos próximos.</div>';
            return;
        }

        container.innerHTML = upcoming.slice(0, 5).map(i => `
            <div class="px-6 py-4 border-b border-slate-50 flex justify-between items-center hover:bg-slate-50 transition-colors">
                <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center font-bold text-xs">
                        ${new Date(i.fecha_fin).getUTCDate()}
                    </div>
                    <div>
                        <div class="text-sm font-bold text-slate-700 line-clamp-1">${i.task_name}</div>
                        <div class="text-xs text-slate-400 flex gap-2">
                             <span>${i.activity_code || '-'}</span>
                             <span>•</span>
                             <span>${i.primary_responsible || 'Sin asignar'}</span>
                        </div>
                    </div>
                </div>
                <div class="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                    ${Utils.formatDate(i.fecha_fin)}
                </div>
            </div>
        `).join('');
    },

    renderRecentActions: (data) => {
        const container = document.getElementById('statsRecent');
        if (!container) return;

        const recent = [...data].sort((a, b) => {
            const da = a.created_at ? new Date(a.created_at) : new Date(0);
            const db = b.created_at ? new Date(b.created_at) : new Date(0);
            return db - da;
        }).slice(0, 5);

        if (recent.length === 0) {
            container.innerHTML = '<div class="p-6 text-center text-slate-400 text-sm">No hay movimientos recientes.</div>';
            return;
        }

        container.innerHTML = recent.map(i => {
            const dateStr = i.created_at || new Date().toISOString();
            const isNew = (new Date() - new Date(dateStr)) < (1000 * 60 * 60 * 48);
            return `
            <div class="px-6 py-4 border-b border-slate-50 flex justify-between items-center hover:bg-slate-50 transition-all">
                <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center text-lg">
                        <i class="fas fa-plus-circle"></i>
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="text-sm font-bold text-slate-700 line-clamp-1">${i.task_name}</span>
                            ${isNew ? '<span class="px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 text-[10px] font-bold">NUEVO</span>' : ''}
                        </div>
                        <div class="text-xs text-slate-400 flex gap-2">
                             <span>${i.activity_code || 'GWP'}</span>
                             <span>•</span>
                             <span>Ingresado por: ${i.primary_responsible || 'Sistema'}</span>
                        </div>
                    </div>
                </div>
                <div class="text-xs text-slate-400 font-medium">
                    ${Utils.formatDate(dateStr)}
                </div>
            </div>
        `}).join('');
    }
};

// Utils Extension
if (!Utils.animateValue) {
    Utils.animateValue = (id, start, end, duration) => {
        const obj = document.getElementById(id);
        if (!obj) return;
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            obj.innerHTML = Math.floor(progress * (end - start) + start);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    };
}
