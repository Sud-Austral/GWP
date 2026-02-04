/**
 * ChatModule - AI Chat for Biblioteca Estratégica
 * Uses GLM-4.7-FlashX API for document-based Q&A
 */

const ChatModule = {
    // API Configuration
    config: {
        API_KEY: "1b0ec96e0b474451833fe01a06f4123d.BkE9SxTzmhtJiJDL",
        API_URL: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
        MODEL_NAME: "GLM-4.7-FlashX",
        //MODEL_NAME: "GLM-4.7",
        MODEL_NAME1: "GLM-4.7-FlashX",
        MODEL_NAME2: "GLM-4.7",
    },

    // State
    state: {
        isOpen: false,
        filteredDocs: null,
        messages: [],
        dataSource: null  // Reference to data source (e.g., RepoModule.data)
    },

    // Set data source reference
    setDataSource: (dataGetter) => {
        ChatModule.state.dataSource = dataGetter;
    },

    // Toggle chat panel visibility
    toggleChat: () => {
        const panel = document.getElementById('repoChatPanel');
        const btn = document.getElementById('repoChatBtn');
        if (!panel) return;

        ChatModule.state.isOpen = !ChatModule.state.isOpen;
        panel.classList.toggle('hidden', !ChatModule.state.isOpen);

        if (btn) {
            btn.innerHTML = ChatModule.state.isOpen
                ? '<i class="fas fa-times text-xl"></i>'
                : '<i class="fas fa-robot text-xl"></i>';
        }

        ChatModule.updateContext();
    },

    // Update context display
    updateContext: () => {
        const contextEl = document.getElementById('repoChatContext');
        if (!contextEl) return;

        const docs = ChatModule.getDocuments();
        const count = docs ? docs.length : 0;
        contextEl.textContent = `Contexto: ${count} documento${count !== 1 ? 's' : ''}`;
    },

    // Get current documents (filtered or all)
    getDocuments: () => {
        if (ChatModule.state.filteredDocs) {
            return ChatModule.state.filteredDocs;
        }
        if (ChatModule.state.dataSource) {
            return typeof ChatModule.state.dataSource === 'function'
                ? ChatModule.state.dataSource()
                : ChatModule.state.dataSource;
        }
        return [];
    },

    // Set filtered documents for context
    setFilteredDocs: (docs) => {
        ChatModule.state.filteredDocs = docs;
        ChatModule.updateContext();
    },

    // Send chat message
    sendChat: async (overrideMessage = null) => {
        const input = document.getElementById('repoChatInput');
        const messagesContainer = document.getElementById('repoChatMessages');
        if (!input || !messagesContainer) return;

        // Ensure overrideMessage is a string if it's an event object (just in case)
        if (typeof overrideMessage === 'object') overrideMessage = null;

        const userMessage = overrideMessage || input.value.trim();
        if (!userMessage) return;

        // Clear input only if typed
        if (!overrideMessage) input.value = '';

        // Add user message to UI
        messagesContainer.insertAdjacentHTML('beforeend', `
            <div class="flex gap-3 justify-end mb-4">
                <div class="bg-indigo-500 text-white p-3 rounded-xl rounded-tr-none shadow-sm text-sm max-w-[80%]">
                    ${ChatModule.escapeHtml(userMessage)}
                </div>
                <div class="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
                    <i class="fas fa-user text-slate-500 text-sm"></i>
                </div>
            </div>
        `);

        // Add loading indicator
        const loadingId = 'chat-loading-' + Date.now();
        messagesContainer.insertAdjacentHTML('beforeend', `
            <div class="flex gap-3 mb-4" id="${loadingId}">
                <div class="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <i class="fas fa-robot text-indigo-600 text-sm"></i>
                </div>
                <div class="bg-white p-3 rounded-xl rounded-tl-none shadow-sm text-sm text-slate-400">
                    <i class="fas fa-spinner fa-spin mr-2"></i>Pensando...
                </div>
            </div>
        `);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        try {
            const response = await ChatModule.callAI(userMessage);

            // Remove loading
            document.getElementById(loadingId)?.remove();

            // Add AI response
            messagesContainer.insertAdjacentHTML('beforeend', `
                <div class="flex gap-3 mb-4">
                    <div class="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <i class="fas fa-robot text-indigo-600 text-sm"></i>
                    </div>
                    <div class="bg-white p-3 rounded-xl rounded-tl-none shadow-sm text-sm text-slate-700 max-w-[85%]">
                        ${ChatModule.formatResponse(response)}
                    </div>
                </div>
            `);
        } catch (error) {
            document.getElementById(loadingId)?.remove();
            messagesContainer.insertAdjacentHTML('beforeend', `
                <div class="flex gap-3 mb-4">
                    <div class="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <i class="fas fa-exclamation-triangle text-red-500 text-sm"></i>
                    </div>
                    <div class="bg-red-50 p-3 rounded-xl rounded-tl-none shadow-sm text-sm text-red-600 max-w-[80%]">
                        Error: ${error.message || 'No se pudo conectar con el asistente'}
                    </div>
                </div>
            `);
        }

        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    },

    // Call AI API
    callAI: async (prompt) => {
        const { API_KEY, API_URL, MODEL_NAME } = ChatModule.config;

        // Build context from documents
        const docs = ChatModule.getDocuments();
        const docsSummary = docs.slice(0, 100).map(d => {
            // Use resumen_largo if available, otherwise fall back to descripcion
            const content = d.resumen_largo || d.descripcion || '';
            return `- "${d.titulo}" (${d.tipo_documento || 'Doc'}): ${content.substring(0, 500)}`;
        }).join('\n');

        const systemPrompt = `Eres un asistente experto en documentos estratégicos de gestión de proyectos.
Tienes acceso a la siguiente biblioteca de ${docs.length} documentos:

${docsSummary}

Responde las consultas del usuario basándote en esta información. 
Si la pregunta no está relacionada con los documentos, indica que no tienes esa información.
Responde en español de forma profesional, detallada y explicativa. Elabora tus respuestas para que sean completas y profundas (aprox. 20% más extensas de lo habitual), proporcionando contexto y matices cuando sea posible.

IMPORTANTE SOBRE PREGUNTAS DE SEGUIMIENTO:
Al final de tu respuesta, DEBES sugerir 3 preguntas breves que el usuario podría hacer a continuación.
Usa EXACTAMENTE este formato, una por línea, asegurándote de cerrar los corchetes:

[SUGERENCIA: ¿Pregunta 1?]
[SUGERENCIA: ¿Pregunta 2?]
[SUGERENCIA: ¿Pregunta 3?]

No añadas texto antes ni después de estas sugerencias. Solo las etiquetas.`;

        // Make request with retry for rate limiting
        const makeRequest = async (retryCount = 0) => {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    "Authorization": `Bearer ${API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: MODEL_NAME,
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: prompt }
                    ],
                    temperature: 0.2
                })
            });

            if (response.status === 429) {
                if (retryCount < 2) {
                    // Wait and retry (exponential backoff)
                    const waitTime = (retryCount + 1) * 3000; // 3s, 6s
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    return makeRequest(retryCount + 1);
                }
                throw new Error('El servicio está muy ocupado. Por favor, espera unos segundos e intenta de nuevo.');
            }

            if (!response.ok) {
                throw new Error(`Error del servidor: ${response.status}`);
            }

            return response;
        };

        const response = await makeRequest();
        const data = await response.json();
        return data.choices?.[0]?.message?.content || 'Sin respuesta';
    },

    // Escape HTML to prevent XSS
    escapeHtml: (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // Remove emojis and unsupported Unicode characters that render as squares
    removeEmojis: (text) => {
        return text.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F700}-\u{1F77F}]|[\u{1F780}-\u{1F7FF}]|[\u{1F800}-\u{1F8FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{231A}-\u{231B}]|[\u{23E9}-\u{23F3}]|[\u{23F8}-\u{23FA}]|[\u{25AA}-\u{25AB}]|[\u{25B6}]|[\u{25C0}]|[\u{25FB}-\u{25FE}]|[\u{2934}-\u{2935}]|[\u{2B05}-\u{2B07}]|[\u{2B1B}-\u{2B1C}]|[\u{2B50}]|[\u{2B55}]|[\u{3030}]|[\u{303D}]|[\u{3297}]|[\u{3299}]/gu, '');
    },

    // Format AI response with markdown-like styling & suggestion buttons
    formatResponse: (text) => {
        // Clean emojis first
        text = ChatModule.removeEmojis(text);
        // Extract suggestions. Regex handles:
        // - Optional spaces after colon
        // - Capture text until closing bracket OR end of line (if bracket missing)
        // - Non-greedy match
        const suggestionRegex = /\[SUGERENCIA:\s*(.+?)(?:\]|\n|$)/g;

        let suggestionsHTML = '<div class="mt-3 flex flex-col gap-2">';
        let hasSuggestions = false;

        // First pass: remove suggestions from text and build HTML list
        const cleanText = text.replace(suggestionRegex, (match, question) => {
            // Clean up question text just in case
            const q = question.trim();
            if (q.length > 2) {
                hasSuggestions = true;
                suggestionsHTML += `
                    <button onclick="ChatModule.sendChat('${q.replace(/'/g, "\\'")}')" 
                        class="text-left text-xs bg-indigo-50 border border-indigo-100 text-indigo-600 px-3 py-2 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-2 w-full">
                        <i class="fas fa-reply text-[10px] flex-shrink-0"></i> 
                        <span class="truncate-2-lines">${q}</span>
                    </button>`;
            }
            return ''; // Remove from main text
        }).trim();

        suggestionsHTML += '</div>';

        // Format Main Text
        let formatted = cleanText
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n\n/g, '<br><br>') // Paragraphs
            .replace(/\n/g, '<br>')
            .replace(/- /g, '• ');

        if (hasSuggestions) {
            formatted += suggestionsHTML;
        }

        return formatted;
    },

    // Clear chat history
    clearChat: () => {
        const messagesContainer = document.getElementById('repoChatMessages');
        if (!messagesContainer) return;

        messagesContainer.innerHTML = `
            <div class="flex gap-3">
                <div class="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <i class="fas fa-robot text-indigo-600 text-sm"></i>
                </div>
                <div class="bg-white p-3 rounded-xl rounded-tl-none shadow-sm text-sm text-slate-700 max-w-[80%]">
                    ¡Hola! Soy tu asistente para consultar la <strong>Biblioteca Estratégica</strong>. 
                    Pregúntame sobre los documentos, leyes, o cualquier información del repositorio.
                </div>
            </div>
        `;
        ChatModule.state.messages = [];
    }
};

// Make available globally
window.ChatModule = ChatModule;
