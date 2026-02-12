# DOCUMENTACIÓN TÉCNICA: BACKEND GWP
**Fecha:** 2026-02-11  
**Tecnología:** Python (Flask) + PostgreSQL

## Propósito
El backend es una API RESTful que gestiona la persistencia de datos, la lógica de negocio y la autenticación del sistema GWP. Su arquitectura está diseñada para manejar de manera centralizada la información del Plan Maestro, el control de hitos, la carga de evidencia documental y la bitácora de observaciones.

## Arquitectura y Tecnologías
- **Framework:** Flask (Python)
- **Base de Datos:** PostgreSQL con `psycopg2` y manejador de pool de conexiones (`ThreadedConnectionPool`).
- **Autenticación:** Sistema de sesiones basado en tokens generados aleatoriamente y almacenados en memoria (`active_sessions`).
- **Seguridad:** Encriptación de contraseñas con `bcrypt`.
- **Almacenamiento:** Sistema de archivos local para los uploads (ruta `/uploads`).

## Endpoints Principales

### 1. Autenticación (`/auth`)
| Endpoint | Método | Propósito |
| :--- | :--- | :--- |
| `/auth/login` | `POST` | Valida credenciales y devuelve un token de sesión. |
| `/auth/register` | `POST` | Registra nuevos usuarios (admin). |

### 2. Plan Maestro e Hitos
| Endpoint | Método | Propósito |
| :--- | :--- | :--- |
| `/plan-maestro` | `GET` | Lista todas las actividades del plan. |
| `/plan-maestro` | `POST` | Crea una nueva actividad operativa. |
| `/plan-maestro/<id>` | `PUT` | Actualiza atributos de una actividad (fecha, estado, etc.). |
| `/hitos` | `GET` | Recupera cronograma global de hitos destacados. |
| `/hitos` | `POST` | Crea un nuevo hito asociado a una actividad. |

### 3. Gestión de Documentos y Evidencia
| Endpoint | Método | Propósito |
| :--- | :--- | :--- |
| `/upload` | `POST` | Sube archivos físicos y los vincula a una actividad del plan. |
| `/documentos` | `GET` | Listado consolidado de toda la evidencia disponible. |
| `/repositorio` | `GET` | Biblioteca estratégica de documentos (leyes, guías). |

### 4. Bitácora (Observaciones)
| Endpoint | Método | Propósito |
| :--- | :--- | :--- |
| `/plan-maestro/<id>/observaciones` | `GET` | Obtiene el historial de comentarios de una actividad. |
| `/plan-maestro/<id>/observaciones` | `POST` | Inserta un nuevo registro en la bitácora. |

## Parámetros Globales
- **Headers:** Todas las rutas protegidas requieren el header `Authorization: Bearer <token>`.
- **Formato de Datos:** Las fechas se serializan automáticamente en formato ISO (YYYY-MM-DD) para compatibilidad con el frontend.

## Consideraciones de Implementación
- **CORS:** La API tiene habilitado CORS para permitir solicitudes desde el frontend local.
- **Unique Filenames:** El sistema utiliza `uuid.uuid4()` para renombrar archivos subidos, evitando colisiones de nombres en el servidor.
- **Manejo de Fechas:** Las fechas en la base de datos se manejan como objetos `date`/`datetime` de Python, y se envían como strings via JSON usando un `CustomJSONProvider`.
