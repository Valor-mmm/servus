-- 0001_init.sql
-- Phase 1 foundation: baseline schema.
-- Wrangler manages its own migration tracking table (d1_migrations).
-- Application tables begin at 0002 and above.

PRAGMA foreign_keys = ON;
