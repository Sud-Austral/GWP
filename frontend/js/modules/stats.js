
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
        } catch (e) { }

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

        // Product/Component Chart (Stacked Horizontal Bar by Status)
        const productStatusCounts = {};
        data.forEach(i => {
            const p = i.product_code || 'Sin Producto';
            const s = (i.status || 'Pendiente').toUpperCase();

            if (!productStatusCounts[p]) {
                productStatusCounts[p] = { completed: 0, inProgress: 0, pending: 0, other: 0, total: 0 };
            }

            productStatusCounts[p].total++;
            if (s === 'COMPLETADO' || s === 'FINALIZADO' || s === 'LISTO') {
                productStatusCounts[p].completed++;
            } else if (s === 'EN PROGRESO' || s === 'EJECUCIÓN') {
                productStatusCounts[p].inProgress++;
            } else if (s === 'PENDIENTE' || s === 'ATRASADO') {
                productStatusCounts[p].pending++;
            } else {
                productStatusCounts[p].other++;
            }
        });

        // Sort by total and take top 8
        const sortedProducts = Object.entries(productStatusCounts)
            .sort((a, b) => b[1].total - a[1].total)
            .slice(0, 8);

        const productLabels = sortedProducts.map(([k]) => k.length > 30 ? k.substring(0, 30) + '...' : k);

        const ctxProduct = document.getElementById('chartProduct');
        if (ctxProduct) {
            if (StatsModule.charts.product) StatsModule.charts.product.destroy();

            StatsModule.charts.product = new Chart(ctxProduct, {
                type: 'bar',
                data: {
                    labels: productLabels,
                    datasets: [
                        {
                            label: 'Completado',
                            data: sortedProducts.map(([, v]) => v.completed),
                            backgroundColor: '#22c55e',
                            borderRadius: 4
                        },
                        {
                            label: 'En Progreso',
                            data: sortedProducts.map(([, v]) => v.inProgress),
                            backgroundColor: '#3b82f6',
                            borderRadius: 4
                        },
                        {
                            label: 'Pendiente',
                            data: sortedProducts.map(([, v]) => v.pending),
                            backgroundColor: '#ef4444',
                            borderRadius: 4
                        },
                        {
                            label: 'Planificado',
                            data: sortedProducts.map(([, v]) => v.other),
                            backgroundColor: '#94a3b8',
                            borderRadius: 4
                        }
                    ]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                usePointStyle: true,
                                font: { family: 'Outfit', size: 11 },
                                padding: 15
                            }
                        },
                        tooltip: {
                            callbacks: {
                                afterTitle: (items) => {
                                    const idx = items[0].dataIndex;
                                    const product = sortedProducts[idx];
                                    return `Total: ${product[1].total} actividades`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            stacked: true,
                            beginAtZero: true,
                            grid: { borderDash: [2, 2] },
                            ticks: { stepSize: 1 }
                        },
                        y: {
                            stacked: true,
                            grid: { display: false }
                        }
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

    renderRecentActions: async (dataTasks) => {
        const container = document.getElementById('statsRecent');
        if (!container) return;

        container.innerHTML = '<div class="p-6 text-center text-slate-400 text-sm italic">Cargando movimientos...</div>';

        try {
            // Fetch all parallel data sources
            const [hitosRes, obsRes, docsRes] = await Promise.all([
                API.get('/hitos').catch(() => []),
                API.get('/observaciones').catch(() => []),
                API.get('/documentos').catch(() => [])
            ]);

            // Normalize data for timeline
            // Status: 0=Task, 1=Hito, 2=Doc, 3=Obs
            let allItems = [];

            // 1. Tasks
            dataTasks.forEach(t => {
                if (t.created_at) {
                    allItems.push({
                        type: 'task',
                        date: new Date(t.created_at),
                        title: t.task_name,
                        subtitle: `Código: ${t.activity_code}`,
                        user: t.created_by_name || 'Sistema', // Assuming we might have this or not
                        icon: 'fa-tasks',
                        color: 'indigo'
                    });
                }
            });

            // 2. Hitos
            if (Array.isArray(hitosRes)) {
                hitosRes.forEach(h => {
                    const d = h.created_at || h.fecha_estimada; // Use created_at if available, else estim
                    if (d) {
                        allItems.push({
                            type: 'hito',
                            date: new Date(d),
                            title: `Hito: ${h.nombre}`,
                            subtitle: h.task_name || 'Sin actividad vinculada',
                            user: 'Sistema',
                            icon: 'fa-flag',
                            color: 'amber'
                        });
                    }
                });
            }

            // 3. Observations
            if (Array.isArray(obsRes)) {
                obsRes.forEach(o => {
                    if (o.created_at) {
                        allItems.push({
                            type: 'obs',
                            date: new Date(o.created_at),
                            title: `Observación en ${o.activity_code || 'Actividad'}`,
                            subtitle: o.texto ? (o.texto.substring(0, 50) + '...') : '',
                            user: o.usuario_nombre || 'Usuario',
                            icon: 'fa-comment-alt',
                            color: 'blue'
                        });
                    }
                });
            }

            // 4. Documents
            if (Array.isArray(docsRes)) {
                docsRes.forEach(d => {
                    if (d.created_at) {
                        allItems.push({
                            type: 'doc',
                            date: new Date(d.created_at),
                            title: `Documento: ${d.nombre_archivo}`,
                            subtitle: d.task_name || 'Sin actividad',
                            user: d.uploader || 'Usuario',
                            icon: 'fa-file-alt',
                            color: 'emerald'
                        });
                    }
                });
            }

            // Sort descending
            allItems.sort((a, b) => b.date - a.date);

            // Take top 8
            const recent = allItems.slice(0, 8);

            if (recent.length === 0) {
                container.innerHTML = '<div class="p-6 text-center text-slate-400 text-sm">No hay movimientos recientes.</div>';
                return;
            }

            container.innerHTML = recent.map(i => {
                const dateStr = i.date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
                const isNew = (new Date() - i.date) < (1000 * 60 * 60 * 24); // 24h as New

                // Color Mapping
                const bgClass = `bg-${i.color}-50`;
                const textClass = `text-${i.color}-500`;

                return `
                <div class="px-6 py-4 border-b border-slate-50 flex justify-between items-center hover:bg-slate-50 transition-all group">
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-xl ${bgClass} ${textClass} flex items-center justify-center text-lg shadow-sm group-hover:scale-110 transition-transform">
                            <i class="fas ${i.icon}"></i>
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <span class="text-sm font-bold text-slate-700 line-clamp-1">${i.title}</span>
                                ${isNew ? '<span class="px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px] font-bold animate-pulse">NUEVO</span>' : ''}
                            </div>
                            <div class="text-xs text-slate-400 flex gap-2 items-center">
                                 <span><i class="fas fa-user-circle text-[10px]"></i> ${i.user}</span>
                                 <span class="w-1 h-1 rounded-full bg-slate-300"></span>
                                 <span>${i.subtitle}</span>
                            </div>
                        </div>
                    </div>
                    <div class="text-xs text-slate-400 font-medium whitespace-nowrap">
                        ${dateStr}
                    </div>
                </div>
            `}).join('');

        } catch (e) {
            console.error(e);
            container.innerHTML = '<div class="p-6 text-center text-red-400 text-sm">Error cargando movimientos recientes.</div>';
        }
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
