import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './AuthorPage.css';
import { FaArrowLeftLong, FaBook, FaMagnifyingGlass } from "react-icons/fa6";

const AuthorPage = () => {
  const { authorName } = useParams();
  const [authorBooks, setAuthorBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();



  useEffect(() => {
    const fetchAuthorBooks = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `https://www.googleapis.com/books/v1/volumes?q=inauthor:"${encodeURIComponent(
            decodeURIComponent(authorName)
          )}"&maxResults=40`
        );
        if (!response.ok) throw new Error("Failed to fetch author's books");
        const data = await response.json();
        setAuthorBooks(data.items || []);
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
    if (!searchTerm) return authorBooks;
    return authorBooks.filter((book) =>
      book?.volumeInfo?.title?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [authorBooks, searchTerm]);

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
        <FaArrowLeftLong/> Go Back
      </h3>

      {/* Hero Section */}
      <div className="author-hero">
        <div className="author-avatar">
          <span>{decodedAuthorName.charAt(0).toUpperCase()}</span>
        </div>
        <div className="author-info">
          <h1>{decodedAuthorName}</h1>
          <p className="author-tagline">Discover the complete collection</p>
          <div className="author-stats">
            <div className="stat">
              <span className="stat-value">{totalBooks}</span>
              <span className="stat-label">Books</span>
            </div>
            {avgRating > 0 && (
              <div className="stat">
                <span className="stat-value">⭐ {avgRating.toFixed(1)}</span>
                <span className="stat-label">Avg Rating</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="search-section">
        <div className="search-container">
          <FaMagnifyingGlass className="search-icon" />
          <input
            type="text"
            placeholder="Search books by title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
            aria-label="Search books by title"
          />
        </div>
        {searchTerm && (
          <p className="search-results-text">
            Found {filteredBooks.length} book{filteredBooks.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Discovering books...</p>
        </div>
      ) : filteredBooks.length === 0 ? (
        <div className="empty-state">
          <FaBook className="empty-icon" />
          <h3>No Books Found</h3>
          <p>
            {authorBooks.length === 0
              ? 'No books found for this author.'
              : 'No books match your search.'}
          </p>
        </div>
      ) : (
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
                <p className="book-title">{book?.volumeInfo?.title?.slice(0, 60) || 'Unknown Title'}{book?.volumeInfo?.title?.length > 60 ? '...' : ''}</p>
                <p className="book-year">
                  {book?.volumeInfo?.publishedDate?.slice(0, 4) || 'N/A'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AuthorPage;