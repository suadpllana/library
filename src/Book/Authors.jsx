import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Authors.css';
import { authors, categories } from './authorsNames';
import { FaArrowLeftLong, FaMagnifyingGlass } from "react-icons/fa6";
import { useLanguage } from '../context/LanguageContext';
import translations from '../i18n/translations';

const Authors = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = translations[language];
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Show all');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 60;

  const filteredAuthors = useMemo(() => {
    return authors.filter((author) => {
      const matchesName = author.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = searchTerm
        ? true 
        : selectedCategory === 'Show all' || author.genres.includes(selectedCategory);
      return matchesName && matchesCategory;
    });
  }, [searchTerm, selectedCategory]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory]);

  const totalPages = Math.ceil(filteredAuthors.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedAuthors = filteredAuthors.slice(startIndex, endIndex);

  const handleAuthorClick = (authorName) => {
    const authorId = encodeURIComponent(authorName);
    navigate(`/authors/${authorId}`);
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getPageNumbers = () => {
    const maxPagesToShow = 5; 
    const pages = [];
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage === totalPages) {
      startPage = Math.max(1, totalPages - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="authors-page">
      <div className="authors-container">
        {/* Header */}
        <div className="authors-header">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <FaArrowLeftLong /> {t.goBack}
          </button>
          <div className="header-title">
            <h1>📚 {t.allAuthors}</h1>
            <p>{t.browse || 'Browse'} {authors.length} {t.authors} • {filteredAuthors.length} {t.shown || 'shown'}</p>
          </div>
        </div>

        {/* Filters Row */}
        <div className="filters-row">
          <div className="search-box">
            <FaMagnifyingGlass />
            <input
              type="text"
              placeholder={t.searchAuthors}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button className="clear-search" onClick={() => setSearchTerm('')}>×</button>
            )}
          </div>
          
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="genre-filter"
          >
            {categories?.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

        {/* Authors List */}
        {paginatedAuthors.length === 0 ? (
          <div className="no-results">
            <p>{t.noAuthorsFound} "{searchTerm}"</p>
            <button onClick={() => { setSearchTerm(''); setSelectedCategory('Show all'); }}>
              {t.clear} {t.filter || 'filters'}
            </button>
          </div>
        ) : (
          <div className="authors-grid">
            {paginatedAuthors.map((author) => (
              <div
                key={author.name}
                className="author-chip"
                onClick={() => handleAuthorClick(author.name)}
              >
                <span className="author-initial">{author.name.charAt(0)}</span>
                <span className="author-name">{author.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              ← {t.previous || 'Prev'}
            </button>
            
            {getPageNumbers().map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={page === currentPage ? 'active' : ''}
              >
                {page}
              </button>
            ))}
            
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              {t.next || 'Next'} →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Authors;