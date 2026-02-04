/**
 * GWP Enhancements Module
 * Premium UI/UX Features
 */

const Enhancements = {
    // ========================================
    // #4 - Global Progress Bar
    // ========================================
    Loader: {
        element: null,

        init() {
            if (this.element) return;
            this.element = document.createElement('div');
            this.element.className = 'global-loader';
            this.element.innerHTML = '<div class="bar"></div>';
            document.body.prepend(this.element);
        },

        start() {
            this.init();
            this.element.classList.remove('done');
            this.element.classList.add('loading');
        },

        done() {
            if (!this.element) return;
            this.element.classList.remove('loading');
            this.element.classList.add('done');
        }
    },

    // ========================================
    // #7 - Collapsible Sidebar
    // ========================================
    Sidebar: {
        isCollapsed: false,

        init() {
            const sidebar = document.querySelector('.sidebar');
            if (!sidebar) return;

            // Add toggle button
            const toggle = document.createElement('button');
            toggle.className = 'sidebar-toggle';
            toggle.innerHTML = '<i class="fas fa-chevron-left"></i>';
            toggle.onclick = () => this.toggle();
            sidebar.style.position = 'relative';
            sidebar.appendChild(toggle);

            // Add mobile menu button
            const mobileBtn = document.createElement('button');
            mobileBtn.className = 'mobile-menu-btn';
            mobileBtn.innerHTML = '<i class="fas fa-bars"></i>';
            mobileBtn.onclick = () => this.toggleMobile();
            document.body.appendChild(mobileBtn);

            // Add overlay for mobile
            const overlay = document.createElement('div');
            overlay.className = 'mobile-overlay';
            overlay.onclick = () => this.closeMobile();
            document.body.appendChild(overlay);

            // Load saved state
            const saved = localStorage.getItem('sidebar_collapsed');
            if (saved === 'true') {
                this.toggle(true);
            }
        },

        toggle(silent = false) {
            const sidebar = document.querySelector('.sidebar');
            const mainContent = document.querySelector('.main-content');

            this.isCollapsed = !this.isCollapsed;
            sidebar.classList.toggle('collapsed', this.isCollapsed);

            if (mainContent) {
                mainContent.style.marginLeft = this.isCollapsed ? '72px' : '0';
            }

            localStorage.setItem('sidebar_collapsed', this.isCollapsed);
        },

        toggleMobile() {
            const sidebar = document.querySelector('.sidebar');
            const overlay = document.querySelector('.mobile-overlay');
            sidebar.classList.toggle('mobile-open');
            overlay.classList.toggle('active');
        },

        closeMobile() {
            const sidebar = document.querySelector('.sidebar');
            const overlay = document.querySelector('.mobile-overlay');
            sidebar.classList.remove('mobile-open');
            overlay.classList.remove('active');
        }
    },

    // ========================================
    // #9 - Push-Style Notifications
    // ========================================
    Notify: {
        container: null,

        init() {
            if (this.container) return;
            this.container = document.createElement('div');
            this.container.className = 'notification-container';
            document.body.appendChild(this.container);
        },

        show(options = {}) {
            this.init();
            const {
                title = 'Notificación',
                message = '',
                type = 'info',
                duration = 4000
            } = options;

            const icons = {
                success: 'fa-check',
                error: 'fa-times',
                warning: 'fa-exclamation',
                info: 'fa-info'
            };

            const notification = document.createElement('div');
            notification.className = 'notification';
            notification.innerHTML = `
                <div class="notification-icon ${type}">
                    <i class="fas ${icons[type] || icons.info}"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-title">${title}</div>
                    <div class="notification-message">${message}</div>
                </div>
                <button class="notification-close">
                    <i class="fas fa-times"></i>
                </button>
                <div class="notification-progress" style="color: ${this.getColor(type)}"></div>
            `;

            notification.querySelector('.notification-close').onclick = () => this.dismiss(notification);
            this.container.appendChild(notification);

            setTimeout(() => this.dismiss(notification), duration);

            return notification;
        },

        getColor(type) {
            const colors = { success: '#16a34a', error: '#dc2626', warning: '#d97706', info: '#2563eb' };
            return colors[type] || colors.info;
        },

        dismiss(notification) {
            notification.classList.add('exiting');
            setTimeout(() => notification.remove(), 300);
        },

        success(message, title = '¡Éxito!') {
            return this.show({ title, message, type: 'success' });
        },

        error(message, title = 'Error') {
            return this.show({ title, message, type: 'error' });
        },

        info(message, title = 'Información') {
            return this.show({ title, message, type: 'info' });
        },

        warning(message, title = 'Advertencia') {
            return this.show({ title, message, type: 'warning' });
        }
    },

    // ========================================
    // #2 - Scroll Animations (Intersection Observer)
    // ========================================
    ScrollAnimations: {
        observer: null,

        init() {
            if (!('IntersectionObserver' in window)) return;

            this.observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                    }
                });
            }, {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            });
        },

        observe(selector) {
            if (!this.observer) this.init();
            document.querySelectorAll(selector).forEach(el => {
                el.classList.add('animate-on-scroll');
                this.observer.observe(el);
            });
        },

        refresh() {
            // Re-observe elements after dynamic content load
            this.observe('.repo-card, .stat-card, .chart-card, .kpi-card');
        }
    },

    // ========================================
    // #17 - Progress Ring Component
    // ========================================
    ProgressRing: {
        create(container, percentage, size = 120, strokeWidth = 10) {
            const radius = (size - strokeWidth) / 2;
            const circumference = radius * 2 * Math.PI;
            const offset = circumference - (percentage / 100) * circumference;

            container.innerHTML = `
                <div class="progress-ring" style="width: ${size}px; height: ${size}px;">
                    <svg width="${size}" height="${size}">
                        <defs>
                            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" style="stop-color:#4361EE"/>
                                <stop offset="100%" style="stop-color:#7C3AED"/>
                            </linearGradient>
                        </defs>
                        <circle class="progress-ring-circle-bg"
                            cx="${size / 2}" cy="${size / 2}" r="${radius}"
                            stroke-width="${strokeWidth}"/>
                        <circle class="progress-ring-circle"
                            cx="${size / 2}" cy="${size / 2}" r="${radius}"
                            stroke-width="${strokeWidth}"
                            stroke-dasharray="${circumference}"
                            stroke-dashoffset="${offset}"/>
                    </svg>
                    <div class="progress-ring-text">
                        ${Math.round(percentage)}<small>%</small>
                    </div>
                </div>
            `;
        }
    },

    // ========================================
    // #13 - Sparklines
    // ========================================
    Sparkline: {
        create(container, data, options = {}) {
            const { height = 30, barWidth = 4, gap = 2 } = options;
            const max = Math.max(...data);

            container.innerHTML = `
                <div class="sparkline-container" style="height: ${height}px;">
                    ${data.map(val => {
                const h = max > 0 ? (val / max) * height : 0;
                return `<div class="sparkline-bar" style="height: ${h}px; width: ${barWidth}px;"></div>`;
            }).join('')}
                </div>
            `;
        }
    },

    // ========================================
    // #19 - Deadline Alerts
    // ========================================
    DeadlineAlert: {
        render(container, count, urgent = false) {
            if (count <= 0) {
                container.innerHTML = '';
                return;
            }

            container.innerHTML = `
                <div class="deadline-alert">
                    <div class="deadline-alert-icon">
                        <i class="fas fa-clock"></i>
                    </div>
                    <div class="deadline-alert-content">
                        <div class="deadline-alert-title">
                            ${urgent ? '¡Vencimientos urgentes!' : 'Actividades próximas a vencer'}
                        </div>
                        <div style="font-size: 0.85rem; color: #64748b;">
                            ${count} ${count === 1 ? 'actividad vence' : 'actividades vencen'} en los próximos 7 días
                        </div>
                    </div>
                    <div class="deadline-alert-count">${count}</div>
                </div>
            `;
        }
    },

    // ========================================
    // #5 - Empty State SVG Generator
    // ========================================
    EmptyState: {
        render(container, options = {}) {
            const {
                icon = 'folder-open',
                title = 'Sin datos',
                description = 'No hay elementos para mostrar.',
                actionText = null,
                actionCallback = null
            } = options;

            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="60" cy="60" r="50" fill="#f1f5f9"/>
                            <circle cx="60" cy="60" r="35" fill="#e2e8f0"/>
                            <text x="60" y="70" text-anchor="middle" font-size="40" fill="#94a3b8">
                                📁
                            </text>
                        </svg>
                    </div>
                    <h3 class="empty-state-title">${title}</h3>
                    <p class="empty-state-description">${description}</p>
                    ${actionText ? `
                        <div class="empty-state-action">
                            <button class="btn btn-primary" id="emptyStateAction">
                                <i class="fas fa-plus"></i> ${actionText}
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;

            if (actionText && actionCallback) {
                container.querySelector('#emptyStateAction').onclick = actionCallback;
            }
        }
    },

    // ========================================
    // #14, #15, #16 - Advanced Charts Helpers
    // ========================================
    Charts: {
        // Burndown Chart
        createBurndown(ctx, data) {
            return new Chart(ctx, {
                type: 'line',
                data: {
                    labels: data.labels,
                    datasets: [
                        {
                            label: 'Ideal',
                            data: data.ideal,
                            borderColor: '#cbd5e1',
                            borderDash: [5, 5],
                            fill: false,
                            tension: 0
                        },
                        {
                            label: 'Real',
                            data: data.actual,
                            borderColor: '#4361EE',
                            backgroundColor: 'rgba(67, 97, 238, 0.1)',
                            fill: true,
                            tension: 0.3
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

        // Monthly Comparison
        createComparison(ctx, data) {
            return new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: data.labels,
                    datasets: [
                        {
                            label: 'Mes Anterior',
                            data: data.previous,
                            backgroundColor: '#e2e8f0',
                            borderRadius: 4
                        },
                        {
                            label: 'Mes Actual',
                            data: data.current,
                            backgroundColor: '#4361EE',
                            borderRadius: 4
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

        // Heatmap
        createHeatmap(container, data) {
            const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
            const max = Math.max(...data.flat());

            container.innerHTML = `
                <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px;">
                    ${days.map(d => `<div style="text-align: center; font-size: 10px; color: #64748b; padding: 4px;">${d}</div>`).join('')}
                    ${data.flat().map((val, i) => {
                const opacity = max > 0 ? (val / max) : 0;
                return `<div style="
                            aspect-ratio: 1;
                            border-radius: 4px;
                            background: rgba(67, 97, 238, ${0.1 + opacity * 0.9});
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 10px;
                            color: ${opacity > 0.5 ? 'white' : '#64748b'};
                            font-weight: 600;
                        ">${val || ''}</div>`;
            }).join('')}
                </div>
            `;
        }
    },

    // ========================================
    // #21 - Calendar Weekly View
    // ========================================
    CalendarWeekly: {
        render(container, events, startDate) {
            const days = [];
            const current = new Date(startDate);

            for (let i = 0; i < 7; i++) {
                days.push(new Date(current));
                current.setDate(current.getDate() + 1);
            }

            const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8am - 8pm

            container.innerHTML = `
                <div class="calendar-week-grid">
                    <div class="calendar-week-header"></div>
                    ${days.map(d => `
                        <div class="calendar-week-header ${this.isToday(d) ? 'today' : ''}">
                            <div style="font-size: 0.7rem; opacity: 0.7;">${d.toLocaleDateString('es', { weekday: 'short' })}</div>
                            <div style="font-size: 1.2rem; font-weight: 700;">${d.getDate()}</div>
                        </div>
                    `).join('')}
                    ${hours.map(h => `
                        <div class="calendar-week-time">${h}:00</div>
                        ${days.map(d => `
                            <div class="calendar-week-day ${this.isToday(d) ? 'today' : ''}" data-date="${d.toISOString().split('T')[0]}" data-hour="${h}">
                            </div>
                        `).join('')}
                    `).join('')}
                </div>
            `;
        },

        isToday(date) {
            const today = new Date();
            return date.toDateString() === today.toDateString();
        }
    },

    // ========================================
    // #23 - Gantt Zoom Levels
    // ========================================
    GanttZoom: {
        levels: ['day', 'week', 'month', 'quarter'],
        current: 'month',

        renderControls(container) {
            container.innerHTML = `
                <div class="gantt-zoom-controls">
                    ${this.levels.map(level => `
                        <button class="gantt-zoom-btn ${level === this.current ? 'active' : ''}" data-zoom="${level}">
                            ${this.getLabel(level)}
                        </button>
                    `).join('')}
                </div>
            `;

            container.querySelectorAll('.gantt-zoom-btn').forEach(btn => {
                btn.onclick = () => {
                    this.current = btn.dataset.zoom;
                    container.querySelectorAll('.gantt-zoom-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    // Trigger re-render
                    if (window.GanttModule) GanttModule.render();
                };
            });
        },

        getLabel(level) {
            const labels = { day: 'Día', week: 'Semana', month: 'Mes', quarter: 'Trimestre' };
            return labels[level];
        },

        getColumnWidth() {
            const widths = { day: 40, week: 80, month: 100, quarter: 150 };
            return widths[this.current];
        }
    },

    // ========================================
    // #26 - Gantt Minimap
    // ========================================
    GanttMinimap: {
        render(container, data, viewportPercent = 30) {
            const totalWidth = 100;

            container.innerHTML = `
                <div class="gantt-minimap">
                    ${data.map(item => {
                const left = item.startPercent || 0;
                const width = item.widthPercent || 5;
                const color = item.color || '#4361EE';
                return `<div class="gantt-minimap-bar" style="left: ${left}%; width: ${width}%; background: ${color};"></div>`;
            }).join('')}
                    <div class="gantt-minimap-viewport" style="left: 0; width: ${viewportPercent}%;"></div>
                </div>
            `;

            // Make viewport draggable
            const viewport = container.querySelector('.gantt-minimap-viewport');
            let isDragging = false;
            let startX = 0;

            viewport.onmousedown = (e) => {
                isDragging = true;
                startX = e.clientX - viewport.offsetLeft;
            };

            document.onmousemove = (e) => {
                if (!isDragging) return;
                const newLeft = Math.max(0, Math.min(100 - viewportPercent, (e.clientX - startX) / container.offsetWidth * 100));
                viewport.style.left = newLeft + '%';
            };

            document.onmouseup = () => isDragging = false;
        }
    },

    // ========================================
    // Initialize All
    // ========================================
    init() {
        this.Sidebar.init();
        this.ScrollAnimations.init();

        // Override Utils.showToast with enhanced notifications
        if (window.Utils) {
            const originalToast = Utils.showToast;
            Utils.showToast = (message, type = 'success') => {
                Enhancements.Notify.show({
                    title: type === 'success' ? '¡Éxito!' : type === 'error' ? 'Error' : 'Info',
                    message: message,
                    type: type
                });
            };
        }


    }
};

// Auto-initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => Enhancements.init());

// Export for global access
window.Enhancements = Enhancements;
