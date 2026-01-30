
const GanttModule = {
    init: async () => {
        const container = document.getElementById('ganttChart');
        // Ensure data is loaded if not present
        let data = window.appData?.plan;
        if (!data) {
            data = await API.get('/plan-maestro');
            window.appData = window.appData || {};
            window.appData.plan = data;
        }

        if (!data || data.length === 0) {
            container.innerHTML = '<div class="text-center p-4">No hay datos para mostrar.</div>';
            return;
        }

        // Configuration
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const year = 2026;
        const colWidth = 60; // px per month column approx if grid

        let html = `
        <div class="gantt-wrapper" style="overflow-x:auto; background:white; border-radius:8px; border:1px solid #e2e8f0;">
            <div style="min-width: 900px;">
                <!-- Header -->
                <div class="gantt-header" style="display:flex; border-bottom:1px solid #e2e8f0; background:#f8fafc; font-size:0.85rem; position:sticky; top:0; z-index:10;">
                    <div style="min-width:250px; padding:10px 15px; font-weight:600; color:#64748b; border-right:1px solid #e2e8f0;">
                        Actividad
                    </div>
                    <div style="flex:1; display:flex;">
                        ${months.map(m => `
                            <div style="flex:1; text-align:center; padding:10px 0; border-right:1px solid #f1f5f9; font-weight:600; color:#475569;">
                                ${m}
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Body -->
                <div class="gantt-body">
        `;

        data.forEach(item => {
            if (!item.fecha_inicio || !item.fecha_fin) return; // Skip if no dates

            const start = new Date(item.fecha_inicio);
            const end = new Date(item.fecha_fin);
            const yearStart = new Date(`${year}-01-01`);
            const yearEnd = new Date(`${year}-12-31`);
            const yearSpan = yearEnd - yearStart;

            // Calc percentages restricted to the year view
            let leftPct = ((start - yearStart) / yearSpan) * 100;
            let widthPct = ((end - start) / yearSpan) * 100;

            // Clamp
            if (leftPct < 0) { widthPct += leftPct; leftPct = 0; }
            if (widthPct < 0) widthPct = 0;
            if (leftPct > 100) return; // Starts after year
            if (leftPct + widthPct > 100) widthPct = 100 - leftPct;

            // Status Color
            let barColor = '#3b82f6'; // blue default
            if (item.status === 'Completado') barColor = '#10b981'; // green
            if (item.status === 'En Progreso') barColor = '#2563eb'; // darker blue
            if (item.status === 'Pendiente') barColor = '#94a3b8'; // grey

            html += `
                <div class="gantt-row" style="display:flex; border-bottom:1px solid #f1f5f9; height:44px; align-items:center;">
                     <div style="min-width:250px; padding:0 15px; font-size:0.85rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; border-right:1px solid #e2e8f0; font-weight:500;" title="${item.task_name}">
                        <span style="color:#64748b; font-size:0.75rem; margin-right:5px;">${item.activity_code}</span>
                        ${item.task_name}
                    </div>
                    
                    <div style="flex:1; position:relative; height:100%; display:flex;">
                        <!-- Background Grid Lines -->
                        ${months.map(() => `
                            <div style="flex:1; border-right:1px solid #f8fafc;"></div>
                        `).join('')}
                        
                        <!-- Bar -->
                        <div style="
                            position:absolute; 
                            left:${leftPct}%; 
                            width:${Math.max(0.5, widthPct)}%; 
                            top:10px; 
                            bottom:10px; 
                            background:${barColor}; 
                            border-radius:6px;
                            box-shadow: 0 1px 2px rgba(0,0,0,0.1);
                            cursor:pointer;
                            transition: transform 0.2s;
                        " 
                        title="${item.task_name}\nInicio: ${Utils.formatDate(item.fecha_inicio)}\nFin: ${Utils.formatDate(item.fecha_fin)}\nEstado: ${item.status}"
                        onmouseover="this.style.transform='scaleY(1.1)'"
                        onmouseout="this.style.transform='none'"
                        ></div>
                    </div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        </div>
        `;

        container.innerHTML = html;
    }
};

window.renderGantt = () => {
    GanttModule.init();
};
