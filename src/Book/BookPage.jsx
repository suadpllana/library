import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from "react-router-dom";
import "./BookPage.css";
import { toast } from "react-toastify";
import { FaArrowLeftLong } from "react-icons/fa6";
import { supabase } from '../lib/supabase';
import AddToCollectionModal from './AddToCollectionModal';

const BookPage = () => {
  const location = useLocation();
  const book = location.state?.book?.volumeInfo || {};
  const fullBook = location.state?.book; // Keep the full book object for modal
  const id = location.state?.book?.id
  const navigate = useNavigate()

  const [isFullDescription, setIsFullDescription] = useState(false);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [loanStatus, setLoanStatus] = useState(null); // null, 'pending', 'approved', 'rejected'
  const [isRequestingLoan, setIsRequestingLoan] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);

  useEffect(() => {
    if (id) {
      checkWishlistStatus();
      checkLoanStatus();
    }
  }, [id]);

  const checkLoanStatus = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return;
      }

      const { data, error } = await supabase
        .from('loan_requests')
        .select('status')
        .eq('book_id', id)
        .eq('user_id', user.id)
        .in('status', ['pending', 'approved'])
        .maybeSingle();
      
      if (error) {
        console.error('Error checking loan status:', error);
        return;
      }
      
      setLoanStatus(data?.status || null);
    } catch (error) {
      console.error('Error checking loan status:', error);
    }
  };

  const handleRequestLoan = async () => {
    try {
      setIsRequestingLoan(true);
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        toast.error('Please sign in to request a loan');
        return;
      }

      const { error } = await supabase
        .from('loan_requests')
        .insert({
          user_id: user.id,
          book_id: id,
          book_title: book.title || 'Unknown Title',
          book_authors: book.authors || [],
          book_image: book.imageLinks?.smallThumbnail || 'https://placehold.co/128x192?text=No+Image',
          status: 'pending'
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('You already have an active request for this book');
        } else {
          toast.error('Failed to request loan: ' + error.message);
        }
        return;
      }

      setLoanStatus('pending');
      toast.success('Loan request submitted! Waiting for admin approval.');
    } catch (error) {
      console.error('Error requesting loan:', error);
      toast.error('Failed to request loan');
    } finally {
      setIsRequestingLoan(false);
    }
  };

  const checkWishlistStatus = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('Authentication error:', authError);
        setIsInWatchlist(false);
        return;
      }

      const { data, error } = await supabase
        .from('wishlist')
        .select('*')
        .eq('book_id', id)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      setIsInWatchlist(!!data);
    } catch (error) {
      console.error('Error checking wishlist status:', error);
      toast.error('Error checking wishlist status');
    }
  };

  const handleWatchlistToggle = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('Authentication error:', authError);
        toast.error('Please sign in to manage your wishlist');
        return;
      }

      if (isInWatchlist) {
        const { error: deleteError } = await supabase
          .from('wishlist')
          .delete()
          .match({ book_id: id, user_id: user.id });
        
        if (deleteError) {
          console.error('Delete error:', deleteError);
          toast.error('Failed to remove book from wishlist');
          return;
        }

        setIsInWatchlist(false);
        toast.success("Book removed from wishlist");
      } else {
        if (!book.title) {
          toast.error('Invalid book data');
          return;
        }

        const { error: insertError } = await supabase
          .from('wishlist')
          .upsert([{
            book_id: id,
            title: book.title,
            authors: book.authors || [],
            image_url: book.imageLinks?.smallThumbnail || 'https://placehold.co/128x192?text=No+Image',
            user_id: user.id
          }], {
            onConflict: 'user_id,book_id',
            ignoreDuplicates: true
          });
        
        if (insertError) {
          console.error('Insert error:', insertError);
          if (insertError.code === '23505') {
            toast.error('This book is already in your wishlist');
          } else {
            toast.error(`Failed to add book to wishlist: ${insertError.message}`);
          }
          return;
        }
        
        setIsInWatchlist(true);
        toast.success("Book added to wishlist");
      }
    } catch (error) {
      console.error('Error updating wishlist:', error);
      toast.error(`Failed to update wishlist: ${error.message}`);
    }
  };

  const description = book.description || '';
  const shortDescription = description.slice(0, 150) + (description.length > 150 ? '...' : '');

  return (
    <div className="book-page">
      {Object.keys(book).length > 0 ? (
        <div className="book-container">
          <div className="book-image">
            <img
              src={book.imageLinks?.smallThumbnail || 'https://placehold.co/128x192?text=No+Image'}
              alt={book.title || 'No Title'}
            />
          </div>
          <div className="book-details">
            <h1>{book.title || 'Unknown Title'}</h1>
            <p className="author" onClick={() => navigate(`/authors/${book.authors[0]}`)}>by {book.authors?.join(', ') || 'Unknown Author'}</p>
            
            <div className="description">
              <h2>Description</h2>
              <p>
                {isFullDescription ? description : shortDescription}
                {description.length > 150 && (
                  <span
                    className="read-more"
                    onClick={() => setIsFullDescription(!isFullDescription)}
                    style={{ color: '#e74c3c', cursor: 'pointer', marginLeft: '5px' }}
                  >
                    {isFullDescription ? ' Read Less' : ' Read More'}
                  </span>
                )}
              </p>
            </div>
            <div className="additional-info">
              <p><strong>ISBN:</strong> {book.industryIdentifiers?.[0]?.identifier || '97807461927'}</p>
            </div>
            <div className="publication-info">
              <p><strong>Publisher:</strong> {book.publisher || 'Unknown'}</p>
              <p><strong>Published Date:</strong> {book.publishedDate || 'Unknown'}</p>
              <p><strong>Categories:</strong> {book.categories?.join(', ') || 'None'}</p>
            </div>
            
            <div className="button-container">
              <a href={book.previewLink || '#'} target="_blank" rel="noopener noreferrer">
                <button className="more-info">More Info</button>
              </a>
              <button 
                className={`watchlist-button ${isInWatchlist ? 'remove' : ''}`}
                onClick={handleWatchlistToggle}
              >
                {isInWatchlist ? 'Remove from Wishlist' : 'Add to Wishlist'}
              </button>
              <button 
                className="collection-button"
                onClick={() => setShowCollectionModal(true)}
              >
                📚 Add to Collection
              </button>
              <button 
                className={`loan-button ${loanStatus === 'pending' ? 'pending' : ''} ${loanStatus === 'approved' ? 'approved' : ''}`}
                onClick={handleRequestLoan}
                disabled={isRequestingLoan || loanStatus === 'pending' || loanStatus === 'approved'}
              >
                {loanStatus === 'pending' ? '⏳ Loan Pending' : 
                 loanStatus === 'approved' ? '✓ Loan Approved' : 
                 isRequestingLoan ? 'Requesting...' : '📚 Request Loan'}
              </button>
            </div>
            <button 
              onClick={() => navigate(-1)}
              className="back-button"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                marginTop: '2rem',
                padding: '0.5rem',
                fontSize: '1rem'
              }}
            >
              <FaArrowLeftLong /> Go Back
            </button>
          </div>
        </div>
      ) : (
        <p>Something went wrong</p>
      )}
      
      {/* Add to Collection Modal */}
      <AddToCollectionModal 
        book={fullBook}
        isOpen={showCollectionModal}
        onClose={() => setShowCollectionModal(false)}
      />
    </div>
  );
};

export default BookPage;