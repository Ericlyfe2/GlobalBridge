-- GlobalBridge seed data
-- Idempotent: safe to re-run.
-- Run after schema.sql.

-- Forum categories
INSERT INTO forum_categories (name, slug, description, icon) VALUES
    ('Visa & Immigration', 'visa-immigration', 'Questions about visas, permits, and immigration', 'passport'),
    ('Scholarships', 'scholarships', 'Funding opportunities and applications', 'award'),
    ('Housing', 'housing', 'Finding accommodation abroad', 'home'),
    ('Career & Jobs', 'careers', 'Internships, jobs, and work permits', 'briefcase'),
    ('Cultural Integration', 'culture', 'Adapting to life in a new country', 'globe'),
    ('Banking & Finance', 'finance', 'Setting up accounts, transfers, taxes', 'dollar')
ON CONFLICT (slug) DO NOTHING;

-- Sample users (mentors + admins). Password hashes are bcrypt of "testpass123".
-- NOTE: must be inserted before success_stories (and other tables) that FK to users.id.
INSERT INTO users (id, email, password_hash, full_name, role, verification_status, country_of_origin, country_of_residence, bio, trust_score, email_verified)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'ama@globalbridge.app',     '$2b$10$pK5tW8T0js44bI.aeJin2.H8SNcEciQVW23kJwXdr2pUTxRyDQPPG', 'Ama Owusu',     'mentor',   'verified', 'Ghana',   'Canada',         '5 years in Toronto. Software engineer.', 92, true),
  ('22222222-2222-2222-2222-222222222222', 'kwame@globalbridge.app',   '$2b$10$pK5tW8T0js44bI.aeJin2.H8SNcEciQVW23kJwXdr2pUTxRyDQPPG', 'Kwame Adjei',   'mentor',   'verified', 'Ghana',   'United Kingdom', 'MSc Finance, Manchester.',                 85, true),
  ('33333333-3333-3333-3333-333333333333', 'yaa@globalbridge.app',     '$2b$10$pK5tW8T0js44bI.aeJin2.H8SNcEciQVW23kJwXdr2pUTxRyDQPPG', 'Yaa Boateng',   'mentor',   'verified', 'Ghana',   'Germany',        'PhD candidate, TU Berlin. DAAD scholar.',  88, true),
  ('44444444-4444-4444-4444-444444444444', 'admin@globalbridge.app',   '$2b$10$pK5tW8T0js44bI.aeJin2.H8SNcEciQVW23kJwXdr2pUTxRyDQPPG', 'Sarah Admin',   'admin',    'verified', NULL,      NULL,             'GlobalBridge platform admin.',             100, true),
  ('55555555-5555-5555-5555-555555555555', 'priya@globalbridge.app',   '$2b$10$pK5tW8T0js44bI.aeJin2.H8SNcEciQVW23kJwXdr2pUTxRyDQPPG', 'Priya Sharma',  'mentor',   'verified', 'India',   'United Kingdom', 'Data scientist at Revolut.',               80, true),
  ('66666666-6666-6666-6666-666666666666', 'tunde@globalbridge.app',   '$2b$10$pK5tW8T0js44bI.aeJin2.H8SNcEciQVW23kJwXdr2pUTxRyDQPPG', 'Tunde Adebayo', 'mentor',   'verified', 'Nigeria', 'Canada',         'Software engineer at Shopify, Toronto.',   91, true)
ON CONFLICT (id) DO NOTHING;

-- Success stories
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

-- Opportunities
INSERT INTO opportunities (posted_by, type, title, description, country, institution, field_of_study, funding_amount, currency, eligibility, application_url, deadline, sponsors_visa, is_verified, view_count)
VALUES
  ('44444444-4444-4444-4444-444444444444', 'scholarship', 'MasterCard Foundation Scholars Program 2026',
    'Comprehensive scholarship for academically talented African students with leadership potential and financial need. Covers tuition, accommodation, books, travel, and mentorship.',
    'Multi', 'MasterCard Foundation', 'All', 50000, 'USD',
    'African citizens, GPA 3.5+, demonstrated leadership, financial need, under 29.',
    'https://mastercardfdn.org/scholars/', '2026-09-15', false, true, 1402),

  ('44444444-4444-4444-4444-444444444444', 'scholarship', 'Chevening Scholarships 2026',
    'UK government fully funded master''s degree scholarship for outstanding students from around the world.',
    'United Kingdom', 'UK Government', 'All', 18000, 'GBP',
    'Bachelor''s degree, 2+ years work experience, leadership potential.',
    'https://www.chevening.org/scholarship/', '2026-11-01', false, true, 2104),

  ('44444444-4444-4444-4444-444444444444', 'scholarship', 'DAAD WISE Scholarship',
    'Working Internships in Science and Engineering for undergraduate students. Includes monthly stipend, insurance, and travel.',
    'Germany', 'DAAD', 'STEM', 934, 'EUR',
    'STEM undergraduate, GPA 3.0+, English or German B2.',
    'https://www.daad.de/wise/', '2026-12-15', false, true, 612),

  ('44444444-4444-4444-4444-444444444444', 'scholarship', 'Fulbright Foreign Student Program',
    'Funding for foreign students to pursue a master''s or PhD in the United States. Covers tuition, living expenses, health insurance.',
    'United States', 'U.S. State Department', 'All', 50000, 'USD',
    'Bachelor''s degree, GPA 3.5+, English proficiency, demonstrated leadership.',
    'https://foreign.fulbrightonline.org/', '2026-10-15', false, true, 1820),

  ('44444444-4444-4444-4444-444444444444', 'job', 'Frontend Engineer Intern at TechCo',
    'Build the consumer-facing dashboard used by 200k+ users. Ship to production from week one. Visa sponsorship available.',
    'United Kingdom', 'TechCo Ltd', 'Computer Science', 32000, 'GBP',
    'TypeScript + React. Strong fundamentals. Currently enrolled in CS degree.',
    'https://techco.example/careers/frontend-intern', '2026-06-30', true, true, 487),

  ('44444444-4444-4444-4444-444444444444', 'work_study', 'Research Assistant — University of Toronto AI Lab',
    'Part-time research role for graduate students. Work alongside leading ML researchers on alignment + safety problems.',
    'Canada', 'University of Toronto', 'Computer Science', 22, 'CAD',
    'Currently enrolled in a Master''s or PhD in CS/AI. Strong Python + PyTorch.',
    'https://web.cs.toronto.edu/', '2026-08-30', false, true, 312),

  ('44444444-4444-4444-4444-444444444444', 'exchange', 'Erasmus Mundus Joint Masters',
    'Two-year joint master''s programme between 3+ European universities. Mobility built into programme.',
    'EU', 'EU Commission', 'All', 25000, 'EUR',
    'Bachelor''s degree. Apply per programme.',
    'https://erasmus-plus.ec.europa.eu/', '2026-12-31', false, true, 924)
ON CONFLICT DO NOTHING;

-- Housing listings
INSERT INTO housing_listings (landlord_id, title, description, city, country, address, rent_amount, currency, bedrooms, bathrooms, furnished, near_university, photos, status, rating)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Cozy studio near University of Toronto',
   'Bright furnished studio on the 8th floor with city views. Quiet building. Utilities (heat, water, internet) included.',
   'Toronto', 'Canada', '123 College St, Toronto, ON',
   1300, 'CAD', 0, 1, true, 'University of Toronto',
   ARRAY['https://res.cloudinary.com/demo/image/upload/studio1.jpg', 'https://res.cloudinary.com/demo/image/upload/studio2.jpg'],
   'active', 4.8),

  ('22222222-2222-2222-2222-222222222222', 'Modern flat near University of Manchester',
   'Recently renovated 2-bed flat. Walking distance to campus + city centre. Bills included.',
   'Manchester', 'United Kingdom', '45 Oxford Rd, Manchester',
   700, 'GBP', 2, 1, true, 'University of Manchester',
   ARRAY['https://res.cloudinary.com/demo/image/upload/manch1.jpg'],
   'active', 4.6),

  ('33333333-3333-3333-3333-333333333333', 'Shared apartment in Mitte',
   'Friendly international shared flat in Berlin Mitte. Furnished room with private bathroom. WG-friendly.',
   'Berlin', 'Germany', 'Linienstraße 12, Berlin',
   650, 'EUR', 1, 1, true, 'TU Berlin',
   ARRAY['https://res.cloudinary.com/demo/image/upload/berlin1.jpg'],
   'active', 4.9),

  ('55555555-5555-5555-5555-555555555555', 'Bright 1BR near Imperial College',
   'South Kensington 1-bedroom. 5 min to Imperial. Concierge building. Long-term tenant preferred.',
   'London', 'United Kingdom', 'Cromwell Road, London',
   1850, 'GBP', 1, 1, true, 'Imperial College London',
   ARRAY['https://res.cloudinary.com/demo/image/upload/london1.jpg'],
   'active', 4.7),

  ('66666666-6666-6666-6666-666666666666', 'Loft near Toronto Metropolitan',
   'Industrial-style loft. Open kitchen, exposed brick. 2 bedrooms suitable for sharing.',
   'Toronto', 'Canada', 'Queen St E, Toronto, ON',
   1900, 'CAD', 2, 1, true, 'Toronto Metropolitan University',
   ARRAY['https://res.cloudinary.com/demo/image/upload/loft1.jpg'],
   'active', 4.5)
ON CONFLICT DO NOTHING;

-- Scam alerts
INSERT INTO scam_alerts (reported_by, title, description, scam_type, affected_countries, upvotes, verified_by_admin)
VALUES
  ('44444444-4444-4444-4444-444444444444',
   'Fake Canadian Study Permit consultant in Lagos asking for $2,000 upfront',
   'Person calling themselves CanadaVisaPro on Instagram contacts students with offers to guarantee Canadian study permits for $2,000. IRCC does not work with private agents.',
   'visa', ARRAY['Nigeria', 'Ghana'], 87, true),

  ('44444444-4444-4444-4444-444444444444',
   'Fake luxury Manchester apartment listing — photos copied from Airbnb',
   'Listing offering £400/month luxury studio in central Manchester. Reverse image search shows the photos are from an Airbnb in Berlin.',
   'housing', ARRAY['United Kingdom'], 42, true),

  ('44444444-4444-4444-4444-444444444444',
   'Phishing email pretending to be IRCC asking for biometrics fee',
   'Email from ircc-verify@canada-gov-update.com asking applicants to reverify their biometrics fee. Real IRCC emails come from @cic.gc.ca only.',
   'phishing', ARRAY['Multi'], 34, true),

  ('44444444-4444-4444-4444-444444444444',
   'Work-from-home job paying $40/hour — money laundering mule scam',
   'WhatsApp messages offering $40/hour package re-shipping or transferring funds. These are mule schemes — you become legally liable.',
   'job', ARRAY['United States', 'Canada'], 56, true)
ON CONFLICT DO NOTHING;
