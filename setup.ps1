
# Script de Instalación y Configuración - GWP Consultorías
# Este script instalará dependencias, configurará la BD e iniciará el servidor.

Write-Host "🚧 Iniciando configuración del entorno GWP..." -ForegroundColor Cyan

# 1. Verificar Python
if (-not (Get-Command "python" -ErrorAction SilentlyContinue)) {
    Write-Error "Python no está instalado. Por favor instálalo desde python.org"
    exit 1
}

# 2. Instalar dependencias Python
Write-Host "`n📦 Instalando dependencias de Python..." -ForegroundColor Yellow
pip install flask flask-cors psycopg2-binary bcrypt

if ($LASTEXITCODE -ne 0) {
    Write-Error "Hubo un problema instalando las dependencias."
    exit $LASTEXITCODE
}
Write-Host "✅ Dependencias instaladas." -ForegroundColor Green

# 3. Inicializar Base de Datos
Write-Host "`n💾 Inicializando base de datos 'GOBIERNO_GESTION'..." -ForegroundColor Yellow
try {
    # Ejecutar script init_db.py
    python backend/init_db.py
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Base de datos configurada correctamente." -ForegroundColor Green
        Write-Host "   Usuarios creados: Admin, Finanzas, Legal (Pass: 123456)" -ForegroundColor Gray
    } else {
        throw "Error en init_db.py"
    }
} catch {
    Write-Error "❌ Error inicializando la base de datos. Asegúrate de que PostgreSQL esté corriendo y la base de datos 'GOBIERNO_GESTION' exista."
    Write-Host "   Puedes crearla manualmente con: CREATE DATABASE GOBIERNO_GESTION;" -ForegroundColor Gray
    exit 1
}

# 4. Mensaje Final
Write-Host "`n🚀 ¡Todo listo!" -ForegroundColor Cyan
Write-Host "---------------------------------------------------"
Write-Host "Para iniciar el servidor backend:"
Write-Host "   python backend/app1.py" -ForegroundColor Yellow
Write-Host "`nPara ver el frontend:"
Write-Host "   Abre frontend/index.html en tu navegador." -ForegroundColor Yellow
Write-Host "---------------------------------------------------"
Write-Host "Presiona cualquier tecla para salir..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
