import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import './ReadingHistory.css';

const ReadingHistory = () => {
  const { user } = useAuth();
  const [wishlistBooks, setWishlistBooks] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, reading: 0, completed: 0 });

  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user]);

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('wishlist')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch book details for each item
      const booksWithDetails = await Promise.all(
        (data || []).map(async (item) => {
          try {
            const response = await fetch(
              `https://www.googleapis.com/books/v1/volumes/${item.book_id}`
            );
            const bookData = await response.json();
            return { ...item, bookInfo: bookData };
          } catch {
            return { ...item, bookInfo: null };
          }
        })
      );

      setWishlistBooks(booksWithDetails);

      // Calculate stats
      const completed = booksWithDetails.filter(b => b.status === 'completed').length;
      const reading = booksWithDetails.filter(b => b.status === 'reading').length;
      setStats({
        total: booksWithDetails.length,
        reading,
        completed
      });
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
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

      setWishlistBooks(prev =>
        prev.map(book =>
          book.book_id === bookId ? { ...book, status: newStatus } : book
        )
      );

      // Update stats
      const updatedBooks = wishlistBooks.map(book =>
        book.book_id === bookId ? { ...book, status: newStatus } : book
      );
      const completed = updatedBooks.filter(b => b.status === 'completed').length;
      const reading = updatedBooks.filter(b => b.status === 'reading').length;
      setStats({ total: updatedBooks.length, reading, completed });
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const filteredBooks = filterStatus === 'all'
    ? wishlistBooks
    : wishlistBooks.filter(book => book.status === filterStatus);

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
    <div className="history-page">
      <div className="history-header">
        <div className="header-content">
          <h1>📖 My Reading Journey</h1>
          <p>Track your progress and celebrate your reading achievements</p>
        </div>
      </div>

      {/* Stats Section */}
      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-icon">📚</div>
          <div className="stat-content">
            <span className="stat-number">{stats.total}</span>
            <span className="stat-label">Total Books</span>
          </div>
        </div>
        <div className="stat-card reading">
          <div className="stat-icon">📖</div>
          <div className="stat-content">
            <span className="stat-number">{stats.reading}</span>
            <span className="stat-label">Currently Reading</span>
          </div>
        </div>
        <div className="stat-card completed">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <span className="stat-number">{stats.completed}</span>
            <span className="stat-label">Completed</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        {[
          { key: 'all', label: 'All Books', icon: '📚' },
          { key: 'wishlist', label: 'Want to Read', icon: '💫' },
          { key: 'reading', label: 'Reading', icon: '📖' },
          { key: 'completed', label: 'Completed', icon: '✅' }
        ].map(({ key, label, icon }) => (
          <button
            key={key}
            className={`filter-tab ${filterStatus === key ? 'active' : ''}`}
            onClick={() => setFilterStatus(key)}
          >
            <span>{icon}</span> {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading your reading history...</p>
        </div>
      ) : filteredBooks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📚</div>
          <h3>No Books Found</h3>
          <p>
            {filterStatus === 'all'
              ? 'Start building your library by adding books to your wishlist!'
              : `No books in "${filterStatus}" status yet.`}
          </p>
          <Link to="/discover" className="discover-btn">Discover Books</Link>
        </div>
      ) : (
        <div className="history-list">
          {filteredBooks.map((book) => (
            <div key={book.id} className="history-card">
              <Link to={`/book/${book.book_id}`}>
                <img
                  src={
                    book.bookInfo?.volumeInfo?.imageLinks?.thumbnail ||
                    'https://via.placeholder.com/128x192?text=No+Cover'
                  }
                  alt={book.bookInfo?.volumeInfo?.title || 'Book cover'}
                />
              </Link>
              
              <div className="book-details">
                <Link to={`/book/${book.book_id}`}>
                  <h3>{book.bookInfo?.volumeInfo?.title || 'Unknown Title'}</h3>
                </Link>
                <p className="author">
                  {book.bookInfo?.volumeInfo?.authors?.join(', ') || 'Unknown Author'}
                </p>
                <p className="date">
                  Added: {new Date(book.added_at).toLocaleDateString()}
                </p>
                
                <div className="status-selector">
                  <label>Status:</label>
                  <select
                    value={book.status || 'wishlist'}
                    onChange={(e) => updateStatus(book.book_id, e.target.value)}
                  >
                    <option value="wishlist">Want to Read</option>
                    <option value="reading">Currently Reading</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="book-actions">
                <Link to={`/book/${book.book_id}`} className="view-btn">
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReadingHistory;
