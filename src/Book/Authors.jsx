import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Authors.css';
import { authors, categories } from './authorsNames';
import { FaArrowLeftLong } from "react-icons/fa6";
const Authors = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Show all');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE =50;

  
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
    <div className="authors-list">
          <h3 style={{textAlign: "left", marginTop: "3rem",  cursor: "pointer", color: "white"}}
            onClick={() => navigate(-1)}
        ><FaArrowLeftLong /> Go Back</h3>
      <h2 style={{textAlign: "center"}}>Our {authors.length} Authors</h2>
      <div className="filters-container">
        <input
          type="text"
          placeholder="Search by author name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
          aria-label="Search authors by name"
        />
        <br />
        <label style={{color: "white"}}>Filter by genre: </label>
        <select

          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="category-select"
          aria-label="Filter authors by category"
        >
          {categories?.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>
      <div className="authors-container">
        {paginatedAuthors.length === 0 ? (
          <p style={{color: "white"}}>No authors found matching your criteria.</p>
        ) : (
          paginatedAuthors?.map((author) => (
            <div
              key={author.name}
              className="author-item"
              onClick={() => handleAuthorClick(author.name)}
            >
              <p>{author.name}</p>
            </div>
          ))
        )}
      </div>
      {totalPages > 1 && (
        <div className="pagination-container" role="navigation" aria-label="Pagination">
         
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="pagination-button"
            aria-label="Previous page"
          >
            Previous
          </button>
          {getPageNumbers()?.map((page) => (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={`pagination-button ${page === currentPage ? 'active' : ''}`}
              aria-label={`Page ${page}`}
              aria-current={page === currentPage ? 'page' : undefined}
            >
              {page}
            </button>
          ))}
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="pagination-button"
            aria-label="Next page"
          >
            Next
          </button>
       
        </div>
      )}
    </div>
  );
};

export default Authors;