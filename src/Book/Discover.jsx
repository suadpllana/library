import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaFire, FaStar, FaClock, FaAward, FaBookOpen, FaArrowRight, FaUser, FaHeart, FaRandom, FaLightbulb } from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import translations from '../i18n/translations';
import './Discover.css';

const Discover = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useLanguage();
  const t = translations[language];
  const [activeTab, setActiveTab] = useState('trending');
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [featuredBook, setFeaturedBook] = useState(null);
  const [personalizedBooks, setPersonalizedBooks] = useState([]);
  const [userCategories, setUserCategories] = useState([]);
  const [loadingPersonalized, setLoadingPersonalized] = useState(false);
  const [randomPick, setRandomPick] = useState(null);

  // Cache for API responses
  const DISCOVER_CACHE_KEY = 'discover_books_cache';
  const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  const tabs = [
    { id: 'trending', label: t.trendingNowTab, icon: <FaFire />, query: 'subject:fiction&orderBy=relevance' },
    { id: 'forYou', label: t.forYou, icon: <FaUser />, query: null },
    { id: 'new', label: t.newArrivals, icon: <HiSparkles />, query: 'subject:fiction&orderBy=newest' },
    { id: 'topRated', label: t.topRated, icon: <FaStar />, query: 'bestseller+2024' },
    { id: 'classics', label: t.classics, icon: <FaAward />, query: 'subject:classics' },
    { id: 'recommended', label: t.staffPicks, icon: <FaBookOpen />, query: 'award+winning+fiction' },
  ];

  useEffect(() => {
    if (activeTab === 'forYou') {
      fetchPersonalizedRecommendations();
    } else {
      fetchBooks();
    }
  }, [activeTab]);

  useEffect(() => {
    if (user) {
      fetchUserPreferences();
    }
  }, [user]);

  const fetchUserPreferences = async () => {
    try {
      // Get user's wishlist and loans to understand their preferences
      const [wishlistRes, loansRes] = await Promise.all([
        supabase.from('wishlist').select('categories').eq('user_id', user.id),
        supabase.from('loan_requests').select('categories').eq('user_id', user.id)
      ]);

      const allCategories = [];
      
      wishlistRes.data?.forEach(item => {
        if (item.categories) {
          allCategories.push(...(Array.isArray(item.categories) ? item.categories : [item.categories]));
        }
      });
      
      loansRes.data?.forEach(item => {
        if (item.categories) {
          allCategories.push(...(Array.isArray(item.categories) ? item.categories : [item.categories]));
        }
      });

      // Count category frequency
      const categoryCount = allCategories.reduce((acc, cat) => {
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
      }, {});

      // Get top categories
      const topCategories = Object.entries(categoryCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([cat]) => cat);

      setUserCategories(topCategories.length > 0 ? topCategories : ['fiction', 'mystery', 'science']);
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      setUserCategories(['fiction', 'mystery', 'science']);
    }
  };

  const fetchPersonalizedRecommendations = async () => {
    const cacheKey = `${DISCOVER_CACHE_KEY}_personalized`;
    
    // Check cache first
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          setBooks(data.books);
          setFeaturedBook(data.featured);
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      console.error('Cache read error:', e);
    }

    setLoadingPersonalized(true);
    setLoading(true);
    
    try {
      const categoriesToUse = userCategories.length > 0 ? userCategories : ['fiction', 'mystery', 'science'];
      // Use single query with combined subjects to reduce API calls
      const combinedQuery = categoriesToUse.slice(0, 2).map(c => `subject:${c}`).join('+OR+');
      
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(combinedQuery)}&maxResults=20&orderBy=relevance`
      );
      const data = await response.json();
      const allBooks = data.items || [];

      // Shuffle books
      const shuffled = allBooks.sort(() => Math.random() - 0.5);
      
      setBooks(shuffled.slice(0, 16));
      const featured = shuffled.find(b => b.volumeInfo?.imageLinks?.thumbnail);
      setFeaturedBook(featured);

      // Save to cache
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify({
          data: { books: shuffled.slice(0, 16), featured },
          timestamp: Date.now()
        }));
      } catch (e) {
        console.error('Cache write error:', e);
      }
    } catch (error) {
      console.error('Error fetching personalized books:', error);
    } finally {
      setLoading(false);
      setLoadingPersonalized(false);
    }
  };

  const getRandomPick = async () => {
    setRandomPick(null);
    const categories = ['thriller', 'romance', 'science fiction', 'biography', 'history', 'fantasy', 'mystery'];
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    
    try {
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=subject:${randomCategory}&maxResults=20`
      );
      const data = await response.json();
      if (data.items?.length > 0) {
        const randomIndex = Math.floor(Math.random() * data.items.length);
        setRandomPick(data.items[randomIndex]);
      }
    } catch (error) {
      console.error('Error getting random pick:', error);
    }
  };

  const fetchBooks = async () => {
    const currentTab = tabs.find(t => t.id === activeTab);
    const cacheKey = `${DISCOVER_CACHE_KEY}_${activeTab}`;
    
    // Check cache first
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          setBooks(data.books);
          setFeaturedBook(data.featured);
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
        `https://www.googleapis.com/books/v1/volumes?q=${currentTab.query}&maxResults=12`
      );
      const data = await response.json();
      const fetchedBooks = data.items || [];
      setBooks(fetchedBooks);
      
      // Set featured book (first book with good image)
      const featured = fetchedBooks.find(b => b.volumeInfo?.imageLinks?.thumbnail);
      setFeaturedBook(featured);

      // Save to cache
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify({
          data: { books: fetchedBooks, featured },
          timestamp: Date.now()
        }));
      } catch (e) {
        console.error('Cache write error:', e);
      }
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
          <h1>{t.discoverNextRead} <span className="gradient-text">{t.greatRead}</span></h1>
          <p>{t.exploreCurated}</p>
        </div>
        
        {featuredBook && (
          <div className="featured-book" onClick={() => handleBookClick(featuredBook)}>
            <div className="featured-badge">
              <HiSparkles /> {t.featured}
            </div>
            <img src={getBookImage(featuredBook)} alt={featuredBook.volumeInfo?.title} />
            <div className="featured-info">
              <h3>{featuredBook.volumeInfo?.title}</h3>
              <p>{featuredBook.volumeInfo?.authors?.[0]}</p>
              <button className="view-btn">
                {t.viewDetails} <FaArrowRight />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Personalized Section */}
      {user && userCategories.length > 0 && activeTab !== 'forYou' && (
        <div className="personalized-section">
          <div className="personalized-header">
            <FaLightbulb className="bulb-icon" />
            <div>
              <h3>{t.basedOnInterests}</h3>
              <p>{t.youSeemToEnjoy}: {userCategories.join(', ')}</p>
            </div>
            <button className="see-more-btn" onClick={() => setActiveTab('forYou')}>
              {t.seeRecommendations} <FaArrowRight />
            </button>
          </div>
        </div>
      )}

      {/* Random Pick Section */}
      <div className="random-pick-section">
        <button className="random-btn" onClick={getRandomPick}>
          <FaRandom /> {t.surpriseMe}
        </button>
        {randomPick && (
          <div className="random-result" onClick={() => handleBookClick(randomPick)}>
            <img src={getBookImage(randomPick)} alt={randomPick.volumeInfo?.title} />
            <div className="random-info">
              <span className="random-label">{t.yourRandomPick}:</span>
              <h4>{randomPick.volumeInfo?.title}</h4>
              <p>{randomPick.volumeInfo?.authors?.[0]}</p>
              <span className="random-category">{randomPick.volumeInfo?.categories?.[0] || 'General'}</span>
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

      {/* For You Info Banner */}
      {activeTab === 'forYou' && (
        <div className="for-you-banner">
          <FaHeart className="banner-icon" />
          <div>
            <h4>{t.personalizedForYou}</h4>
            <p>{t.booksBasedOnHistory} ({userCategories.join(', ')})</p>
          </div>
        </div>
      )}

      {/* Books Grid */}
      <div className="discover-content">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>{activeTab === 'forYou' ? t.findingBooksForYou : t.loadingAmazingBooks}</p>
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
             
                  {book.volumeInfo?.averageRating && (
                    <div className="rating-badge">
                      <FaStar /> {book.volumeInfo.averageRating}
                    </div>
                  )}
                  {book.recommendedCategory && (
                    <div className="recommended-badge">
                      <FaHeart /> {book.recommendedCategory}
                    </div>
                  )}
                </div>
                <div className="book-info">
                  <h4>{book.volumeInfo?.title?.slice(0, 50)}{book.volumeInfo?.title?.length > 50 ? '...' : ''}</h4>
                  <p className="author">{book.volumeInfo?.authors?.[0] || t.unknownAuthor}</p>
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
            <p>{t.booksAvailable}</p>
          </div>
        </div>
        <div className="stat-card">
          <FaStar className="stat-icon" />
          <div>
            <h3>4.5</h3>
            <p>{t.averageRating}</p>
          </div>
        </div>
        <div className="stat-card">
          <FaFire className="stat-icon" />
          <div>
            <h3>500+</h3>
            <p>{t.newThisMonth}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Discover;
