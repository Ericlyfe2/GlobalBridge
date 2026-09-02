-- GlobalBridge Database Schema
-- PostgreSQL 16+
-- Consolidated from schema.sql + migration_002–005

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "vector";

-- =====================
-- USERS & AUTH
-- =====================
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'student', 'mentor', 'employer'); END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') AND NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'super_admin' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')) THEN ALTER TYPE user_role ADD VALUE 'super_admin' BEFORE 'admin'; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_status') THEN CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected'); END IF; END $$;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Firebase UID for users authenticated via Firebase Auth (identity bridge).
    -- Postgres keeps UUID ids for all domain FKs; requireAuth resolves uid -> id.
    firebase_uid TEXT UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    -- Nullable: Firebase manages passwords; seeded demo users still carry a bcrypt hash.
    password_hash VARCHAR(255) CHECK (password_hash IS NULL OR length(password_hash) >= 60),
    full_name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'student',
    verification_status verification_status DEFAULT 'pending',
    avatar_url TEXT,
    country_of_origin VARCHAR(100),
    country_of_residence VARCHAR(100),
    bio TEXT,
    trust_score INT DEFAULT 0,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    preferred_language VARCHAR(10) DEFAULT 'en',
    token_version INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INT NOT NULL DEFAULT 0;
-- Identity bridge migration (idempotent for existing databases):
ALTER TABLE users ADD COLUMN IF NOT EXISTS firebase_uid TEXT UNIQUE;
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
-- Email verification feature removed: Firebase Auth's own emailVerified flag
-- is no longer gated on for app sessions.
ALTER TABLE users DROP COLUMN IF EXISTS email_verified;

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_users_country ON users(country_of_residence);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Mentor extended profile
CREATE TABLE IF NOT EXISTS mentor_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    expertise_areas TEXT[],
    years_abroad INT,
    languages_spoken TEXT[],
    universities_attended TEXT[],
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMPTZ,
    available_for_mentoring BOOLEAN DEFAULT TRUE
);

-- Employer extended profile
CREATE TABLE IF NOT EXISTS employer_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    company_website TEXT,
    company_size VARCHAR(50),
    industry VARCHAR(100),
    sponsors_visas BOOLEAN DEFAULT FALSE,
    visa_sponsorship_countries TEXT[]
);

CREATE INDEX IF NOT EXISTS idx_employer_profiles_sponsors ON employer_profiles(sponsors_visas);

-- =====================
-- OPPORTUNITY LISTINGS
-- =====================
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'opportunity_type') THEN CREATE TYPE opportunity_type AS ENUM ('scholarship', 'work_study', 'exchange', 'internship', 'job'); END IF; END $$;

CREATE TABLE IF NOT EXISTS opportunities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    posted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    type opportunity_type NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    country VARCHAR(100) NOT NULL,
    institution VARCHAR(255),
    field_of_study VARCHAR(255),
    funding_amount NUMERIC(12, 2),
    currency VARCHAR(10),
    eligibility TEXT,
    application_url TEXT,
    deadline DATE,
    sponsors_visa BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    view_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_opportunities_type ON opportunities(type);
CREATE INDEX IF NOT EXISTS idx_opportunities_country ON opportunities(country);
CREATE INDEX IF NOT EXISTS idx_opportunities_deadline ON opportunities(deadline);
CREATE INDEX IF NOT EXISTS idx_opportunities_search ON opportunities USING gin(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_opportunities_description_search ON opportunities USING gin(description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_opportunities_deadline_created ON opportunities(deadline ASC NULLS LAST, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_opportunities_type_country ON opportunities(type, country);
CREATE INDEX IF NOT EXISTS idx_opportunities_posted_by ON opportunities(posted_by);

-- =====================
-- HOUSING MARKETPLACE
-- =====================
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'listing_status') THEN CREATE TYPE listing_status AS ENUM ('draft', 'pending_review', 'active', 'rented', 'archived'); END IF; END $$;

CREATE TABLE IF NOT EXISTS housing_listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    landlord_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    city VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL,
    address TEXT,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    rent_amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    rent_period VARCHAR(20) DEFAULT 'month',
    bedrooms INT,
    bathrooms INT,
    furnished BOOLEAN DEFAULT FALSE,
    near_university VARCHAR(255),
    photos TEXT[],
    virtual_tour_url TEXT,
    status listing_status DEFAULT 'pending_review',
    rating NUMERIC(3, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_housing_city ON housing_listings(city, country);
CREATE INDEX IF NOT EXISTS idx_housing_rating_created ON housing_listings(rating DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_housing_rent_amount ON housing_listings(rent_amount);
CREATE INDEX IF NOT EXISTS idx_housing_currency ON housing_listings(currency);
CREATE INDEX IF NOT EXISTS idx_housing_listings_status ON housing_listings(status, city, country);
CREATE INDEX IF NOT EXISTS idx_housing_listings_landlord ON housing_listings(landlord_id);

CREATE TABLE IF NOT EXISTS roommate_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    budget_min NUMERIC(10, 2),
    budget_max NUMERIC(10, 2),
    preferred_city VARCHAR(100),
    lifestyle TEXT[],
    smoking BOOLEAN DEFAULT FALSE,
    pets BOOLEAN DEFAULT FALSE,
    looking_for_roommate BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_roommate_looking ON roommate_preferences(looking_for_roommate);

-- =====================
-- FORUMS & Q&A
-- =====================
CREATE TABLE IF NOT EXISTS forum_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    post_count INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS forum_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES forum_categories(id) ON DELETE SET NULL,
    author_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    body TEXT NOT NULL,
    tags TEXT[],
    upvotes INT DEFAULT 0,
    answer_count INT DEFAULT 0,
    is_resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forum_posts_category ON forum_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_author ON forum_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_created ON forum_posts(category_id, created_at DESC);

CREATE TABLE IF NOT EXISTS forum_replies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES forum_posts(id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    upvotes INT DEFAULT 0,
    is_accepted_answer BOOLEAN DEFAULT FALSE,
    is_verified_mentor_reply BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forum_replies_post ON forum_replies(post_id);

-- =====================
-- PRIVATE MESSAGING
-- =====================
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant_a UUID REFERENCES users(id) ON DELETE CASCADE,
    participant_b UUID REFERENCES users(id) ON DELETE CASCADE,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(participant_a, participant_b)
);

CREATE INDEX IF NOT EXISTS idx_conversations_participants ON conversations(participant_a, participant_b);

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    flagged BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(conversation_id, created_at);

-- =====================
-- SUCCESS STORIES
-- =====================
CREATE TABLE IF NOT EXISTS success_stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  origin VARCHAR(120) NOT NULL,
  origin_flag VARCHAR(4) NOT NULL,
  destination VARCHAR(120) NOT NULL,
  dest_flag VARCHAR(4) NOT NULL,
  program VARCHAR(255),
  outcome VARCHAR(120) NOT NULL,
  year VARCHAR(8),
  quote TEXT NOT NULL,
  before_text TEXT,
  after_text TEXT,
  body TEXT,
  verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_success_stories_author ON success_stories(author_id);

-- =====================
-- AI ASSISTANT
-- =====================
CREATE TABLE IF NOT EXISTS ai_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255),
    origin_country VARCHAR(100),
    destination_country VARCHAR(100),
    visa_type VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES ai_conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    sources JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS visa_checklists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    origin_country VARCHAR(100) NOT NULL,
    destination_country VARCHAR(100) NOT NULL,
    visa_type VARCHAR(100) NOT NULL,
    items JSONB NOT NULL,
    completed_items TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- RAG KNOWLEDGE BASE
-- =====================
CREATE TABLE IF NOT EXISTS knowledge_base (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL UNIQUE,
    content TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    subcategory VARCHAR(100),
    tags TEXT[],
    metadata JSONB DEFAULT '{}'::jsonb,
    source_url TEXT,
    embedding vector(1536),
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_tags ON knowledge_base USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_active ON knowledge_base(is_active);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_embedding ON knowledge_base USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- =====================
-- TRUSTED SOURCES (for opportunity discovery)
-- =====================
CREATE TABLE IF NOT EXISTS trusted_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('gov', 'university', 'embassy', 'ngo', 'company', 'other')),
    base_url TEXT NOT NULL,
    scrape_patterns TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    confidence_weight NUMERIC(3, 2) DEFAULT 1.00,
    last_checked_at TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trusted_sources_type ON trusted_sources(type);
CREATE INDEX IF NOT EXISTS idx_trusted_sources_active ON trusted_sources(is_active);

-- =====================
-- CRAWLED OPPORTUNITIES (from verified sources)
-- =====================
CREATE TABLE IF NOT EXISTS crawled_opportunities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id UUID REFERENCES trusted_sources(id) ON DELETE CASCADE,
    source_url TEXT NOT NULL UNIQUE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    opportunity_type VARCHAR(50) NOT NULL CHECK (opportunity_type IN ('scholarship', 'internship', 'fellowship', 'grant', 'exchange', 'job', 'volunteer', 'competition', 'conference', 'hackathon')),
    country VARCHAR(100),
    city VARCHAR(100),
    institution VARCHAR(255),
    field_of_study VARCHAR(255),
    funding_amount NUMERIC(12, 2),
    currency VARCHAR(10),
    funding_type VARCHAR(50) CHECK (funding_type IN ('full', 'partial', 'unspecified')),
    eligibility TEXT,
    application_url TEXT,
    deadline DATE,
    sponsors_visa BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_status verification_status DEFAULT 'pending',
    verified_at TIMESTAMPTZ,
    confidence_score NUMERIC(3, 2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'archived')),
    publication_date DATE,
    last_checked_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crawled_opps_type ON crawled_opportunities(opportunity_type);
CREATE INDEX IF NOT EXISTS idx_crawled_opps_country ON crawled_opportunities(country);
CREATE INDEX IF NOT EXISTS idx_crawled_opps_deadline ON crawled_opportunities(deadline);
CREATE INDEX IF NOT EXISTS idx_crawled_opps_verified ON crawled_opportunities(verification_status);
CREATE INDEX IF NOT EXISTS idx_crawled_opps_status ON crawled_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_crawled_opps_source ON crawled_opportunities(source_id);
CREATE INDEX IF NOT EXISTS idx_crawled_opps_search ON crawled_opportunities USING gin(title gin_trgm_ops);

-- =====================
-- AI CONVERSATION ANALYSIS
-- =====================
ALTER TABLE ai_conversations ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE ai_conversations ADD COLUMN IF NOT EXISTS message_count INT DEFAULT 0;
ALTER TABLE ai_conversations ADD COLUMN IF NOT EXISTS topics TEXT[];
ALTER TABLE ai_conversations ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- =====================
-- AI FEEDBACK & ANALYTICS
-- =====================
CREATE TABLE IF NOT EXISTS ai_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID REFERENCES ai_messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    feedback_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_feedback_message ON ai_feedback(message_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_user ON ai_feedback(user_id);

CREATE TABLE IF NOT EXISTS ai_usage_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    feature VARCHAR(100) NOT NULL,
    model VARCHAR(100),
    input_tokens INT DEFAULT 0,
    output_tokens INT DEFAULT 0,
    cache_hit BOOLEAN DEFAULT FALSE,
    response_time_ms INT,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_log_feature ON ai_usage_log(feature);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_created ON ai_usage_log(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_user ON ai_usage_log(user_id);

-- =====================
-- EMBEDDING CACHE (for frequently queried items)
-- =====================
CREATE TABLE IF NOT EXISTS embedding_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    input_hash VARCHAR(64) UNIQUE NOT NULL,
    input_text TEXT NOT NULL,
    embedding vector(1536),
    model VARCHAR(100) DEFAULT 'text-embedding-3-small',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_embedding_cache_hash ON embedding_cache(input_hash);

-- =====================
-- MODERATION & REPORTS
-- =====================
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_status') THEN CREATE TYPE report_status AS ENUM ('pending', 'reviewing', 'resolved', 'dismissed'); END IF; END $$;

CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id UUID NOT NULL,
    reason VARCHAR(100) NOT NULL,
    details TEXT,
    status report_status DEFAULT 'pending',
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scam_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reported_by UUID REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    scam_type VARCHAR(100),
    affected_countries TEXT[],
    upvotes INT DEFAULT 0,
    verified_by_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- ADMIN AUDIT LOG — records privileged admin actions for accountability
-- =====================
CREATE TABLE IF NOT EXISTS admin_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50),
    target_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_admin ON admin_audit_log(admin_id);

-- =====================
-- MISSING FOREIGN-KEY INDEXES (audit remediation)
-- =====================
CREATE INDEX IF NOT EXISTS idx_forum_replies_author ON forum_replies(author_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation ON ai_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_visa_checklists_user ON visa_checklists(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_resolver ON reports(resolved_by);
CREATE INDEX IF NOT EXISTS idx_scam_alerts_reporter ON scam_alerts(reported_by);
CREATE INDEX IF NOT EXISTS idx_forum_posts_category_id ON forum_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_notifications_kind ON notifications(kind);

-- =====================
-- NOTIFICATIONS TABLE (if not already exists)
-- =====================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    kind VARCHAR(50) NOT NULL DEFAULT 'info',
    title VARCHAR(255) NOT NULL,
    body TEXT,
    href TEXT,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- SAVED ITEMS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS saved_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    item_type VARCHAR(50) NOT NULL,
    item_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, item_type, item_id)
);

-- =====================
-- MENTOR BOOKINGS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS mentor_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mentor_id UUID REFERENCES users(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    slot_date DATE NOT NULL,
    slot_time TIME NOT NULL,
    duration_min INT DEFAULT 30,
    goal TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- USER DOCUMENTS TABLE (verification docs)
-- =====================
-- Shape corrected 2026-08-22 (GB-02, found by verify:clean-install).
--
-- This block used to declare type / file_name / mime_type / verified /
-- verified_by / verified_at — none of which any code has ever referenced —
-- while routes/uploads.ts reads and writes purpose / storage_key /
-- original_name / mime / size_bytes / status. A database provisioned from this
-- file therefore had no `purpose` column, which is not just a failed INSERT:
-- purpose is what GET /api/uploads/files/:key checks to decide whether a
-- document is product-public or private to its owner. Uploads were broken on
-- any fresh environment, access control included.
--
-- The Phase 3 drift guard compares table presence only, so it could not see
-- this. The clean-install smoke test found it on its first run.
CREATE TABLE IF NOT EXISTS user_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    -- 'avatar' | 'housing' | 'verification' | 'document'; drives access control.
    purpose VARCHAR(50) NOT NULL,
    url TEXT NOT NULL,
    storage_key TEXT NOT NULL,
    original_name VARCHAR(255),
    mime VARCHAR(100),
    size_bytes INTEGER,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bring an already-provisioned database in line without dropping anything.
ALTER TABLE user_documents ADD COLUMN IF NOT EXISTS purpose VARCHAR(50);
ALTER TABLE user_documents ADD COLUMN IF NOT EXISTS storage_key TEXT;
ALTER TABLE user_documents ADD COLUMN IF NOT EXISTS original_name VARCHAR(255);
ALTER TABLE user_documents ADD COLUMN IF NOT EXISTS mime VARCHAR(100);
ALTER TABLE user_documents ADD COLUMN IF NOT EXISTS size_bytes INTEGER;
ALTER TABLE user_documents ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';
CREATE INDEX IF NOT EXISTS idx_user_documents_storage_key ON user_documents(storage_key);

-- =====================
-- PERMISSIONS / RBAC TABLE
-- =====================
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role user_role NOT NULL,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role, resource, action)
);

-- Seed default permissions
INSERT INTO permissions (role, resource, action) VALUES
    ('super_admin', '*', '*'),
    ('admin', 'users', 'read'),
    ('admin', 'users', 'write'),
    ('admin', 'users', 'delete'),
    ('admin', 'verifications', 'read'),
    ('admin', 'verifications', 'write'),
    ('admin', 'listings', 'read'),
    ('admin', 'listings', 'write'),
    ('admin', 'reports', 'read'),
    ('admin', 'reports', 'write'),
    ('admin', 'content', 'read'),
    ('admin', 'content', 'write'),
    ('admin', 'content', 'delete'),
    ('admin', 'settings', 'read'),
    ('admin', 'settings', 'write'),
    ('admin', 'analytics', 'read'),
    ('admin', 'ai', 'read'),
    ('admin', 'ai', 'write'),
    ('admin', 'notifications', 'write')
ON CONFLICT DO NOTHING;

-- =====================
-- PLATFORM SETTINGS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS platform_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO platform_settings (key, value) VALUES
    ('platform_name', '"GlobalBridge"'),
    ('maintenance_mode', 'false'),
    ('allow_registrations', 'true'),
    ('default_language', '"en"'),
    ('require_email_verification', 'false'),
    ('max_login_attempts', '5'),
    ('session_timeout_minutes', '60'),
    ('rate_limit_requests', '300'),
    ('rate_limit_window_minutes', '15'),
    ('ai_chat_enabled', 'true'),
    ('ai_doc_check_enabled', 'true'),
    ('ai_scam_detection_enabled', 'true'),
    ('ai_translation_enabled', 'true'),
    ('ai_model', '"gemini-3.5-flash"'),
    ('ai_temperature', '0.3'),
    ('ai_escalation_threshold', '0.6'),
    ('ai_system_prompt', '"You are GlobalBridge''s immigration assistant. Always cite the official government source URL when you quote a rule. If you are not 100% sure, say so and escalate to a verified human mentor. Never give legal advice. Be concise — short sentences, numbered steps."'),
    ('contact_email', '"support@globalbridge.com"'),
    ('privacy_policy_url', '"/privacy"'),
    ('terms_of_service_url', '"/terms"')
ON CONFLICT DO NOTHING;

-- =====================
-- AUDIT TRAIL / ACTIVITY LOG
-- =====================
CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100),
    resource_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON activity_log(action);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_log_resource ON activity_log(resource, resource_id);
CREATE INDEX IF NOT EXISTS idx_user_documents_user ON user_documents(user_id);

-- =====================
-- CONSOLIDATED FROM ONE-OFF MIGRATION SCRIPTS
-- =====================
-- Everything below previously existed ONLY inside backend/src/migrate-*.ts and
-- db/migration_rag.sql, which had to be run by hand. A database provisioned from
-- this file alone was therefore missing ten tables that the application queries
-- on live request paths — Safe Space, Peer Review, Library, the contact form,
-- the newsletter and all web push returned 500 "relation does not exist".
--
-- This file is the canonical schema. It is idempotent and safe to re-run against
-- an existing database. The migrate-*.ts scripts are retained only as historical
-- record; new environments need nothing but this file.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Mentor booking timezone (was migrate-booking-timezone.ts) ───────────────
-- slot_time alone is ambiguous the moment mentor and student are in different
-- zones: "3:00 PM" has no way of saying whose 3pm it is.
ALTER TABLE mentor_bookings ADD COLUMN IF NOT EXISTS student_timezone TEXT;

-- ── Safe Space (was migrate-safe-space.ts) ─────────────────────────────────
-- user_id is kept for abuse/legal escalation only — every read endpoint omits
-- it, so nothing in the API response links a post back to an account.
CREATE TABLE IF NOT EXISTS safe_space_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    alias TEXT NOT NULL,
    alias_color TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    upvotes INT NOT NULL DEFAULT 0,
    support_count INT NOT NULL DEFAULT 0,
    flagged BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS safe_space_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES safe_space_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    alias TEXT NOT NULL,
    alias_color TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Dedup tables so one account can't inflate a post's counts by spam-clicking.
CREATE TABLE IF NOT EXISTS safe_space_upvotes (
    post_id UUID NOT NULL REFERENCES safe_space_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS safe_space_support (
    post_id UUID NOT NULL REFERENCES safe_space_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_safe_space_posts_topic ON safe_space_posts(topic);
CREATE INDEX IF NOT EXISTS idx_safe_space_replies_post ON safe_space_replies(post_id);

-- ── Peer review (was migrate-peer-review.ts) ───────────────────────────────
-- Alias-based like safe_space_posts — reviewers see the essay and a random
-- alias, never the submitter's real identity.
CREATE TABLE IF NOT EXISTS peer_review_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    alias TEXT NOT NULL,
    alias_color TEXT NOT NULL,
    doc_type TEXT NOT NULL,
    target TEXT NOT NULL,
    focus_question TEXT,
    body TEXT NOT NULL,
    reviews_needed INT NOT NULL DEFAULT 3,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS peer_review_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES peer_review_submissions(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    alias TEXT NOT NULL,
    alias_color TEXT NOT NULL,
    rubric_scores JSONB NOT NULL,
    overall_score INT NOT NULL,
    comments TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (submission_id, reviewer_id)
);

CREATE INDEX IF NOT EXISTS idx_peer_review_subs_user ON peer_review_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_peer_review_reviews_sub ON peer_review_reviews(submission_id);

-- ── Mentor-contributed library (was migrate-library.ts) ────────────────────
CREATE TABLE IF NOT EXISTS library_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contributor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    topic TEXT NOT NULL,
    duration_min INT NOT NULL,
    origin TEXT NOT NULL,
    origin_flag TEXT NOT NULL,
    destination TEXT NOT NULL,
    dest_flag TEXT NOT NULL,
    media_url TEXT NOT NULL,
    plays_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_library_items_topic ON library_items(topic);

-- ── Contact form (was migrate-contact-table.ts) ────────────────────────────
CREATE TABLE IF NOT EXISTS contact_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Newsletter (was migrate-newsletter-table.ts) ───────────────────────────
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Web push subscriptions (was db/migration_rag.sql only) ─────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);

-- Supports GET /api/ai/usage/today, which filters on user_id AND created_at.
-- The separate single-column indexes above cannot serve that pair efficiently.
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_user_created ON ai_usage_log(user_id, created_at);

-- =====================
-- PRIVACY & ROLE INTEGRITY (GB-05, GB-06)
-- =====================
-- Country of origin is sensitive on a platform for immigrants: combined with a
-- legal name and country of residence it is an identifying, targetable tuple.
-- It is private unless the user deliberately shares it.
ALTER TABLE users ADD COLUMN IF NOT EXISTS share_country_of_origin BOOLEAN NOT NULL DEFAULT FALSE;

-- Marks the one-time signup profile step as done. requireAuth self-heals a
-- minimal users row on first sight, so "does a row exist" cannot distinguish a
-- first registration from a replay — which is what let any account re-POST
-- /api/auth/register-profile to reassign its own role.
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_completed_at TIMESTAMPTZ;

-- =====================
-- MENTORSHIP: AVAILABILITY, CONFLICTS, LIFECYCLE (GB-08)
-- =====================
-- Booking accepted anything: two students could hold the same mentor at the same
-- moment, a mentor who had switched themselves off still received bookings, and
-- no endpoint could ever move a booking out of 'pending'.

-- Needed to combine an equality column (mentor_id) with a range operator in one
-- exclusion constraint.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- The live database had slot_time as VARCHAR(10) while this file declared TIME,
-- so "25:99", "99:99" and "not-time" were all stored silently rather than
-- rejected. Column-level drift the Phase 3 guard did not catch, since it only
-- compared table presence. Cast rather than recreate, so existing values survive.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'mentor_bookings' AND column_name = 'slot_time'
       AND data_type <> 'time without time zone'
  ) THEN
    ALTER TABLE mentor_bookings
      ALTER COLUMN slot_time TYPE TIME USING slot_time::time;
  END IF;
END $$;

-- Mentors declare availability in their own timezone; without it a weekday and a
-- wall-clock window are meaningless.
ALTER TABLE mentor_profiles ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC';

-- Recurring weekly windows. weekday follows Postgres EXTRACT(DOW): 0 = Sunday.
CREATE TABLE IF NOT EXISTS mentor_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mentor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT mentor_availability_range CHECK (end_time > start_time),
    UNIQUE (mentor_id, weekday, start_time)
);
CREATE INDEX IF NOT EXISTS idx_mentor_availability_mentor ON mentor_availability(mentor_id, weekday);

-- slot_date + slot_time are wall-clock in the STUDENT's timezone, which is
-- ambiguous the moment two parties are in different zones — and useless for
-- overlap detection. starts_at is the resolved instant, and is what the
-- exclusion constraint and every availability check work from.
ALTER TABLE mentor_bookings ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ;
ALTER TABLE mentor_bookings ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ;

UPDATE mentor_bookings
   SET starts_at = (slot_date + slot_time) AT TIME ZONE COALESCE(student_timezone, 'UTC')
 WHERE starts_at IS NULL;

-- ends_at is a stored column rather than an expression in the constraint below,
-- because `timestamptz + interval` is STABLE (it depends on the session
-- timezone for calendar arithmetic) and an index expression must be IMMUTABLE.
-- A trigger keeps it correct no matter who writes the row, so the invariant
-- does not depend on application code remembering to set it.
CREATE OR REPLACE FUNCTION mentor_bookings_set_ends_at() RETURNS trigger AS $fn$
BEGIN
  -- Derive the instant here too, so a caller that forgets starts_at cannot
  -- silently opt out of the overlap constraint: tstzrange(NULL, NULL) conflicts
  -- with nothing, which would disable the guarantee exactly when it matters.
  IF NEW.starts_at IS NULL THEN
    NEW.starts_at := (NEW.slot_date + NEW.slot_time)
                     AT TIME ZONE COALESCE(NEW.student_timezone, 'UTC');
  END IF;
  NEW.ends_at := NEW.starts_at + make_interval(mins => COALESCE(NEW.duration_min, 30));
  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_mentor_bookings_ends_at ON mentor_bookings;
CREATE TRIGGER trg_mentor_bookings_ends_at
  BEFORE INSERT OR UPDATE OF starts_at, duration_min, slot_date, slot_time, student_timezone
  ON mentor_bookings
  FOR EACH ROW EXECUTE FUNCTION mentor_bookings_set_ends_at();

UPDATE mentor_bookings
   SET ends_at = starts_at + make_interval(mins => COALESCE(duration_min, 30))
 WHERE ends_at IS NULL AND starts_at IS NOT NULL;

-- The constraint the audit asked for: enforced by the database, not by a
-- read-then-write in application code that two concurrent requests can both win.
-- Scoped to live bookings, so a cancelled or declined slot frees up again.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'mentor_bookings_no_overlap'
  ) THEN
    ALTER TABLE mentor_bookings ADD CONSTRAINT mentor_bookings_no_overlap
      EXCLUDE USING gist (
        mentor_id WITH =,
        tstzrange(starts_at, ends_at) WITH &&
      ) WHERE (status IN ('pending', 'confirmed'));
  END IF;
END $$;

ALTER TABLE mentor_bookings ALTER COLUMN starts_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mentor_bookings_mentor_start ON mentor_bookings(mentor_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_mentor_bookings_student ON mentor_bookings(student_id, starts_at);

-- =====================
-- TRUSTED SOURCES (GB-14)
-- =====================
-- The table existed from the beginning with a type, an is_active flag and a
-- confidence_weight, and was referenced by exactly zero lines of code — the
-- "trusted source preference" the docs describe was never implemented. It is
-- now the allow-list that decides which model-produced URLs may be shown to a
-- user as a citation at all.
ALTER TABLE trusted_sources ADD CONSTRAINT trusted_sources_base_url_key UNIQUE (base_url);

INSERT INTO trusted_sources (name, type, base_url, confidence_weight) VALUES
  ('Government of Canada',                         'gov', 'https://www.canada.ca',            1.00),
  ('Immigration, Refugees and Citizenship Canada', 'gov', 'https://ircc.canada.ca',           1.00),
  ('UK Government',                                'gov', 'https://www.gov.uk',               1.00),
  ('US Citizenship and Immigration Services',      'gov', 'https://www.uscis.gov',            1.00),
  ('US Department of State — Travel',              'gov', 'https://travel.state.gov',         1.00),
  ('Study in the States (US ICE/SEVP)',            'gov', 'https://studyinthestates.dhs.gov', 1.00),
  ('German Federal Office for Migration (BAMF)',   'gov', 'https://www.bamf.de',              1.00),
  ('German Federal Foreign Office',                'gov', 'https://www.auswaertiges-amt.de',  1.00),
  ('Make it in Germany',                           'gov', 'https://www.make-it-in-germany.com', 1.00),
  ('Australian Department of Home Affairs',        'gov', 'https://immi.homeaffairs.gov.au',  1.00),
  ('Study Australia',                              'gov', 'https://www.studyaustralia.gov.au', 1.00),
  ('Ireland Immigration Service',                  'gov', 'https://www.irishimmigration.ie',  1.00),
  ('Immigration New Zealand',                      'gov', 'https://www.immigration.govt.nz',  1.00),
  ('Netherlands IND',                              'gov', 'https://ind.nl',                   1.00),
  ('Campus France',                                'gov', 'https://www.campusfrance.org',     0.95),
  ('DAAD (German Academic Exchange Service)',      'ngo', 'https://www.daad.de',              0.95),
  ('British Council',                              'ngo', 'https://www.britishcouncil.org',   0.90),
  ('EducationUSA',                                 'gov', 'https://educationusa.state.gov',   0.95),
  ('UNHCR',                                        'ngo', 'https://www.unhcr.org',            0.90),
  ('EU Immigration Portal',                        'gov', 'https://immigration-portal.ec.europa.eu', 1.00)
ON CONFLICT (base_url) DO NOTHING;

-- =====================
-- FORUM VOTES (GB-18)
-- =====================
-- forum_posts.upvotes and forum_replies.upvotes were displayed and never
-- incremented: the up/down buttons in the thread view had no onClick and no
-- endpoint behind them. This is the missing persistence, with one row per
-- (voter, target) so a vote is idempotent and reversible rather than a counter
-- anyone can pump.
CREATE TABLE IF NOT EXISTS forum_votes (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type VARCHAR(10) NOT NULL CHECK (target_type IN ('post', 'reply')),
    target_id UUID NOT NULL,
    value SMALLINT NOT NULL CHECK (value IN (-1, 1)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, target_type, target_id)
);
CREATE INDEX IF NOT EXISTS idx_forum_votes_target ON forum_votes(target_type, target_id);
