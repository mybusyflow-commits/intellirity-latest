-- 001_future_postgres_indexes.sql
--
-- STATUS: NOT YET APPLIED. The app currently runs on in-memory stores;
-- there is no Postgres to optimize (pg_stat_statements / EXPLAIN have no
-- tables to read). Apply this file once Postgres is provisioned (e.g. at
-- Vercel/Render deploy) and the SQLAlchemy models are migrated to real
-- tables. Until then it is documentation of intent, reviewed and reversible
-- (every statement has a matching DROP below).
--
-- Hot read paths observed in code (all in-memory today, same shapes in SQL):
--   1. threats WHERE is_resolved=false ORDER BY created_at DESC   (overview, verdicts)
--   2. threats WHERE severity=? AND is_resolved=?                  (filters)
--   3. threats WHERE id=?                                          (drawer, resolve)
--   4. scans ORDER BY created_at DESC LIMIT n                      (history)
--   5. organizations WHERE slug=?                                  (create/get)
--
-- No "just in case" indexes: each one maps to a query above. Every index
-- slows writes, so only these five ship. No unused indexes exist yet.
-- On live tables with users, run the CONCURRENTLY variants (commented)
-- so writes are never blocked; plain CREATE INDEX locks writes.

-- 1+2. Active-threat feed + severity filter (multi-column: both filters
--    always appear together; created_at covers the ORDER BY).
CREATE INDEX IF NOT EXISTS ix_threats_resolved_severity_created
    ON threats (is_resolved, severity, created_at DESC);
-- CONCURRENTLY variant for live tables:
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_threats_resolved_severity_created
--     ON threats (is_resolved, severity, created_at DESC);

-- 3. Single-threat lookup (id is expected to be the primary key; this
--    unique index only matters if it is not).
CREATE UNIQUE INDEX IF NOT EXISTS ix_threats_id
    ON threats (id);
-- CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS ix_threats_id
--     ON threats (id);

-- 4. Scan history ordering.
CREATE INDEX IF NOT EXISTS ix_scans_created
    ON scans (created_at DESC);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_scans_created
--     ON scans (created_at DESC);

-- 5. Organization slug lookup.
CREATE UNIQUE INDEX IF NOT EXISTS ix_organizations_slug
    ON organizations (slug);
-- CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS ix_organizations_slug
--     ON organizations (slug);

-- Enable query stats for the next optimization round (needs server reload
-- of shared_preload_libraries on managed Postgres; append-only).
-- CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- ROLLBACK (reviewed undo for every statement above):
-- DROP INDEX IF EXISTS ix_threats_resolved_severity_created;
-- DROP INDEX IF EXISTS ix_threats_id;
-- DROP INDEX IF EXISTS ix_scans_created;
-- DROP INDEX IF EXISTS ix_organizations_slug;
