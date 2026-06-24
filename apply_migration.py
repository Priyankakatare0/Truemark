import os
import psycopg2

db_url = "postgresql://postgres:Truemark%403%26%28%2A@db.kqophnztbmdodhebcjvy.supabase.co:5432/postgres"

print("Connecting to DB...")
try:
    conn = psycopg2.connect(db_url)
    conn.autocommit = True
    cursor = conn.cursor()

    migration_path = "backend/db/migrations/003_auth.sql"
    print(f"Reading {migration_path}...")
    with open(migration_path, "r", encoding="utf-8") as f:
        sql = f.read()

    print("Executing migration...")
    cursor.execute(sql)
    print("Migration executed successfully.")

    print("Reloading PostgREST schema cache...")
    cursor.execute("NOTIFY pgrst, 'reload schema';")
    print("Schema cache reloaded.")

except Exception as e:
    print(f"Error: {e}")
finally:
    if 'conn' in locals() and conn:
        cursor.close()
        conn.close()
