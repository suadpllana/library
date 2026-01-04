import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FaSearch, FaFilter, FaTimes, FaStar, FaCalendar, FaBook, FaUser, FaGlobe } from 'react-icons/fa';
import './AdvancedSearch.css';

const AdvancedSearch = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
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

  const subjects = [
    'Fiction', 'Non-fiction', 'Science Fiction', 'Fantasy', 'Mystery', 
    'Romance', 'Thriller', 'Biography', 'History', 'Science', 
    'Technology', 'Philosophy', 'Psychology', 'Self-Help', 'Business',
    'Art', 'Poetry', 'Drama', 'Children', 'Young Adult'
  ];

  const languages = [
    { code: '', label: 'Any Language' },
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Spanish' },
    { code: 'fr', label: 'French' },
    { code: 'de', label: 'German' },
    { code: 'it', label: 'Italian' },
    { code: 'pt', label: 'Portuguese' },
    { code: 'ru', label: 'Russian' },
    { code: 'zh', label: 'Chinese' },
    { code: 'ja', label: 'Japanese' },
  ];

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
        <h1><FaSearch /> Advanced Search</h1>
        <p>Find exactly what you're looking for with powerful filters</p>
      </div>

      {/* Search Form */}
      <form className="search-form" onSubmit={handleSearch}>
        <div className="main-search">
          <input
            type="text"
            placeholder="Search for books, authors, subjects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="search-btn">
            <FaSearch /> Search
          </button>
          <button 
            type="button" 
            className={`filter-toggle ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <FaFilter /> Filters
          </button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="filters-panel">
            <div className="filters-header">
              <h3>Advanced Filters</h3>
              <button type="button" className="clear-btn" onClick={clearFilters}>
                <FaTimes /> Clear All
              </button>
            </div>

            <div className="filters-grid">
              <div className="filter-group">
                <label><FaBook /> Title Contains</label>
                <input
                  type="text"
                  placeholder="e.g., Harry Potter"
                  value={filters.title}
                  onChange={(e) => handleFilterChange('title', e.target.value)}
                />
              </div>

              <div className="filter-group">
                <label><FaUser /> Author</label>
                <input
                  type="text"
                  placeholder="e.g., J.K. Rowling"
                  value={filters.author}
                  onChange={(e) => handleFilterChange('author', e.target.value)}
                />
              </div>

              <div className="filter-group">
                <label><FaBook /> Subject/Category</label>
                <select
                  value={filters.subject}
                  onChange={(e) => handleFilterChange('subject', e.target.value)}
                >
                  <option value="">All Subjects</option>
                  {subjects.map(subject => (
                    <option key={subject} value={subject.toLowerCase()}>{subject}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label><FaGlobe /> Language</label>
                <select
                  value={filters.language}
                  onChange={(e) => handleFilterChange('language', e.target.value)}
                >
                  {languages.map(lang => (
                    <option key={lang.code} value={lang.code}>{lang.label}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Publisher</label>
                <input
                  type="text"
                  placeholder="Publisher name"
                  value={filters.publisher}
                  onChange={(e) => handleFilterChange('publisher', e.target.value)}
                />
              </div>

              <div className="filter-group">
                <label>ISBN</label>
                <input
                  type="text"
                  placeholder="ISBN number"
                  value={filters.isbn}
                  onChange={(e) => handleFilterChange('isbn', e.target.value)}
                />
              </div>

              <div className="filter-group">
                <label>Print Type</label>
                <select
                  value={filters.printType}
                  onChange={(e) => handleFilterChange('printType', e.target.value)}
                >
                  <option value="all">All Types</option>
                  <option value="books">Books Only</option>
                  <option value="magazines">Magazines Only</option>
                </select>
              </div>

              <div className="filter-group">
                <label><FaCalendar /> Sort By</label>
                <select
                  value={filters.orderBy}
                  onChange={(e) => handleFilterChange('orderBy', e.target.value)}
                >
                  <option value="relevance">Relevance</option>
                  <option value="newest">Newest First</option>
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
            <p>Searching...</p>
          </div>
        ) : results.length > 0 ? (
          <>
            <div className="results-header">
              <p>Found <strong>{totalItems.toLocaleString()}</strong> results</p>
              <span>Showing {startIndex + 1} - {Math.min(startIndex + maxResults, totalItems)}</span>
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
                    <p className="author">{book.volumeInfo?.authors?.join(', ') || 'Unknown Author'}</p>
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
                  Previous
                </button>
                <span className="page-info">
                  Page {Math.floor(startIndex / maxResults) + 1} of {Math.ceil(totalItems / maxResults)}
                </span>
                <button 
                  onClick={handleNextPage}
                  disabled={startIndex + maxResults >= totalItems}
                  className="page-btn"
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : searchQuery && !loading ? (
          <div className="no-results">
            <h3>No results found</h3>
            <p>Try adjusting your search terms or filters</p>
          </div>
        ) : (
          <div className="search-tips">
            <h3>Search Tips</h3>
            <ul>
              <li>Use specific keywords for better results</li>
              <li>Try searching by author name or book title</li>
              <li>Use filters to narrow down results</li>
              <li>Search by ISBN for exact matches</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvancedSearch;
