import React, { useState, useEffect, useRef } from 'react';
import { categories } from './categories';
import { useNavigate } from "react-router-dom";
import { useLanguage } from '../context/LanguageContext';

const CategoryBooks = ({ setShowCategories, showCategories }) => {
  const [categoryBooks, setCategoryBooks] = useState([]);
  const [categoryName, setCategoryName] = useState();
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const navigate = useNavigate();
  const { t } = useLanguage();
  const hasFetchedInitial = useRef(false);
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (!hasFetchedInitial.current && categoryName === "") {
      bookInfo("philosophy"); 
      hasFetchedInitial.current = true;
    }
  }, []); 

  useEffect(() => {
    if (showCategories && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [showCategories]);

  async function bookInfo(category) {
    if (!category.trim()) return;
    setLoading(true);
    let query;
    
      const categoryQuery = category.toLowerCase().replace(/\s+/g, '+');
      query = `subject:${categoryQuery}&maxResults=25`;
    
    try {
      const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${query}`);
      const data = await response.json();
      setCategoryBooks(data.items || []);
      setCategoryName(category);
      navigate("/category", {
        state: { categoryBooks: data.items || [], categoryName: category, loading: false }
      });
      setShowCategories(false);
      setSearchInput('');
    } catch (error) {
      console.error("Error fetching books:", error);
    } finally {
      setLoading(false);
    }
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      bookInfo(searchInput.trim());
    }
  };

  const filteredCategories = searchInput.trim()
    ? categories.filter(cat => cat.name.toLowerCase().includes(searchInput.toLowerCase()))
    : categories;

  return (
    <div className="book-category">
      <div className="book-category-inner-wrap">
        <form className="category-search-form" onSubmit={handleSearchSubmit}>
          <input
            ref={searchInputRef}
            type="text"
            className="category-search-input"
            placeholder={t('searchOrTypeCategory') || 'Search or type a category...'}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            maxLength={60}
          />
          {searchInput.trim() && (
            <button type="submit" className="category-search-go" disabled={loading}>
              {loading ? '...' : '→'}
            </button>
          )}
        </form>
        <div className="book-category-inner">
          {filteredCategories.length > 0 ? (
            filteredCategories.map(category => (
              <button key={category.name} className="category-item" onClick={() => bookInfo(category.name)}>
                <p>{category.emoji} {category.name}</p>
              </button>
            ))
          ) : (
            <div className="category-no-match">
              <p>{t('noMatchingCategories') || 'No matching categories'}</p>
              <button className="category-custom-search-btn" onClick={() => bookInfo(searchInput.trim())}>
                🔍 {t('searchFor') || 'Search for'} "{searchInput.trim()}"
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CategoryBooks;