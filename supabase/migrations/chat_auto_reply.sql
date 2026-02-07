-- Create a SECURITY DEFINER function so auto-reply messages
-- can be inserted as 'admin' sender_type by regular users.
CREATE OR REPLACE FUNCTION send_auto_reply(
  p_user_id UUID,
  p_message TEXT,
  p_is_read BOOLEAN DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO chat_messages (user_id, user_name, user_email, message, sender_type, is_read)
  VALUES (p_user_id, 'Librium Support', 'support@librium.com', p_message, 'admin', p_is_read);
END;
$$;
