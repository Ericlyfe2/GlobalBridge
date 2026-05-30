-- GlobalPath migration 003 — performance indexes
-- Idempotent. Run after schema.sql + migration_002.sql.
-- Requires pg_trgm extension (already enabled in schema.sql).

-- ===== Opportunities =====

-- Trigram index on description enables ILIKE/fuzzy text search (biggest perf win)
CREATE INDEX IF NOT EXISTS idx_opportunities_description_search
  ON opportunities USING gin(description gin_trgm_ops);

-- Composite index for the common sort path (deadline ASC NULLS LAST, created_at DESC)
CREATE INDEX IF NOT EXISTS idx_opportunities_deadline_created
  ON opportunities(deadline ASC NULLS LAST, created_at DESC);

-- Composite index for filtered list queries with type + country
CREATE INDEX IF NOT EXISTS idx_opportunities_type_country
  ON opportunities(type, country);

-- ===== Housing listings =====

-- Composite index for sort path (rating DESC, created_at DESC)
CREATE INDEX IF NOT EXISTS idx_housing_rating_created
  ON housing_listings(rating DESC, created_at DESC);

-- Index on rent_amount for max_rent range filter
CREATE INDEX IF NOT EXISTS idx_housing_rent_amount
  ON housing_listings(rent_amount);

-- Index on currency for currency filter
CREATE INDEX IF NOT EXISTS idx_housing_currency
  ON housing_listings(currency);

-- ===== Roommate preferences =====

-- Index on looking_for_roommate boolean filter
CREATE INDEX IF NOT EXISTS idx_roommate_looking
  ON roommate_preferences(looking_for_roommate);
