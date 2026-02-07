import { supabase } from './supabase';

/**
 * Email Notification Service
 * Handles email preferences and queuing notifications for delivery.
 * Notifications are stored in Supabase and can be processed by an Edge Function or webhook.
 */

// Notification types
export const NOTIFICATION_TYPES = {
  LOAN_UPDATE: 'loan_update',
  REVIEW: 'review',
  COMMUNITY_MENTION: 'mention',
  CHAT_EXPORT: 'export',
  WISHLIST_REMINDER: 'wishlist',
  WEEKLY_DIGEST: 'digest',
};

/**
 * Fetch user's email notification preferences
 */
export async function getEmailPreferences(userId) {
  const { data, error } = await supabase
    .from('email_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code === 'PGRST116') {
    // No preferences exist yet, create defaults
    const { data: newPrefs, error: insertError } = await supabase
      .from('email_preferences')
      .insert({ user_id: userId })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create email preferences:', insertError);
      return null;
    }
    return newPrefs;
  }

  if (error) {
    console.error('Failed to fetch email preferences:', error);
    return null;
  }

  return data;
}

/**
 * Update user's email notification preferences
 */
export async function updateEmailPreferences(userId, preferences) {
  const { data, error } = await supabase
    .from('email_preferences')
    .upsert({
      user_id: userId,
      ...preferences,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) {
    console.error('Failed to update email preferences:', error);
    throw error;
  }

  return data;
}

/**
 * Queue an email notification for a user.
 * The notification is stored in the database and will be
 * processed by a Supabase Edge Function or cron job.
 */
export async function queueEmailNotification(userId, type, subject, body, metadata = {}) {
  // First check if user has this type of notification enabled
  const prefs = await getEmailPreferences(userId);
  if (!prefs) return null;

  const typeToPreference = {
    [NOTIFICATION_TYPES.LOAN_UPDATE]: 'loan_updates',
    [NOTIFICATION_TYPES.REVIEW]: 'review_notifications',
    [NOTIFICATION_TYPES.COMMUNITY_MENTION]: 'community_mentions',
    [NOTIFICATION_TYPES.CHAT_EXPORT]: 'chat_export',
    [NOTIFICATION_TYPES.WISHLIST_REMINDER]: 'wishlist_reminders',
    [NOTIFICATION_TYPES.WEEKLY_DIGEST]: 'weekly_digest',
  };

  const prefKey = typeToPreference[type];
  if (prefKey && !prefs[prefKey]) {
    // User has disabled this notification type
    return null;
  }

  const { data, error } = await supabase
    .from('email_notifications_log')
    .insert({
      user_id: userId,
      type,
      subject,
      body,
      metadata,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to queue email notification:', error);
    return null;
  }

  return data;
}

// ----- Pre-built notification templates -----

/**
 * Notify user about loan status change
 */
export async function notifyLoanUpdate(userId, bookTitle, status, notes = '') {
  const subjects = {
    approved: `Your loan request for "${bookTitle}" has been approved!`,
    rejected: `Your loan request for "${bookTitle}" was declined`,
    returned: `"${bookTitle}" has been marked as returned`,
    extended: `Your loan for "${bookTitle}" has been extended`,
  };

  const bodies = {
    approved: `Great news! Your request to borrow "${bookTitle}" has been approved. You can now pick up the book.`,
    rejected: `Unfortunately, your request for "${bookTitle}" was declined.${notes ? ` Reason: ${notes}` : ''}`,
    returned: `"${bookTitle}" has been successfully returned. Thank you!`,
    extended: `Your loan period for "${bookTitle}" has been extended by 14 days.`,
  };

  return queueEmailNotification(
    userId,
    NOTIFICATION_TYPES.LOAN_UPDATE,
    subjects[status] || `Loan update for "${bookTitle}"`,
    bodies[status] || `There's an update on your loan for "${bookTitle}".`,
    { bookTitle, status, notes }
  );
}

/**
 * Notify user about a new review on their book
 */
export async function notifyNewReview(userId, bookTitle, reviewerName, rating) {
  return queueEmailNotification(
    userId,
    NOTIFICATION_TYPES.REVIEW,
    `New ${rating}-star review on "${bookTitle}"`,
    `${reviewerName} left a ${rating}-star review on "${bookTitle}". Check it out!`,
    { bookTitle, reviewerName, rating }
  );
}

/**
 * Notify user about a community mention
 */
export async function notifyCommunityMention(userId, mentionedBy, channelName, messagePreview) {
  return queueEmailNotification(
    userId,
    NOTIFICATION_TYPES.COMMUNITY_MENTION,
    `${mentionedBy} mentioned you in #${channelName}`,
    `${mentionedBy} mentioned you in #${channelName}: "${messagePreview}"`,
    { mentionedBy, channelName, messagePreview }
  );
}

/**
 * Notify user that their chat export is ready
 */
export async function notifyChatExport(userId) {
  return queueEmailNotification(
    userId,
    NOTIFICATION_TYPES.CHAT_EXPORT,
    'Your Book AI chat has been exported',
    'Your conversation with Book AI has been exported and downloaded successfully.',
    {}
  );
}
