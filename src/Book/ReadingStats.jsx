import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeftLong, FaBook, FaChartBar, FaCalendarDays, FaTrophy, FaClock, FaStar, FaFire, FaBookOpen } from "react-icons/fa6";
import { supabase } from '../lib/supabase';
import { toast } from 'react-toastify';
import './ReadingStats.css';

const ReadingStats = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalBooks: 0,
    booksRead: 0,
    booksReading: 0,
    booksWantToRead: 0,
    loansApproved: 0,
    reviewsWritten: 0,
    avgRating: 0,
    pagesRead: 0,
    favoriteGenre: 'Not set',
    readingGoal: 12,
    monthlyReading: Array(12).fill(0),
    genreDistribution: []
  });
  const [timeRange, setTimeRange] = useState('year');

  useEffect(() => {
    fetchAllStats();
  }, []);

  const fetchAllStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Fetch profile for reading goal
      const { data: profile } = await supabase
        .from('profiles')
        .select('reading_goal, favorite_genre')
        .eq('id', user.id)
        .single();

      // Fetch all wishlist items with status
      const { data: wishlistData } = await supabase
        .from('wishlist')
        .select('status, created_at, categories')
        .eq('user_id', user.id);

      const totalBooks = wishlistData?.length || 0;
      const booksRead = wishlistData?.filter(b => b.status === 'completed').length || 0;
      const booksReading = wishlistData?.filter(b => b.status === 'reading').length || 0;
      const booksWantToRead = wishlistData?.filter(b => !b.status || b.status === 'want_to_read').length || 0;

      // Calculate monthly reading (books added per month this year)
      const currentYear = new Date().getFullYear();
      const monthlyReading = Array(12).fill(0);
      wishlistData?.forEach(book => {
        const bookDate = new Date(book.created_at);
        if (bookDate.getFullYear() === currentYear) {
          monthlyReading[bookDate.getMonth()]++;
        }
      });

      // Calculate genre distribution
      const genreCounts = {};
      wishlistData?.forEach(book => {
        if (book.categories && Array.isArray(book.categories)) {
          book.categories.forEach(cat => {
            genreCounts[cat] = (genreCounts[cat] || 0) + 1;
          });
        }
      });
      const genreDistribution = Object.entries(genreCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);

      // Fetch loan stats
      const { data: loanData } = await supabase
        .from('loan_requests')
        .select('status')
        .eq('user_id', user.id);

      const loansApproved = loanData?.filter(l => l.status === 'approved' || l.status === 'returned').length || 0;

      // Fetch review stats
      const { data: reviewsData } = await supabase
        .from('book_reviews')
        .select('rating')
        .eq('user_id', user.id);

      const reviewsWritten = reviewsData?.length || 0;
      const avgRating = reviewsWritten > 0 
        ? (reviewsData.reduce((sum, r) => sum + r.rating, 0) / reviewsWritten).toFixed(1)
        : 0;

      // Estimate pages read (avg 300 pages per book)
      const pagesRead = booksRead * 300;

      // Find most common genre
      const favoriteGenre = genreDistribution.length > 0 ? genreDistribution[0].name : 'Not enough data';

      setStats({
        totalBooks,
        booksRead,
        booksReading,
        booksWantToRead,
        loansApproved,
        reviewsWritten,
        avgRating,
        pagesRead,
        favoriteGenre,
        readingGoal: profile?.reading_goal || 12,
        monthlyReading,
        genreDistribution
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const getMaxMonthlyValue = () => {
    return Math.max(...stats.monthlyReading, 1);
  };

  const getMaxGenreValue = () => {
    if (stats.genreDistribution.length === 0) return 1;
    return Math.max(...stats.genreDistribution.map(g => g.count), 1);
  };

  const getReadingGoalProgress = () => {
    return Math.min((stats.booksRead / stats.readingGoal) * 100, 100);
  };

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  if (loading) {
    return (
      <div className="reading-stats-page">
        <div className="stats-loading">
          <div className="loading-spinner"></div>
          <p>Loading your statistics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="reading-stats-page">
      <h3 
        className="back-link"
        onClick={() => navigate(-1)}
      >
        <FaArrowLeftLong /> Go Back
      </h3>

      <div className="stats-header">
        <div className="header-content">
          <h1><FaChartBar /> Reading Statistics</h1>
          <p>Track your reading journey with detailed insights</p>
        </div>
        <div className="time-filter">
          <button 
            className={timeRange === 'month' ? 'active' : ''} 
            onClick={() => setTimeRange('month')}
          >
            This Month
          </button>
          <button 
            className={timeRange === 'year' ? 'active' : ''} 
            onClick={() => setTimeRange('year')}
          >
            This Year
          </button>
          <button 
            className={timeRange === 'all' ? 'active' : ''} 
            onClick={() => setTimeRange('all')}
          >
            All Time
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="metrics-grid">
        <div className="metric-card total">
          <div className="metric-icon">
            <FaBook />
          </div>
          <div className="metric-content">
            <span className="metric-value">{stats.totalBooks}</span>
            <span className="metric-label">Total Books</span>
          </div>
        </div>

        <div className="metric-card read">
          <div className="metric-icon">
            <FaTrophy />
          </div>
          <div className="metric-content">
            <span className="metric-value">{stats.booksRead}</span>
            <span className="metric-label">Books Read</span>
          </div>
        </div>

        <div className="metric-card reading">
          <div className="metric-icon">
            <FaBookOpen />
          </div>
          <div className="metric-content">
            <span className="metric-value">{stats.booksReading}</span>
            <span className="metric-label">Currently Reading</span>
          </div>
        </div>

        <div className="metric-card pages">
          <div className="metric-icon">
            <FaFire />
          </div>
          <div className="metric-content">
            <span className="metric-value">{stats.pagesRead.toLocaleString()}</span>
            <span className="metric-label">Est. Pages Read</span>
          </div>
        </div>

        <div className="metric-card reviews">
          <div className="metric-icon">
            <FaStar />
          </div>
          <div className="metric-content">
            <span className="metric-value">{stats.reviewsWritten}</span>
            <span className="metric-label">Reviews Written</span>
          </div>
        </div>

        <div className="metric-card loans">
          <div className="metric-icon">
            <FaClock />
          </div>
          <div className="metric-content">
            <span className="metric-value">{stats.loansApproved}</span>
            <span className="metric-label">Books Borrowed</span>
          </div>
        </div>
      </div>

      {/* Main Charts Area */}
      <div className="charts-grid">
        {/* Reading Goal Progress */}
        <div className="chart-card goal-card">
          <h3><FaTrophy /> Reading Goal {new Date().getFullYear()}</h3>
          <div className="goal-visualization">
            <div className="goal-circle">
              <svg viewBox="0 0 100 100">
                <circle
                  className="goal-circle-bg"
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  strokeWidth="8"
                />
                <circle
                  className="goal-circle-progress"
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  strokeWidth="8"
                  strokeDasharray={`${getReadingGoalProgress() * 2.83} 283`}
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <div className="goal-text">
                <span className="goal-current">{stats.booksRead}</span>
                <span className="goal-total">of {stats.readingGoal}</span>
              </div>
            </div>
            <div className="goal-info">
              <p className="goal-percentage">{Math.round(getReadingGoalProgress())}% Complete</p>
              <p className="goal-remaining">
                {stats.booksRead >= stats.readingGoal 
                  ? '🎉 Goal achieved!' 
                  : `${stats.readingGoal - stats.booksRead} books to go`}
              </p>
            </div>
          </div>
        </div>

        {/* Monthly Reading Chart */}
        <div className="chart-card monthly-chart">
          <h3><FaCalendarDays /> Books Added per Month</h3>
          <div className="bar-chart">
            {months.map((month, index) => (
              <div key={month} className="bar-item">
                <div className="bar-wrapper">
                  <div 
                    className="bar"
                    style={{ height: `${(stats.monthlyReading[index] / getMaxMonthlyValue()) * 100}%` }}
                  >
                    {stats.monthlyReading[index] > 0 && (
                      <span className="bar-value">{stats.monthlyReading[index]}</span>
                    )}
                  </div>
                </div>
                <span className="bar-label">{month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Genre Distribution */}
        <div className="chart-card genre-chart">
          <h3><FaBook /> Genre Distribution</h3>
          {stats.genreDistribution.length === 0 ? (
            <div className="no-data">
              <p>No genre data available yet.</p>
              <p>Add more books to see your reading preferences!</p>
            </div>
          ) : (
            <div className="genre-bars">
              {stats.genreDistribution.map((genre, index) => (
                <div key={genre.name} className="genre-bar-item">
                  <div className="genre-info">
                    <span className="genre-name">{genre.name}</span>
                    <span className="genre-count">{genre.count} books</span>
                  </div>
                  <div className="genre-bar-wrapper">
                    <div 
                      className="genre-bar"
                      style={{ 
                        width: `${(genre.count / getMaxGenreValue()) * 100}%`,
                        animationDelay: `${index * 0.1}s`
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reading Status Distribution */}
        <div className="chart-card status-chart">
          <h3><FaBookOpen /> Reading Status</h3>
          <div className="status-grid">
            <div className="status-item completed">
              <div className="status-circle">
                <span className="status-number">{stats.booksRead}</span>
              </div>
              <span className="status-label">Completed</span>
            </div>
            <div className="status-item reading">
              <div className="status-circle">
                <span className="status-number">{stats.booksReading}</span>
              </div>
              <span className="status-label">Reading</span>
            </div>
            <div className="status-item want">
              <div className="status-circle">
                <span className="status-number">{stats.booksWantToRead}</span>
              </div>
              <span className="status-label">Want to Read</span>
            </div>
          </div>
          
          {/* Simple pie-like visualization */}
          <div className="status-breakdown">
            <div className="breakdown-bar">
              <div 
                className="breakdown-segment completed"
                style={{ width: `${stats.totalBooks > 0 ? (stats.booksRead / stats.totalBooks) * 100 : 0}%` }}
              ></div>
              <div 
                className="breakdown-segment reading"
                style={{ width: `${stats.totalBooks > 0 ? (stats.booksReading / stats.totalBooks) * 100 : 0}%` }}
              ></div>
              <div 
                className="breakdown-segment want"
                style={{ width: `${stats.totalBooks > 0 ? (stats.booksWantToRead / stats.totalBooks) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Insights Card */}
        <div className="chart-card insights-card">
          <h3><FaFire /> Reading Insights</h3>
          <div className="insights-list">
            <div className="insight-item">
              <span className="insight-icon">📚</span>
              <div className="insight-content">
                <span className="insight-title">Favorite Genre</span>
                <span className="insight-value">{stats.favoriteGenre}</span>
              </div>
            </div>
            <div className="insight-item">
              <span className="insight-icon">⭐</span>
              <div className="insight-content">
                <span className="insight-title">Average Rating Given</span>
                <span className="insight-value">{stats.avgRating || 'No ratings yet'}</span>
              </div>
            </div>
            <div className="insight-item">
              <span className="insight-icon">📖</span>
              <div className="insight-content">
                <span className="insight-title">Reading Pace</span>
                <span className="insight-value">
                  ~{Math.round(stats.booksRead / Math.max(new Date().getMonth() + 1, 1))} books/month
                </span>
              </div>
            </div>
            <div className="insight-item">
              <span className="insight-icon">🎯</span>
              <div className="insight-content">
                <span className="insight-title">Completion Rate</span>
                <span className="insight-value">
                  {stats.totalBooks > 0 ? Math.round((stats.booksRead / stats.totalBooks) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReadingStats;
