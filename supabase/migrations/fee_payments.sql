-- ============================================
-- Fee Payments Table
-- Tracks late return fees ($1/day) and payment verification
-- ============================================

CREATE TABLE IF NOT EXISTS fee_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  loan_id UUID REFERENCES loan_requests(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  days_overdue INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'pending', 'verified', 'rejected')),
  paid_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id),
  admin_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_fee_payments_user ON fee_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_loan ON fee_payments(loan_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_status ON fee_payments(status);

-- RLS policies
ALTER TABLE fee_payments ENABLE ROW LEVEL SECURITY;

-- Users can view their own fee payments
CREATE POLICY "Users can view own fee payments"
  ON fee_payments FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own fee payments (marking as paid)
CREATE POLICY "Users can insert own fee payments"
  ON fee_payments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own fee payments (only status to pending)
CREATE POLICY "Users can update own fee payments"
  ON fee_payments FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can view all fee payments
CREATE POLICY "Admins can view all fee payments"
  ON fee_payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can update all fee payments (verify/reject)
CREATE POLICY "Admins can update all fee payments"
  ON fee_payments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_fee_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER fee_payments_updated_at
  BEFORE UPDATE ON fee_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_fee_payments_updated_at();
