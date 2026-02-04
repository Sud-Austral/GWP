/**
 * Router.js - Access Control & Read-Only Users
 * Controls which users have read-only access to the system
 */

const Router = {
    // === READ-ONLY USERS ===
    // Add usernames/nombres here to restrict them to view-only mode
    readOnlyUsers: [
        'visita',
        // Add more usernames as needed
    ],

    // Check if current user is read-only
    isReadOnly: () => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        // Check both nombre and username for flexibility
        const isRO = Router.readOnlyUsers.includes(user.nombre) ||
            Router.readOnlyUsers.includes(user.username);
        return isRO;
    },

    // Apply read-only restrictions to the UI
    applyRestrictions: () => {
        if (!Router.isReadOnly()) return;

        // === HIDE SPECIFIC ACTION BUTTONS ===

        // 1. Hide "Nueva Actividad" type buttons in page headers
        document.querySelectorAll('.page-header .btn-primary, .header-actions .btn, .page-actions .btn').forEach(el => {
            const text = el.textContent.toLowerCase();
            if (text.includes('nuevo') || text.includes('nueva') || text.includes('crear') || text.includes('agregar')) {
                el.style.setProperty('display', 'none', 'important');
            }
        });

        // 2. Hide edit/delete icons in table action columns
        document.querySelectorAll('table tbody tr').forEach(row => {
            row.querySelectorAll('button, a').forEach(btn => {
                const onclick = btn.getAttribute('onclick') || '';
                const classes = btn.className || '';
                if (onclick.includes('edit') || onclick.includes('delete') ||
                    onclick.includes('Edit') || onclick.includes('Delete') ||
                    onclick.includes('openModal') ||
                    classes.includes('edit') || classes.includes('delete')) {
                    btn.style.setProperty('display', 'none', 'important');
                }
            });
            // Hide pencil and trash icons
            row.querySelectorAll('.fa-pencil, .fa-pencil-alt, .fa-edit, .fa-trash, .fa-trash-alt').forEach(icon => {
                const parent = icon.closest('button') || icon.closest('a') || icon;
                parent.style.setProperty('display', 'none', 'important');
            });
        });

        // 3. Hide buttons with onclick containing action keywords
        document.querySelectorAll('[onclick]').forEach(el => {
            const onclick = el.getAttribute('onclick').toLowerCase();
            const actionKeywords = ['edit(', 'delete(', 'save(', 'add(', 'create(', 'remove(', 'upload(', 'openmodal(', 'nuevo'];
            if (actionKeywords.some(kw => onclick.includes(kw))) {
                // But preserve view/details actions
                if (!onclick.includes('view') && !onclick.includes('detail') && !onclick.includes('download')) {
                    el.style.setProperty('display', 'none', 'important');
                }
            }
        });

        // 4. Hide modal submit buttons
        document.querySelectorAll('.modal button[type="submit"], .modal .btn-primary').forEach(el => {
            el.style.setProperty('display', 'none', 'important');
        });

        // 5. Disable form inputs inside modals
        document.querySelectorAll('.modal input, .modal select, .modal textarea').forEach(el => {
            el.disabled = true;
        });

        // 6. Hide floating action buttons and upload buttons
        document.querySelectorAll('.fab, #btnAddDoc, #btnUpload, #btnNewUser, #btnAddHito, #btnAddObs').forEach(el => {
            el.style.setProperty('display', 'none', 'important');
        });

        // 7. Find buttons by their text content
        document.querySelectorAll('button, .btn').forEach(btn => {
            const text = btn.textContent.trim().toLowerCase();
            const actionWords = ['guardar', 'crear', 'nuevo', 'nueva', 'agregar', 'añadir', 'eliminar', 'editar', 'subir'];
            if (actionWords.some(word => text.includes(word))) {
                btn.style.setProperty('display', 'none', 'important');
            }
        });

        // Add visual indicator
        Router.addReadOnlyBadge();
    },

    // Add a visual badge to indicate read-only mode
    addReadOnlyBadge: () => {
        if (document.getElementById('readOnlyBadge')) return;

        const badge = document.createElement('div');
        badge.id = 'readOnlyBadge';
        badge.innerHTML = `<i class="fas fa-eye"></i> Modo Consulta`;
        badge.style.cssText = `
            position: fixed;
            top: 12px;
            right: 12px;
            background: linear-gradient(135deg, #14b8a6, #0d9488);
            color: white;
            padding: 10px 20px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 600;
            z-index: 99999;
            box-shadow: 0 4px 15px rgba(20, 184, 166, 0.3);
            display: flex;
            align-items: center;
            gap: 8px;
        `;
        document.body.appendChild(badge);
    },

    // Initialize router
    init: () => {
        if (!Router.isReadOnly()) {
            console.log('✅ Usuario con permisos completos');
            return;
        }

        console.log('🔒 Activando modo solo lectura...');

        // Apply with delays to catch dynamic content
        Router.applyRestrictions();
        setTimeout(() => Router.applyRestrictions(), 300);
        setTimeout(() => Router.applyRestrictions(), 1000);
        setTimeout(() => Router.applyRestrictions(), 2000);

        // Watch for DOM changes
        const observer = new MutationObserver(() => {
            Router.applyRestrictions();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
};

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', Router.init);

// Make globally available
window.Router = Router;
