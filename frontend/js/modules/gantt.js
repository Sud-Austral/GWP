
const GanttModule = {
    init: async () => {
        // Simple visualization
        const container = document.getElementById('ganttChart');
        const data = window.appData?.plan || [];

        if (data.length === 0) {
            container.innerHTML = '<div class="text-center p-4">No hay datos para mostrar. Cargue el Plan Maestro primero.</div>';
            return;
        }

        // Simple HTML Bar Chart
        let html = '<div class="gantt-wrapper" style="overflow-x:auto;">';

        // Header (Months) - Simplified
        html += '<div class="gantt-header" style="display:flex; border-bottom:1px solid #ddd; margin-bottom:10px;">';
        html += '<div style="width:200px; font-weight:bold; padding:5px;">Actividad</div>';
        html += '<div style="flex:1; text-align:center; padding:5px;">Linea de Tiempo (2026)</div>';
        html += '</div>';

        // Body
        data.forEach(item => {
            if (!item.fecha_inicio || !item.fecha_fin) return;

            const start = new Date(item.fecha_inicio);
            const end = new Date(item.fecha_fin);
            const totalWidth = 800; // px assumed

            // Calc position (Very rough approximation for demo)
            // Assumes 2026 full year
            const yearStart = new Date('2026-01-01');
            const yearEnd = new Date('2026-12-31');
            const yearSpan = yearEnd - yearStart;

            const left = ((start - yearStart) / yearSpan) * 100;
            const width = ((end - start) / yearSpan) * 100;

            html += `<div class="gantt-row" style="display:flex; align-items:center; margin-bottom:5px; border-bottom:1px solid #eee;">`;
            html += `<div style="width:200px; padding:5px; font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${item.task_name}">${item.activity_code}</div>`;
            html += `<div style="flex:1; position:relative; height:30px; background:#f9f9f9;">`;
            html += `<div style="position:absolute; left:${Math.max(0, left)}%; width:${Math.max(1, width)}%; height:20px; top:5px; background:#3b82f6; border-radius:4px;" title="${item.task_name} (${Utils.formatDate(item.fecha_inicio)} - ${Utils.formatDate(item.fecha_fin)})"></div>`;
            html += `</div>`;
            html += `</div>`;
        });

        html += '</div>';
        container.innerHTML = html;
    }
};

window.renderGantt = () => {
    GanttModule.init();
};
