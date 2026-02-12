# DOCUMENTO DE CONTEXTO DE CÓDIGO: CONTEXT_GWP_2026-02-11.md

## 📋 METADATA
- **Fecha de análisis:** 2026-02-11
- **Lenguaje principal:** JavaScript (Vanilla ES6+) + PostgreSQL
- **Tipo de proyecto:** Frontend Dashboard (SPA-like) + Backend API (Bajo control interno)
- **Criticidad:** CRÍTICA (Datos gubernamentales/estandarizados)

## 🎯 PROPÓSITO Y ALCANCE
GWP es una herramienta de despliegue estratégico orientada a garantizar el cumplimiento de plazos en consultorías complejas. Su objetivo principal es la gestión del Plan Maestro, permitiendo a los stakeholders visualizar avances en tiempo real y centralizar evidencias documentales.

El sistema resuelve la desincronización histórica entre tablas de datos y gráficos temporales mediante un flujo de estado centralizado. Se utiliza en entornos donde el incumplimiento de hitos tiene un alto impacto regulatorio o institucional.

## 🏗️ ARQUITECTURA Y ESTRUCTURA
- **Patrón arquitectónico:** Modular basado en componentes con un **SSOT (Single Source of Truth)** implementado mediante el patrón Observer (`DataStore.js`).
- **Componentes principales:**
  • `GanttModule`: El componente crítico ("North Star") para la toma de decisiones.
  • `PlanModule`: Motor CRUD y gestor de carga de evidencias.
  • `DataStore`: Orquestador de eventos que sincroniza módulos desconectados.
  • `StatsModule`: Dashboard analítico interactivo (Chart.js).
- **Flujo de datos principal:** Las mutaciones en `PlanModule` refrescan el `DataStore`, el cual emite eventos (`plan:updated`) que provocan el re-renderizado automático de la Gantt y Stats sin recarga de página.

## 🔧 STACK TECNOLÓGICO
- **Frameworks:** Ninguno (Vanilla JS nativo) para máximo rendimiento y control.
- **Visualización:** Chart.js 4.5.1.
- **Dependencias:** FontAwesome 6.4.0, Google Fonts (Outfit).
- **Backend:** API REST propia con base de datos PostgreSQL.

## 📊 CARACTERÍSTICAS OPERACIONALES
- **Volumen esperado:** Medio (entre 100 y 1,000 registros por plan).
- **SLA requerido:** Alta disponibilidad de datos para revisiones ejecutivas.
- **Requisitos de performance:** Renderizado fluido de la Gantt durante el scroll y filtrado instantáneo en cascada.
- **Requisitos de seguridad:** Control estricto de acceso y trazabilidad de cambios en hitos.

## ⚠️ RESTRICCIONES Y CONSIDERACIONES
- **Limitaciones técnicas:** Al no usar frameworks reactivos, la manipulación del DOM debe ser extremadamente eficiente para evitar lags en volúmenes de datos "B" (1,000 registros).
- **Áreas intocables:** El bus de eventos del `DataStore` y la lógica de cifrado de tokens en `app.js`.
- **Deuda técnica:** Migración incremental de módulos antiguos hacia el esquema de eventos del `DataStore`.

## 🎯 OBJETIVOS DE LA REVISIÓN
PRIORIDADES (ordenadas de mayor a menor):
1. **Escalabilidad Visual:** Optimizar el renderizado de la Gantt para manejar el techo de 1,000 registros sin degradación de UI.
2. **Precisión en Extracción (IA):** Garantizar que el asistente IA extraiga datos técnicos del repositorio con error cero.
3. **Integridad de Sincronización:** Asegurar que ningún cambio de estado en hitos quede huérfano de actualización visual.

FUERA DE ALCANCE:
- Refactorización completa o cambio de arquitectura (solo cambios incrementales/fixes).
- Modificaciones estructurales en la base de datos PostgreSQL.

## 👥 CONTEXTO DE EQUIPO
- **Nivel del equipo:** Senior / Ejecutivo (Enfoque Antigravity Professional).
- **Estándares:** Código autodocumentado, terminología técnica precisa, eliminación de verbosidad (concisión).
- **Convenciones:** Uso de cache-busting estricto (`?v=2.7`) y patrones de clonación de nodos para limpieza de listeners.

---

## 🔍 ÁREAS DE ATENCIÓN ESPECIAL

1. **Eficiencia en GanttModule:** Revisar loops de construcción de filas en la Gantt; el objetivo es mantener 60fps durante el scroll con 500+ actividades.
2. **Suscripciones al DataStore:** Verificar que los módulos se desuscriban correctamente (`off`) antes de suscribirse (`on`) para evitar fugas de memoria.
3. **Prompts de IA:** En `chat.js`, recibir que la inyección de contexto priorice campos de metadatos (tipo, fuente, fecha) para maximizar la precisión de extracción.

---
FIN DEL DOCUMENTO DE CONTEXTO
