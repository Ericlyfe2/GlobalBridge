-- GlobalBridge migration 002 — stories, notifications, saved items, bookings
-- Idempotent.

-- ===== Success stories =====
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

-- ===== Notifications =====
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  kind VARCHAR(40) NOT NULL,          -- message|verification|scam|opportunity|housing|job|ai
  title VARCHAR(255) NOT NULL,
  body TEXT,
  href TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);

-- ===== Saved / bookmarked items =====
CREATE TABLE IF NOT EXISTS saved_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  item_type VARCHAR(30) NOT NULL,     -- opportunity|housing|job
  item_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, item_type, item_id)
);

-- ===== Mentor bookings =====
CREATE TABLE IF NOT EXISTS mentor_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mentor_id UUID REFERENCES users(id) ON DELETE CASCADE,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  slot_date DATE NOT NULL,
  slot_time VARCHAR(10) NOT NULL,
  duration_min INT DEFAULT 30,
  goal TEXT,
  status VARCHAR(20) DEFAULT 'confirmed',  -- confirmed|cancelled|completed
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bookings_mentor ON mentor_bookings(mentor_id);
CREATE INDEX IF NOT EXISTS idx_bookings_student ON mentor_bookings(student_id);

-- ===== Seed: success stories =====
INSERT INTO success_stories (author_id, name, origin, origin_flag, destination, dest_flag, program, outcome, year, quote, before_text, after_text, body)
VALUES
 ('66666666-6666-6666-6666-666666666666', 'Amara O.', 'Lagos, Nigeria', 'ng', 'Toronto, Canada', 'ca',
  'MSc Computer Science · University of Toronto', 'Admission + visa approved', '2025',
  'The AI assistant walked me through my Canada study permit in 20 minutes. Saved me $400 on a consultant.',
  '3 visa rejection scares, 2 fake agents contacted me',
  'Permit approved in 4 weeks. Now interning at a startup.',
  'Three rejections in nine months. Two fake visa agents in my DMs. This is how I got my Canadian Study Permit using GlobalBridge.'),
 ('22222222-2222-2222-2222-222222222222', 'Kwame A.', 'Accra, Ghana', 'gh', 'Manchester, UK', 'gb',
  'MSc Finance · Alliance Manchester', 'Verified housing', '2026',
  'I found verified housing two weeks before flying out. No scams, no surprises. Met my roommate via the matching tool.',
  'Almost wired £1,200 deposit to a fake landlord on Facebook',
  '£700/month studio walking distance to campus. Roommate became my best friend.',
  'Housing was my biggest fear. The verified marketplace removed it entirely.'),
 ('33333333-3333-3333-3333-333333333333', 'Adaeze N.', 'Abuja, Nigeria', 'ng', 'Berlin, Germany', 'de',
  'B.Eng Mechanical · TU Berlin', 'Full scholarship', '2025',
  'Connected with three Ghanaian alumni from my target university before I even applied. Game changer.',
  'Could not afford private school tuition',
  'Full DAAD scholarship covering tuition + €934/month stipend.',
  'Mentors who had walked the exact path made all the difference.'),
 ('55555555-5555-5555-5555-555555555555', 'Priya S.', 'Mumbai, India', 'in', 'London, UK', 'gb',
  'MSc Data Science · Imperial', 'Visa-sponsor job', '2024',
  'Got my Tier 4 to Skilled Worker conversion at TechCo. The visa-sponsor filter showed me 40+ companies that actually sponsor.',
  'Generic job boards = 200 applications, 0 callbacks',
  '5 interviews, 2 offers, sponsorship at a Series B fintech.',
  'The sponsorship tracker turned a hopeless search into a focused one.')
ON CONFLICT DO NOTHING;
