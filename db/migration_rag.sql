-- GlobalBridge RAG Migration
-- Adds pgvector + knowledge_base + trusted_sources + crawled_opportunities + AI analytics

CREATE EXTENSION IF NOT EXISTS "vector";

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
-- TRUSTED SOURCES
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
-- CRAWLED OPPORTUNITIES
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
-- AI CONVERSATION EXTENSIONS
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
-- EMBEDDING CACHE
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
