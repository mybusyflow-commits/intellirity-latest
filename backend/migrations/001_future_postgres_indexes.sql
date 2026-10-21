-- 001_future_postgres_indexes.sql
--
-- STATUS: NOT YET APPLIED. The app currently runs its threat and scan
-- stores in memory; there is no Postgres to optimize for those reads.
-- Apply this file once the SQLAlchemy models are wired to real tables
-- (see app/models/models.py — the table names below are taken from it).
--
-- Table names MUST match app/models/models.py:
--   ThreatDetection -> threat_detections
--   SecurityScan    -> security_scans
--   Organization    -> organizations
--   LedgerRecord    -> ledger_records
--   EscrowHold      -> escrow_holds
--
-- Hot read paths (all in-memory today, same shapes in SQL):
--   1. threats WHERE is_resolved=false ORDER BY created_at DESC   (overview, verdicts)
--   2. threats WHERE severity=? AND is_resolved=?                  (filters)
--   3. threats WHERE id=?                                          (drawer, resolve)
--   4. scans ORDER BY created_at DESC LIMIT n                      (history)
--   5. organizations WHERE slug=?                                  (create/get)
--
-- No "just in case" indexes: each one maps to a query above. Every index
-- slows writes, so only these five ship.
-- On live tables with users, run the CONCURRENTLY variants (commented)
-- so writes are never blocked; plain CREATE INDEX locks writes.

-- 1+2. Active-threat feed + severity filter (multi-column: both filters
--    always appear together; created_at covers the ORDER BY).
CREATE INDEX IF NOT EXISTS ix_threat_detections_resolved_severity_created
    ON threat_detections (is_resolved, severity, created_at DESC);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_threat_detections_resolved_severity_created
--     ON threat_detections (is_resolved, severity, created_at DESC);

-- 3. Single-threat lookup (id is expected to be the primary key; this
--    unique index only matters if it is not).
CREATE UNIQUE INDEX IF NOT EXISTS ix_threat_detections_id
    ON threat_detections (id);
-- CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS ix_threat_detections_id
--     ON threat_detections (id);

-- 4. Scan history ordering.
CREATE INDEX IF NOT EXISTS ix_security_scans_created
    ON security_scans (created_at DESC);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_security_scans_created
--     ON security_scans (created_at DESC);

-- 5. Organization slug lookup.
CREATE UNIQUE INDEX IF NOT EXISTS ix_organizations_slug
    ON organizations (slug);
-- CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS ix_organizations_slug
--     ON organizations (slug);

-- Enable query stats for the next optimization round (needs server reload
-- of shared_preload_libraries on managed Postgres; append-only).
-- CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- ROLLBACK (reviewed undo for every statement above):
-- DROP INDEX IF EXISTS ix_threat_detections_resolved_severity_created;
-- DROP INDEX IF EXISTS ix_threat_detections_id;
-- DROP INDEX IF EXISTS ix_security_scans_created;
-- DROP INDEX IF EXISTS ix_organizations_slug;
