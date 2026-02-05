-- ========================================
-- COMMUNITY FEATURE - Database Schema
-- Run these migrations in Supabase SQL Editor
-- ========================================

-- 1. Community Messages Table
CREATE TABLE IF NOT EXISTS community_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  channel VARCHAR(50) NOT NULL DEFAULT 'general',
  content TEXT NOT NULL,
  reply_to UUID REFERENCES community_messages(id) ON DELETE SET NULL,
  reactions JSONB DEFAULT '{}',
  is_pinned BOOLEAN DEFAULT FALSE,
  is_edited BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_community_messages_channel ON community_messages(channel);
CREATE INDEX IF NOT EXISTS idx_community_messages_user_id ON community_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_community_messages_created_at ON community_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_messages_pinned ON community_messages(is_pinned) WHERE is_pinned = TRUE;

-- 2. Community Reports Table (for moderation)
CREATE TABLE IF NOT EXISTS community_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES community_messages(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending, reviewed, resolved, dismissed
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_reports_status ON community_reports(status);
CREATE INDEX IF NOT EXISTS idx_community_reports_message_id ON community_reports(message_id);

-- 3. User Typing Status Table (optional, for real-time typing indicators)
CREATE TABLE IF NOT EXISTS community_typing (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  channel VARCHAR(50) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, channel)
);

-- 4. User Bans Table (for moderation)
CREATE TABLE IF NOT EXISTS community_bans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  banned_by UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  reason TEXT,
  expires_at TIMESTAMPTZ, -- NULL means permanent ban
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ========================================
-- ROW LEVEL SECURITY POLICIES
-- ========================================

-- Enable RLS on all tables
ALTER TABLE community_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_typing ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_bans ENABLE ROW LEVEL SECURITY;

-- Community Messages Policies
-- Everyone can read messages
CREATE POLICY "Anyone can read messages" ON community_messages
  FOR SELECT USING (true);

-- Authenticated users can insert messages (unless banned)
CREATE POLICY "Authenticated users can insert messages" ON community_messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    NOT EXISTS (
      SELECT 1 FROM community_bans 
      WHERE community_bans.user_id = auth.uid() 
      AND (expires_at IS NULL OR expires_at > NOW())
    )
  );

-- Users can update their own messages
CREATE POLICY "Users can update own messages" ON community_messages
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own messages, admins can delete any
CREATE POLICY "Users can delete own messages" ON community_messages
  FOR DELETE USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Community Reports Policies
-- Users can create reports
CREATE POLICY "Users can create reports" ON community_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Only admins can view reports
CREATE POLICY "Admins can view reports" ON community_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Only admins can update reports
CREATE POLICY "Admins can update reports" ON community_reports
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Community Typing Policies
-- Everyone can see typing status
CREATE POLICY "Anyone can see typing status" ON community_typing
  FOR SELECT USING (true);

-- Users can update their own typing status
CREATE POLICY "Users can manage own typing status" ON community_typing
  FOR ALL USING (auth.uid() = user_id);

-- Community Bans Policies
-- Only admins can manage bans
CREATE POLICY "Admins can manage bans" ON community_bans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Users can check if they're banned
CREATE POLICY "Users can check own ban status" ON community_bans
  FOR SELECT USING (auth.uid() = user_id);

-- ========================================
-- REALTIME SUBSCRIPTIONS
-- ========================================

-- Enable realtime for community_messages
ALTER PUBLICATION supabase_realtime ADD TABLE community_messages;

-- ========================================
-- HELPER FUNCTIONS
-- ========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating updated_at
CREATE TRIGGER update_community_messages_updated_at
  BEFORE UPDATE ON community_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up old typing indicators (run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_typing_indicators()
RETURNS void AS $$
BEGIN
  DELETE FROM community_typing WHERE updated_at < NOW() - INTERVAL '10 seconds';
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- ADMIN-ONLY FEATURES
-- ========================================

-- Function to allow admins to pin/unpin messages
CREATE OR REPLACE FUNCTION admin_toggle_pin(message_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_admin BOOLEAN;
  current_pin_status BOOLEAN;
BEGIN
  -- Check if user is admin
  SELECT (role = 'admin') INTO is_admin FROM profiles WHERE id = auth.uid();
  
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Only admins can pin/unpin messages';
  END IF;
  
  -- Toggle pin status
  UPDATE community_messages 
  SET is_pinned = NOT is_pinned 
  WHERE id = message_uuid
  RETURNING is_pinned INTO current_pin_status;
  
  RETURN current_pin_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to ban a user (admin only)
CREATE OR REPLACE FUNCTION admin_ban_user(
  target_user_id UUID,
  ban_reason TEXT DEFAULT NULL,
  ban_duration INTERVAL DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  -- Check if user is admin
  SELECT (role = 'admin') INTO is_admin FROM profiles WHERE id = auth.uid();
  
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Only admins can ban users';
  END IF;
  
  -- Don't allow banning other admins
  IF EXISTS (SELECT 1 FROM profiles WHERE id = target_user_id AND role = 'admin') THEN
    RAISE EXCEPTION 'Cannot ban admin users';
  END IF;
  
  -- Insert or update ban
  INSERT INTO community_bans (user_id, banned_by, reason, expires_at)
  VALUES (
    target_user_id, 
    auth.uid(), 
    ban_reason,
    CASE WHEN ban_duration IS NOT NULL THEN NOW() + ban_duration ELSE NULL END
  )
  ON CONFLICT (user_id) DO UPDATE SET
    banned_by = auth.uid(),
    reason = ban_reason,
    expires_at = CASE WHEN ban_duration IS NOT NULL THEN NOW() + ban_duration ELSE NULL END,
    created_at = NOW();
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to unban a user (admin only)
CREATE OR REPLACE FUNCTION admin_unban_user(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  -- Check if user is admin
  SELECT (role = 'admin') INTO is_admin FROM profiles WHERE id = auth.uid();
  
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Only admins can unban users';
  END IF;
  
  DELETE FROM community_bans WHERE user_id = target_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
