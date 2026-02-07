import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { 
  FaComments, FaUsers, FaBook, FaCrown, FaHeart, FaReply, 
  FaEllipsisV, FaThumbtack, FaTrash, FaBan, FaSearch,
  FaPaperPlane, FaSmile, FaImage, FaAt, FaHashtag, FaFire,
  FaStar, FaBookOpen, FaLightbulb, FaQuoteLeft, FaGlobe,
  FaShieldAlt, FaUserShield, FaEdit, FaTimes, FaCheck,
  FaExclamationTriangle, FaInfoCircle, FaArrowDown
} from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { toast } from 'react-toastify';
import './Community.css';

// Emoji picker data
const EMOJI_LIST = ['👍', '❤️', '😂', '😮', '😢', '🔥', '📚', '⭐', '🎉', '💡', '🤔', '👏'];

// Channel definitions
const CHANNELS = [
  { id: 'general', nameKey: 'generalChannel', icon: <FaComments />, descKey: 'generalChannelDesc' },
  { id: 'recommendations', nameKey: 'recommendationsChannel', icon: <FaLightbulb />, descKey: 'recommendationsChannelDesc' },
  { id: 'reviews', nameKey: 'reviewsChannel', icon: <FaStar />, descKey: 'reviewsChannelDesc' },
  { id: 'reading-now', nameKey: 'currentlyReadingChannel', icon: <FaBookOpen />, descKey: 'currentlyReadingChannelDesc' },
  { id: 'quotes', nameKey: 'quotesChannel', icon: <FaQuoteLeft />, descKey: 'quotesChannelDesc' },
  { id: 'announcements', nameKey: 'announcementsChannel', icon: <FaShieldAlt />, descKey: 'announcementsChannelDesc', adminOnly: true },
];

const Community = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const { t } = useLanguage();
  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingChannelRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // State
  const [activeChannel, setActiveChannel] = useState('general');
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showUserList, setShowUserList] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [showPinnedMessages, setShowPinnedMessages] = useState(false);
  const [contextMenu, setContextMenu] = useState({ show: false, x: 0, y: 0, message: null });
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [showMentions, setShowMentions] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [unreadCount, setUnreadCount] = useState({});
  const [showNewMessageIndicator, setShowNewMessageIndicator] = useState(false);
  const [userProfiles, setUserProfiles] = useState({});
  const [reportModal, setReportModal] = useState({ show: false, message: null });
  const [reportReason, setReportReason] = useState('');

  const isAdmin = userRole === 'admin';

  // Scroll to bottom of messages
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    setShowNewMessageIndicator(false);
  }, []);

  // Fetch user profile - using ref to avoid infinite loops
  const userProfilesRef = useRef({});
  
  // Clear cache when user changes
  useEffect(() => {
    userProfilesRef.current = {};
    setUserProfiles({});
    setMessages([]);
    setPinnedMessages([]);
  }, [user?.id]);
  
  const fetchUserProfile = useCallback(async (userId) => {
    if (!userId) return null;
    if (userProfilesRef.current[userId]) return userProfilesRef.current[userId];

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role, username')
        .eq('id', userId)
        .single();

      if (error) throw error;

      userProfilesRef.current[userId] = data;
      setUserProfiles(prev => ({ ...prev, [userId]: data }));
      return data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }, []);

  // Initialize community_messages table if needed and fetch messages
  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('community_messages')
        .select('*')
        .eq('channel', activeChannel)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) {
        // Table might not exist yet
        if (error.code === '42P01' || error.code === 'PGRST200') {
          console.log('Community messages table does not exist yet or schema issue');
          setMessages([]);
          return;
        }
        throw error;
      }

      // Fetch profiles for all unique users in messages
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(m => m.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, role, username')
          .in('id', userIds);

        const profilesMap = {};
        profiles?.forEach(p => { profilesMap[p.id] = p; });

        // Attach profiles to messages
        const messagesWithProfiles = data.map(msg => ({
          ...msg,
          profiles: profilesMap[msg.user_id] || null
        }));

        setMessages(messagesWithProfiles);
        
        // Update profiles cache
        setUserProfiles(prev => ({ ...prev, ...profilesMap }));
      } else {
        setMessages([]);
      }
      
      // Fetch pinned messages
      const { data: pinned } = await supabase
        .from('community_messages')
        .select('*')
        .eq('channel', activeChannel)
        .eq('is_pinned', true)
        .order('created_at', { ascending: false });

      if (pinned && pinned.length > 0) {
        const pinnedUserIds = [...new Set(pinned.map(m => m.user_id))];
        const { data: pinnedProfiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, role')
          .in('id', pinnedUserIds);

        const pinnedProfilesMap = {};
        pinnedProfiles?.forEach(p => { pinnedProfilesMap[p.id] = p; });

        const pinnedWithProfiles = pinned.map(msg => ({
          ...msg,
          profiles: pinnedProfilesMap[msg.user_id] || null
        }));

        setPinnedMessages(pinnedWithProfiles);
      } else {
        setPinnedMessages([]);
      }

      // Small delay then scroll
      setTimeout(() => scrollToBottom(false), 100);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error(t('failedLoadMessages'));
    } finally {
      setLoading(false);
    }
  }, [activeChannel, scrollToBottom]);

  // Subscribe to real-time updates
  useEffect(() => {
    fetchMessages();

    // Real-time subscription
    const subscription = supabase
      .channel(`community_${activeChannel}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'community_messages',
        filter: `channel=eq.${activeChannel}`
      }, async (payload) => {
        if (payload.eventType === 'INSERT') {
          // Skip if this message was already added optimistically (own message)
          if (payload.new.user_id === user?.id) {
            setMessages(prev => {
              const alreadyExists = prev.some(m => m.id === payload.new.id);
              if (alreadyExists) return prev;
              // Replace temp message if still present
              const tempIdx = prev.findIndex(m => String(m.id).startsWith('temp-') && m.user_id === user.id);
              if (tempIdx !== -1) return prev; // Already handled by sendMessage
              return prev;
            });
            return;
          }
          // Fetch the profile for the new message from another user
          const profile = await fetchUserProfile(payload.new.user_id);
          const newMsg = { ...payload.new, profiles: profile };
          
          setMessages(prev => [...prev, newMsg]);
          
          // Show new message indicator if not at bottom
          const container = messagesEndRef.current?.parentElement;
          if (container) {
            const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 100;
            if (!isAtBottom && payload.new.user_id !== user?.id) {
              setShowNewMessageIndicator(true);
            } else {
              scrollToBottom();
            }
          }
        } else if (payload.eventType === 'UPDATE') {
          setMessages(prev => prev.map(msg => 
            msg.id === payload.new.id ? { ...msg, ...payload.new } : msg
          ));
          if (payload.new.is_pinned) {
            const profile = await fetchUserProfile(payload.new.user_id);
            setPinnedMessages(prev => {
              const exists = prev.find(m => m.id === payload.new.id);
              if (exists) return prev;
              return [{ ...payload.new, profiles: profile }, ...prev];
            });
          } else {
            setPinnedMessages(prev => prev.filter(m => m.id !== payload.new.id));
          }
        } else if (payload.eventType === 'DELETE') {
          setMessages(prev => prev.filter(msg => msg.id !== payload.old.id));
          setPinnedMessages(prev => prev.filter(m => m.id !== payload.old.id));
        }
      })
      .subscribe();

    // Presence for online users
    const presenceChannel = supabase.channel('online_users');
    
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const users = Object.values(state).flat();
        setOnlineUsers(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && user) {
          const profile = await fetchUserProfile(user.id);
          const displayName = profile?.username
            ? `@${profile.username}`
            : (profile
              ? (`${profile.first_name || ''} ${profile.last_name || ''}`.trim() || user.email?.split('@')[0] || 'A Member')
              : (user.email?.split('@')[0] || 'A Member'));
          await presenceChannel.track({
            user_id: user.id,
            name: displayName,
            role: profile?.role || 'user',
            online_at: new Date().toISOString(),
          });
        }
      });

    // Typing broadcast channel
    const typingChannel = supabase.channel(`typing_${activeChannel}`);
    
    typingChannel
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.user_id === user?.id) return;
        setTypingUsers(prev => {
          const exists = prev.find(u => u === payload.name);
          if (exists) return prev;
          return [...prev, payload.name];
        });
        // Remove after 3 seconds
        setTimeout(() => {
          setTypingUsers(prev => prev.filter(u => u !== payload.name));
        }, 3000);
      })
      .on('broadcast', { event: 'stop_typing' }, ({ payload }) => {
        setTypingUsers(prev => prev.filter(u => u !== payload.name));
      })
      .subscribe();

    // Store channel ref for sending typing events
    typingChannelRef.current = typingChannel;

    return () => {
      subscription.unsubscribe();
      presenceChannel.unsubscribe();
      typingChannel.unsubscribe();
      typingChannelRef.current = null;
    };
  }, [activeChannel, user, fetchMessages, fetchUserProfile, scrollToBottom]);

  // Send message
  const sendMessage = async (e) => {
    e?.preventDefault();
    
    const trimmedMessage = newMessage.trim();
    
    // Input validation
    if (!trimmedMessage || sending) return;
    
    // Message length limits
    const MAX_MESSAGE_LENGTH = 2000;
    const MIN_MESSAGE_LENGTH = 1;
    
    if (trimmedMessage.length < MIN_MESSAGE_LENGTH) {
      toast.error(t('messageTooShort'));
      return;
    }
    
    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      toast.error(t('messageTooLong').replace('{max}', MAX_MESSAGE_LENGTH));
      return;
    }
    
    const channel = CHANNELS.find(c => c.id === activeChannel);
    if (channel?.adminOnly && !isAdmin) {
      toast.error(t('adminOnlyChannel'));
      return;
    }

    setSending(true);
    
    try {
      // Get the current user's profile for optimistic insert
      const currentProfile = userProfilesRef.current[user.id] || await fetchUserProfile(user.id);

      const messageData = {
        user_id: user.id,
        channel: activeChannel,
        content: trimmedMessage,
        reply_to: replyingTo?.id || null,
        reactions: {},
        is_pinned: false,
        is_edited: false,
      };

      // Optimistic insert — display message immediately with the user's profile
      const optimisticId = `temp-${Date.now()}`;
      const optimisticMsg = {
        ...messageData,
        id: optimisticId,
        created_at: new Date().toISOString(),
        profiles: currentProfile,
      };
      setMessages(prev => [...prev, optimisticMsg]);
      scrollToBottom();

      const { data: inserted, error } = await supabase
        .from('community_messages')
        .insert(messageData)
        .select()
        .single();

      if (error) {
        // Remove optimistic message on failure
        setMessages(prev => prev.filter(m => m.id !== optimisticId));
        throw error;
      }

      // Replace optimistic message with the real one (keep profile)
      setMessages(prev => prev.map(m =>
        m.id === optimisticId ? { ...inserted, profiles: currentProfile } : m
      ));

      setNewMessage('');
      setReplyingTo(null);
      messageInputRef.current?.focus();

      // Stop typing broadcast
      if (typingChannelRef.current && user) {
        const profile = userProfilesRef.current[user.id];
        const name = profile?.username || (`${profile?.first_name || ''} ${profile?.last_name || ''}`.trim()) || user.email?.split('@')[0] || 'Someone';
        typingChannelRef.current.send({
          type: 'broadcast',
          event: 'stop_typing',
          payload: { user_id: user.id, name }
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error(t('failedSendCommunity'));
    } finally {
      setSending(false);
    }
  };

  // Edit message
  const handleEditMessage = async () => {
    const trimmedMessage = newMessage.trim();
    
    if (!editingMessage || !trimmedMessage) return;
    
    // Apply same validation
    const MAX_MESSAGE_LENGTH = 2000;
    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      toast.error(t('messageTooLong').replace('{max}', MAX_MESSAGE_LENGTH));
      return;
    }

    try {
      const { error } = await supabase
        .from('community_messages')
        .update({ 
          content: trimmedMessage,
          is_edited: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingMessage.id)
        .eq('user_id', user.id);

      if (error) throw error;

      setEditingMessage(null);
      setNewMessage('');
      toast.success(t('messageEdited'));
    } catch (error) {
      console.error('Error editing message:', error);
      toast.error(t('failedEditMessage'));
    }
  };

  // Delete message
  const handleDeleteMessage = async (message) => {
    if (!isAdmin && message.user_id !== user.id) return;

    try {
      const { error } = await supabase
        .from('community_messages')
        .delete()
        .eq('id', message.id);

      if (error) throw error;
      toast.success(t('messageDeleted'));
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error(t('failedDeleteMessage'));
    }
    setContextMenu({ show: false, x: 0, y: 0, message: null });
  };

  // Pin/Unpin message (admin only)
  const handlePinMessage = async (message) => {
    if (!isAdmin) return;

    try {
      const { error } = await supabase
        .from('community_messages')
        .update({ is_pinned: !message.is_pinned })
        .eq('id', message.id);

      if (error) throw error;
      toast.success(message.is_pinned ? t('messageUnpinned') : t('messagePinned'));
    } catch (error) {
      console.error('Error pinning message:', error);
      toast.error(t('failedPinMessage'));
    }
    setContextMenu({ show: false, x: 0, y: 0, message: null });
  };

  // Add reaction
  const handleReaction = async (message, emoji) => {
    try {
      const reactions = message.reactions || {};
      const userReactions = reactions[emoji] || [];
      
      let newReactions;
      if (userReactions.includes(user.id)) {
        // Remove reaction
        newReactions = {
          ...reactions,
          [emoji]: userReactions.filter(id => id !== user.id)
        };
        // Clean up empty arrays
        if (newReactions[emoji].length === 0) {
          delete newReactions[emoji];
        }
      } else {
        // Add reaction
        newReactions = {
          ...reactions,
          [emoji]: [...userReactions, user.id]
        };
      }

      const { error } = await supabase
        .from('community_messages')
        .update({ reactions: newReactions })
        .eq('id', message.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  // Report message
  const handleReportMessage = async () => {
    if (!reportModal.message || !reportReason.trim()) return;

    try {
      const { error } = await supabase
        .from('community_reports')
        .insert({
          message_id: reportModal.message.id,
          reporter_id: user.id,
          reason: reportReason.trim(),
          status: 'pending'
        });

      if (error) throw error;
      
      toast.success(t('thankYouReport'));
      setReportModal({ show: false, message: null });
      setReportReason('');
    } catch (error) {
      console.error('Error reporting message:', error);
      toast.error(t('failedReport'));
    }
  };

  // Context menu handler
  const handleContextMenu = (e, message) => {
    e.preventDefault();
    setContextMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      message
    });
  };

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu({ show: false, x: 0, y: 0, message: null });
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // Handle mention input
  const handleInputChange = async (e) => {
    const value = e.target.value;
    setNewMessage(value);

    // Broadcast typing indicator
    if (typingChannelRef.current && user) {
      const profile = userProfilesRef.current[user.id];
      const displayName = profile
        ? (`${profile.username || ''} || ${profile.first_name || ''} ${profile.last_name || ''}`.trim())
        : (user.email?.split('@')[0] || 'Someone');
      const name = profile?.username || (`${profile?.first_name || ''} ${profile?.last_name || ''}`.trim()) || user.email?.split('@')[0] || 'Someone';
      
      typingChannelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { user_id: user.id, name }
      });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        typingChannelRef.current?.send({
          type: 'broadcast',
          event: 'stop_typing',
          payload: { user_id: user.id, name }
        });
      }, 3000);
    }

    // Check for @ mentions
    const lastAtIndex = value.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const searchTerm = value.slice(lastAtIndex + 1).toLowerCase();
      if (searchTerm.length > 0 && !searchTerm.includes(' ')) {
        // Search for users
        const { data } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`)
          .limit(5);

        if (data?.length) {
          setMentionSuggestions(data);
          setShowMentions(true);
        } else {
          setShowMentions(false);
        }
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  // Insert mention
  const insertMention = (profile) => {
    const lastAtIndex = newMessage.lastIndexOf('@');
    const beforeAt = newMessage.slice(0, lastAtIndex);
    const name = `${profile.first_name} ${profile.last_name}`;
    setNewMessage(`${beforeAt}@${name} `);
    setShowMentions(false);
    messageInputRef.current?.focus();
  };

  // Format message content with mentions and links - SANITIZED for XSS prevention
  const formatMessageContent = (content) => {
    if (!content) return '';
    
    // First, escape HTML entities in the original content to prevent XSS
    const escapeHtml = (text) => {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    };
    
    let escaped = escapeHtml(content);
    
    // Handle mentions (@Name)
    let formatted = escaped.replace(/@(\w+\s?\w*)/g, '<span class="mention">@$1</span>');
    
    // Handle URLs - only allow http/https protocols
    formatted = formatted.replace(
      /(https?:\/\/[^\s<]+)/g, 
      '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
    );
    
    // Handle book titles (between ** **)
    formatted = formatted.replace(
      /\*\*(.+?)\*\*/g,
      '<span class="book-title">📖 $1</span>'
    );

    // Sanitize with DOMPurify allowing only safe tags and attributes
    return DOMPurify.sanitize(formatted, {
      ALLOWED_TAGS: ['span', 'a'],
      ALLOWED_ATTR: ['class', 'href', 'target', 'rel'],
      ALLOW_DATA_ATTR: false
    });
  };

  // Get user display name — prefer username for privacy
  const getUserDisplayName = (profile) => {
    if (!profile) return 'A Member';
    if (profile.username) return `@${profile.username}`;
    const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
    if (fullName) return fullName;
    if (profile.email) return profile.email.split('@')[0];
    return 'A Member';
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Filter messages by search
  const filteredMessages = searchQuery
    ? messages.filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  return (
    <div className="community-page">
      {/* Sidebar */}
      <aside className="community-sidebar">
        <div className="sidebar-header">
          <h2><FaUsers /> {t('community')}</h2>
          <span className="online-count">
            <span className="online-dot"></span>
            {onlineUsers.length} {t('onlineNow')}
          </span>
        </div>

        {/* Channels */}
        <div className="channels-section">
          <h3><FaHashtag /> {t('channels')}</h3>
          <ul className="channel-list">
            {CHANNELS.map(channel => (
              <li 
                key={channel.id}
                className={`channel-item ${activeChannel === channel.id ? 'active' : ''} ${channel.adminOnly ? 'admin-only' : ''}`}
                onClick={() => !channel.adminOnly || isAdmin ? setActiveChannel(channel.id) : null}
                title={t(channel.descKey)}
              >
                <span className="channel-icon">{channel.icon}</span>
                <span className="channel-name">{t(channel.nameKey)}</span>
                {channel.adminOnly && <FaCrown className="admin-badge" title={t('adminOnlyBadge')} />}
                {unreadCount[channel.id] > 0 && (
                  <span className="unread-badge">{unreadCount[channel.id]}</span>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Online Users */}
        <div className="online-users-section">
          <h3 onClick={() => setShowUserList(!showUserList)}>
            <FaGlobe /> {t('onlineMembers')}
            <span className="toggle-icon">{showUserList ? '−' : '+'}</span>
          </h3>
          {showUserList && (
            <ul className="online-users-list">
              {onlineUsers.map((u, i) => (
                <li key={i} className="online-user">
                  <div className="user-avatar-small">
                    {u.avatar ? (
                      <img src={u.avatar} alt={u.name} />
                    ) : (
                      <span>{u.name?.charAt(0) || '?'}</span>
                    )}
                    <span className="status-indicator online"></span>
                  </div>
                  <span className="user-name">{u.name}</span>
                  {u.role === 'admin' && (
                    <span className="role-badge admin">
                      <FaShieldAlt /> {t('adminRole')}
                    </span>
                  )}
                </li>
              ))}
              {onlineUsers.length === 0 && (
                <li className="no-users">{t('noOneOnline')}</li>
              )}
            </ul>
          )}
        </div>

        {/* Community Guidelines */}
        <div className="community-guidelines">
          <h4><FaInfoCircle /> {t('communityGuidelines')}</h4>
          <ul>
            <li>{t('beRespectful')}</li>
            <li>{t('noSpoilers')}</li>
            <li>{t('stayOnTopic')}</li>
            <li>{t('haveFun')}</li>
          </ul>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="community-main">
        {/* Channel Header */}
        <header className="channel-header">
          <div className="channel-info">
            <h2>
              {CHANNELS.find(c => c.id === activeChannel)?.icon}
              {t(CHANNELS.find(c => c.id === activeChannel)?.nameKey)}
            </h2>
            <p>{t(CHANNELS.find(c => c.id === activeChannel)?.descKey)}</p>
          </div>
          <div className="channel-actions">
            {pinnedMessages.length > 0 && (
              <button 
                className={`action-btn ${showPinnedMessages ? 'active' : ''}`}
                onClick={() => setShowPinnedMessages(!showPinnedMessages)}
                title={t('pinnedMessagesTitle')}
              >
                <FaThumbtack />
                <span className="badge">{pinnedMessages.length}</span>
              </button>
            )}
            <button 
              className={`action-btn ${showSearch ? 'active' : ''}`}
              onClick={() => setShowSearch(!showSearch)}
              title={t('searchMessagesTitle')}
            >
              <FaSearch />
            </button>
          </div>
        </header>

        {/* Search Bar */}
        {showSearch && (
          <div className="search-bar">
            <FaSearch />
            <input
              type="text"
              placeholder={t('searchMessages')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')}>
                <FaTimes />
              </button>
            )}
          </div>
        )}

        {/* Pinned Messages */}
        {showPinnedMessages && pinnedMessages.length > 0 && (
          <div className="pinned-messages-panel">
            <div className="panel-header">
              <h3><FaThumbtack /> {t('pinnedMessages')}</h3>
              <button onClick={() => setShowPinnedMessages(false)}><FaTimes /></button>
            </div>
            <div className="pinned-list">
              {pinnedMessages.map(msg => (
                <div key={msg.id} className="pinned-message">
                  <div className="pinned-author">
                    {getUserDisplayName(msg.profiles)}
                    {msg.profiles?.role === 'admin' && (
                      <span className="role-badge admin"><FaShieldAlt /></span>
                    )}
                  </div>
                  <p dangerouslySetInnerHTML={{ __html: formatMessageContent(msg.content) }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div className="messages-container">
          {loading ? (
            <div className="loading-messages">
              <div className="spinner"></div>
              <p>{t('loadingMessages')}</p>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="empty-messages">
              <FaComments className="empty-icon" />
              <h3>{t('noMessagesYet')}</h3>
              <p>{t('beFirstToStart')}</p>
            </div>
          ) : (
            <div className="messages-list">
              {filteredMessages.map((message, index) => {
                const prevMessage = filteredMessages[index - 1];
                const showHeader = !prevMessage || 
                  prevMessage.user_id !== message.user_id ||
                  new Date(message.created_at) - new Date(prevMessage.created_at) > 300000;

                return (
                  <div 
                    key={message.id}
                    id={`message-${message.id}`}
                    className={`message ${message.user_id === user?.id ? 'own-message' : ''} ${message.is_pinned ? 'pinned' : ''}`}
                    onContextMenu={(e) => handleContextMenu(e, message)}
                  >
                    {showHeader && (
                      <div className="message-header">
                        <div className="message-avatar">
                          <span>{getUserDisplayName(message.profiles).charAt(0)}</span>
                        </div>
                        <div className="message-meta">
                          <span className="message-author">
                            {getUserDisplayName(message.profiles)}
                            {message.profiles?.role === 'admin' && (
                              <span className="role-badge admin">
                                <FaShieldAlt /> {t('adminRole')}
                              </span>
                            )}
                          </span>
                          <span className="message-time">{formatTime(message.created_at)}</span>
                        </div>
                      </div>
                    )}
                    
                    {message.reply_to && (() => {
                      const originalMsg = messages.find(m => m.id === message.reply_to);
                      return (
                        <div 
                          className="reply-reference clickable"
                          onClick={() => {
                            const el = document.getElementById(`message-${message.reply_to}`);
                            if (el) {
                              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              el.classList.add('highlight-message');
                              setTimeout(() => el.classList.remove('highlight-message'), 2000);
                            }
                          }}
                        >
                          <FaReply />
                          <div className="reply-preview">
                            <span className="reply-author">
                              {originalMsg ? getUserDisplayName(originalMsg.profiles) : t('unknown')}
                            </span>
                            <span className="reply-text">
                              {originalMsg ? originalMsg.content.slice(0, 80) + (originalMsg.content.length > 80 ? '...' : '') : t('messageNotFound')}
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    <div className="message-content">
                      <p dangerouslySetInnerHTML={{ __html: formatMessageContent(message.content) }} />
                      {message.is_edited && <span className="edited-tag">{t('edited')}</span>}
                      {message.is_pinned && <FaThumbtack className="pin-indicator" title={t('pinned')} />}
                    </div>

                    {/* Reactions */}
                    {message.reactions && Object.keys(message.reactions).length > 0 && (
                      <div className="message-reactions">
                        {Object.entries(message.reactions).map(([emoji, users]) => (
                          users.length > 0 && (
                            <button
                              key={emoji}
                              className={`reaction ${users.includes(user?.id) ? 'active' : ''}`}
                              onClick={() => handleReaction(message, emoji)}
                            >
                              {emoji} {users.length}
                            </button>
                          )
                        ))}
                      </div>
                    )}

                    {/* Quick Actions */}
                    <div className="message-actions">
                      <button 
                        className="action-btn" 
                        onClick={() => setShowEmojiPicker(showEmojiPicker === message.id ? false : message.id)}
                        title={t('addReaction')}
                      >
                        <FaSmile />
                      </button>
                      <button 
                        className="action-btn" 
                        onClick={() => {
                          setReplyingTo(message);
                          messageInputRef.current?.focus();
                        }}
                        title={t('reply')}
                      >
                        <FaReply />
                      </button>
                      <button className="action-btn" title={t('moreOptions')}>
                        <FaEllipsisV />
                      </button>
                    </div>

                    {/* Emoji Picker */}
                    {showEmojiPicker === message.id && (
                      <div className="emoji-picker">
                        {EMOJI_LIST.map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => {
                              handleReaction(message, emoji);
                              setShowEmojiPicker(false);
                            }}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* New Message Indicator */}
          {showNewMessageIndicator && (
            <button className="new-message-indicator" onClick={() => scrollToBottom()}>
              <FaArrowDown /> {t('newMessages')}
            </button>
          )}
        </div>

        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <div className="typing-indicator">
            <span className="typing-dots">
              <span></span><span></span><span></span>
            </span>
            {typingUsers.slice(0, 3).join(', ')} {typingUsers.length === 1 ? t('isTyping') : t('areTyping')}...
          </div>
        )}

        {/* Reply Preview */}
        {replyingTo && (
          <div className="reply-preview">
            <div className="reply-content">
              <FaReply />
              <span>{t('replyingToLabel')} <strong>{getUserDisplayName(replyingTo.profiles)}</strong></span>
              <p>{replyingTo.content.slice(0, 100)}...</p>
            </div>
            <button onClick={() => setReplyingTo(null)}><FaTimes /></button>
          </div>
        )}

        {/* Edit Preview */}
        {editingMessage && (
          <div className="edit-preview">
            <div className="edit-content">
              <FaEdit />
              <span>{t('editingMessage')}</span>
            </div>
            <button onClick={() => {
              setEditingMessage(null);
              setNewMessage('');
            }}><FaTimes /></button>
          </div>
        )}

        {/* Mention Suggestions */}
        {showMentions && mentionSuggestions.length > 0 && (
          <div className="mention-suggestions">
            {mentionSuggestions.map(profile => (
              <button
                key={profile.id}
                className="mention-item"
                onClick={() => insertMention(profile)}
              >
                <div className="mention-avatar">
                  <span>{profile.first_name?.charAt(0) || '?'}</span>
                </div>
                <span>{profile.first_name} {profile.last_name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Message Input */}
        <form className="message-input-container" onSubmit={editingMessage ? (e) => { e.preventDefault(); handleEditMessage(); } : sendMessage}>
          <div className="input-wrapper">
            <button type="button" className="input-action" title={t('addEmoji')}>
              <FaSmile />
            </button>
            <input
              ref={messageInputRef}
              type="text"
              placeholder={
                CHANNELS.find(c => c.id === activeChannel)?.adminOnly && !isAdmin
                  ? t('adminOnlyChannel')
                  : `${t('messageChannel')}${activeChannel}...`
              }
              value={newMessage}
              onChange={handleInputChange}
              disabled={CHANNELS.find(c => c.id === activeChannel)?.adminOnly && !isAdmin}
            />
            <button type="button" className="input-action" title={t('mentionSomeone')}>
              <FaAt />
            </button>
          </div>
          <button 
            type="submit" 
            className="send-btn"
            disabled={!newMessage.trim() || sending || (CHANNELS.find(c => c.id === activeChannel)?.adminOnly && !isAdmin)}
          >
            {sending ? (
              <span className="sending-spinner"></span>
            ) : editingMessage ? (
              <FaCheck />
            ) : (
              <FaPaperPlane />
            )}
          </button>
        </form>
      </main>

      {/* Context Menu */}
      {contextMenu.show && (
        <div 
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button onClick={() => {
            setReplyingTo(contextMenu.message);
            setContextMenu({ show: false, x: 0, y: 0, message: null });
            messageInputRef.current?.focus();
          }}>
            <FaReply /> {t('reply')}
          </button>
          
          {contextMenu.message?.user_id === user?.id && (
            <button onClick={() => {
              setEditingMessage(contextMenu.message);
              setNewMessage(contextMenu.message.content);
              setContextMenu({ show: false, x: 0, y: 0, message: null });
              messageInputRef.current?.focus();
            }}>
              <FaEdit /> {t('editMessage')}
            </button>
          )}
          
          {isAdmin && (
            <button onClick={() => handlePinMessage(contextMenu.message)}>
              <FaThumbtack /> {contextMenu.message?.is_pinned ? t('unpin') : t('pin')}
            </button>
          )}
          
          {(contextMenu.message?.user_id === user?.id || isAdmin) && (
            <button className="danger" onClick={() => handleDeleteMessage(contextMenu.message)}>
              <FaTrash /> {t('deleteMessage')}
            </button>
          )}
          
          {contextMenu.message?.user_id !== user?.id && (
            <button className="danger" onClick={() => {
              setReportModal({ show: true, message: contextMenu.message });
              setContextMenu({ show: false, x: 0, y: 0, message: null });
            }}>
              <FaExclamationTriangle /> {t('report')}
            </button>
          )}
        </div>
      )}

      {/* Report Modal */}
      {reportModal.show && (
        <div className="modal-overlay" onClick={() => setReportModal({ show: false, message: null })}>
          <div className="report-modal" onClick={e => e.stopPropagation()}>
            <h3><FaExclamationTriangle /> {t('reportMessageTitle')}</h3>
            <p>{t('whyReporting')}</p>
            <textarea
              placeholder={t('describeIssue')}
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              rows={4}
            />
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => {
                setReportModal({ show: false, message: null });
                setReportReason('');
              }}>
                {t('cancel')}
              </button>
              <button 
                className="submit-btn" 
                onClick={handleReportMessage}
                disabled={!reportReason.trim()}
              >
                {t('submitReport')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Community;
