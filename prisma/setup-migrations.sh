#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Converts the existing db-push schema to a proper Prisma migration baseline.
# Run this ONCE on a database that was set up with `prisma db push`.
#
# After this script, use:
#   npx prisma migrate dev --name <change_name>   for future schema changes
#   npx prisma migrate deploy                     to apply in production
# ─────────────────────────────────────────────────────────────────────────────
set -e

MIGRATION_NAME="0000_init"
MIGRATIONS_DIR="prisma/migrations/${MIGRATION_NAME}"

echo "Creating migration directory..."
mkdir -p "$MIGRATIONS_DIR"

echo "Generating SQL from current schema (diff from empty → schema)..."
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel ./prisma/schema.prisma \
  --script > "${MIGRATIONS_DIR}/migration.sql"

echo "Marking migration as already applied (baseline)..."
npx prisma migrate resolve --applied "$MIGRATION_NAME"

echo ""
echo "✅  Migration baseline created at ${MIGRATIONS_DIR}/migration.sql"
echo "    The migration is marked as applied — it will NOT be re-run."
echo ""
echo "    From now on, make schema changes via:"
echo "    npx prisma migrate dev --name <description>"
