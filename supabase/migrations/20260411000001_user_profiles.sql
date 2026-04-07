-- ============================================================
-- USER PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id      UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  job_title    TEXT,
  phone        TEXT,
  bio          TEXT,
  avatar_url   TEXT,
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles (user_id);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "user_profiles_select_own" ON user_profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Users can read profiles of people in same tenant
CREATE POLICY "user_profiles_select_tenant_members" ON user_profiles
  FOR SELECT TO authenticated
  USING (
    user_id IN (
      SELECT tu.user_id FROM tenant_users tu
      WHERE tu.tenant_id = ANY (public.my_tenant_ids())
    )
  );

-- Users can insert their own profile
CREATE POLICY "user_profiles_insert_own" ON user_profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own profile only
CREATE POLICY "user_profiles_update_own" ON user_profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
