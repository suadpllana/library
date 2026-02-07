import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FaSearch, FaFilter, FaTimes, FaStar, FaCalendar, FaBook, FaUser, FaGlobe } from 'react-icons/fa';
import { useLanguage } from '../context/LanguageContext';
import translations from '../i18n/translations';
import './AdvancedSearch.css';

const SUBJECTS = [
  'Fiction', 'Non-fiction', 'Science Fiction', 'Fantasy', 'Mystery', 
  'Romance', 'Thriller', 'Biography', 'History', 'Science', 
  'Technology', 'Philosophy', 'Psychology', 'Self-Help', 'Business',
  'Art', 'Poetry', 'Drama', 'Children', 'Young Adult'
];

const LANGUAGES = [
  { code: '', label: 'Any Language', labelKey: 'anyLanguage' },
  { code: 'en', label: 'English', labelKey: 'english' },
  { code: 'es', label: 'Spanish', labelKey: 'spanish' },
  { code: 'fr', label: 'French', labelKey: 'french' },
  { code: 'de', label: 'German', labelKey: 'german' },
  { code: 'it', label: 'Italian', labelKey: 'italian' },
  { code: 'pt', label: 'Portuguese', labelKey: 'portuguese' },
  { code: 'ru', label: 'Russian', labelKey: 'russian' },
  { code: 'zh', label: 'Chinese', labelKey: 'chinese' },
  { code: 'ja', label: 'Japanese', labelKey: 'japanese' },
];

const AdvancedSearch = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { language } = useLanguage();
  const t = translations[language];
  
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [filters, setFilters] = useState({
    title: '',
    author: '',
    subject: '',
    publisher: '',
    isbn: '',
    language: '',
    printType: 'all',
    orderBy: 'relevance',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const [startIndex, setStartIndex] = useState(0);
  const maxResults = 20;

  useEffect(() => {
    const query = searchParams.get('q');
    if (query) {
      setSearchQuery(query);
      performSearch(query);
    }
  }, []);

  const buildSearchQuery = () => {
    let query = searchQuery;
    
    if (filters.title) query += `+intitle:${filters.title}`;
    if (filters.author) query += `+inauthor:${filters.author}`;
    if (filters.subject) query += `+subject:${filters.subject}`;
    if (filters.publisher) query += `+inpublisher:${filters.publisher}`;
    if (filters.isbn) query += `+isbn:${filters.isbn}`;
    
    return query;
  };

  const performSearch = async (query = null, newStartIndex = 0) => {
    const searchTerm = query || buildSearchQuery();
    if (!searchTerm.trim()) return;

    setLoading(true);
    setStartIndex(newStartIndex);

    try {
      let url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchTerm)}&startIndex=${newStartIndex}&maxResults=${maxResults}&orderBy=${filters.orderBy}`;
      
      if (filters.printType !== 'all') {
        url += `&printType=${filters.printType}`;
      }
      if (filters.language) {
        url += `&langRestrict=${filters.language}`;
      }

      const response = await fetch(url);
      const data = await response.json();
      
      setResults(data.items || []);
      setTotalItems(data.totalItems || 0);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchParams({ q: searchQuery });
    performSearch();
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      title: '',
      author: '',
      subject: '',
      publisher: '',
      isbn: '',
      language: '',
      printType: 'all',
      orderBy: 'relevance',
    });
  };

  const handleBookClick = (book) => {
    navigate(`/book/${book.id}`, { state: { book } });
  };

  const getBookImage = (book) => {
    return book.volumeInfo?.imageLinks?.thumbnail || 
           book.volumeInfo?.imageLinks?.smallThumbnail || 
           'https://placehold.co/128x192?text=No+Image';
  };

  const handleNextPage = () => {
    const newIndex = startIndex + maxResults;
    performSearch(null, newIndex);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevPage = () => {
    const newIndex = Math.max(0, startIndex - maxResults);
    performSearch(null, newIndex);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="advanced-search-page">
      {/* Search Header */}
      <div className="search-header">
        <h1><FaSearch /> {t.advancedSearch}</h1>
        <p>{t.findExactly}</p>
      </div>

      {/* Search Form */}
      <form className="search-form" onSubmit={handleSearch}>
        <div className="main-search">
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="search-btn">
            <FaSearch /> {t.search}
          </button>
          <button 
            type="button" 
            className={`filter-toggle ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <FaFilter /> {t.filters}
          </button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="filters-panel">
            <div className="filters-header">
              <h3>{t.advancedFilters}</h3>
              <button type="button" className="clear-btn" onClick={clearFilters}>
                <FaTimes /> {t.clearAll}
              </button>
            </div>

            <div className="filters-grid">
              <div className="filter-group">
                <label><FaBook /> {t.titleContains}</label>
                <input
                  type="text"
                  placeholder={t.titlePlaceholder}
                  value={filters.title}
                  onChange={(e) => handleFilterChange('title', e.target.value)}
                />
              </div>

              <div className="filter-group">
                <label><FaUser /> {t.authorLabel}</label>
                <input
                  type="text"
                  placeholder={t.authorSearchPlaceholder}
                  value={filters.author}
                  onChange={(e) => handleFilterChange('author', e.target.value)}
                />
              </div>

              <div className="filter-group">
                <label><FaBook /> {t.subjectCategory}</label>
                <select
                  value={filters.subject}
                  onChange={(e) => handleFilterChange('subject', e.target.value)}
                >
                  <option value="">{t.allSubjects}</option>
                  {SUBJECTS.map(subject => (
                    <option key={subject} value={subject.toLowerCase()}>{subject}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label><FaGlobe /> {t.language}</label>
                <select
                  value={filters.language}
                  onChange={(e) => handleFilterChange('language', e.target.value)}
                >
                  {LANGUAGES.map(lang => (
                    <option key={lang.code} value={lang.code}>{t[lang.labelKey] || lang.label}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>{t.publisherLabel}</label>
                <input
                  type="text"
                  placeholder={t.publisherPlaceholder}
                  value={filters.publisher}
                  onChange={(e) => handleFilterChange('publisher', e.target.value)}
                />
              </div>

              <div className="filter-group">
                <label>{t.isbnLabel}</label>
                <input
                  type="text"
                  placeholder={t.isbnPlaceholder}
                  value={filters.isbn}
                  onChange={(e) => handleFilterChange('isbn', e.target.value)}
                />
              </div>

              <div className="filter-group">
                <label>{t.printType}</label>
                <select
                  value={filters.printType}
                  onChange={(e) => handleFilterChange('printType', e.target.value)}
                >
                  <option value="all">{t.allTypes}</option>
                  <option value="books">{t.booksOnly}</option>
                  <option value="magazines">{t.magazinesOnly}</option>
                </select>
              </div>

              <div className="filter-group">
                <label><FaCalendar /> {t.sortBy}</label>
                <select
                  value={filters.orderBy}
                  onChange={(e) => handleFilterChange('orderBy', e.target.value)}
                >
                  <option value="relevance">{t.relevance}</option>
                  <option value="newest">{t.newestFirst}</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </form>

      {/* Results */}
      <div className="search-results">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>{t.searching}</p>
          </div>
        ) : results.length > 0 ? (
          <>
            <div className="results-header">
              <p>{t.found} <strong>{totalItems.toLocaleString()}</strong> {t.results}</p>
              <span>{t.showing} {startIndex + 1} - {Math.min(startIndex + maxResults, totalItems)}</span>
            </div>

            <div className="results-grid">
              {results.map((book) => (
                <div 
                  key={book.id} 
                  className="result-card"
                  onClick={() => handleBookClick(book)}
                >
                  <img src={getBookImage(book)} alt={book.volumeInfo?.title} />
                  <div className="result-info">
                    <h4>{book.volumeInfo?.title}</h4>
                    <p className="author">{book.volumeInfo?.authors?.join(', ') || t.unknownAuthor}</p>
                    {book.volumeInfo?.publishedDate && (
                      <p className="date">{book.volumeInfo.publishedDate.split('-')[0]}</p>
                    )}
                    {book.volumeInfo?.averageRating && (
                      <div className="rating">
                        <FaStar /> {book.volumeInfo.averageRating}
                      </div>
                    )}
                    <p className="description">
                      {book.volumeInfo?.description?.slice(0, 150)}
                      {book.volumeInfo?.description?.length > 150 ? '...' : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalItems > maxResults && (
              <div className="pagination">
                <button 
                  onClick={handlePrevPage} 
                  disabled={startIndex === 0}
                  className="page-btn"
                >
                  {t.previous}
                </button>
                <span className="page-info">
                  Page {Math.floor(startIndex / maxResults) + 1} of {Math.ceil(totalItems / maxResults)}
                </span>
                <button 
                  onClick={handleNextPage}
                  disabled={startIndex + maxResults >= totalItems}
                  className="page-btn"
                >
                  {t.next}
                </button>
              </div>
            )}
          </>
        ) : searchQuery && !loading ? (
          <div className="no-results">
            <h3>{t.noResults}</h3>
            <p>{t.tryAdjusting}</p>
          </div>
        ) : (
          <div className="search-tips">
            <h3>{t.searchTips}</h3>
            <ul>
              <li>{t.searchTip1}</li>
              <li>{t.searchTip2}</li>
              <li>{t.searchTip3}</li>
              <li>{t.searchTip4}</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvancedSearch;
