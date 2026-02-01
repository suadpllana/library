import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './AuthorPage.css';
import { FaArrowLeftLong, FaBook, FaMagnifyingGlass, FaGrip, FaList, FaArrowDownWideShort, FaCalendarDays, FaStar, FaFont } from "react-icons/fa6";
import { useLanguage } from '../context/LanguageContext';
import translations from '../i18n/translations';

// Cache for author books
const AUTHOR_CACHE_KEY = 'author_books_cache';
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

const AuthorPage = () => {
  const { authorName } = useParams();
  const { language } = useLanguage();
  const t = translations[language];
  const [authorBooks, setAuthorBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'oldest', 'rating', 'title'
  const navigate = useNavigate();



  useEffect(() => {
    const fetchAuthorBooks = async () => {
      const cacheKey = `${AUTHOR_CACHE_KEY}_${authorName}`;
      
      // Check cache first
      try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_DURATION) {
            setAuthorBooks(data);
            setLoading(false);
            return;
          }
        }
      } catch (e) {
        console.error('Cache read error:', e);
      }

      setLoading(true);
      try {
        const response = await fetch(
          `https://www.googleapis.com/books/v1/volumes?q=inauthor:"${encodeURIComponent(
            decodeURIComponent(authorName)
          )}"&maxResults=40`
        );
        if (!response.ok) throw new Error("Failed to fetch author's books");
        const data = await response.json();
        const books = data.items || [];
        setAuthorBooks(books);

        // Save to cache
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify({
            data: books,
            timestamp: Date.now()
          }));
        } catch (e) {
          console.error('Cache write error:', e);
        }
      } catch (err) {
        console.error(err);
        toast.error(`Failed to fetch books by ${decodeURIComponent(authorName)}`);
      } finally {
        setLoading(false);
      }
    };

    fetchAuthorBooks();
  }, [authorName]);

  const filteredBooks = useMemo(() => {
    let books = authorBooks;
    
    // Filter by search term
    if (searchTerm) {
      books = books.filter((book) =>
        book?.volumeInfo?.title?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Sort books
    const sorted = [...books].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return (b.volumeInfo?.publishedDate || '').localeCompare(a.volumeInfo?.publishedDate || '');
        case 'oldest':
          return (a.volumeInfo?.publishedDate || '').localeCompare(b.volumeInfo?.publishedDate || '');
        case 'rating':
          return (b.volumeInfo?.averageRating || 0) - (a.volumeInfo?.averageRating || 0);
        case 'title':
          return (a.volumeInfo?.title || '').localeCompare(b.volumeInfo?.title || '');
        default:
          return 0;
      }
    });
    
    return sorted;
  }, [authorBooks, searchTerm, sortBy]);

  const handleBookClick = (book) => {
    navigate(`/book/${book.id}`, { state: { book } });
  };

  const decodedAuthorName = decodeURIComponent(authorName);
  const totalBooks = authorBooks.length;
  const avgRating = authorBooks.reduce((sum, book) => 
    sum + (book.volumeInfo?.averageRating || 0), 0) / (authorBooks.filter(b => b.volumeInfo?.averageRating).length || 1);

  return (
    <div className="author-detail">
      <h3 className="back-link" onClick={() => navigate(-1)}>
        <FaArrowLeftLong/> {t.goBack}
      </h3>

      {/* Hero Section */}
      <div className="author-hero">
        <div className="author-avatar">
          <span>{decodedAuthorName.charAt(0).toUpperCase()}</span>
        </div>
        <div className="author-info">
          <h1>{decodedAuthorName}</h1>
          <p className="author-tagline">{t.exploreCurated}</p>
          <div className="author-stats">
            <div className="stat">
              <span className="stat-value">{totalBooks}</span>
              <span className="stat-label">{t.books}</span>
            </div>
            {avgRating > 0 && (
              <div className="stat">
                <span className="stat-value">⭐ {avgRating.toFixed(1)}</span>
                <span className="stat-label">{t.averageRating}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search & Controls Section */}
      <div className="search-section">
        <div className="controls-row">
          <div className="search-container">
            <FaMagnifyingGlass className="search-icon" />
            <input
              type="text"
              placeholder={t.searchBooks}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
              aria-label={t.searchBooks}
            />
          </div>
          
          <div className="view-controls">
            <div className="sort-dropdown">
              <FaArrowDownWideShort className="sort-icon" />
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className="sort-select"
              >
                <option value="newest">{t.newest}</option>
                <option value="oldest">{t.oldest}</option>
                <option value="rating">{t.rating}</option>
                <option value="title">{t.titleAZ}</option>
              </select>
            </div>
            
            <div className="view-toggle">
              <button 
                className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title={t.gridView}
              >
                <FaGrip />
              </button>
              <button 
                className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                title={t.listView}
              >
                <FaList />
              </button>
            </div>
          </div>
        </div>
        
        {searchTerm && (
          <p className="search-results-text">
            {t.found || 'Found'} {filteredBooks.length} {filteredBooks.length !== 1 ? t.books : t.book}
          </p>
        )}
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>{t.loading}</p>
        </div>
      ) : filteredBooks.length === 0 ? (
        <div className="empty-state">
          <FaBook className="empty-icon" />
          <h3>{t.noResults}</h3>
          <p>
            {authorBooks.length === 0
              ? t.noAuthorsFound
              : t.noResults}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="author-books-grid">
          {filteredBooks?.map((book, index) => (
            <div
              key={book.id}
              className="author-book-item"
              onClick={() => handleBookClick(book)}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="book-cover-wrapper">
                <img
                  src={
                    book?.volumeInfo?.imageLinks?.thumbnail ||
                    book?.volumeInfo?.imageLinks?.smallThumbnail ||
                    'https://placehold.co/128x192?text=No+Image'
                  }
                  alt={book?.volumeInfo?.title || 'No Title'}
                />
                {book.volumeInfo?.averageRating && (
                  <span className="rating-badge">
                    ⭐ {book.volumeInfo.averageRating}
                  </span>
                )}
              </div>
              <div className="book-info">
                <p className="book-title">{book?.volumeInfo?.title?.slice(0, 60) || t.unknownTitle}{book?.volumeInfo?.title?.length > 60 ? '...' : ''}</p>
                <div className="book-meta">
                  <span className="book-year">
                    <FaCalendarDays /> {book?.volumeInfo?.publishedDate?.slice(0, 4) || 'N/A'}
                  </span>
                  {book.volumeInfo?.pageCount && (
                    <span className="book-pages">
                      <FaBook /> {book.volumeInfo.pageCount}p
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="author-books-list">
          {filteredBooks?.map((book, index) => (
            <div
              key={book.id}
              className="author-book-list-item"
              onClick={() => handleBookClick(book)}
              style={{ animationDelay: `${index * 0.03}s` }}
            >
              <img
                src={
                  book?.volumeInfo?.imageLinks?.thumbnail ||
                  book?.volumeInfo?.imageLinks?.smallThumbnail ||
                  'https://placehold.co/128x192?text=No+Image'
                }
                alt={book?.volumeInfo?.title || 'No Title'}
                className="list-book-cover"
              />
              <div className="list-book-info">
                <h3 className="list-book-title">{book?.volumeInfo?.title || t.unknownTitle}</h3>
                <div className="list-book-meta">
                  <span className="meta-item">
                    <FaCalendarDays /> {book?.volumeInfo?.publishedDate?.slice(0, 4) || 'N/A'}
                  </span>
                  {book.volumeInfo?.pageCount && (
                    <span className="meta-item">
                      <FaBook /> {book.volumeInfo.pageCount} {t.pages}
                    </span>
                  )}
                  {book.volumeInfo?.averageRating && (
                    <span className="meta-item rating">
                      <FaStar /> {book.volumeInfo.averageRating} / 5
                    </span>
                  )}
                </div>
                {book.volumeInfo?.description && (
                  <p className="list-book-description">
                    {book.volumeInfo.description.slice(0, 200)}{book.volumeInfo.description.length > 200 ? '...' : ''}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AuthorPage;