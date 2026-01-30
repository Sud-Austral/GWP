import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

def check_and_fix_columns():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("No DATABASE_URL found")
        return

    try:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        
        # Check existing columns
        cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'plan_maestro'")
        existing_cols = [row[0] for row in cur.fetchall()]
        print("Columnas existentes:", existing_cols)

        # Expected new columns and types
        new_cols = {
            "week_start": "INTEGER",
            "week_end": "INTEGER",
            "type_tag": "VARCHAR(50)",
            "dependency_code": "VARCHAR(100)",
            "evidence_requirement": "TEXT",
            "primary_role": "VARCHAR(50)",
            "co_responsibles": "TEXT"
        }

        added = []
        for col, dtype in new_cols.items():
            if col not in existing_cols:
                print(f"Agregando columna faltante: {col}")
                cur.execute(f"ALTER TABLE plan_maestro ADD COLUMN {col} {dtype}")
                added.append(col)
        
        conn.commit()
        cur.close()
        conn.close()
        
        if added:
            print(f"Se agregaron {len(added)} columnas correctamente.")
        else:
            print("Todas las columnas ya existían.")

    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    check_and_fix_columns()
