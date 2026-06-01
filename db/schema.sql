-- GlobalBridge Database Schema
-- PostgreSQL 16+
-- Consolidated from schema.sql + migration_002–005

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =====================
-- USERS & AUTH
-- =====================
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN CREATE TYPE user_role AS ENUM ('student', 'mentor', 'employer', 'admin'); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_status') THEN CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected'); END IF; END $$;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL CHECK (length(password_hash) >= 60),
    full_name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'student',
    verification_status verification_status DEFAULT 'pending',
    avatar_url TEXT,
    country_of_origin VARCHAR(100),
    country_of_residence VARCHAR(100),
    bio TEXT,
    trust_score INT DEFAULT 0,
    email_verified BOOLEAN DEFAULT FALSE,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    preferred_language VARCHAR(10) DEFAULT 'en',
    token_version INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_country ON users(country_of_residence);

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
    category_id UUID REFERENCES forum_categories(id),
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

-- =====================
-- NOTIFICATIONS
-- =====================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  kind VARCHAR(40) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT,
  href TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(user_id, created_at DESC);

-- =====================
-- SAVED ITEMS & BOOKMARKS
-- =====================
CREATE TABLE IF NOT EXISTS saved_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  item_type VARCHAR(30) NOT NULL,
  item_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, item_type, item_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_items_user ON saved_items(user_id);

-- =====================
-- MENTOR BOOKINGS
-- =====================
CREATE TABLE IF NOT EXISTS mentor_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mentor_id UUID REFERENCES users(id) ON DELETE CASCADE,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  slot_date DATE NOT NULL,
  slot_time VARCHAR(10) NOT NULL,
  duration_min INT DEFAULT 30,
  goal TEXT,
  status VARCHAR(20) DEFAULT 'confirmed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_mentor ON mentor_bookings(mentor_id);
CREATE INDEX IF NOT EXISTS idx_bookings_student ON mentor_bookings(student_id);

-- =====================
-- USER DOCUMENTS
-- =====================
CREATE TABLE IF NOT EXISTS user_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  purpose VARCHAR(30) NOT NULL,
  url TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  original_name VARCHAR(255),
  mime VARCHAR(100),
  size_bytes INT,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_documents_user ON user_documents(user_id, created_at DESC);

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
    created_at TIMESTAMPTZ DEFAULT NOW()
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
-- MODERATION & REPORTS
-- =====================
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_status') THEN CREATE TYPE report_status AS ENUM ('pending', 'reviewing', 'resolved', 'dismissed'); END IF; END $$;

CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID REFERENCES users(id),
    target_type VARCHAR(50) NOT NULL,
    target_id UUID NOT NULL,
    reason VARCHAR(100) NOT NULL,
    details TEXT,
    status report_status DEFAULT 'pending',
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scam_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reported_by UUID REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    scam_type VARCHAR(100),
    affected_countries TEXT[],
    upvotes INT DEFAULT 0,
    verified_by_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
