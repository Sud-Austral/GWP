
const ChatDetalle = {
    // Configuración
    config: {
        MAX_DOCS: 2 // Activarse solo si hay 1 o 2 docs
    },

    /**
     * Verifica si el modo detalle debe activarse
     * @param {Array} docs - Lista de documentos del contexto actual
     * @returns {boolean}
     */
    shouldActivate: (docs) => {
        return docs && docs.length > 0 && docs.length <= ChatDetalle.config.MAX_DOCS;
    },

    /**
     * Obtiene el análisis detallado desde el backend y llama a la IA
     * @param {Array} docs - Los documentos filtrados (1 o 2)
     * @param {String} userMessage - El mensaje del usuario
     * @param {Function} aiCallback - Función para llamar a la API de IA (ChatModule.callAI_Internal o similar)
     * @returns {Promise<String>} - La respuesta de la IA
     */
    process: async (docs, userMessage, aiCaller) => {
        try {
            // 1. Obtener contenido COMPLETO desde el backend
            // Extraer solo IDs para la petición
            const docIds = docs.map(d => d.id);
            const token = localStorage.getItem('token');

            // Notificar UI (opcional, si se quiere feedback específico)
            // console.log("Modo Detalle Activado para docs:", docIds);

            const response = await fetch(`${API.BASE}/repositorio/detalle-completo`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ids: docIds })
            });

            if (!response.ok) {
                throw new Error("Error obteniendo detalles completos de los documentos");
            }

            const fullDocs = await response.json(); // Array con metadatos + 'file_content'

            // 2. Construir un System Prompt Especializado
            const contextText = fullDocs.map(d => {
                // Limitar longitud para evitar errores 429/Token Limit
                const MAX_CHARS = 25000;
                let rawContent = d.file_content || '(No se pudo extraer texto del archivo físico, básate en los metadatos anteriores)';
                if (rawContent.length > MAX_CHARS) {
                    rawContent = rawContent.substring(0, MAX_CHARS) + "\n\n[... CONTENIDO TRUNCADO POR EXCESO DE LONGITUD ...]";
                }

                let content = `
=== INICIO DOCUMENTO ID:${d.id} ===
TÍTULO: ${d.titulo || 'Sin título'}
TIPO: ${d.tipo_documento || 'No especificado'}
AÑO: ${d.fecha_publicacion ? d.fecha_publicacion.substring(0, 4) : 'N/A'}
FUENTE: ${d.fuente_origen || 'N/A'} (${d.tipo_fuente || ''})
ETIQUETAS: ${d.etiquetas || 'Ninguna'}
DESCRIPCIÓN: ${d.descripcion || ''}
PUNTOS CLAVE: ${d.puntos_clave || ''}
RESUMEN LARGO: ${d.resumen_largo || ''}
ENLACE EXTERNO: ${d.enlace_externo || ''}
SUBIDO POR: ${d.uploader_name || 'Desconocido'}

--- CONTENIDO DEL ARCHIVO O TEXTO EXTENDIDO ---
${rawContent}
=== FIN DOCUMENTO ID:${d.id} ===
`;
                return content;
            }).join('\n\n');

            const systemPrompt = `Eres un ANALISTA ESTRATÉGICO SENIOR especializado en auditoría documental profunda.
Estás analizando específicamente ${fullDocs.length} documento(s) en su totalidad.

CONTEXTO DE LOS DOCUMENTOS:
${contextText}

INSTRUCCIONES DE ANÁLISIS PROFUNDO:
1. **Análisis Holístico**: No te limites al texto del archivo. Cruza la información del contenido con los metadatos (Fuente, Año, Tipo, Etiquetas). Por ejemplo, si es una "Ley" de "2020", considera su vigencia. Si es un informe de una fuente específica, considera su sesgo o autoridad.
2. **Respuesta Estructurada**:
   - Comienza con una respuesta directa a la pregunta del usuario.
   - Si aplica, cita segmentos textuales literales del contenido del archivo para respaldar tus afirmaciones.
   - Usa el formato de cita [[ID:id]] explícitamente.
3. **Atención al Detalle**: Fíjate en discrepancias entre la descripción del registro y el contenido real del archivo si las hubiera.

FORMATO DE RESPUESTA:
- Usa Markdown profesional (negritas, listas, subtítulos).
- Sé exhaustivo pero claro.
- IMPORTANTE: Al final de tu respuesta, DEBES incluir obligatoriamente 3 preguntas de seguimiento que profundicen en el análisis, usando el siguiente formato EXACTO (una por línea):

[SUGERENCIA: ¿Pregunta 1 relacionada con el contenido?]
[SUGERENCIA: ¿Pregunta 2 sobre implicaciones?]
[SUGERENCIA: ¿Pregunta 3 comparativa o de detalle?]

Pregunta del Usuario: "${userMessage}"
`;

            // 3. Llamar a la IA con este prompt enriquecido
            // Nota: Aquí no usamos el "systemPrompt" genérico de ChatModule, sino este super-prompt como contexto.
            // Para integrarlo con ChatModule.callAI, podríamos pasarle un flag o llamar directo a la API si ChatModule lo permite.
            // Asumiremos que ChatModule tiene un método flexible o modificaremos ChatModule para aceptar systemPrompt override.

            return await aiCaller(userMessage, systemPrompt);

        } catch (error) {
            console.error("Error en ChatDetalle:", error);
            throw error; // Propagar para manejo de error estándar en ChatModule
        }
    }
};

window.ChatDetalle = ChatDetalle;
