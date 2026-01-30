-- Esquema de Base de Datos para Gestión de Consultorías (GWP)
-- Dialecto: PostgreSQL
-- Enfoque: Simplificado, sin roles, solo usuarios simples.

-- 1. Tabla de Usuarios (Simple, sin roles)
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    username VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla Principal: Plan Maestro
CREATE TABLE plan_maestro (
    id SERIAL PRIMARY KEY,
    
    activity_code VARCHAR(50),
    product_code VARCHAR(100),
    task_name TEXT NOT NULL,
    
    week_start INTEGER,
    week_end INTEGER,
    
    type_tag VARCHAR(50),
    dependency_code VARCHAR(100),
    evidence_requirement TEXT,
    
    primary_role VARCHAR(50),
    co_responsibles TEXT,
    primary_responsible VARCHAR(100),
    
    status VARCHAR(50) DEFAULT 'Pendiente',
    has_file_uploaded BOOLEAN DEFAULT FALSE,
    
    fecha_inicio DATE,
    fecha_fin DATE,
    
    -- Auditoría básica
    created_by INTEGER REFERENCES usuarios(id),
    updated_by INTEGER REFERENCES usuarios(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_plan_activity_code ON plan_maestro(activity_code);

-- 3. Tabla de Hitos
CREATE TABLE hitos (
    id SERIAL PRIMARY KEY,
    plan_maestro_id INTEGER NOT NULL REFERENCES plan_maestro(id) ON DELETE CASCADE,
    
    nombre TEXT NOT NULL,
    fecha_estimada DATE,
    fecha_real DATE,
    estado VARCHAR(50) DEFAULT 'Pendiente',
    descripcion TEXT,
    
    created_by INTEGER REFERENCES usuarios(id),
    updated_by INTEGER REFERENCES usuarios(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabla de Documentos
CREATE TABLE documentos (
    id SERIAL PRIMARY KEY,
    plan_maestro_id INTEGER NOT NULL REFERENCES plan_maestro(id) ON DELETE CASCADE,
    
    nombre_archivo VARCHAR(255) NOT NULL,
    ruta_archivo TEXT NOT NULL,
    tipo_archivo VARCHAR(50),
    tamano_bytes BIGINT,
    
    uploaded_by INTEGER REFERENCES usuarios(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Funciones de ayuda
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_usuarios_modtime BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_plan_maestro_modtime BEFORE UPDATE ON plan_maestro FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_hitos_modtime BEFORE UPDATE ON hitos FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
