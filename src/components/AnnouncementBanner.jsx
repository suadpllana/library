import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import './AnnouncementBanner.css';

const AnnouncementBanner = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [dismissed, setDismissed] = useState([]);

  useEffect(() => {
    if (user) {
      fetchAnnouncements();
      const channel = supabase
        .channel('user_announcements')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {
          fetchAnnouncements();
        })
        .subscribe();
      return () => supabase.removeChannel(channel);
    }
  }, [user]);

  useEffect(() => {
    // Load dismissed announcements from localStorage
    const stored = JSON.parse(localStorage.getItem('dismissed_announcements') || '[]');
    setDismissed(stored);
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('id, title, message, type, created_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      // Silently fail - announcements are non-critical
      console.error('Error fetching announcements:', error);
    }
  };

  const dismissAnnouncement = (id) => {
    const updated = [...dismissed, id];
    setDismissed(updated);
    localStorage.setItem('dismissed_announcements', JSON.stringify(updated));
  };

  const dismissAll = () => {
    const allIds = visibleAnnouncements.map(a => a.id);
    const updated = [...new Set([...dismissed, ...allIds])];
    setDismissed(updated);
    localStorage.setItem('dismissed_announcements', JSON.stringify(updated));
  };

  const visibleAnnouncements = announcements.filter(a => !dismissed.includes(a.id));

  if (visibleAnnouncements.length === 0) return null;

  const getTypeIcon = (type) => {
    switch (type) {
      case 'warning': return '⚠️';
      case 'success': return '✅';
      case 'urgent': return '🚨';
      default: return 'ℹ️';
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="announcement-banner-container">
      {visibleAnnouncements.length > 1 && (
        <button className="dismiss-all-btn" onClick={dismissAll}>
          Dismiss all
        </button>
      )}
      {visibleAnnouncements.map((ann) => (
        <div key={ann.id} className={`announcement-banner type-${ann.type}`}>
          <div className="announcement-banner-icon">{getTypeIcon(ann.type)}</div>
          <div className="announcement-banner-content">
            <strong className="announcement-banner-title">{ann.title}</strong>
            <p className="announcement-banner-message">{ann.message}</p>
            <span className="announcement-banner-time">{formatTime(ann.created_at)}</span>
          </div>
          <button 
            className="announcement-banner-close" 
            onClick={() => dismissAnnouncement(ann.id)}
            aria-label="Dismiss announcement"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

export default AnnouncementBanner;
