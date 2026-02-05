import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "./Book.css";
import booksImage from "../assets/image copy.png";
import kidsWithBook from "../assets/image.png";
import { toast } from "react-toastify";
import { FaChevronLeft } from "react-icons/fa";
import { FaChevronRight } from "react-icons/fa";
import { FaStar, FaEnvelope, FaUsers, FaCalendarAlt, FaQuoteLeft } from 'react-icons/fa'
import "react-toastify/dist/ReactToastify.css";
import { useLanguage } from "../context/LanguageContext";
import translations from "../i18n/translations";

const Book = () => {
  const { language } = useLanguage();
  const t = translations[language];
  const [title, setTitle] = useState("");
  const [debouncedTitle, setDebouncedTitle] = useState("");
  const [recommendedBooks, setRecommendedBooks] = useState([]);
  const [categories, setCategories] = useState({
    mostReadBooks: [],
    newReleases: [],
    trendingNow: [],
    bestOfTheYear: [],
  });
  const [currentSlides, setCurrentSlides] = useState({
    mostReadBooks: 0,
    newReleases: 0,
    trendingNow: 0,
    bestOfTheYear: 0,
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [featuredOfWeek, setFeaturedOfWeek] = useState(null);
  const [quote, setQuote] = useState(null);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [booksReadCount, setBooksReadCount] = useState(() => {
    try { return Number(localStorage.getItem('booksRead') || 0); } catch { return 0; }
  });
  const [topAuthors, setTopAuthors] = useState([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTitle(title);
    }, 500);

    return () => clearTimeout(timer);
  }, [title]);

  useEffect(() => {
    const fetchBooks = async () => {
      if (debouncedTitle.trim() === "") {
        setRecommendedBooks([]);
        setSearching(false);
        return;
      }

      setSearching(true);
      try {
        const response = await fetch(
          `https://www.googleapis.com/books/v1/volumes?q=${debouncedTitle}&maxResults=10`
        );
        if (!response.ok) throw new Error("Failed to fetch books");
        const data = await response.json();
        setRecommendedBooks(data.items || []);
      } catch (err) {
        console.error(err);
        toast.error("Failed to fetch books");
      } finally {
        setSearching(false);
      }
    };

    fetchBooks();
  }, [debouncedTitle]);

  useEffect(() => {
    const quotes = [
      "A room without books is like a body without a soul. — Cicero",
      "So many books, so little time. — Frank Zappa",
      "There is no friend as loyal as a book. — Ernest Hemingway",
      "Books are a uniquely portable magic. — Stephen King",
      "Read in order to live. — Gustave Flaubert"
    ];
    setQuote(quotes[Math.floor(Math.random() * quotes.length)]);

    const pickFeatured = () => {
      const possible = [
        ...(categories.bestOfTheYear || []),
        ...(categories.mostReadBooks || []),
        ...(categories.trendingNow || []),
        ...(categories.newReleases || [])
      ];
      if (possible.length > 0) {
        const found = possible.find(b => b?.volumeInfo?.imageLinks?.smallThumbnail) || possible[0];
        setFeaturedOfWeek(found);
      }
    };

    const computeTopAuthors = () => {
      const map = {};
      Object.values(categories).flat().forEach(book => {
        const authors = book?.volumeInfo?.authors || [];
        authors.forEach(a => { map[a] = (map[a] || 0) + 1; });
      });
      const sorted = Object.entries(map).sort((a,b) => b[1]-a[1]).slice(0,6).map(([a]) => a);
      setTopAuthors(sorted);
    };

    pickFeatured();
    computeTopAuthors();
  }, [categories]);

  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    if (!newsletterEmail || !newsletterEmail.includes('@')) {
      toast.error(t.pleaseProvideValidEmail);
      return;
    }
    try {
      const saved = JSON.parse(localStorage.getItem('newsletter') || '[]');
      if (!saved.includes(newsletterEmail)) saved.unshift(newsletterEmail);
      localStorage.setItem('newsletter', JSON.stringify(saved.slice(0, 50)));
      setNewsletterEmail('');
      toast.success(t.thanksForSubscribing);
    } catch (err) {
      console.error(err);
      toast.error(t.couldNotSaveSubscription);
    }
  };

  const markBookRead = useCallback(() => {
    setBooksReadCount(c => {
      const next = c + 1;
      try { localStorage.setItem('booksRead', String(next)); } catch {}
      return next;
    });
    toast.success(t.niceProgressSaved);
  }, [t]);

  // Single query set with 4 categories to reduce API calls
  const categoryQueries = {
    mostReadBooks: "bestseller&maxResults=6",
    newReleases: "subject:fiction&orderBy=newest&maxResults=6",
    trendingNow: "subject:popular+fiction&maxResults=6",
    bestOfTheYear: "subject:award+winners&maxResults=6",
  };

  // Cache key for sessionStorage
  const CACHE_KEY = 'homepage_books_cache';
  const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  // Fetch categories with caching to reduce API calls
  useEffect(() => {
    let mounted = true;

    const fetchCategoryBooks = async () => {
      // Check cache first
      try {
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_DURATION) {
            setCategories(data);
            setLoading(false);
            return;
          }
        }
      } catch (e) {
        console.error('Cache read error:', e);
      }

      setLoading(true);

      try {
        const results = {};
        // Fetch all categories in parallel
        const entries = Object.entries(categoryQueries);
        const responses = await Promise.all(
          entries.map(([_, query]) =>
            fetch(`https://www.googleapis.com/books/v1/volumes?q=${query}`)
          )
        );

        for (let i = 0; i < entries.length; i++) {
          const [category] = entries[i];
          if (responses[i].ok) {
            const data = await responses[i].json();
            results[category] = data.items || [];
          } else {
            results[category] = [];
          }
        }

        if (mounted) {
          setCategories(results);
          // Save to cache
          try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify({
              data: results,
              timestamp: Date.now()
            }));
          } catch (e) {
            console.error('Cache write error:', e);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchCategoryBooks();

    return () => {
      mounted = false;
    };
  }, []);

  function getAuthorFromBook(e, author){
    e.stopPropagation()
    navigate(`/authors/${author}`)
  }

 const handleSlide = (category, direction) => {
  setCurrentSlides((prev) => {
    const totalBooks = categories[category].length;
    const booksPerSlide = 4;
    const maxIndex = Math.max(0, totalBooks - booksPerSlide);
    let newIndex = prev[category] + direction * booksPerSlide;
    
    if (newIndex < 0) {
      newIndex = Math.floor(maxIndex / booksPerSlide) * booksPerSlide;
    } else if (newIndex > maxIndex) {
      newIndex = 0;
    } else {
      newIndex = Math.round(newIndex / booksPerSlide) * booksPerSlide;
    }
    
    return { ...prev, [category]: newIndex };
  });
};

  const [searching, setSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [showRecent, setShowRecent] = useState(false);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setTitle(val);
    // Hide recent searches while the user is actively typing (but don't clear values)
    if (val.trim()) {
      setSearching(true);
      setShowRecent(false);
    } else {
      setSearching(false);
      setShowRecent(true);
    }
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem('recentSearches');
      if (raw) setRecentSearches(JSON.parse(raw).slice(0, 5));
    } catch (err) {
      console.error('Failed to load recent searches', err);
    }
  }, []);

  const saveRecent = (term) => {
    if (!term || !term.trim()) return;
    setRecentSearches((prev) => {
      const next = [term, ...prev.filter((t) => t !== term)].slice(0, 5);
      try { localStorage.setItem('recentSearches', JSON.stringify(next)); } catch (err) {}
      return next;
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (title.trim()) {
        setDebouncedTitle(title);
        saveRecent(title);
        setShowRecent(false);
      }
    }
  };

  const handleSelectRecent = (term) => {
    setTitle(term);
    setDebouncedTitle(term);
    saveRecent(term);
    setShowRecent(false);
    setSearching(true);
  };

  const clearRecent = () => {
    setRecentSearches([]);
    try { localStorage.removeItem('recentSearches'); } catch (err) {}
  };

  const handleClearSearch = () => {
    setTitle("");
    setDebouncedTitle("");
    setRecommendedBooks([]);
    setSearching(false);
  };

  const handleBookClick = (book) => {
    // If this book comes from the current recommended results, save the
    // active search term so it appears in recent searches when returning.
    try {
      const isRecommended = recommendedBooks?.some((b) => b?.id === book?.id);
      const bookTitle = book?.volumeInfo?.title || '';
      if (isRecommended) {
        // prefer the active search query if present, otherwise save the book title
        const termToSave = title?.trim() || bookTitle;
        if (termToSave) saveRecent(termToSave);
      }
    } catch (err) {
      // ignore
    }

    navigate(`/book/${book.id}`, { state: { book , id: book.id } });
  };

  const renderSlideshow = (category, books) => {
    const categoryNames = {
      mostReadBooks: t.mostReadBooks,
      newReleases: t.newReleases,
      trendingNow: t.trendingNow,
      bestOfTheYear: t.bestOfTheYear,
    };
    
    if (!books || books.length === 0) {
      return <p>{t.noResults}</p>;
    }

    const currentIndex = currentSlides[category];
    const booksPerSlide = 4;
    const visibleBooks = books.slice(currentIndex, currentIndex + booksPerSlide);

    return (
      <div className="slideshow">
        <h2>{categoryNames[category] || category.replace(/([A-Z])/g, " $1").trim()}</h2>
        <div className="slideshow-container">
        
            <button 
              className="slide-button prev"
              onClick={() => handleSlide(category, -1)}
              disabled={books.length <= booksPerSlide}
            >
              <FaChevronLeft />
            </button>
      
          <div className="slide-items">
            {visibleBooks?.map((book) => (
              <div
                key={book.id}
                className="slide-item"
                onClick={() => handleBookClick(book)}
              >
                <img
                  src={book?.volumeInfo?.imageLinks?.smallThumbnail || "https://placehold.co/128x192?text=No+Image"}
                  alt={book?.volumeInfo?.title || t.unknownTitle}
                />
                <p>{book?.volumeInfo?.title?.slice(0,100) || t.unknownTitle}</p>
                <p className="author" onClick={(e) => getAuthorFromBook(e,book?.volumeInfo?.authors[0])}>{t.by} {book?.volumeInfo?.authors?.join(", ") || t.unknownAuthor}</p>
              </div>
            ))}
            {visibleBooks?.length < booksPerSlide &&
              Array?.from({ length: booksPerSlide - visibleBooks.length })?.map((_, index) => (
                <div key={`placeholder-${index}`} className="slide-item placeholder">
                  <div className="placeholder-image"></div>
                  <p>{t.noBookAvailable}</p>
                </div>
              ))}
          </div>
        
            <button 
              className="slide-button next"
              onClick={() => handleSlide(category, 1)}
              disabled={books.length <= booksPerSlide}
            >
              <FaChevronRight />
            </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="headerContainer">
        <div className="headerImage">
          <img src={booksImage} alt="Books" />
        </div>
        <div className="searchContainer">
          <h1>{t.searchTheBook}</h1>
          <div className="search-input-wrapper">
            <input
              className="title-input"
              placeholder={t.enterBookName}
              value={title}
              onChange={handleInputChange}
              onFocus={() => setShowRecent(true)}
              onBlur={() => setTimeout(() => setShowRecent(false), 150)}
              onKeyDown={handleKeyDown}
              type="text"
            />
            {title && (
              <button className="clear-search-btn" onClick={handleClearSearch} type="button">
                ✕
              </button>
            )}
            {searching && <div className="search-spinner"></div>}
          </div>
          {recommendedBooks?.length > 0 && (
            <div className="recommendations">
              {recommendedBooks?.slice(0, 5)?.map((book) => (
                <div
                  key={book?.id}
                  onClick={() => handleBookClick(book)}
                  className="recommendation-item"
                >
                  <img
                    src={
                      book?.volumeInfo?.imageLinks?.smallThumbnail ||
                      book?.volumeInfo?.imageLinks?.thumbnail ||
                      "https://placehold.co/128x192?text=No+Image"
                    }
                    alt={book?.volumeInfo?.title || t.unknownTitle}
                  />
                  <p>{book?.volumeInfo?.title?.slice(0,50) || t.unknownTitle}{book?.volumeInfo?.authors?.[0] && ` - ${book.volumeInfo.authors[0]}`}</p>
                </div>
              ))}
            </div>
          )}
          {showRecent && recentSearches?.length > 0 && (
            <div className="recent-searches">
              <div className="recent-header">
                <span>{t.recentSearches}</span>
                <button className="clear-recent" onMouseDown={(e)=>{e.preventDefault(); clearRecent();}}>{t.clear}</button>
              </div>
              {recentSearches.map((s, i) => (
                <div
                  key={i}
                  className="recent-item"
                  onMouseDown={() => handleSelectRecent(s)}
                  onClick={() => handleSelectRecent(s)}
                >
                  <p>{s}</p>
                </div>
              ))}
            </div>
          )}
          <img className="kidsImage" src={kidsWithBook} alt="Kids with book" />
        </div>
      </div>
      <div className="homepage-widgets">
        <div className="widgets-top">
          <div className="book-of-the-week">
            {featuredOfWeek ? (
              <div className="book-of-the-week-content">
                <img className="book-of-the-week-image" src={featuredOfWeek?.volumeInfo?.imageLinks?.smallThumbnail || featuredOfWeek?.volumeInfo?.imageLinks?.thumbnail || 'https://placehold.co/220x320?text=No+Image'} alt={featuredOfWeek?.volumeInfo?.title} />
                <div className="book-of-the-week-details">
                  <h2>{featuredOfWeek?.volumeInfo?.title}</h2>
                  <p className="author">{t.by} {featuredOfWeek?.volumeInfo?.authors?.join(', ') || t.unknownAuthor}</p>
                  <p className="description">{featuredOfWeek?.volumeInfo?.description?.slice(0,300) || featuredOfWeek?.volumeInfo?.subtitle || t.noDescription}</p>
                  <div className="book-of-the-week-actions">
                    <button className="view-details-button" onClick={() => handleBookClick(featuredOfWeek)}>{t.viewDetails}</button>
                    <button className="view-details-button secondary-btn" onClick={markBookRead}>{t.markRead}</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="book-of-the-week loading">
                <div className="spinner"></div>
                <span style={{marginLeft: '12px'}}>{t.loadingFeatured}</span>
              </div>
            )}
          </div>

          <div className="widgets-right">
            <div className="quote-widget">
              <h3><FaQuoteLeft className="icon-inline"/>{t.quoteOfTheDay}</h3>
              <p className="muted">{quote || t.booksOpenTheWay}</p>
            </div>

            <div className="challenge-widget">
              <h4><FaCalendarAlt className="icon-inline"/>{t.readingChallenge}</h4>
              <p className="muted">{t.booksReadThisMonth}: <strong>{booksReadCount}</strong></p>
              <div className="progress-bar">
                <div className="progress-fill" style={{width: `${Math.min(100, booksReadCount * 10)}%`}} />
              </div>
              <div className="challenge-actions">
                <button className="view-details-button" onClick={markBookRead}>{t.iFinishedABook}</button>
              </div>
            </div>

            <form onSubmit={handleNewsletterSubmit} className="newsletter-widget">
              <FaEnvelope className="newsletter-icon" />
              <input value={newsletterEmail} onChange={(e)=>setNewsletterEmail(e.target.value)} placeholder={t.yourEmailForUpdates} className="newsletter-input" />
              <button className="view-details-button" type="submit">{t.subscribe}</button>
            </form>
          </div>
        </div>

        <div className="authors-widget">
          <h3><FaUsers className="icon-inline"/>{t.featuredAuthors}</h3>
          <div className="authors-list">
            {topAuthors.length > 0 ? topAuthors.map((a, i) => (
              <div key={i} className="author-chip" onClick={()=>navigate(`/authors/${encodeURIComponent(a)}`)}>{a}</div>
            )) : <p className="muted">{t.noAuthorsToShow}</p>}
          </div>
        </div>
      </div>

      <hr />
      <div className="categories-container">
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
          </div>
        ) : (
          Object.entries(categories)?.map(([category, books]) => (
            <div key={category} className="category-section">
              {renderSlideshow(category, books)}
            </div>
          ))
        )}
        {!loading &&  <footer style={{textAlign: "center"}}>{t.createdBy} @Suad Pllana </footer>}
       
      </div>

    </>
  );
};

export default Book;