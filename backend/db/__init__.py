# backend/db/__init__.py
# Makes `db` a proper Python package.
# Do NOT import supabase_client here to avoid circular imports at module load time.
# Use: from db import supabase_client   or   import db.supabase_client
