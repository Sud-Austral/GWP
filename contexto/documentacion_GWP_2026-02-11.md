# DOCUMENTACIÓN TÉCNICA: PROYECTO GWP
**Fecha:** 2026-02-11  
**Versión del Sistema:** 2.7

## 1. DATASTORE (Single Source of Truth)

### Propósito
El `DataStore` es el núcleo de gestión de estado de la aplicación. Implementa un patrón **Observer** para centralizar los datos del Plan Maestro, Hitos y Repositorio, eliminando la duplicidad de peticiones API y garantizando que todos los módulos (Gantt, Tabla, Estadísticas) muestren la misma información en tiempo real.

### Uso
Los módulos deben suscribirse a eventos para reaccionar a cambios y utilizar los métodos de refresco para actualizar los datos globales.

```javascript
// Suscribirse a cambios en el plan
DataStore.on('plan:updated', (newPlan) => {
    miModulo.render(newPlan);
});

// Forzar actualización de datos
await DataStore.refreshPlan();
```

### Métodos Principales
| Método | Descripción | Retorno |
| :--- | :--- | :--- |
| `on(event, cb)` | Registra un callback para un evento específico. | `void` |
| `off(event, cb)` | Elimina una suscripción existente. | `void` |
| `refreshPlan()` | Obtiene datos frescos del servidor y emite `plan:updated`. | `Promise<Array>` |
| `refreshAll()` | Refresca Plan e Hitos en paralelo. | `Promise<Object>` |
| `findPlanItem(id)` | Busca una actividad específica por ID en el estado local. | `Object/null` |

---

## 2. MODULOS DE VISTA (Pattern Modular)

### Propósito
Cada sección de la aplicación (Gantt, Plan, Stats) está encapsulada en un objeto global (ej: `GanttModule`). Estos módulos gestionan su propia lógica de renderizado y eventos del DOM, delegando la obtención de datos al `DataStore`.

### Estructura Típica
1. **`init()`**: Configuración inicial, renderbreadcrumbs y primera carga de datos.
2. **`render()`**: Generación de HTML dinámico basado en el estado actual.
3. **`setupEvents()`**: Asignación de listeners de usuario (botones, formularios).
4. **`_onPlanUpdated()`**: Callback de reacción ante cambios en el `DataStore`.

---

## 3. UTILS (Helper Library)

### Propósito
Proporciona utilidades transversales para el manejo del DOM, formateo de datos y componentes visuales comunes.

### Funciones Críticas
#### `formatDate(dateString)`
Convierte strings de fecha a formato `DD/MM/YYYY`. Posee protección contra desfases de zona horaria mediante parsing manual de strings ISO.
- **Parámetro:** `String` (ISO o timestamp).
- **Retorno:** `String` formateado.

#### `setupCascadingFilters(config)`
Implementa lógica de filtros interconectados. Al seleccionar una opción en un filtro, las opciones de los demás se actualizan automáticamente según la disponibilidad de datos.
- **Config:** 
  - `data`: Array de objetos a filtrar.
  - `filters`: Lista de objetos `{id: elementId, key: dataProperty}`.
  - `onFilter`: Callback que recibe el array filtrado.

---

## 4. CONSIDERACIONES TÉCNICAS

- **Vanilla JS:** El proyecto no utiliza frameworks (React/Vue). La manipulación del DOM se realiza directamente mediante `document.createElement` o `innerHTML`.
- **Gestión de Eventos:** Para evitar la duplicidad de listeners al re-renderizar, se recomienda el uso de `cloneNode(true)` para limpiar elementos antes de asignar nuevos eventos en formularios.
- **Fechas:** Siempre utilizar las funciones de `Utils` para manejar fechas. El uso directo de `new Date(isoString)` está prohibido por riesgos de desfase de día en diferentes zonas horarias.

- **Cache-Busting:** Al desplegar cambios en JS/CSS, se debe incrementar el parámetro `v=` en las etiquetas `<script>` y `<link>` del archivo `dashboard.html` (v2.7 actual).
