
import psycopg2
import bcrypt
import os

# Configuración
DB_HOST = "localhost"
DB_NAME = "GWP"
DB_USER = "postgres"
DB_PASS = "UnaCasaEnUnArbol2024"
DB_PORT = "5432"

def fix_database():
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASS,
            port=DB_PORT
        )
        cur = conn.cursor()
        
        print("🔌 Conectado a la base de datos.")

        # 4. Arreglar SPECIFICAMENTE a 'admin_general' que es el usuario con problemas
        target_user = "admin_general"
        # Generar hash valido con la libreria bcrypt actual (genera $2b$...)
        new_hash = bcrypt.hashpw("123456".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        print(f"🔑 Verificando usuario '{target_user}'...")
        
        # Verificar si existe
        cur.execute("SELECT count(*) FROM usuarios WHERE username = %s", (target_user,))
        exists = cur.fetchone()[0] > 0
        
        if exists:
            # Actualizar hash SIEMPRE para asegurar compatibilidad
            print(f"🔄 Actualizando hash inválido para '{target_user}'...")
            cur.execute("UPDATE usuarios SET password_hash = %s WHERE username = %s", (new_hash, target_user))
            print("✅ Clave actualizada a '123456'")
        else:
            print(f"🆕 Creando usuario '{target_user}'...")
            cur.execute("INSERT INTO usuarios (nombre, username, password_hash) VALUES (%s, %s, %s)", ('Administrador General', target_user, new_hash))
            print("✅ Usuario creado con clave '123456'")

        conn.commit()
        cur.close()
        conn.close()
        print("\n🚀 LISTO. Usa: Usuario='admin_general', Password='123456'")

    except Exception as e:
        print(f"\n❌ ERROR: {e}")

if __name__ == "__main__":
    fix_database()
