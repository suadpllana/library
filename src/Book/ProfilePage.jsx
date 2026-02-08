import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaArrowLeftLong, FaCamera, FaPen, FaFloppyDisk, FaXmark, FaBook, FaHeart, FaClock, FaStar, FaChartLine, FaTrophy, FaCalendarDays, FaCircleCheck, FaBookOpen, FaMedal, FaFire, FaBell, FaGear, FaDownload, FaTrashCan, FaShieldHalved } from "react-icons/fa6";
import { supabase } from '../lib/supabase';
import { getEmailPreferences, updateEmailPreferences } from '../lib/emailNotifications';
import { useAuth } from '../context/AuthContext';
import ConfirmDialog from '../components/ConfirmDialog';
import './ProfilePage.css';
import { useLanguage } from '../context/LanguageContext';
import translations from '../i18n/translations';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const { language } = useLanguage();
  const t = translations[language];
  const fileInputRef = useRef(null);
  const [userProfile, setUserProfile] = useState(null);
  const [wishlistBooks, setWishlistBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    username: ''
  });
  const [stats, setStats] = useState({
    totalBooks: 0,
    booksRead: 0,
    booksReading: 0,
    loansRequested: 0,
    loansApproved: 0,
    reviewsWritten: 0,
    averageRating: 0,
    collectionsCount: 0,
    readingStreak: 0
  });
  const [activeSection, setActiveSection] = useState('overview');
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [recentActivity, setRecentActivity] = useState([]);
  const [emailPrefs, setEmailPrefs] = useState(null);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState(12);
  const [exportingData, setExportingData] = useState(false);

  useEffect(() => {
    if (!authUser) {
      toast.error(t.pleaseSignIn);
      navigate('/');
      return;
    }

    const loadProfileData = async () => {
      try {
        await Promise.all([
          fetchUserProfile(),
          fetchWishlistBooks(),
          fetchUserStats(),
          fetchRecentActivity(),
          loadEmailPreferences()
        ]);
      } catch (error) {
        console.error('Error loading profile data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadProfileData();
  }, [authUser]);

  const fetchUserProfile = async () => {
    try {
      if (!authUser) return;

      // Fetch from profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching profile:', profileError);
      }

      const profile = {
        id: authUser.id,
        email: authUser.email,
        created_at: new Date(authUser.created_at).toLocaleDateString(language === 'sq' ? 'sq-AL' : 'en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        first_name: profileData?.first_name || authUser.user_metadata?.first_name || '',
        last_name: profileData?.last_name || authUser.user_metadata?.last_name || '',
        username: profileData?.username || '',
        avatar_url: profileData?.avatar_url || null
      };

      setUserProfile(profile);
      setAvatarUrl(profile.avatar_url);
      setEditForm({
        first_name: profile.first_name,
        last_name: profile.last_name,
        username: profile.username
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    }
  };

  const fetchUserStats = async () => {
    try {
      if (!authUser) return;

      // Fetch wishlist count and status data
      const { data: wishlistData } = await supabase
        .from('wishlist')
        .select('status')
        .eq('user_id', authUser.id);

      const totalBooks = wishlistData?.length || 0;
      const booksRead = wishlistData?.filter(b => b.status === 'completed').length || 0;
      const booksReading = wishlistData?.filter(b => b.status === 'reading').length || 0;

      // Fetch loan stats
      const { data: loanData } = await supabase
        .from('loan_requests')
        .select('status')
        .eq('user_id', authUser.id);

      const loansRequested = loanData?.length || 0;
      const loansApproved = loanData?.filter(l => l.status === 'approved' || l.status === 'returned').length || 0;

      // Fetch reviews stats
      const { data: reviewsData } = await supabase
        .from('book_reviews')
        .select('rating')
        .eq('user_id', authUser.id);

      const reviewsWritten = reviewsData?.length || 0;
      const averageRating = reviewsWritten > 0 
        ? (reviewsData.reduce((sum, r) => sum + r.rating, 0) / reviewsWritten).toFixed(1)
        : 0;

      // Fetch collections count
      const { count: collectionsCount } = await supabase
        .from('reading_collections')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', authUser.id);

      // Calculate reading streak based on completed books
      const readingStreak = booksRead > 0 ? Math.min(booksRead * 2, 30) : 0;

      setStats({
        totalBooks,
        booksRead,
        booksReading,
        loansRequested,
        loansApproved,
        reviewsWritten,
        averageRating,
        collectionsCount: collectionsCount || 0,
        readingStreak
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      if (!authUser) return;

      const activities = [];

      // Get recent wishlist additions
      const { data: recentWishlist } = await supabase
        .from('wishlist')
        .select('title, created_at')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false })
        .limit(3);

      recentWishlist?.forEach(item => {
        activities.push({
          type: 'wishlist',
          icon: '❤️',
          text: `Added "${item.title}" to wishlist`,
          date: new Date(item.created_at)
        });
      });

      // Get recent loan requests
      const { data: recentLoans } = await supabase
        .from('loan_requests')
        .select('book_title, status, requested_at')
        .eq('user_id', authUser.id)
        .order('requested_at', { ascending: false })
        .limit(3);

      recentLoans?.forEach(item => {
        activities.push({
          type: 'loan',
          icon: item.status === 'approved' ? '✅' : item.status === 'pending' ? '⏳' : '📚',
          text: `Loan request for "${item.book_title}" - ${item.status}`,
          date: new Date(item.requested_at)
        });
      });

      // Get recent reviews
      const { data: recentReviews } = await supabase
        .from('book_reviews')
        .select('book_title, rating, created_at')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false })
        .limit(2);

      recentReviews?.forEach(item => {
        activities.push({
          type: 'review',
          icon: '⭐',
          text: `Reviewed "${item.book_title}" - ${item.rating}/5`,
          date: new Date(item.created_at)
        });
      });

      // Sort by date and take latest 8
      activities.sort((a, b) => b.date - a.date);
      setRecentActivity(activities.slice(0, 8));
    } catch (error) {
      console.error('Error fetching activity:', error);
    }
  };

  const loadEmailPreferences = async () => {
    try {
      if (!authUser) return;
      const prefs = await getEmailPreferences(authUser.id);
      setEmailPrefs(prefs);
    } catch (error) {
      console.error('Error loading email preferences:', error);
    }
  };

  const handleToggleEmailPref = async (key) => {
    if (!emailPrefs || savingPrefs) return;
    const newValue = !emailPrefs[key];
    const updatedPrefs = { ...emailPrefs, [key]: newValue };
    setEmailPrefs(updatedPrefs);
    setSavingPrefs(true);
    try {
      await updateEmailPreferences(authUser.id, { [key]: newValue });
    } catch (error) {
      // Revert on failure
      setEmailPrefs(emailPrefs);
      toast.error(t.somethingWentWrong);
    } finally {
      setSavingPrefs(false);
    }
  };

  const fetchWishlistBooks = async () => {
    try {
      if (!authUser) return;

      const { data: wishlistItems, error } = await supabase
        .from('wishlist')
        .select('title, authors, created_at, book_id, image_url')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) throw error;

      // Map image_url to thumbnail for consistent usage in component
      const formattedItems = (wishlistItems || []).map(item => ({
        ...item,
        thumbnail: item.image_url
      }));

      setWishlistBooks(formattedItems);
    } catch (error) {
      console.error('Error fetching wishlist:', error);
    }
  };

  const handleSaveProfile = async () => {
    try {
      if (!authUser) return;

      // Sanitize name inputs
      const sanitizedFirst = sanitizeInput(editForm.first_name);
      const sanitizedLast = sanitizeInput(editForm.last_name);

      // Validate username if provided
      if (editForm.username) {
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        if (!usernameRegex.test(editForm.username)) {
          toast.error(t.usernameInvalid || 'Username must be 3-20 characters (letters, numbers, underscore)');
          return;
        }
        // Check uniqueness
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', editForm.username.toLowerCase())
          .neq('id', authUser.id)
          .single();
        if (existing) {
          toast.error(t.usernameTaken || 'Username is already taken');
          return;
        }
      }

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: authUser.id,
          first_name: sanitizedFirst,
          last_name: sanitizedLast,
          username: editForm.username ? editForm.username.toLowerCase() : null,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setUserProfile(prev => ({
        ...prev,
        ...editForm
      }));
      setIsEditing(false);
      toast.success(t.profileUpdated);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(t.failedUpdateProfile);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t.imageSizeTooLarge);
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error(t.pleaseUploadImage);
      return;
    }

    setUploadingAvatar(true);

    try {
      if (!authUser) return;

      // Use base64 encoding for avatar
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result;
        
        const { error: updateError } = await supabase
          .from('profiles')
          .upsert({
            id: authUser.id,
            avatar_url: base64,
            updated_at: new Date().toISOString()
          });

        if (updateError) {
          console.error('Error updating avatar:', updateError);
          toast.error(t.failedUploadAvatar);
          return;
        }

        setAvatarUrl(base64);
        toast.success(t.avatarUpdated);
        setUploadingAvatar(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error(t.failedUploadAvatar);
      setUploadingAvatar(false);
    }
  };

  const handleBookClick = (bookId, bookTitle) => {
    navigate(`/book/${bookId}`, { 
      state: { 
        book: { 
          id: bookId,
          volumeInfo: { title: bookTitle } 
        } 
      } 
    });
  };

  // Sanitize text input - strip all HTML/script content, not just specific chars
  const sanitizeInput = (text) => {
    if (!text) return '';
    // Strip all HTML tags completely
    const stripped = text.replace(/<[^>]*>/g, '');
    // Remove any remaining control characters
    const cleaned = stripped.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
    return cleaned.trim().slice(0, 100);
  };

  // Export personal data (GDPR compliance)
  const handleExportData = async () => {
    if (exportingData) return;
    setExportingData(true);
    try {
      const [
        { data: wishlistData },
        { data: loansData },
        { data: reviewsData },
        { data: collectionsData },
        { data: profileData }
      ] = await Promise.all([
        supabase.from('wishlist').select('*').eq('user_id', authUser.id),
        supabase.from('loan_requests').select('*').eq('user_id', authUser.id),
        supabase.from('book_reviews').select('*').eq('user_id', authUser.id),
        supabase.from('reading_collections').select('*').eq('user_id', authUser.id),
        supabase.from('profiles').select('*').eq('id', authUser.id).single()
      ]);

      const exportObj = {
        exported_at: new Date().toISOString(),
        profile: {
          email: authUser.email,
          first_name: profileData?.first_name,
          last_name: profileData?.last_name,
          username: profileData?.username,
          created_at: authUser.created_at
        },
        wishlist: wishlistData || [],
        loan_requests: loansData || [],
        reviews: reviewsData || [],
        collections: collectionsData || []
      };

      const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `my_library_data_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success(t.dataExported || 'Your data has been exported!');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error(t.somethingWentWrong);
    } finally {
      setExportingData(false);
    }
  };

  // Update reading goal
  const handleSaveGoal = async () => {
    const goal = Math.max(1, Math.min(365, parseInt(goalInput) || 12));
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: authUser.id,
          reading_goal: goal,
          updated_at: new Date().toISOString()
        });
      if (error) throw error;
      setUserProfile(prev => ({ ...prev, reading_goal: goal }));
      setEditingGoal(false);
      toast.success(t.goalUpdated || 'Reading goal updated!');
    } catch (error) {
      console.error('Error updating goal:', error);
      toast.error(t.somethingWentWrong);
    }
  };

  // Delete account request
  const handleDeleteAccount = async () => {
    try {
      // Sign out and notify
      toast.info(t.accountDeleteRequested || 'Account deletion requested. Please contact support to complete the process.');
      await supabase.auth.signOut();
      navigate('/');
    } catch (error) {
      console.error('Error:', error);
      toast.error(t.somethingWentWrong);
    }
  };

  const handleResetPassword = async () => {
    try {
      const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin + window.location.pathname.split('/').slice(0, -1).join('/') || 'https://suadpllana.github.io/library';
      const { error } = await supabase.auth.resetPasswordForEmail(userProfile.email, {
        redirectTo: `${siteUrl}/#/auth`,
      });
      
      if (error) throw error;
      
      toast.success(t.passwordResetSent);
    } catch (error) {
      console.error('Error sending reset email:', error);
      toast.error(t.failedResetPassword);
    }
  };

  const getInitials = () => {
    const first = userProfile?.first_name?.[0] || '';
    const last = userProfile?.last_name?.[0] || '';
    return (first + last).toUpperCase() || '?';
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getReadingProgress = () => {
    const goal = userProfile?.reading_goal || 12;
    const read = stats.booksRead;
    return Math.min((read / goal) * 100, 100);
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-loading">
          <div className="loading-spinner"></div>
          <p>{t.loadingProfile}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <h3 
        className="back-link"
        onClick={() => navigate(-1)}
      >
        <FaArrowLeftLong /> {t.goBack}
      </h3>

      <div className="profile-layout">
        {/* Left Sidebar - Profile Card */}
        <div className="profile-sidebar">
          <div className="profile-card">
            <div className="avatar-section">
              <div 
                className={`avatar-container ${uploadingAvatar ? 'uploading' : ''}`}
                onClick={handleAvatarClick}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="avatar-image" />
                ) : (
                  <div className="avatar-initials">{getInitials()}</div>
                )}
                <div className="avatar-overlay">
                  <FaCamera />
                </div>
                {uploadingAvatar && <div className="avatar-spinner"></div>}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarUpload}
                accept="image/*"
                style={{ display: 'none' }}
              />
            </div>

            {userProfile && (
              <div className="profile-name-section">
                <h2>{userProfile.first_name} {userProfile.last_name || ''}</h2>
                {userProfile.username && <p className="user-username">@{userProfile.username}</p>}
                <p className="user-email">{userProfile.email}</p>
              </div>
            )}

            <div className="member-info">
              <FaCalendarDays />
              <span>{t.memberSince} {userProfile?.created_at}</span>
            </div>

            <button 
              className="edit-profile-btn"
              onClick={() => setIsEditing(true)}
            >
              <FaPen /> {t.editProfile}
            </button>
          </div>

          {/* Quick Stats */}
          <div className="quick-stats-card">
            <h3>📊 {t.quickStats}</h3>
            <div className="quick-stats-grid">
              <div className="quick-stat">
                <span className="stat-number">{stats.totalBooks}</span>
                <span className="stat-label">{t.saved}</span>
              </div>
              <div className="quick-stat">
                <span className="stat-number">{stats.booksRead}</span>
                <span className="stat-label">{t.read}</span>
              </div>
              <div className="quick-stat">
                <span className="stat-number">{stats.reviewsWritten}</span>
                <span className="stat-label">{t.reviews}</span>
              </div>
              <div className="quick-stat">
                <span className="stat-number">{stats.collectionsCount}</span>
                <span className="stat-label">{t.collections}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="profile-main">
          {/* Navigation Tabs */}
          <div className="profile-tabs">
            <button 
              className={activeSection === 'overview' ? 'active' : ''}
              onClick={() => setActiveSection('overview')}
            >
              <FaChartLine /> {t.overview}
            </button>
            <button 
              className={activeSection === 'activity' ? 'active' : ''}
              onClick={() => setActiveSection('activity')}
            >
              <FaClock /> {t.activity}
            </button>
            <button 
              className={activeSection === 'achievements' ? 'active' : ''}
              onClick={() => setActiveSection('achievements')}
            >
              <FaTrophy /> {t.achievements}
            </button>
            <button 
              className={activeSection === 'books' ? 'active' : ''}
              onClick={() => setActiveSection('books')}
            >
              <FaBook /> {t.myBooks || 'My Books'}
            </button>
            <button 
              className={activeSection === 'notifications' ? 'active' : ''}
              onClick={() => setActiveSection('notifications')}
            >
              <FaBell /> {t.emailNotifications || 'Email Notifications'}
            </button>
            <button 
              className={activeSection === 'settings' ? 'active' : ''}
              onClick={() => setActiveSection('settings')}
            >
              <FaGear /> {t.settings || 'Settings'}
            </button>
          </div>

          {/* Overview Section */}
          {activeSection === 'overview' && (
            <div className="overview-section">
              {/* Reading Goal Progress */}
              <div className="reading-goal-card">
                <div className="goal-header">
                  <h3><FaBookOpen /> {t.readingGoal} {new Date().getFullYear()}</h3>
                  <div className="goal-header-right">
                    {editingGoal ? (
                      <div className="goal-edit-inline">
                        <input 
                          type="number" 
                          min="1" max="365" 
                          value={goalInput}
                          onChange={(e) => setGoalInput(e.target.value)}
                          className="goal-input"
                        />
                        <button className="goal-save-btn" onClick={handleSaveGoal}>
                          <FaFloppyDisk />
                        </button>
                        <button className="goal-cancel-btn" onClick={() => setEditingGoal(false)}>
                          <FaXmark />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="goal-text">{stats.booksRead} / {userProfile?.reading_goal || 12} {t.booksReadGoal}</span>
                        <button className="goal-edit-btn" onClick={() => { setGoalInput(userProfile?.reading_goal || 12); setEditingGoal(true); }} title="Edit goal">
                          <FaPen />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="progress-bar-container">
                  <div 
                    className="progress-bar-fill"
                    style={{ width: `${getReadingProgress()}%` }}
                  ></div>
                </div>
                <p className="goal-message">
                  {getReadingProgress() >= 100 
                    ? `🎉 ${t.goalReached}`
                    : `${(userProfile?.reading_goal || 12) - stats.booksRead} ${t.moreBooksToGoal}`
                  }
                </p>
              </div>

              {/* Stats Cards */}
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon books">
                    <FaBook />
                  </div>
                  <div className="stat-content">
                    <span className="stat-value">{stats.totalBooks}</span>
                    <span className="stat-title">{t.booksSaved}</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon completed">
                    <FaCircleCheck />
                  </div>
                  <div className="stat-content">
                    <span className="stat-value">{stats.booksRead}</span>
                    <span className="stat-title">{t.booksCompleted}</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon reading">
                    <FaBookOpen />
                  </div>
                  <div className="stat-content">
                    <span className="stat-value">{stats.booksReading}</span>
                    <span className="stat-title">{t.currentlyReadingBooks}</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon loans">
                    <FaClock />
                  </div>
                  <div className="stat-content">
                    <span className="stat-value">{stats.loansApproved}</span>
                    <span className="stat-title">{t.booksBorrowed}</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon reviews">
                    <FaStar />
                  </div>
                  <div className="stat-content">
                    <span className="stat-value">{stats.reviewsWritten}</span>
                    <span className="stat-title">{t.reviewsWrittenLabel}</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon streak">
                    <FaFire />
                  </div>
                  <div className="stat-content">
                    <span className="stat-value">{stats.readingStreak}</span>
                    <span className="stat-title">{t.dayStreak}</span>
                  </div>
                </div>
              </div>

              {/* Average Rating Given */}
              {stats.reviewsWritten > 0 && (
                <div className="avg-rating-card">
                  <h3>{t.yourAverageRating}</h3>
                  <div className="avg-rating-display">
                    <span className="avg-rating-number">{stats.averageRating}</span>
                    <div className="avg-rating-stars">
                      {[1, 2, 3, 4, 5].map(star => (
                        <FaStar 
                          key={star}
                          className={star <= Math.round(stats.averageRating) ? 'filled' : ''}
                        />
                      ))}
                    </div>
                  </div>
                  <p>{t.basedOnReviews} {stats.reviewsWritten} {t.reviews}</p>
                </div>
              )}
            </div>
          )}

          {/* Activity Section */}
          {activeSection === 'activity' && (
            <div className="activity-section">
              <h3><FaClock /> {t.recentActivity}</h3>
              {recentActivity.length === 0 ? (
                <div className="empty-activity">
                  <p>{t.noRecentActivity}</p>
                </div>
              ) : (
                <div className="activity-timeline">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="activity-item">
                      <div className="activity-icon">{activity.icon}</div>
                      <div className="activity-content">
                        <p>{activity.text}</p>
                        <span className="activity-date">{formatDate(activity.date)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Achievements Section */}
          {activeSection === 'achievements' && (
            <div className="achievements-section">
              <h3><FaTrophy /> {t.achievements}</h3>
              <div className="achievements-grid">
                <div className={`achievement-card ${stats.totalBooks >= 1 ? 'unlocked' : 'locked'}`}>
                  <div className="achievement-icon">📖</div>
                  <div className="achievement-info">
                    <h4>{t.firstSteps}</h4>
                    <p>{t.addFirstBook}</p>
                  </div>
                  {stats.totalBooks >= 1 && <FaCircleCheck className="achievement-check" />}
                </div>

                <div className={`achievement-card ${stats.totalBooks >= 10 ? 'unlocked' : 'locked'}`}>
                  <div className="achievement-icon">📚</div>
                  <div className="achievement-info">
                    <h4>{t.bookCollector}</h4>
                    <p>{t.save10Books}</p>
                  </div>
                  {stats.totalBooks >= 10 && <FaCircleCheck className="achievement-check" />}
                </div>

                <div className={`achievement-card ${stats.booksRead >= 5 ? 'unlocked' : 'locked'}`}>
                  <div className="achievement-icon">🎯</div>
                  <div className="achievement-info">
                    <h4>{t.dedicatedReader}</h4>
                    <p>{t.complete5Books}</p>
                  </div>
                  {stats.booksRead >= 5 && <FaCircleCheck className="achievement-check" />}
                </div>

                <div className={`achievement-card ${stats.reviewsWritten >= 3 ? 'unlocked' : 'locked'}`}>
                  <div className="achievement-icon">⭐</div>
                  <div className="achievement-info">
                    <h4>{t.critic}</h4>
                    <p>{t.write3Reviews}</p>
                  </div>
                  {stats.reviewsWritten >= 3 && <FaCircleCheck className="achievement-check" />}
                </div>

                <div className={`achievement-card ${stats.collectionsCount >= 3 ? 'unlocked' : 'locked'}`}>
                  <div className="achievement-icon">🗂️</div>
                  <div className="achievement-info">
                    <h4>{t.organizer}</h4>
                    <p>{t.create3Collections}</p>
                  </div>
                  {stats.collectionsCount >= 3 && <FaCircleCheck className="achievement-check" />}
                </div>

                <div className={`achievement-card ${stats.loansApproved >= 1 ? 'unlocked' : 'locked'}`}>
                  <div className="achievement-icon">📖</div>
                  <div className="achievement-info">
                    <h4>{t.borrower}</h4>
                    <p>{t.getLoanApproved}</p>
                  </div>
                  {stats.loansApproved >= 1 && <FaCircleCheck className="achievement-check" />}
                </div>

                <div className={`achievement-card ${stats.totalBooks >= 50 ? 'unlocked' : 'locked'}`}>
                  <div className="achievement-icon">🏆</div>
                  <div className="achievement-info">
                    <h4>{t.bookworm}</h4>
                    <p>{t.save50Books}</p>
                  </div>
                  {stats.totalBooks >= 50 && <FaCircleCheck className="achievement-check" />}
                </div>

                <div className={`achievement-card ${getReadingProgress() >= 100 ? 'unlocked' : 'locked'}`}>
                  <div className="achievement-icon">🎉</div>
                  <div className="achievement-info">
                    <h4>{t.goalCrusher}</h4>
                    <p>{t.completeReadingGoal}</p>
                  </div>
                  {getReadingProgress() >= 100 && <FaCircleCheck className="achievement-check" />}
                </div>
              </div>
            </div>
          )}

          {/* Books Section */}
          {activeSection === 'books' && (
            <div className="books-section">
              <div className="section-header">
                <h3><FaHeart /> {t.recentlySavedBooks}</h3>
                <button className="see-all-btn" onClick={() => navigate('/wishlist')}>
                  {t.seeAll}
                </button>
              </div>
              
              {wishlistBooks.length === 0 ? (
                <div className="empty-books">
                  <p>{t.noBooksYet}</p>
                  <button onClick={() => navigate('/')}>{t.discoverBooks}</button>
                </div>
              ) : (
                <div className="saved-books-grid">
                  {wishlistBooks.map((book, index) => (
                    <div 
                      key={index}
                      className="saved-book-card"
                      onClick={() => handleBookClick(book.book_id, book.title)}
                    >
                      <div className="book-thumbnail">
                        <img 
                          src={book.thumbnail || 'https://placehold.co/128x192?text=No+Image'} 
                          alt={book.title} 
                        />
                        {book.status && (
                          <span className={`status-badge ${book.status}`}>
                            {book.status === 'completed' ? '✓ Read' : '📖 Reading'}
                          </span>
                        )}
                      </div>
                      <div className="book-info">
                        <h4>{book.title}</h4>
                        <p>{book.authors?.join(', ') || t.unknownAuthor}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Email Notifications Section */}
          {activeSection === 'notifications' && (
            <div className="notifications-section">
              <div className="section-header">
                <h3><FaBell /> {t.emailNotifications || 'Email Notifications'}</h3>
              </div>
              <p className="section-description">{t.emailNotifDesc || 'Choose which email notifications you\'d like to receive.'}</p>
              
              {emailPrefs ? (
                <div className="notification-toggles">
                  <div className="notif-toggle-item">
                    <div className="notif-info">
                      <h4>{t.loanUpdatesNotif || 'Loan Updates'}</h4>
                      <p>{t.loanUpdatesDesc || 'Get notified when your loan requests are approved, rejected, or extended.'}</p>
                    </div>
                    <label className="toggle-switch">
                      <input 
                        type="checkbox" 
                        checked={emailPrefs.loan_updates} 
                        onChange={() => handleToggleEmailPref('loan_updates')}
                        disabled={savingPrefs}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="notif-toggle-item">
                    <div className="notif-info">
                      <h4>{t.reviewNotif || 'Review Notifications'}</h4>
                      <p>{t.reviewNotifDesc || 'Receive updates when new reviews are posted on books you\'ve reviewed.'}</p>
                    </div>
                    <label className="toggle-switch">
                      <input 
                        type="checkbox" 
                        checked={emailPrefs.review_notifications} 
                        onChange={() => handleToggleEmailPref('review_notifications')}
                        disabled={savingPrefs}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="notif-toggle-item">
                    <div className="notif-info">
                      <h4>{t.communityMentionsNotif || 'Community Mentions'}</h4>
                      <p>{t.communityMentionsDesc || 'Get notified when someone mentions you in community chat.'}</p>
                    </div>
                    <label className="toggle-switch">
                      <input 
                        type="checkbox" 
                        checked={emailPrefs.community_mentions} 
                        onChange={() => handleToggleEmailPref('community_mentions')}
                        disabled={savingPrefs}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="notif-toggle-item">
                    <div className="notif-info">
                      <h4>{t.wishlistRemindersNotif || 'Wishlist Reminders'}</h4>
                      <p>{t.wishlistRemindersDesc || 'Periodic reminders about books on your wishlist.'}</p>
                    </div>
                    <label className="toggle-switch">
                      <input 
                        type="checkbox" 
                        checked={emailPrefs.wishlist_reminders} 
                        onChange={() => handleToggleEmailPref('wishlist_reminders')}
                        disabled={savingPrefs}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="notif-toggle-item">
                    <div className="notif-info">
                      <h4>{t.chatExportNotif || 'Chat Export'}</h4>
                      <p>{t.chatExportDesc || 'Get a confirmation email when you export your AI chat.'}</p>
                    </div>
                    <label className="toggle-switch">
                      <input 
                        type="checkbox" 
                        checked={emailPrefs.chat_export} 
                        onChange={() => handleToggleEmailPref('chat_export')}
                        disabled={savingPrefs}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="notif-toggle-item">
                    <div className="notif-info">
                      <h4>{t.weeklyDigestNotif || 'Weekly Digest'}</h4>
                      <p>{t.weeklyDigestDesc || 'A weekly summary of your reading activity and new recommendations.'}</p>
                    </div>
                    <label className="toggle-switch">
                      <input 
                        type="checkbox" 
                        checked={emailPrefs.weekly_digest} 
                        onChange={() => handleToggleEmailPref('weekly_digest')}
                        disabled={savingPrefs}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                </div>
              ) : (
                <div className="loading-prefs">
                  <div className="spinner"></div>
                  <p>{t.loading || 'Loading...'}</p>
                </div>
              )}
            </div>
          )}
          {/* Settings Section */}
          {activeSection === 'settings' && (
            <div className="settings-section">
              <h3><FaGear /> {t.settings || 'Settings'}</h3>

              {/* Data Privacy */}
              <div className="settings-card">
                <div className="settings-card-header">
                  <FaShieldHalved />
                  <h4>{t.dataPrivacy || 'Data & Privacy'}</h4>
                </div>
                <p className="settings-desc">{t.dataPrivacyDesc || 'Download all your personal data or request account deletion.'}</p>
                
                <div className="settings-actions">
                  <button className="export-data-btn" onClick={handleExportData} disabled={exportingData}>
                    <FaDownload /> {exportingData ? (t.exporting || 'Exporting...') : (t.exportMyData || 'Export My Data')}
                  </button>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="settings-card danger-zone">
                <div className="settings-card-header">
                  <FaTrashCan />
                  <h4>{t.dangerZone || 'Danger Zone'}</h4>
                </div>
                <p className="settings-desc">{t.deleteAccountWarning || 'Once you delete your account, there is no going back. Please be certain.'}</p>
                <button className="delete-account-btn" onClick={() => setShowDeleteConfirm(true)}>
                  <FaTrashCan /> {t.deleteAccount || 'Delete Account'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="modal-overlay" onClick={() => setIsEditing(false)}>
          <div className="edit-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t.editProfile}</h2>
              <button className="close-btn" onClick={() => setIsEditing(false)}>
                <FaXmark />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>{t.firstName}</label>
                  <input
                    type="text"
                    value={editForm.first_name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, first_name: e.target.value }))}
                    placeholder={t.enterFirstName}
                  />
                </div>
                <div className="form-group">
                  <label>{t.lastName}</label>
                  <input
                    type="text"
                    value={editForm.last_name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, last_name: e.target.value }))}
                    placeholder={t.enterLastName}
                  />
                </div>
              </div>
              <div className="form-group username-group">
                <label>{t.username || 'Username'}</label>
                <div className="username-input-wrapper">
                  <span className="username-prefix">@</span>
                  <input
                    type="text"
                    value={editForm.username}
                    onChange={(e) => setEditForm(prev => ({ ...prev, username: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') }))}
                    placeholder={t.enterUsername || 'Enter username'}
                    maxLength={20}
                  />
                </div>
                <span className="form-hint">{t.usernameHint || '3-20 characters, letters, numbers, underscore'}</span>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="reset-password-btn" 
                onClick={handleResetPassword}
                type="button"
              >
                {t.resetPassword}
              </button>
              <div className="footer-right">
                <button className="cancel-btn" onClick={() => setIsEditing(false)}>
                  {t.cancel}
                </button>
                <button className="save-btn" onClick={handleSaveProfile}>
                  <FaFloppyDisk /> {t.saveChanges}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteAccount}
        title={t.deleteAccount || 'Delete Account'}
        message={t.deleteAccountConfirm || 'Are you sure you want to delete your account? This action cannot be undone. All your data including wishlist, reviews, and collections will be permanently lost.'}
      />
    </div>
  );
};

export default ProfilePage;
