import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import translations from '../i18n/translations';
import { toast } from 'react-toastify';
import { FaArrowLeftLong, FaBook, FaCircleCheck, FaBookOpen, FaStar, FaTrophy, FaCalendarDays, FaFire, FaClock, FaMedal } from 'react-icons/fa6';
import './PublicProfile.css';

const PublicProfile = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const { language } = useLanguage();
  const t = translations[language];

  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (username) {
      loadPublicProfile();
    }
  }, [username]);

  const loadPublicProfile = async () => {
    try {
      setLoading(true);
      setNotFound(false);

      // Sanitize username input
      const cleanUsername = username.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
      if (!cleanUsername || cleanUsername.length < 3) {
        setNotFound(true);
        return;
      }

      // Fetch profile (only public fields - NO email)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, first_name, last_name, avatar_url, created_at, reading_goal')
        .eq('username', cleanUsername)
        .single();

      if (profileError || !profileData) {
        setNotFound(true);
        return;
      }

      // Check if viewing own profile — redirect to /profile
      if (authUser && profileData.id === authUser.id) {
        navigate('/profile', { replace: true });
        return;
      }

      setProfile({
        ...profileData,
        created_at: new Date(profileData.created_at).toLocaleDateString(
          language === 'sq' ? 'sq-AL' : 'en-US',
          { year: 'numeric', month: 'long', day: 'numeric' }
        )
      });

      // Fetch public stats
      await fetchPublicStats(profileData.id, profileData.reading_goal);

    } catch (error) {
      console.error('Error loading public profile:', error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchPublicStats = async (userId, readingGoal) => {
    try {
      // Books in wishlist and their statuses
      const { data: wishlistData } = await supabase
        .from('wishlist')
        .select('status')
        .eq('user_id', userId);

      const totalBooks = wishlistData?.length || 0;
      const booksRead = wishlistData?.filter(b => b.status === 'completed').length || 0;
      const booksReading = wishlistData?.filter(b => b.status === 'reading').length || 0;

      // Reviews
      const { data: reviewsData } = await supabase
        .from('book_reviews')
        .select('rating')
        .eq('user_id', userId);

      const reviewsWritten = reviewsData?.length || 0;
      const averageRating = reviewsWritten > 0
        ? (reviewsData.reduce((sum, r) => sum + r.rating, 0) / reviewsWritten).toFixed(1)
        : 0;

      // Collections
      const { count: collectionsCount } = await supabase
        .from('reading_collections')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Loans approved
      const { data: loanData } = await supabase
        .from('loan_requests')
        .select('status')
        .eq('user_id', userId);

      const loansApproved = loanData?.filter(l => l.status === 'approved' || l.status === 'returned').length || 0;
      const readingStreak = booksRead > 0 ? Math.min(booksRead * 2, 30) : 0;

      setStats({
        totalBooks,
        booksRead,
        booksReading,
        reviewsWritten,
        averageRating,
        collectionsCount: collectionsCount || 0,
        loansApproved,
        readingStreak
      });

      // Calculate achievements
      const goal = readingGoal || 12;
      const goalProgress = Math.min((booksRead / goal) * 100, 100);
      const achievementList = [
        { icon: '📖', title: t.firstSteps || 'First Steps', desc: t.addFirstBook || 'Add first book', unlocked: totalBooks >= 1 },
        { icon: '📚', title: t.bookCollector || 'Book Collector', desc: t.save10Books || 'Save 10 books', unlocked: totalBooks >= 10 },
        { icon: '🎯', title: t.dedicatedReader || 'Dedicated Reader', desc: t.complete5Books || 'Complete 5 books', unlocked: booksRead >= 5 },
        { icon: '⭐', title: t.critic || 'Critic', desc: t.write3Reviews || 'Write 3 reviews', unlocked: reviewsWritten >= 3 },
        { icon: '🗂️', title: t.organizer || 'Organizer', desc: t.create3Collections || 'Create 3 collections', unlocked: (collectionsCount || 0) >= 3 },
        { icon: '📖', title: t.borrower || 'Borrower', desc: t.getLoanApproved || 'Get a loan approved', unlocked: loansApproved >= 1 },
        { icon: '🏆', title: t.bookworm || 'Bookworm', desc: t.save50Books || 'Save 50 books', unlocked: totalBooks >= 50 },
        { icon: '🎉', title: t.goalCrusher || 'Goal Crusher', desc: t.completeReadingGoal || 'Complete reading goal', unlocked: goalProgress >= 100 },
      ];
      setAchievements(achievementList);

    } catch (error) {
      console.error('Error fetching public stats:', error);
    }
  };

  const getInitials = () => {
    const first = profile?.first_name?.[0] || '';
    const last = profile?.last_name?.[0] || '';
    return (first + last).toUpperCase() || '?';
  };

  if (loading) {
    return (
      <div className="public-profile-page">
        <div className="public-profile-loading">
          <div className="loading-spinner"></div>
          <p>{t.loadingProfile || 'Loading profile...'}</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="public-profile-page">
        <div className="public-profile-not-found">
          <div className="not-found-icon">🔍</div>
          <h2>{t.userNotFound || 'User not found'}</h2>
          <p>{t.userNotFoundDesc || 'This user doesn\'t exist or hasn\'t set up their profile yet.'}</p>
          <button onClick={() => navigate(-1)} className="go-back-btn">
            <FaArrowLeftLong /> {t.goBack || 'Go Back'}
          </button>
        </div>
      </div>
    );
  }

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <div className="public-profile-page">
      <h3 className="back-link" onClick={() => navigate(-1)}>
        <FaArrowLeftLong /> {t.goBack || 'Go Back'}
      </h3>

      <div className="public-profile-layout">
        {/* Profile Card */}
        <div className="public-profile-card">
          <div className="public-avatar">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.username} className="avatar-image" />
            ) : (
              <div className="avatar-initials">{getInitials()}</div>
            )}
          </div>

          <div className="public-name-section">
            <h1>{profile.first_name} {profile.last_name || ''}</h1>
            {profile.username && <p className="public-username">@{profile.username}</p>}
          </div>

          <div className="public-member-info">
            <FaCalendarDays />
            <span>{t.memberSince || 'Member since'} {profile.created_at}</span>
          </div>

          <div className="public-badge-row">
            <span className="public-badge">
              <FaTrophy /> {unlockedCount}/{achievements.length} {t.achievements || 'Achievements'}
            </span>
            <span className="public-badge">
              <FaBook /> {stats?.totalBooks || 0} {t.booksSaved || 'Books'}
            </span>
          </div>
        </div>

        {/* Stats Section */}
        <div className="public-stats-section">
          <h2><FaStar /> {t.readingStats || 'Reading Stats'}</h2>

          <div className="public-stats-grid">
            <div className="public-stat-card">
              <div className="stat-icon books"><FaBook /></div>
              <div className="stat-content">
                <span className="stat-value">{stats?.totalBooks || 0}</span>
                <span className="stat-label">{t.booksSaved || 'Books Saved'}</span>
              </div>
            </div>

            <div className="public-stat-card">
              <div className="stat-icon completed"><FaCircleCheck /></div>
              <div className="stat-content">
                <span className="stat-value">{stats?.booksRead || 0}</span>
                <span className="stat-label">{t.booksCompleted || 'Books Read'}</span>
              </div>
            </div>

            <div className="public-stat-card">
              <div className="stat-icon reading"><FaBookOpen /></div>
              <div className="stat-content">
                <span className="stat-value">{stats?.booksReading || 0}</span>
                <span className="stat-label">{t.currentlyReadingBooks || 'Currently Reading'}</span>
              </div>
            </div>

            <div className="public-stat-card">
              <div className="stat-icon reviews"><FaStar /></div>
              <div className="stat-content">
                <span className="stat-value">{stats?.reviewsWritten || 0}</span>
                <span className="stat-label">{t.reviewsWrittenLabel || 'Reviews'}</span>
              </div>
            </div>

            <div className="public-stat-card">
              <div className="stat-icon streak"><FaFire /></div>
              <div className="stat-content">
                <span className="stat-value">{stats?.readingStreak || 0}</span>
                <span className="stat-label">{t.dayStreak || 'Day Streak'}</span>
              </div>
            </div>

            <div className="public-stat-card">
              <div className="stat-icon collections"><FaMedal /></div>
              <div className="stat-content">
                <span className="stat-value">{stats?.collectionsCount || 0}</span>
                <span className="stat-label">{t.collections || 'Collections'}</span>
              </div>
            </div>
          </div>

          {/* Average Rating */}
          {stats?.reviewsWritten > 0 && (
            <div className="public-avg-rating">
              <h3>{t.yourAverageRating || 'Average Rating Given'}</h3>
              <div className="avg-rating-display">
                <span className="avg-rating-number">{stats.averageRating}</span>
                <div className="avg-rating-stars">
                  {[1, 2, 3, 4, 5].map(star => (
                    <FaStar key={star} className={star <= Math.round(parseFloat(stats.averageRating)) ? 'filled' : ''} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Achievements Section */}
        <div className="public-achievements-section">
          <h2><FaTrophy /> {t.achievements || 'Achievements'} ({unlockedCount}/{achievements.length})</h2>
          <div className="public-achievements-grid">
            {achievements.map((achievement, index) => (
              <div key={index} className={`public-achievement-card ${achievement.unlocked ? 'unlocked' : 'locked'}`}>
                <div className="achievement-icon">{achievement.icon}</div>
                <div className="achievement-info">
                  <h4>{achievement.title}</h4>
                  <p>{achievement.desc}</p>
                </div>
                {achievement.unlocked && <FaCircleCheck className="achievement-check" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicProfile;
