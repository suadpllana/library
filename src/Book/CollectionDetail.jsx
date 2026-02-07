import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import translations from '../i18n/translations';
import { toast } from 'react-toastify';
import './CollectionDetail.css';

const CollectionDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { language } = useLanguage();
  const t = translations[language];
  const [collection, setCollection] = useState(null);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && id) {
      fetchCollection();
    }
  }, [user, id]);

  const fetchCollection = async () => {
    try {
      // Fetch collection details
      const { data: collectionData, error: collectionError } = await supabase
        .from('reading_collections')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (collectionError) throw collectionError;
      setCollection(collectionData);

      // Fetch books in collection
      const { data: booksData, error: booksError } = await supabase
        .from('collection_books')
        .select('*')
        .eq('collection_id', id)
        .order('added_at', { ascending: false });

      if (booksError) throw booksError;

      // Fetch book details from Google Books API for each book
      const bookPromises = booksData.map(async (item) => {
        try {
          const response = await fetch(
            `https://www.googleapis.com/books/v1/volumes/${item.book_id}`
          );
          const data = await response.json();
          return {
            ...item,
            volumeInfo: data.volumeInfo
          };
        } catch {
          return item;
        }
      });

      const booksWithDetails = await Promise.all(bookPromises);
      setBooks(booksWithDetails);
    } catch (error) {
      console.error('Error fetching collection:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeBook = async (bookId) => {
    if (!confirm(t.confirmRemoveFromCollection)) return;

    try {
      const { error } = await supabase
        .from('collection_books')
        .delete()
        .eq('collection_id', id)
        .eq('book_id', bookId);

      if (error) throw error;
      setBooks(books.filter(b => b.book_id !== bookId));
      toast.success(t.bookRemovedFromCollection);
    } catch (error) {
      console.error('Error removing book:', error);
      toast.error(t.failedRemoveBook);
    }
  };

  if (loading) {
    return (
      <div className="collection-detail-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>{t.loadingCollection}</p>
        </div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="collection-detail-page">
        <div className="not-found">
          <h2>{t.collectionNotFound}</h2>
          <p>{t.collectionNotFoundDesc}</p>
          <Link to="/collections" className="back-link">{t.backToCollections}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="collection-detail-page">
      <div className="collection-detail-header" style={{ '--accent-color': collection.color || '#6366f1' }}>
        <Link to="/collections" className="back-btn">
          {t.backToCollections}
        </Link>
        
        <div className="collection-title">
          <span className="collection-emoji">{collection.icon || '📚'}</span>
          <div>
            <h1>{collection.name}</h1>
            {collection.description && (
              <p className="collection-desc">{collection.description}</p>
            )}
          </div>
        </div>

        <div className="collection-stats">
          <div className="stat">
            <span className="stat-value">{books.length}</span>
            <span className="stat-label">{t.books}</span>
          </div>
        </div>
      </div>

      {books.length === 0 ? (
        <div className="empty-collection">
          <div className="empty-icon">📖</div>
          <h3>{t.noBooksYetCollection}</h3>
          <p>{t.startAddingBooks}</p>
          <Link to="/discover" className="discover-btn">{t.discoverBooks}</Link>
        </div>
      ) : (
        <div className="books-grid">
          {books.map((book) => (
            <div key={book.book_id} className="book-card">
              <Link to={`/book/${book.book_id}`}>
                <img
                  src={book.volumeInfo?.imageLinks?.thumbnail || 'https://via.placeholder.com/128x192?text=No+Cover'}
                  alt={book.volumeInfo?.title || book.book_title}
                />
              </Link>
              <div className="book-info">
                <Link to={`/book/${book.book_id}`}>
                  <h4>{book.volumeInfo?.title || book.book_title}</h4>
                </Link>
                <p className="author">{book.volumeInfo?.authors?.join(', ') || t.unknownAuthor}</p>
                {book.notes && (
                  <p className="notes">{book.notes}</p>
                )}
                <button 
                  className="remove-btn"
                  onClick={() => removeBook(book.book_id)}
                >
                  {t.remove}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CollectionDetail;
