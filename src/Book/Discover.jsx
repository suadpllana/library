import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaFire, FaStar, FaClock, FaAward, FaBookOpen, FaArrowRight } from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi';
import './Discover.css';

const Discover = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('trending');
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [featuredBook, setFeaturedBook] = useState(null);

  const tabs = [
    { id: 'trending', label: 'Trending Now', icon: <FaFire />, query: 'subject:fiction&orderBy=relevance' },
    { id: 'new', label: 'New Arrivals', icon: <HiSparkles />, query: 'subject:fiction&orderBy=newest' },
    { id: 'topRated', label: 'Top Rated', icon: <FaStar />, query: 'bestseller+2024' },
    { id: 'classics', label: 'Classics', icon: <FaAward />, query: 'subject:classics' },
    { id: 'recommended', label: 'Staff Picks', icon: <FaBookOpen />, query: 'award+winning+fiction' },
  ];

  useEffect(() => {
    fetchBooks();
  }, [activeTab]);

  const fetchBooks = async () => {
    setLoading(true);
    const currentTab = tabs.find(t => t.id === activeTab);
    
    try {
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${currentTab.query}&maxResults=20`
      );
      const data = await response.json();
      const fetchedBooks = data.items || [];
      setBooks(fetchedBooks);
      
      // Set featured book (first book with good image)
      const featured = fetchedBooks.find(b => b.volumeInfo?.imageLinks?.thumbnail);
      setFeaturedBook(featured);
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookClick = (book) => {
    navigate(`/book/${book.id}`, { state: { book } });
  };

  const getBookImage = (book) => {
    return book.volumeInfo?.imageLinks?.thumbnail || 
           book.volumeInfo?.imageLinks?.smallThumbnail || 
           'https://placehold.co/128x192?text=No+Image';
  };

  return (
    <div className="discover-page">
      {/* Hero Section */}
      <div className="discover-hero">
        <div className="hero-content">
          <h1>Discover Your Next <span className="gradient-text">Great Read</span></h1>
          <p>Explore curated collections, trending titles, and hidden gems</p>
        </div>
        
        {featuredBook && (
          <div className="featured-book" onClick={() => handleBookClick(featuredBook)}>
            <div className="featured-badge">
              <HiSparkles /> Featured
            </div>
            <img src={getBookImage(featuredBook)} alt={featuredBook.volumeInfo?.title} />
            <div className="featured-info">
              <h3>{featuredBook.volumeInfo?.title}</h3>
              <p>{featuredBook.volumeInfo?.authors?.[0]}</p>
              <button className="view-btn">
                View Details <FaArrowRight />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="discover-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Books Grid */}
      <div className="discover-content">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading amazing books...</p>
          </div>
        ) : (
          <div className="books-grid">
            {books.map((book, index) => (
              <div 
                key={book.id} 
                className="book-card"
                onClick={() => handleBookClick(book)}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="book-image-wrapper">
                  <img src={getBookImage(book)} alt={book.volumeInfo?.title} />
                  <div className="book-overlay">
                    <span className="quick-view">Quick View</span>
                  </div>
                  {book.volumeInfo?.averageRating && (
                    <div className="rating-badge">
                      <FaStar /> {book.volumeInfo.averageRating}
                    </div>
                  )}
                </div>
                <div className="book-info">
                  <h4>{book.volumeInfo?.title?.slice(0, 50)}{book.volumeInfo?.title?.length > 50 ? '...' : ''}</h4>
                  <p className="author">{book.volumeInfo?.authors?.[0] || 'Unknown Author'}</p>
                  {book.volumeInfo?.categories && (
                    <span className="category-tag">{book.volumeInfo.categories[0]}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="discover-stats">
        <div className="stat-card">
          <FaBookOpen className="stat-icon" />
          <div>
            <h3>10,000+</h3>
            <p>Books Available</p>
          </div>
        </div>
        <div className="stat-card">
          <FaStar className="stat-icon" />
          <div>
            <h3>4.5</h3>
            <p>Average Rating</p>
          </div>
        </div>
        <div className="stat-card">
          <FaFire className="stat-icon" />
          <div>
            <h3>500+</h3>
            <p>New This Month</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Discover;
