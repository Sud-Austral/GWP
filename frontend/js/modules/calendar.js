
const CalendarModule = {
    init: async () => {
        const container = document.getElementById('calendarView');
        const data = window.appData?.plan || [];

        if (data.length === 0) {
            container.innerHTML = '<div class="text-center p-4">No hay datos.</div>';
            return;
        }

        // Group by month
        const eventsByMonth = {};

        data.forEach(item => {
            if (item.fecha_fin) {
                const date = new Date(item.fecha_fin);
                const monthKey = date.toLocaleString('es-CL', { month: 'long', year: 'numeric' });
                if (!eventsByMonth[monthKey]) eventsByMonth[monthKey] = [];
                eventsByMonth[monthKey].push({
                    day: date.getDate(),
                    title: item.task_name,
                    code: item.activity_code,
                    type: 'Fin Actividad'
                });
            }
        });

        // Hitos handling would go here (fetch from /hitos endpoints if implemented)
        // For now just showing Activity Ends

        let html = '<div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:1rem;">';

        for (const [month, events] of Object.entries(eventsByMonth)) {
            html += `
                <div style="background:white; border:1px solid #e2e8f0; border-radius:0.5rem; padding:1rem;">
                    <h3 style="font-weight:bold; margin-bottom:1rem; text-transform:capitalize; border-bottom:1px solid #eee; padding-bottom:0.5rem;">${month}</h3>
                    <ul style="list-style:none; padding:0;">
                        ${events.sort((a, b) => a.day - b.day).map(e => `
                            <li style="margin-bottom:0.5rem; font-size:0.9rem; border-left:3px solid #ef4444; padding-left:0.5rem;">
                                <span style="font-weight:bold; color:#64748b;">${e.day}</span> - 
                                <span style="font-weight:500;">${e.code}</span>
                                <div style="font-size:0.8rem; color:#94a3b8;">${e.title}</div>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
        }

        html += '</div>';
        container.innerHTML = html;
    }
};
