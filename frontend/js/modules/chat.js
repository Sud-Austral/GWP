/**
 * ChatModule - AI Chat for Biblioteca Estratégica
 * Uses GLM-4.7-FlashX API for document-based Q&A
 */

const ChatModule = {
    // API Configuration
    config: {
        API_KEY: "1b0ec96e0b474451833fe01a06f4123d.BkE9SxTzmhtJiJDL",
        API_URL: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
        MODEL_NAME: "GLM-4.7-FlashX"
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
    sendChat: async () => {
        const input = document.getElementById('repoChatInput');
        const messagesContainer = document.getElementById('repoChatMessages');
        if (!input || !messagesContainer) return;

        const userMessage = input.value.trim();
        if (!userMessage) return;

        // Clear input
        input.value = '';

        // Add user message to UI
        messagesContainer.innerHTML += `
            <div class="flex gap-3 justify-end">
                <div class="bg-indigo-500 text-white p-3 rounded-xl rounded-tr-none shadow-sm text-sm max-w-[80%]">
                    ${ChatModule.escapeHtml(userMessage)}
                </div>
                <div class="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
                    <i class="fas fa-user text-slate-500 text-sm"></i>
                </div>
            </div>
        `;

        // Add loading indicator
        const loadingId = 'chat-loading-' + Date.now();
        messagesContainer.innerHTML += `
            <div class="flex gap-3" id="${loadingId}">
                <div class="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <i class="fas fa-robot text-indigo-600 text-sm"></i>
                </div>
                <div class="bg-white p-3 rounded-xl rounded-tl-none shadow-sm text-sm text-slate-400">
                    <i class="fas fa-spinner fa-spin mr-2"></i>Pensando...
                </div>
            </div>
        `;
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        try {
            const response = await ChatModule.callAI(userMessage);

            // Remove loading
            document.getElementById(loadingId)?.remove();

            // Add AI response
            messagesContainer.innerHTML += `
                <div class="flex gap-3">
                    <div class="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <i class="fas fa-robot text-indigo-600 text-sm"></i>
                    </div>
                    <div class="bg-white p-3 rounded-xl rounded-tl-none shadow-sm text-sm text-slate-700 max-w-[80%]">
                        ${ChatModule.formatResponse(response)}
                    </div>
                </div>
            `;
        } catch (error) {
            document.getElementById(loadingId)?.remove();
            messagesContainer.innerHTML += `
                <div class="flex gap-3">
                    <div class="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <i class="fas fa-exclamation-triangle text-red-500 text-sm"></i>
                    </div>
                    <div class="bg-red-50 p-3 rounded-xl rounded-tl-none shadow-sm text-sm text-red-600 max-w-[80%]">
                        Error: ${error.message || 'No se pudo conectar con el asistente'}
                    </div>
                </div>
            `;
        }

        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    },

    // Call AI API
    callAI: async (prompt) => {
        const { API_KEY, API_URL, MODEL_NAME } = ChatModule.config;

        // Build context from documents
        const docs = ChatModule.getDocuments();
        const docsSummary = docs.slice(0, 20).map(d => {
            return `- "${d.titulo}" (${d.tipo_documento || 'Doc'}): ${(d.descripcion || '').substring(0, 200)}`;
        }).join('\n');

        const systemPrompt = `Eres un asistente experto en documentos estratégicos de gestión de proyectos.
Tienes acceso a la siguiente biblioteca de ${docs.length} documentos:

${docsSummary}

Responde las consultas del usuario basándote en esta información. 
Si la pregunta no está relacionada con los documentos, indica que no tienes esa información.
Responde en español de forma concisa y profesional.`;

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

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || 'Sin respuesta';
    },

    // Escape HTML to prevent XSS
    escapeHtml: (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // Format AI response with markdown-like styling
    formatResponse: (text) => {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>')
            .replace(/- /g, '• ');
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
