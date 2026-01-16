import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaArrowLeftLong, FaCamera, FaPen, FaFloppyDisk, FaXmark, FaBook, FaHeart, FaClock, FaStar, FaChartLine, FaTrophy, FaCalendarDays, FaCircleCheck, FaBookOpen, FaMedal, FaFire } from "react-icons/fa6";
import { supabase } from '../lib/supabase';
import './ProfilePage.css';

const ProfilePage = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [userProfile, setUserProfile] = useState(null);
  const [wishlistBooks, setWishlistBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    bio: '',
    favorite_genre: '',
    reading_goal: 12
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

  const genres = [
    'Fiction', 'Non-Fiction', 'Science Fiction', 'Fantasy', 'Mystery',
    'Romance', 'Thriller', 'Biography', 'History', 'Science',
    'Self-Help', 'Philosophy', 'Technology', 'Art', 'Poetry'
  ];

  useEffect(() => {
    fetchUserProfile();
    fetchWishlistBooks();
    fetchUserStats();
    fetchRecentActivity();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        toast.error('Please sign in to view your profile');
        navigate('/');
        return;
      }

      // Fetch from profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching profile:', profileError);
      }

      const profile = {
        id: user.id,
        email: user.email,
        created_at: new Date(user.created_at).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        first_name: profileData?.first_name || user.user_metadata?.first_name || '',
        last_name: profileData?.last_name || user.user_metadata?.last_name || '',
        bio: profileData?.bio || '',
        favorite_genre: profileData?.favorite_genre || '',
        reading_goal: profileData?.reading_goal || 12,
        avatar_url: profileData?.avatar_url || null
      };

      setUserProfile(profile);
      setAvatarUrl(profile.avatar_url);
      setEditForm({
        first_name: profile.first_name,
        last_name: profile.last_name,
        bio: profile.bio,
        favorite_genre: profile.favorite_genre,
        reading_goal: profile.reading_goal
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    }
  };

  const fetchUserStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch wishlist count (total saved books)
      const { count: wishlistCount } = await supabase
        .from('wishlist')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Fetch reading history stats
      const { data: historyData } = await supabase
        .from('wishlist')
        .select('status')
        .eq('user_id', user.id);

      const booksRead = historyData?.filter(b => b.status === 'completed').length || 0;
      const booksReading = historyData?.filter(b => b.status === 'reading').length || 0;

      // Fetch loan stats
      const { data: loanData } = await supabase
        .from('loan_requests')
        .select('status')
        .eq('user_id', user.id);

      const loansRequested = loanData?.length || 0;
      const loansApproved = loanData?.filter(l => l.status === 'approved' || l.status === 'returned').length || 0;

      // Fetch reviews stats
      const { data: reviewsData } = await supabase
        .from('book_reviews')
        .select('rating')
        .eq('user_id', user.id);

      const reviewsWritten = reviewsData?.length || 0;
      const averageRating = reviewsWritten > 0 
        ? (reviewsData.reduce((sum, r) => sum + r.rating, 0) / reviewsWritten).toFixed(1)
        : 0;

      // Fetch collections count
      const { count: collectionsCount } = await supabase
        .from('reading_collections')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Calculate reading streak (simplified - based on recent activity)
      const readingStreak = booksRead > 0 ? Math.min(booksRead * 2, 30) : 0;

      setStats({
        totalBooks: wishlistCount || 0,
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const activities = [];

      // Get recent wishlist additions
      const { data: recentWishlist } = await supabase
        .from('wishlist')
        .select('title, created_at')
        .eq('user_id', user.id)
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
        .eq('user_id', user.id)
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
        .eq('user_id', user.id)
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

  const fetchWishlistBooks = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) return;

      const { data: wishlistItems, error } = await supabase
        .from('wishlist')
        .select('title, authors, created_at, book_id, thumbnail, status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) throw error;

      setWishlistBooks(wishlistItems || []);
    } catch (error) {
      console.error('Error fetching wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          first_name: editForm.first_name,
          last_name: editForm.last_name,
          bio: editForm.bio,
          favorite_genre: editForm.favorite_genre,
          reading_goal: editForm.reading_goal,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setUserProfile(prev => ({
        ...prev,
        ...editForm
      }));
      setIsEditing(false);
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
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
      toast.error('Image size must be less than 2MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    setUploadingAvatar(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Use base64 encoding for avatar
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result;
        
        const { error: updateError } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            avatar_url: base64,
            updated_at: new Date().toISOString()
          });

        if (updateError) {
          console.error('Error updating avatar:', updateError);
          toast.error('Failed to upload avatar');
          return;
        }

        setAvatarUrl(base64);
        toast.success('Avatar updated!');
        setUploadingAvatar(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload avatar');
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
          <p>Loading your profile...</p>
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
        <FaArrowLeftLong /> Go Back
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
                <p className="user-email">{userProfile.email}</p>
                {userProfile.bio && <p className="user-bio">{userProfile.bio}</p>}
                {userProfile.favorite_genre && (
                  <span className="favorite-genre-badge">
                    {userProfile.favorite_genre} enthusiast
                  </span>
                )}
              </div>
            )}

            <div className="member-info">
              <FaCalendarDays />
              <span>Member since {userProfile?.created_at}</span>
            </div>

            <button 
              className="edit-profile-btn"
              onClick={() => setIsEditing(true)}
            >
              <FaPen /> Edit Profile
            </button>
          </div>

          {/* Quick Stats */}
          <div className="quick-stats-card">
            <h3>📊 Quick Stats</h3>
            <div className="quick-stats-grid">
              <div className="quick-stat">
                <span className="stat-number">{stats.totalBooks}</span>
                <span className="stat-label">Saved</span>
              </div>
              <div className="quick-stat">
                <span className="stat-number">{stats.booksRead}</span>
                <span className="stat-label">Read</span>
              </div>
              <div className="quick-stat">
                <span className="stat-number">{stats.reviewsWritten}</span>
                <span className="stat-label">Reviews</span>
              </div>
              <div className="quick-stat">
                <span className="stat-number">{stats.collectionsCount}</span>
                <span className="stat-label">Collections</span>
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
              <FaChartLine /> Overview
            </button>
            <button 
              className={activeSection === 'activity' ? 'active' : ''}
              onClick={() => setActiveSection('activity')}
            >
              <FaClock /> Activity
            </button>
            <button 
              className={activeSection === 'achievements' ? 'active' : ''}
              onClick={() => setActiveSection('achievements')}
            >
              <FaTrophy /> Achievements
            </button>
            <button 
              className={activeSection === 'books' ? 'active' : ''}
              onClick={() => setActiveSection('books')}
            >
              <FaBook /> My Books
            </button>
          </div>

          {/* Overview Section */}
          {activeSection === 'overview' && (
            <div className="overview-section">
              {/* Reading Goal Progress */}
              <div className="reading-goal-card">
                <div className="goal-header">
                  <h3><FaBookOpen /> Reading Goal {new Date().getFullYear()}</h3>
                  <span className="goal-text">{stats.booksRead} / {userProfile?.reading_goal || 12} books</span>
                </div>
                <div className="progress-bar-container">
                  <div 
                    className="progress-bar-fill"
                    style={{ width: `${getReadingProgress()}%` }}
                  ></div>
                </div>
                <p className="goal-message">
                  {getReadingProgress() >= 100 
                    ? '🎉 Congratulations! You\'ve reached your goal!'
                    : `${(userProfile?.reading_goal || 12) - stats.booksRead} more books to reach your goal`
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
                    <span className="stat-title">Books Saved</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon completed">
                    <FaCircleCheck />
                  </div>
                  <div className="stat-content">
                    <span className="stat-value">{stats.booksRead}</span>
                    <span className="stat-title">Books Completed</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon reading">
                    <FaBookOpen />
                  </div>
                  <div className="stat-content">
                    <span className="stat-value">{stats.booksReading}</span>
                    <span className="stat-title">Currently Reading</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon loans">
                    <FaClock />
                  </div>
                  <div className="stat-content">
                    <span className="stat-value">{stats.loansApproved}</span>
                    <span className="stat-title">Books Borrowed</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon reviews">
                    <FaStar />
                  </div>
                  <div className="stat-content">
                    <span className="stat-value">{stats.reviewsWritten}</span>
                    <span className="stat-title">Reviews Written</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon streak">
                    <FaFire />
                  </div>
                  <div className="stat-content">
                    <span className="stat-value">{stats.readingStreak}</span>
                    <span className="stat-title">Day Streak</span>
                  </div>
                </div>
              </div>

              {/* Average Rating Given */}
              {stats.reviewsWritten > 0 && (
                <div className="avg-rating-card">
                  <h3>Your Average Rating</h3>
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
                  <p>Based on {stats.reviewsWritten} reviews</p>
                </div>
              )}
            </div>
          )}

          {/* Activity Section */}
          {activeSection === 'activity' && (
            <div className="activity-section">
              <h3><FaClock /> Recent Activity</h3>
              {recentActivity.length === 0 ? (
                <div className="empty-activity">
                  <p>No recent activity. Start by adding books to your wishlist!</p>
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
              <h3><FaTrophy /> Achievements</h3>
              <div className="achievements-grid">
                <div className={`achievement-card ${stats.totalBooks >= 1 ? 'unlocked' : 'locked'}`}>
                  <div className="achievement-icon">📖</div>
                  <div className="achievement-info">
                    <h4>First Steps</h4>
                    <p>Add your first book</p>
                  </div>
                  {stats.totalBooks >= 1 && <FaCircleCheck className="achievement-check" />}
                </div>

                <div className={`achievement-card ${stats.totalBooks >= 10 ? 'unlocked' : 'locked'}`}>
                  <div className="achievement-icon">📚</div>
                  <div className="achievement-info">
                    <h4>Book Collector</h4>
                    <p>Save 10 books</p>
                  </div>
                  {stats.totalBooks >= 10 && <FaCircleCheck className="achievement-check" />}
                </div>

                <div className={`achievement-card ${stats.booksRead >= 5 ? 'unlocked' : 'locked'}`}>
                  <div className="achievement-icon">🎯</div>
                  <div className="achievement-info">
                    <h4>Dedicated Reader</h4>
                    <p>Complete 5 books</p>
                  </div>
                  {stats.booksRead >= 5 && <FaCircleCheck className="achievement-check" />}
                </div>

                <div className={`achievement-card ${stats.reviewsWritten >= 3 ? 'unlocked' : 'locked'}`}>
                  <div className="achievement-icon">⭐</div>
                  <div className="achievement-info">
                    <h4>Critic</h4>
                    <p>Write 3 reviews</p>
                  </div>
                  {stats.reviewsWritten >= 3 && <FaCircleCheck className="achievement-check" />}
                </div>

                <div className={`achievement-card ${stats.collectionsCount >= 3 ? 'unlocked' : 'locked'}`}>
                  <div className="achievement-icon">🗂️</div>
                  <div className="achievement-info">
                    <h4>Organizer</h4>
                    <p>Create 3 collections</p>
                  </div>
                  {stats.collectionsCount >= 3 && <FaCircleCheck className="achievement-check" />}
                </div>

                <div className={`achievement-card ${stats.loansApproved >= 1 ? 'unlocked' : 'locked'}`}>
                  <div className="achievement-icon">📖</div>
                  <div className="achievement-info">
                    <h4>Borrower</h4>
                    <p>Get a loan approved</p>
                  </div>
                  {stats.loansApproved >= 1 && <FaCircleCheck className="achievement-check" />}
                </div>

                <div className={`achievement-card ${stats.totalBooks >= 50 ? 'unlocked' : 'locked'}`}>
                  <div className="achievement-icon">🏆</div>
                  <div className="achievement-info">
                    <h4>Bookworm</h4>
                    <p>Save 50 books</p>
                  </div>
                  {stats.totalBooks >= 50 && <FaCircleCheck className="achievement-check" />}
                </div>

                <div className={`achievement-card ${getReadingProgress() >= 100 ? 'unlocked' : 'locked'}`}>
                  <div className="achievement-icon">🎉</div>
                  <div className="achievement-info">
                    <h4>Goal Crusher</h4>
                    <p>Complete reading goal</p>
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
                <h3><FaHeart /> Recently Saved Books</h3>
                <button className="see-all-btn" onClick={() => navigate('/wishlist')}>
                  See All
                </button>
              </div>
              
              {wishlistBooks.length === 0 ? (
                <div className="empty-books">
                  <p>No books saved yet. Start exploring and add some!</p>
                  <button onClick={() => navigate('/')}>Discover Books</button>
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
                        <p>{book.authors?.join(', ') || 'Unknown Author'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="modal-overlay" onClick={() => setIsEditing(false)}>
          <div className="edit-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Profile</h2>
              <button className="close-btn" onClick={() => setIsEditing(false)}>
                <FaXmark />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>First Name</label>
                  <input
                    type="text"
                    value={editForm.first_name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, first_name: e.target.value }))}
                    placeholder="Enter your first name"
                  />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input
                    type="text"
                    value={editForm.last_name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, last_name: e.target.value }))}
                    placeholder="Enter your last name"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Bio</label>
                <textarea
                  value={editForm.bio}
                  onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Tell us about yourself..."
                  rows={3}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Favorite Genre</label>
                  <select
                    value={editForm.favorite_genre}
                    onChange={(e) => setEditForm(prev => ({ ...prev, favorite_genre: e.target.value }))}
                  >
                    <option value="">Select a genre</option>
                    {genres.map(genre => (
                      <option key={genre} value={genre}>{genre}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Reading Goal (books/year)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={editForm.reading_goal}
                    onChange={(e) => setEditForm(prev => ({ ...prev, reading_goal: parseInt(e.target.value) || 12 }))}
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setIsEditing(false)}>
                Cancel
              </button>
              <button className="save-btn" onClick={handleSaveProfile}>
                <FaFloppyDisk /> Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
