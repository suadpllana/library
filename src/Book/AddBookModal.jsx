import React, { useState, useRef, useEffect, useCallback } from 'react';
import './AddBookModal.css';
import { toast } from 'react-toastify';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../context/LanguageContext';
import translations from '../i18n/translations';

const AddBookModal = ({ setOpenModal, onBookAdded }) => {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [authorSuggestions, setAuthorSuggestions] = useState([]);
  const [showAuthorSuggestions, setShowAuthorSuggestions] = useState(false);
  const [authorSearchLoading, setAuthorSearchLoading] = useState(false);
  const debounceRef = useRef(null);
  const authorDebounceRef = useRef(null);
  const suggestionsRef = useRef(null);
  const authorSuggestionsRef = useRef(null);
  const { language } = useLanguage();
  const t = translations[language];

  // Click outside to close suggestions
  useEffect(() => {
    const handleClick = (e) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
      if (authorSuggestionsRef.current && !authorSuggestionsRef.current.contains(e.target)) {
        setShowAuthorSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const searchBooks = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setSearchLoading(true);
    try {
      const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=3`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      const books = (data.items || []).map(item => ({
        id: item.id,
        title: item.volumeInfo?.title || 'Unknown',
        authors: item.volumeInfo?.authors || [],
        image: item.volumeInfo?.imageLinks?.smallThumbnail || null,
        publishedDate: item.volumeInfo?.publishedDate || '',
      }));
      setSuggestions(books);
      setShowSuggestions(true);
    } catch (err) {
      console.error('Book search error:', err);
      setSuggestions([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const searchBooksByAuthor = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setAuthorSuggestions([]);
      setShowAuthorSuggestions(false);
      return;
    }
    setAuthorSearchLoading(true);
    try {
      const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=inauthor:${encodeURIComponent(query)}&orderBy=relevance&maxResults=3`);
      if (!res.ok) throw new Error('Author search failed');
      const data = await res.json();
      const books = (data.items || []).map(item => ({
        id: item.id,
        title: item.volumeInfo?.title || 'Unknown',
        authors: item.volumeInfo?.authors || [],
        image: item.volumeInfo?.imageLinks?.smallThumbnail || null,
        publishedDate: item.volumeInfo?.publishedDate || '',
      }));
      setAuthorSuggestions(books);
      setShowAuthorSuggestions(true);
    } catch (err) {
      console.error('Author search error:', err);
      setAuthorSuggestions([]);
    } finally {
      setAuthorSearchLoading(false);
    }
  }, []);

  const handleAuthorChange = (e) => {
    const val = e.target.value;
    setAuthor(val);
    setSelectedBook(null);

    if (authorDebounceRef.current) clearTimeout(authorDebounceRef.current);
    authorDebounceRef.current = setTimeout(() => searchBooksByAuthor(val), 400);
  };

  const handleSelectAuthorBook = (book) => {
    setSelectedBook(book);
    setTitle(book.title);
    setAuthor(book.authors.join(', '));
    setShowAuthorSuggestions(false);
    setAuthorSuggestions([]);
  };

  const handleTitleChange = (e) => {
    const val = e.target.value;
    setTitle(val);
    setSelectedBook(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchBooks(val), 400);
  };

  const handleSelectBook = (book) => {
    setSelectedBook(book);
    setTitle(book.title);
    setAuthor(book.authors.join(', '));
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleAddManual = () => {
    setSelectedBook(null);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!title.trim() || !author.trim()) {
      toast.error(t.pleaseFillTitleAuthor);
      return;
    }

    setLoading(true);
    
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        toast.error(t.pleaseSignInToAdd);
        return;
      }

      // Create a unique ID for manually added books
      const bookId = selectedBook ? selectedBook.id : `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const imageUrl = selectedBook?.image || 'https://placehold.co/128x192/4a5568/ffffff?text=Manual+Book';

      const { error: insertError } = await supabase
        .from('wishlist')
        .insert([{
          book_id: bookId,
          title: title.trim(),
          authors: [author.trim()],
          image_url: imageUrl,
          user_id: user.id
        }]);
      
      if (insertError) {
        console.error('Insert error:', insertError);
        toast.error(`Failed to add book: ${insertError.message}`);
        return;
      }
      
      toast.success(`"${title}" ${t.addedToWishlistMsg}`);
      setTitle('');
      setAuthor('');
      setOpenModal(false);
      
      // Notify parent to refresh the list
      if (onBookAdded) {
        onBookAdded();
      }
    } catch (error) {
      console.error('Error adding book:', error);
      toast.error(`Failed to add book: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-book-modal-overlay" onClick={() => setOpenModal(false)}>
      <div className="add-book-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="add-book-modal-header">
          <h2>📚 {t.addBookManually}</h2>
          <button 
            className="close-btn" 
            onClick={() => setOpenModal(false)}
            aria-label={t.closeModal}
          >
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="add-book-form">
          <div className="form-group" style={{ position: 'relative' }} ref={suggestionsRef}>
            <label htmlFor="book-title">{t.bookTitleRequired}</label>
            <input
              id="book-title"
              type="text"
              value={title}
              onChange={handleTitleChange}
              placeholder={t.bookTitlePlaceholder}
              maxLength={200}
              required
              autoComplete="off"
            />
            {searchLoading && (
              <span className="search-loading-indicator">{t.searching}</span>
            )}
            {showSuggestions && (suggestions.length > 0 || title.length >= 2) && (
              <div className="book-suggestions-dropdown">
                {suggestions.map(book => (
                  <button
                    key={book.id}
                    type="button"
                    className={`suggestion-item ${selectedBook?.id === book.id ? 'selected' : ''}`}
                    onClick={() => handleSelectBook(book)}
                  >
                    <img
                      src={book.image || 'https://placehold.co/40x56/4a5568/ffffff?text=📚'}
                      alt=""
                      className="suggestion-cover"
                    />
                    <div className="suggestion-info">
                      <span className="suggestion-title">{book.title}</span>
                      <span className="suggestion-author">{book.authors.join(', ') || t.unknownAuthor}</span>
                    </div>
                  </button>
                ))}
                <button
                  type="button"
                  className="suggestion-item manual-option"
                  onClick={handleAddManual}
                >
                  <span className="manual-icon">✏️</span>
                  <div className="suggestion-info">
                    <span className="suggestion-title">{t.addManuallyOption}</span>
                    <span className="suggestion-author">{t.enterTitleAuthorYourself}</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          <div className="form-group" style={{ position: 'relative' }} ref={authorSuggestionsRef}>
            <label htmlFor="book-author">{t.authorRequired}</label>
            <input
              id="book-author"
              type="text"
              value={author}
              onChange={handleAuthorChange}
              placeholder={t.authorPlaceholder}
              maxLength={100}
              required
              autoComplete="off"
            />
            {authorSearchLoading && (
              <span className="search-loading-indicator">{t.searching}</span>
            )}
            {showAuthorSuggestions && (authorSuggestions.length > 0 || author.length >= 2) && (
              <div className="book-suggestions-dropdown">
                {authorSuggestions.map(book => (
                  <button
                    key={book.id}
                    type="button"
                    className={`suggestion-item ${selectedBook?.id === book.id ? 'selected' : ''}`}
                    onClick={() => handleSelectAuthorBook(book)}
                  >
                    <img
                      src={book.image || 'https://placehold.co/40x56/4a5568/ffffff?text=📚'}
                      alt=""
                      className="suggestion-cover"
                    />
                    <div className="suggestion-info">
                      <span className="suggestion-title">{book.title}</span>
                      <span className="suggestion-author">{book.authors.join(', ') || t.unknownAuthor}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedBook && (
            <div className="selected-book-preview">
              <img
                src={selectedBook.image || 'https://placehold.co/48x68/4a5568/ffffff?text=📚'}
                alt=""
              />
              <div>
                <p className="preview-title">{selectedBook.title}</p>
                <p className="preview-author">{selectedBook.authors.join(', ')}</p>
                {selectedBook.publishedDate && <p className="preview-date">{selectedBook.publishedDate}</p>}
              </div>
            </div>
          )}

          <div className="modal-actions">
            <button 
              type="button" 
              className="cancel-btn" 
              onClick={() => setOpenModal(false)}
              disabled={loading}
            >
              {t.cancel}
            </button>
            <button 
              type="submit" 
              className="add-btn"
              disabled={loading}
            >
              {loading ? t.adding : t.addBookBtn}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddBookModal;
