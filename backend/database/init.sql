-- LOS Database Initialization
-- ============================================================
-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- Default Approval Matrix (7 Levels per SRS REQ-LOS-012)
-- ============================================================
-- These are created after TypeORM syncs tables via seed.ts
-- This file sets DB-level security rules

-- Prevent UPDATE/DELETE on audit_logs (immutable)
-- (Applied after tables are created by TypeORM synchronize)
-- CREATE RULE protect_audit_logs AS ON UPDATE TO audit_logs DO INSTEAD NOTHING;
-- CREATE RULE protect_audit_del  AS ON DELETE TO audit_logs DO INSTEAD NOTHING;

-- Row-level security for approval_workflows (immutable)
-- ALTER TABLE approval_workflows ENABLE ROW LEVEL SECURITY;

-- Index hints for performance
-- (TypeORM @Index decorators handle most; add composite ones here)
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_loan_app_status_level
--   ON loan_applications(status, current_level) WHERE deleted_at IS NULL;

SELECT 'LOS Database initialized' AS status;
