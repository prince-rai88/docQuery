"""
Migration 0001 — Enable the pgvector PostgreSQL extension.

Why a separate migration?
--------------------------
The `vector` extension must exist in PostgreSQL before any VectorField column
or HNSW index can be created.  By isolating this in its own migration we can:

  1. Run it in a DB-superuser context once (or grant it via a managed-cloud
     console) without touching application tables.
  2. Trivially skip it in CI by mocking the RunSQL operation if needed.

Prerequisites
-------------
  • The PostgreSQL user must have SUPERUSER or the `pg_extension` role
    (or the extension must be pre-installed by the DBA / cloud provider).
  • Package: pip install pgvector  (already in requirements.txt)

How to apply
------------
    python manage.py migrate documents 0001
"""

from django.db import migrations


class Migration(migrations.Migration):

    initial = True

    dependencies = []  # no app dependencies; this is the very first migration

    operations = [
        migrations.RunSQL(
            # ----------------------------------------------------------------
            # Forward: enable the extension
            # ----------------------------------------------------------------
            sql="CREATE EXTENSION IF NOT EXISTS vector;",
            # ----------------------------------------------------------------
            # Reverse: drop the extension.
            # ⚠️  This will FAIL if any column of type vector still exists.
            #    Drop all VectorField columns first (migration 0002 reverse)
            #    before reversing this migration.
            # ----------------------------------------------------------------
            reverse_sql="DROP EXTENSION IF EXISTS vector;",
        ),
    ]
