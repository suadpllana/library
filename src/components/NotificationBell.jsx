import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import './NotificationBell.css';

const NotificationBell = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Set up real-time subscription
      const subscription = subscribeToNotifications();
      return () => {
        subscription?.unsubscribe();
      };
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isOpen]);

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Fetch recent loan status changes as notifications
      const { data: loans, error } = await supabase
        .from('loan_requests')
        .select('id, book_title, status, responded_at, notes')
        .eq('user_id', user.id)
        .not('responded_at', 'is', null)
        .order('responded_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Transform loans into notifications
      const notifs = (loans || []).map(loan => ({
        id: loan.id,
        type: 'loan',
        title: getNotificationTitle(loan.status),
        message: `"${loan.book_title}" - ${getStatusMessage(loan.status, loan.notes)}`,
        timestamp: loan.responded_at,
        status: loan.status,
        read: isNotificationRead(loan.id)
      }));

      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToNotifications = () => {
    if (!user) return null;

    return supabase
      .channel('loan_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'loan_requests',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          // Add new notification when loan status changes
          if (payload.new.responded_at && payload.new.responded_at !== payload.old?.responded_at) {
            const newNotif = {
              id: payload.new.id,
              type: 'loan',
              title: getNotificationTitle(payload.new.status),
              message: `"${payload.new.book_title}" - ${getStatusMessage(payload.new.status, payload.new.notes)}`,
              timestamp: payload.new.responded_at,
              status: payload.new.status,
              read: false
            };

            setNotifications(prev => [newNotif, ...prev.slice(0, 9)]);
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      .subscribe();
  };

  const getNotificationTitle = (status) => {
    switch (status) {
      case 'approved': return '✅ Loan Approved';
      case 'rejected': return '❌ Loan Rejected';
      case 'returned': return '📥 Book Returned';
      default: return '📚 Loan Update';
    }
  };

  const getStatusMessage = (status, notes) => {
    switch (status) {
      case 'approved': return 'Your loan request has been approved! You can pick up the book.';
      case 'rejected': return notes || 'Your loan request was not approved.';
      case 'returned': return 'Book has been marked as returned.';
      default: return 'Status updated.';
    }
  };

  const isNotificationRead = (notifId) => {
    const readNotifs = JSON.parse(localStorage.getItem('readNotifications') || '[]');
    return readNotifs.includes(notifId);
  };

  const markAsRead = (notifId) => {
    const readNotifs = JSON.parse(localStorage.getItem('readNotifications') || '[]');
    if (!readNotifs.includes(notifId)) {
      readNotifs.push(notifId);
      localStorage.setItem('readNotifications', JSON.stringify(readNotifs));
      
      setNotifications(prev => 
        prev.map(n => n.id === notifId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const markAllAsRead = () => {
    const notifIds = notifications.map(n => n.id);
    const readNotifs = JSON.parse(localStorage.getItem('readNotifications') || '[]');
    const updatedReadNotifs = [...new Set([...readNotifs, ...notifIds])];
    localStorage.setItem('readNotifications', JSON.stringify(updatedReadNotifs));
    
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const handleNotificationClick = (notif) => {
    markAsRead(notif.id);
    setIsOpen(false);
    navigate('/loaned-books');
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return '✅';
      case 'rejected': return '❌';
      case 'returned': return '📥';
      default: return '📚';
    }
  };

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <button 
        className={`notification-bell ${unreadCount > 0 ? 'has-notifications' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
      >
        <span className="bell-icon">🔔</span>
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button className="mark-all-read" onClick={markAllAsRead}>
                Mark all read
              </button>
            )}
          </div>

          <div className="notification-list">
            {loading ? (
              <div className="notification-loading">
                <div className="loading-spinner"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="no-notifications">
                <span>🔔</span>
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map(notif => (
                <div 
                  key={notif.id}
                  className={`notification-item ${!notif.read ? 'unread' : ''} ${notif.status}`}
                  onClick={() => handleNotificationClick(notif)}
                >
                  <div className="notification-icon">
                    {getStatusIcon(notif.status)}
                  </div>
                  <div className="notification-content">
                    <p className="notification-title">{notif.title}</p>
                    <p className="notification-message">{notif.message}</p>
                    <span className="notification-time">{formatTime(notif.timestamp)}</span>
                  </div>
                  {!notif.read && <div className="unread-dot"></div>}
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="notification-footer">
              <button onClick={() => { setIsOpen(false); navigate('/loaned-books'); }}>
                View all loan requests
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
