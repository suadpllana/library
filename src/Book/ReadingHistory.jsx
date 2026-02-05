import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { FaArrowLeftLong, FaBook, FaBookOpen, FaCircleCheck, FaHeart, FaStar, FaEye } from 'react-icons/fa6'
import { toast } from 'react-toastify';
import './ReadingHistory.css';

// Cache for book details
const bookCache = new Map();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

const ReadingHistory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [wishlistBooks, setWishlistBooks] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, reading: 0, completed: 0 });

  useEffect(() => {
    let mounted = true;

    if (user) {
      fetchHistory(mounted);
    }

    return () => { mounted = false; };
  }, [user]);

  const fetchBookDetails = async (bookId) => {
    // Check cache first
    const cached = bookCache.get(bookId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    try {
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes/${bookId}`
      );
      if (!response.ok) return null;
      const bookData = await response.json();
      
      // Cache the result
      bookCache.set(bookId, { data: bookData, timestamp: Date.now() });
      return bookData;
    } catch {
      return null;
    }
  };

  const fetchHistory = async (mounted = true) => {
    try {
      const { data, error } = await supabase
        .from('wishlist')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!mounted) return;

      // First, set books with stored data (no API calls needed)
      // The wishlist already stores title, authors, image_url
      const booksWithStoredData = (data || []).map(item => ({
        ...item,
        bookInfo: {
          volumeInfo: {
            title: item.title,
            authors: item.authors ? [item.authors] : [],
            imageLinks: item.image_url ? { thumbnail: item.image_url } : null,
            categories: item.categories ? [item.categories] : []
          }
        }
      }));

      setWishlistBooks(booksWithStoredData);

      // Calculate stats immediately with available data
      const completed = booksWithStoredData.filter(b => b.status === 'completed').length;
      const reading = booksWithStoredData.filter(b => b.status === 'reading').length;
      setStats({
        total: booksWithStoredData.length,
        reading,
        completed
      });

      setLoading(false);

      // Only fetch additional details for books that need more info (in batches)
      // This is optional and happens in the background
      const booksNeedingDetails = booksWithStoredData.filter(
        b => !b.rating && !b.description
      ).slice(0, 10); // Limit to 10 at a time

      if (booksNeedingDetails.length > 0) {
        // Fetch in small batches with delay to avoid rate limiting
        const batchSize = 3;
        for (let i = 0; i < booksNeedingDetails.length; i += batchSize) {
          if (!mounted) return; // Stop if unmounted

          const batch = booksNeedingDetails.slice(i, i + batchSize);
          const details = await Promise.all(
            batch.map(item => fetchBookDetails(item.book_id))
          );
          
          if (!mounted) return; // Stop if unmounted

          setWishlistBooks(prev => 
            prev.map(book => {
              const detailIndex = batch.findIndex(b => b.book_id === book.book_id);
              if (detailIndex !== -1 && details[detailIndex]) {
                return { ...book, bookInfo: details[detailIndex] };
              }
              return book;
            })
          );

          // Small delay between batches to avoid rate limiting
          if (i + batchSize < booksNeedingDetails.length) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      if (mounted) setLoading(false);
    }
  };

  const updateStatus = async (bookId, newStatus) => {
    try {
      const { error } = await supabase
        .from('wishlist')
        .update({ status: newStatus })
        .eq('user_id', user.id)
        .eq('book_id', bookId);

      if (error) {
        if (error.code === '42703') {
          // Column doesn't exist - need to add status column to Supabase
          console.error('Status column missing in wishlist table');
          alert('Reading status feature requires database setup. Please contact the administrator to add the "status" column to the wishlist table in Supabase.');
          return;
        }
        throw error;
      }

      setWishlistBooks(prev => {
        const updatedBooks = prev.map(book =>
          book.book_id === bookId ? { ...book, status: newStatus } : book
        );
        // Update stats from the new state
        const completed = updatedBooks.filter(b => b.status === 'completed').length;
        const reading = updatedBooks.filter(b => b.status === 'reading').length;
        setStats({ total: updatedBooks.length, reading, completed });
        return updatedBooks;
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update reading status');
    }
  };

  const filteredBooks = filterStatus === 'all'
    ? wishlistBooks
    : wishlistBooks.filter(book => book.status === filterStatus);

  const getStatusBadge = (status) => {
    const badges = {
      wishlist: { icon: <FaHeart />, label: 'Want to Read', class: 'status-wishlist' },
      reading: { icon: <FaBookOpen />, label: 'Reading', class: 'status-reading' },
      completed: { icon: <FaCircleCheck />, label: 'Completed', class: 'status-completed' }
    };
    return badges[status] || badges.wishlist;
  };

  if (!user) {
    return (
      <div className="history-page">
        <div className="not-logged-in">
          <h2>📚 Reading History</h2>
          <p>Please log in to view your reading history.</p>
          <Link to="/auth" className="login-btn">Log In</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="reading-history-page">
      <div className="reading-history-container">
        {/* Header */}
        <div className="history-header">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <FaArrowLeftLong /> Back
          </button>
          <div className="header-info">
            <h1>📖 My Reading Journey</h1>
            <p>Track your progress and celebrate your achievements</p>
          </div>
        </div>

        {/* Stats */}
        <div className="journey-stats">
          <div className="journey-stat">
            <div className="stat-icon total"><FaBook /></div>
            <div className="stat-data">
              <span className="stat-num">{stats.total}</span>
              <span className="stat-text">Total Books</span>
            </div>
          </div>
          <div className="journey-stat">
            <div className="stat-icon reading"><FaBookOpen /></div>
            <div className="stat-data">
              <span className="stat-num">{stats.reading}</span>
              <span className="stat-text">Reading</span>
            </div>
          </div>
          <div className="journey-stat">
            <div className="stat-icon completed"><FaCircleCheck /></div>
            <div className="stat-data">
              <span className="stat-num">{stats.completed}</span>
              <span className="stat-text">Completed</span>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="filter-bar">
          {[
            { key: 'all', label: 'All Books', icon: <FaBook /> },
            { key: 'wishlist', label: 'Want to Read', icon: <FaHeart /> },
            { key: 'reading', label: 'Reading', icon: <FaBookOpen /> },
            { key: 'completed', label: 'Completed', icon: <FaCircleCheck /> }
          ].map(({ key, label, icon }) => (
            <button
              key={key}
              className={`filter-btn ${filterStatus === key ? 'active' : ''}`}
              onClick={() => setFilterStatus(key)}
            >
              {icon}
              <span>{label}</span>
              <span className="filter-count">
                {key === 'all' ? wishlistBooks.length : wishlistBooks.filter(b => b.status === key).length}
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading your reading journey...</p>
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📚</div>
            <h3>No Books Found</h3>
            <p>
              {filterStatus === 'all'
                ? 'Start your reading journey by adding books to your wishlist!'
                : `No books marked as "${filterStatus}" yet.`}
            </p>
            <Link to="/discover" className="discover-btn">Discover Books</Link>
          </div>
        ) : (
          <div className="books-grid">
            {filteredBooks.map((book) => {
              const statusBadge = getStatusBadge(book.status);
              const bookInfo = book.bookInfo?.volumeInfo;
              const rating = bookInfo?.averageRating;
              
              return (
                <div key={book.id} className="book-card">
                  <div className="book-cover">
                    <img
                      src={bookInfo?.imageLinks?.thumbnail || 'https://placehold.co/128x192?text=No+Cover'}
                      alt={bookInfo?.title || 'Book cover'}
                      onClick={() => navigate(`/book/${book.book_id}`)}
                    />
                    <div className={`status-badge ${statusBadge.class}`}>
                      {statusBadge.icon}
                      <span>{statusBadge.label}</span>
                    </div>
                    {rating && (
                      <div className="rating-badge">
                        <FaStar /> {rating.toFixed(1)}
                      </div>
                    )}
                  </div>
                  
                  <div className="book-info">
                    <h3 onClick={() => navigate(`/book/${book.book_id}`)}>
                      {bookInfo?.title || 'Unknown Title'}
                    </h3>
                    <p className="book-author">
                      {bookInfo?.authors?.join(', ') || 'Unknown Author'}
                    </p>
                    
                    {bookInfo?.pageCount && (
                      <p className="book-pages">{bookInfo.pageCount} pages</p>
                    )}
                    
                    <p className="book-added">
                      Added {new Date(book.added_at || book.created_at).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </p>
                    
                    <div className="book-actions">
                      <select
                        value={book.status || 'wishlist'}
                        onChange={(e) => updateStatus(book.book_id, e.target.value)}
                        className="status-select"
                      >
                        <option value="wishlist">💫 Want to Read</option>
                        <option value="reading">📖 Reading</option>
                        <option value="completed">✅ Completed</option>
                      </select>
                      
                      <button 
                        className="view-btn"
                        onClick={() => navigate(`/book/${book.book_id}`)}
                      >
                        <FaEye /> View
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReadingHistory;
