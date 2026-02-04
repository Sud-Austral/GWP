
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

    openHelpModal: (title, content) => {
        let modal = document.getElementById('globalHelpModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'globalHelpModal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 600px; max-height: 85vh; display: flex; flex-direction: column;">
                    <header class="modal-header bg-slate-50 border-b border-slate-100 p-5 rounded-t-xl">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center shadow-sm">
                                <i class="fas fa-book-reader text-indigo-600 text-xl"></i>
                            </div>
                            <div>
                                <h2 class="modal-title text-xl font-bold text-slate-800" id="helpModalTitle">Ayuda</h2>
                                <p class="text-xs text-slate-400 font-medium uppercase tracking-wider">Documentación de Usuario</p>
                            </div>
                        </div>
                        <button class="close-btn hover:bg-slate-200 rounded-lg p-2 transition-colors" onclick="Utils.closeModal('globalHelpModal')">&times;</button>
                    </header>
                    <div id="helpModalContent" class="p-6 text-slate-600 text-sm leading-relaxed overflow-y-auto space-y-6 custom-scrollbar"></div>
                    <div class="modal-footer p-4 border-t border-slate-100 flex justify-between items-center bg-slate-50 rounded-b-xl">
                        <span class="text-xs text-slate-400">GWP Admin v2.3</span>
                        <button class="btn btn-primary px-6 shadow-lg shadow-indigo-200" onclick="Utils.closeModal('globalHelpModal')">Entendido</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        document.getElementById('helpModalTitle').textContent = title;
        document.getElementById('helpModalContent').innerHTML = content;
        Utils.openModal('globalHelpModal');
    },

    showHelpForCurrentView: () => {
        const view = document.querySelector('.nav-item.active')?.dataset.view || 'dashboard';

        const helpContent = {
            'dashboard': {
                title: 'Panel de Control e Indicadores',
                content: `
                    <div class="space-y-6">
                        <div class="bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm">
                            <h3 class="font-bold text-blue-800 mb-2 flex items-center gap-2">
                                <i class="fas fa-chart-pie"></i> Resumen Ejecutivo
                            </h3>
                            <p class="text-blue-700 text-justify">
                                Bienvenido al centro de mando del proyecto. Esta pantalla procesa en tiempo real todos los registros de actividades, hitos y documentación para entregar una radiografía precisa del estado de salud del proyecto. 
                                Está diseñada para responder preguntas críticas como: <i>¿Vamos a tiempo? ¿Dónde están los cuellos de botella?</i>
                            </p>
                        </div>

                        <div>
                            <h4 class="font-bold text-slate-800 mb-3 border-b border-slate-200 pb-2">1. Interpretación de KPIs</h4>
                            <ul class="grid grid-cols-1 gap-3">
                                <li class="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                                    <div class="flex items-center gap-2 mb-1 font-semibold text-slate-700"><i class="fas fa-clipboard-list text-blue-500"></i> Total Actividades</div>
                                    <div class="text-xs text-slate-500 text-justify">Representa el alcance total del proyecto. Un aumento inesperado aquí podría indicar un "scope creep" (aumento no controlado del alcance).</div>
                                </li>
                                <li class="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                                    <div class="flex items-center gap-2 mb-1 font-semibold text-slate-700"><i class="fas fa-check-circle text-green-500"></i> Completadas</div>
                                    <div class="text-xs text-slate-500 text-justify">Indica el valor ganado. Compare este número con el total para obtener un porcentaje de avance crudo.</div>
                                </li>
                                <li class="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                                    <div class="flex items-center gap-2 mb-1 font-semibold text-slate-700"><i class="fas fa-spinner text-amber-500"></i> En Progreso</div>
                                    <div class="text-xs text-slate-500 text-justify">Muestra la carga de trabajo actual del equipo. Demasiadas tareas en esta columna pueden indicar falta de foco o bloqueos.</div>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h4 class="font-bold text-slate-800 mb-3 border-b border-slate-200 pb-2">2. Herramientas de Análisis Profundo</h4>
                            <div class="space-y-4">
                                <div>
                                    <span class="font-bold text-indigo-600 block mb-1">Burndown Chart (Gráfico de Quemado)</span>
                                    <p class="text-xs text-slate-600 text-justify">
                                        Es su mejor herramienta para predecir si el proyecto terminará a tiempo. La <b>línea ideal</b> (recta descendente) muestra el ritmo perfecto de trabajo. La <b>línea real</b> (fluctuante) muestra su avance verdadero.
                                        <br>• Si la línea real está <b>por encima</b> de la ideal: El proyecto está atrasado.
                                        <br>• Si la línea real está <b>por debajo</b> de la ideal: El proyecto va adelantado.
                                    </p>
                                </div>
                                <hr class="border-slate-100">
                                <div>
                                    <span class="font-bold text-purple-600 block mb-1">Mapa de Calor (Actividad Diaria)</span>
                                    <p class="text-xs text-slate-600 text-justify">
                                        Visualiza la intensidad del trabajo día a día. Los cuadros más oscuros indican días con muchas actividades iniciadas o cerradas. Úselo para identificar patrones de trabajo del equipo (ej. ¿Se trabaja mucho los viernes o al inicio de mes?).
                                    </p>
                                </div>
                            </div>
                        </div>

                         <div class="bg-amber-50 p-3 rounded-lg border border-amber-100 mt-4 text-xs text-amber-800 flex gap-2">
                            <i class="fas fa-lightbulb mt-0.5"></i>
                            <div><b>Tip Pro:</b> Si ve una discrepancia entre los datos mostrados y lo que espera, pulse el botón "Actualizar" en la esquina superior derecha para forzar una re-sincronización completa con la base de datos.</div>
                        </div>
                    </div>
                `
            },
            'plan': {
                title: 'Plan Maestro de Actividades',
                content: `
                    <div class="space-y-5">
                       <p class="text-justify text-slate-600">
                           El <b>Plan Maestro</b> no es solo una lista de tareas; es el sistema nervioso del proyecto. Desde aquí se controlan los tiempos, los responsables, los entregables y la trazabilidad de cada acción operativa.
                       </p>

                       <div class="grid grid-cols-1 gap-4">
                           <div class="border-l-4 border-indigo-500 bg-slate-50 pl-4 py-3 rounded-r-lg">
                               <h4 class="font-bold text-slate-800 text-sm flex items-center gap-2"><i class="fas fa-filter text-indigo-500"></i> Filtrado Inteligente</h4>
                               <p class="text-xs mt-1 text-slate-600 text-justify">
                                   La barra superior contiene filtros poderosos. Puede ver, por ejemplo, "Todas las actividades <i>Pendientes</i> de <i>Juan Pérez</i> relacionadas con el <i>Producto 1</i>". Esto es vital para las reuniones de coordinación semanal.
                               </p>
                           </div>
                           
                           <div class="border-l-4 border-green-500 bg-slate-50 pl-4 py-3 rounded-r-lg">
                               <h4 class="font-bold text-slate-800 text-sm flex items-center gap-2"><i class="fas fa-pencil-alt text-green-500"></i> Gestión Integral</h4>
                               <p class="text-xs mt-1 text-slate-600 text-justify">
                                   Al crear o editar una actividad, usted no solo define un nombre. Puede (y debe):
                                   <br>• Asignar un <b>Responsable</b> claro.
                                   <br>• Definir fechas de <b>Inicio y Fin</b> para alimentar la Carta Gantt.
                                   <br>• Vincular <b>Documentos de Evidencia</b> directamente (no pierda archivos en correos).
                                   <br>• Registrar <b>Observaciones</b> para dejar constancia de problemas o acuerdos.
                               </p>
                           </div>
                       </div>

                       <div>
                           <h4 class="font-bold text-slate-800 mb-2 border-b border-slate-200 pb-1">Ciclo de Vida de una Actividad</h4>
                           <div class="flex items-center justify-between text-xs text-center px-4">
                               <div class="flex flex-col items-center gap-1 opacity-60">
                                   <div class="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold">1</div>
                                   <span>Creación</span>
                               </div>
                               <div class="h-0.5 w-8 bg-slate-200"></div>
                               <div class="flex flex-col items-center gap-1 opacity-80">
                                   <div class="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">2</div>
                                   <span>Asignación</span>
                               </div>
                               <div class="h-0.5 w-8 bg-slate-200"></div>
                               <div class="flex flex-col items-center gap-1 font-bold text-indigo-700">
                                   <div class="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">3</div>
                                   <span>Ejecución <br>& Evidencia</span>
                               </div>
                               <div class="h-0.5 w-8 bg-slate-200"></div>
                               <div class="flex flex-col items-center gap-1 opacity-60">
                                   <div class="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">4</div>
                                   <span>Cierre</span>
                               </div>
                           </div>
                       </div>
                    </div>
                `
            },
            'gantt': {
                title: 'Carta Gantt Interactiva',
                content: `
                    <div class="space-y-4">
                        <div class="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex gap-3 text-indigo-800">
                            <i class="fas fa-project-diagram mt-1"></i>
                            <p class="text-sm text-justify">
                                Esta vista transforma las fechas abstractas del Plan Maestro en una línea de tiempo visual e intuitiva. Es esencial para identificar conflictos de agenda y dependencias entre tareas.
                            </p>
                        </div>
                        
                        <div class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                            <h4 class="font-bold text-slate-800 mb-2">Navegación Eficiente</h4>
                            <ul class="text-xs space-y-2 text-slate-600">
                                <li class="flex gap-2">
                                    <span class="badge bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono">Zoom</span>
                                    <span>Use los botones superiores (Día/Semana/Mes) para cambiar entre una vista táctica diaria o una vista estratégica mensual.</span>
                                </li>
                                <li class="flex gap-2">
                                    <span class="badge bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono">Drag</span>
                                    <span>Haga clic y arrastre sobre el gráfico para moverse en el tiempo (scroll horizontal).</span>
                                </li>
                                <li class="flex gap-2">
                                    <span class="badge bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono">Minimapa</span>
                                    <span>La barra inferior muestra una vista completa del proyecto. Arrastre el cuadro selector para saltar rápidamente a cualquier fecha.</span>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h4 class="font-bold text-slate-800 mb-2 border-b border-slate-200 pb-1">Simbología del Gráfico</h4>
                            <div class="grid grid-cols-1 gap-2 text-xs">
                                <div class="flex items-center gap-3 p-2 rounded bg-slate-50">
                                    <span class="w-4 h-4 rounded bg-emerald-500 shadow-sm block"></span> 
                                    <span><b>Verde:</b> Tarea completada exitosamente. Ya no requiere atención.</span>
                                </div>
                                <div class="flex items-center gap-3 p-2 rounded bg-slate-50">
                                    <span class="w-4 h-4 rounded bg-blue-500 shadow-sm block"></span> 
                                    <span><b>Azul:</b> Tarea en progreso normal. Requiere seguimiento estándar.</span>
                                </div>
                                <div class="flex items-center gap-3 p-2 rounded bg-slate-50">
                                    <span class="w-4 h-4 rounded bg-red-500 shadow-sm block"></span> 
                                    <span><b>Rojo:</b> Tarea pendiente o atrasada. ¡Atención prioritaria requerida!</span>
                                </div>
                                <div class="flex items-center gap-3 p-2 rounded bg-slate-50">
                                    <i class="fas fa-diamond text-amber-500 ml-0.5"></i>
                                    <span class="ml-1"><b>Rombo Dorado:</b> Hito clave (entrega mayor, pago, auditoría). No tiene duración, es un punto en el tiempo.</span>
                                </div>
                            </div>
                        </div>
                    </div>
                `
            },
            'calendar': {
                title: 'Calendario y Vencimientos',
                content: `
                    <div class="space-y-4">
                        <p class="text-justify text-slate-600 mb-2">
                            Mientras la Carta Gantt muestra la duración, el <b>Calendario</b> se enfoca en los <i>deadlines</i> (fechas límite). Es la vista ideal para responder "¿Qué vence esta semana?".
                        </p>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="bg-white p-4 border border-slate-200 rounded-xl hover:shadow-md transition-shadow">
                                <i class="fas fa-calendar-alt text-2xl text-indigo-500 mb-2"></i>
                                <h4 class="font-bold text-slate-800 text-sm">Vista Mensual</h4>
                                <p class="text-xs text-slate-500 mt-1">Panorama general. Ideal para distribuir la carga de trabajo y evitar cuellos de botella a fin de mes.</p>
                            </div>
                             <div class="bg-white p-4 border border-slate-200 rounded-xl hover:shadow-md transition-shadow">
                                <i class="fas fa-list-ul text-2xl text-purple-500 mb-2"></i>
                                <h4 class="font-bold text-slate-800 text-sm">Vista Agenda</h4>
                                <p class="text-xs text-slate-500 mt-1">Lista secuencial tipo "To-Do". Perfecta para imprimir y tachar tareas a medida que se completan.</p>
                            </div>
                        </div>

                        <div class="bg-amber-50 rounded-lg p-3 border border-amber-100 flex gap-3 mt-2">
                            <i class="fas fa-history text-amber-600 mt-1"></i>
                            <div>
                                <h5 class="font-bold text-amber-800 text-xs">Modo Histórico</h5>
                                <p class="text-[11px] text-amber-700 text-justify">
                                    Por defecto, el calendario muestra eventos futuros. Active el botón <b>"Histórico"</b> para revelar eventos pasados. Esto es útil para auditorías: ver cuándo <i>realmente</i> sucedieron las cosas vs. cuándo se planificaron.
                                </p>
                            </div>
                        </div>
                    </div>
                `
            },
            'hitos': {
                title: 'Gestión de Hitos e Inspectores',
                content: `
                    <div class="space-y-5">
                        <p class="text-justify text-slate-600">
                            Los <b>Hitos</b> son los puntos de control de calidad y financieros del proyecto. A diferencia de las actividades rutinarias, los hitos suelen representar entregas de informes finales, aprobaciones de etapas o pagos asociados.
                        </p>
                        
                        <div class="border border-slate-200 rounded-xl overflow-hidden">
                             <div class="bg-slate-50 px-4 py-2 border-b border-slate-200 font-bold text-xs text-slate-600">Funcionalidades Clave</div>
                             <div class="p-4 grid grid-cols-1 gap-4">
                                
                                <div class="flex gap-3">
                                    <div class="bg-purple-100 text-purple-600 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"><i class="fas fa-check"></i></div>
                                    <div>
                                        <div class="font-bold text-sm text-slate-800">Edición Rápida (Quick-Edit)</div>
                                        <p class="text-xs text-slate-500 text-justify">No necesita abrir un formulario complejo. Cambie el estado de "Pendiente" a "Completado" directamente desde la tabla principal.</p>
                                    </div>
                                </div>

                                <div class="flex gap-3">
                                    <div class="bg-red-100 text-red-600 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"><i class="fas fa-bell"></i></div>
                                    <div>
                                        <div class="font-bold text-sm text-slate-800">Alertas de Vencimiento</div>
                                        <p class="text-xs text-slate-500 text-justify">El sistema colorea automáticamente en rojo los hitos cuya fecha estimada ya pasó y no han sido completados. ¡Atiéndalos de inmediato!</p>
                                    </div>
                                </div>

                                <div class="flex gap-3">
                                    <div class="bg-blue-100 text-blue-600 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"><i class="fas fa-link"></i></div>
                                    <div>
                                        <div class="font-bold text-sm text-slate-800">Vinculación</div>
                                        <p class="text-xs text-slate-500 text-justify">Un hito puede "vivir solo" o estar atado a una Tarea del Plan Maestro. Si está atado, hereda la información de contexto de esa tarea.</p>
                                    </div>
                                </div>
                             </div>
                        </div>
                    </div>
                `
            },
            'repo': {
                title: 'Biblioteca Estratégica con IA',
                content: `
                    <div class="space-y-5">
                        <div class="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-700 text-white p-6 shadow-xl">
                            <div class="absolute top-0 right-0 -mt-2 -mr-2 bg-white/10 w-24 h-24 rounded-full blur-xl"></div>
                            <h3 class="font-bold text-lg mb-2 flex items-center gap-2"><i class="fas fa-brain"></i> Cerebro del Proyecto</h3>
                            <p class="text-sm opacity-90 text-justify leading-relaxed">
                                Esta no es una carpeta compartida normal. Es un repositorio potenciado por Inteligencia Artificial capaz de leer, comprender y sintetizar cientos de páginas de textos legales y técnicos en segundos.
                            </p>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="border border-slate-200 p-4 rounded-xl">
                                <h4 class="font-bold text-indigo-600 text-sm mb-2">Búsqueda Semántica</h4>
                                <p class="text-xs text-slate-600 text-justify">
                                    Olvídese de recordar el nombre exacto del archivo. Busque conceptos como <i>"reglas de poda en zonas áridas"</i> y la IA encontrará los documentos relevantes aunque esas palabras exactas no estén en el título.
                                </p>
                            </div>
                            <div class="border border-slate-200 p-4 rounded-xl">
                                <h4 class="font-bold text-purple-600 text-sm mb-2">Chat con Documentos</h4>
                                <p class="text-xs text-slate-600 text-justify">
                                    Use el botón flotante <i class="fas fa-robot"></i>. Puede pedirle: <i>"Resume la Ley 20.283"</i> o <i>"Compara las conclusiones de los informes de 2023 y 2024"</i>. La IA citará las fuentes exactas (página y documento).
                                </p>
                            </div>
                        </div>

                        <div class="bg-slate-50 p-4 rounded-xl text-xs text-slate-600 flex gap-3">
                             <i class="fas fa-info-circle text-slate-400 mt-0.5"></i>
                             <p><b>Nota:</b> Para alimentar el cerebro, use el botón "Agregar Documento". Entre más metadatos (etiquetas, tipo, año) agregue, más inteligentes serán las respuestas de la IA.</p>
                        </div>
                    </div>
                `
            },
            'observaciones': {
                title: 'Bitácora de Observaciones',
                content: `
                    <div class="space-y-4">
                        <p class="text-justify text-slate-600">
                           La <b>Bitácora</b> es el historial narrativo del proyecto. Aquí se registra todo lo que "no cabe" en una celda de Excel: discusiones, acuerdos verbales, justificaciones de retrasos, o hallazgos en terreno.
                        </p>
                        
                        <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                            <h4 class="font-bold text-slate-800 text-sm mb-3">Mejores Prácticas de Uso</h4>
                            <ul class="space-y-3">
                                <li class="flex gap-3 text-xs text-slate-600">
                                    <span class="font-bold text-indigo-500 w-6">01.</span>
                                    <span><b>Sea Específico:</b> No escriba "hubo un problema". Escriba "El servidor falló por falta de memoria a las 14:00".</span>
                                </li>
                                <li class="flex gap-3 text-xs text-slate-600">
                                    <span class="font-bold text-indigo-500 w-6">02.</span>
                                    <span><b>Vincule:</b> Siempre que sea posible, vincule la observación a una Actividad o Producto existente para mantener la trazabilidad.</span>
                                </li>
                                <li class="flex gap-3 text-xs text-slate-600">
                                    <span class="font-bold text-indigo-500 w-6">03.</span>
                                    <span><b>Úselo como Evidencia:</b> En disputas contractuales o revisiones de desempeño, esta bitácora es su respaldo oficial de qué se dijo y cuándo.</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                `
            },
            'documents': {
                title: 'Repositorio Documental',
                content: `
                    <div class="space-y-4">
                        <p class="text-justify text-slate-600">
                           Esta vista consolida <b>toda la evidencia</b> adjunta a las actividades del proyecto en un solo lugar. Es ideal para auditorías de calidad o para recuperar archivos perdidos.
                        </p>
                        
                        <div class="border-t border-b border-slate-200 py-4 my-2 grid grid-cols-2 gap-4">
                             <div>
                                 <h5 class="text-xs font-bold text-slate-700 uppercase mb-1">Filtros Clave</h5>
                                 <p class="text-[11px] text-slate-500">Use los desplegables para ver solo la documentación de un Responsable específico o de un Producto entregable.</p>
                             </div>
                             <div>
                                 <h5 class="text-xs font-bold text-slate-700 uppercase mb-1">Descarga</h5>
                                 <p class="text-[11px] text-slate-500">Haga clic en el nombre del archivo para descargarlo o previsualizarlo inmediatamente.</p>
                             </div>
                        </div>

                         <div class="bg-red-50 p-3 rounded-lg border border-red-100 flex gap-2 text-xs text-red-800">
                            <i class="fas fa-exclamation-triangle mt-0.5"></i>
                            <div>Esta vista no reemplaza a la "Biblioteca Estratégica". Aquí solo viven los archivos operativos (evidencia de tareas). Las leyes y manuales viven en la Biblioteca.</div>
                        </div>
                    </div>
                `
            },
            'users': {
                title: 'Administración de Usuarios',
                content: `
                    <div class="space-y-4 text-center py-6">
                        <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-user-shield text-slate-400 text-2xl"></i>
                        </div>
                        <h4 class="font-bold text-slate-800">Zona de Administración</h4>
                        <p class="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                            Módulo restringido para Super-Admins. Permite dar de alta nuevos usuarios, restablecer contraseñas y configurar permisos de visualización.
                            <br><br>
                            Tenga cuidado: los cambios aquí afectan el acceso inmediato a la plataforma.
                        </p>
                    </div>
                `
            }
        };

        const data = helpContent[view] || helpContent['dashboard'];
        Utils.openHelpModal(data.title, data.content);
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
