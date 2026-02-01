import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from "react-router-dom";
import "./BookPage.css";
import { toast } from "react-toastify";
import { FaArrowLeftLong, FaStar, FaRegStar, FaTrash } from "react-icons/fa6";
import { supabase } from '../lib/supabase';
import AddToCollectionModal from './AddToCollectionModal';

const BookPage = () => {
  const location = useLocation();
  const { id: urlId } = useParams();
  // Use state so we can fetch book details when navigated directly via URL
  const [fullBook, setFullBook] = useState(location.state?.book || null);
  const [book, setBook] = useState(location.state?.book?.volumeInfo || {});
  const id = fullBook?.id || urlId; // Use URL param as fallback
  const navigate = useNavigate()

  const [isFullDescription, setIsFullDescription] = useState(false);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [loanStatus, setLoanStatus] = useState(null); // null, 'pending', 'approved', 'rejected'
  const [isRequestingLoan, setIsRequestingLoan] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  
  // Review state
  const [reviews, setReviews] = useState([]);
  const [userReview, setUserReview] = useState(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [hoverRating, setHoverRating] = useState(0);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [averageRating, setAverageRating] = useState(0);
  const [isAnonymous, setIsAnonymous] = useState(false);

  useEffect(() => {
    if (id) {
      checkWishlistStatus();
      checkLoanStatus();
      fetchReviews();
    }
  }, [id]);

  // If we don't have fullBook (navigated directly via URL), fetch details from Google Books
  useEffect(() => {
    const fetchById = async () => {
      if (!fullBook && urlId) {
        try {
          const res = await fetch(`https://www.googleapis.com/books/v1/volumes/${urlId}`);
          if (!res.ok) throw new Error('Failed to fetch book details');
          const data = await res.json();
          setFullBook(data);
          setBook(data.volumeInfo || {});
        } catch (err) {
          console.error('Error fetching book by id:', err);
        }
      }
    };

    fetchById();
  }, [fullBook, urlId]);

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
            user_id: user.id,
            status: 'wishlist'
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

  // Review Functions
  const fetchReviews = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('book_reviews')
        .select('*')
        .eq('book_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user profiles for reviews
      const userIds = [...new Set(data?.map(r => r.user_id) || [])];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', userIds);

        const profilesMap = {};
        profiles?.forEach(p => { profilesMap[p.id] = p; });

        const reviewsWithProfiles = (data || []).map(review => ({
          ...review,
          user_name: review.is_anonymous 
            ? 'Anonymous' 
            : (profilesMap[review.user_id] 
                ? `${profilesMap[review.user_id].first_name} ${profilesMap[review.user_id].last_name || ''}`.trim()
                : 'Anonymous')
        }));

        setReviews(reviewsWithProfiles);

        // Calculate average rating
        if (reviewsWithProfiles.length > 0) {
          const avg = reviewsWithProfiles.reduce((sum, r) => sum + r.rating, 0) / reviewsWithProfiles.length;
          setAverageRating(avg);
        }

        // Check if current user has reviewed
        if (user) {
          const myReview = reviewsWithProfiles.find(r => r.user_id === user.id);
          if (myReview) {
            setUserReview(myReview);
            setReviewRating(myReview.rating);
            setReviewText(myReview.review_text || '');
            setIsAnonymous(myReview.is_anonymous || false);
          }
        }
      } else {
        setReviews([]);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const handleSubmitReview = async () => {
    if (reviewRating === 0) {
      toast.error('Please select a rating');
      return;
    }

    try {
      setSubmittingReview(true);
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        toast.error('Please sign in to leave a review');
        return;
      }

      const reviewData = {
        book_id: id,
        book_title: book.title || 'Unknown Title',
        user_id: user.id,
        rating: reviewRating,
        review_text: reviewText.trim(),
        is_anonymous: isAnonymous
      };

      if (userReview) {
        // Update existing review
        const { error } = await supabase
          .from('book_reviews')
          .update({
            rating: reviewRating,
            review_text: reviewText.trim(),
            is_anonymous: isAnonymous,
            updated_at: new Date().toISOString()
          })
          .eq('id', userReview.id);

        if (error) throw error;
        toast.success('Review updated successfully!');
      } else {
        // Create new review
        const { error } = await supabase
          .from('book_reviews')
          .insert(reviewData);

        if (error) throw error;
        toast.success('Review submitted successfully!');
      }

      setShowReviewForm(false);
      fetchReviews();
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!userReview) return;
    
    if (!confirm('Are you sure you want to delete your review?')) return;

    try {
      const { data, error } = await supabase
        .from('book_reviews')
        .delete()
        .eq('id', userReview.id)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.error('No review was deleted — it may not exist or you lack permissions');
        fetchReviews();
        return;
      }

      toast.success('Review deleted');
      setUserReview(null);
      setReviewRating(0);
      setReviewText('');
      fetchReviews();
    } catch (error) {
      console.error('Error deleting review:', error);
      toast.error('Failed to delete review');
    }
  };

  const renderStars = (rating, interactive = false, size = 'normal') => {
    const stars = [];
    const displayRating = interactive ? (hoverRating || reviewRating) : rating;
    
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span
          key={i}
          className={`star ${size} ${i <= displayRating ? 'filled' : ''} ${interactive ? 'interactive' : ''}`}
          onClick={interactive ? () => setReviewRating(i) : undefined}
          onMouseEnter={interactive ? () => setHoverRating(i) : undefined}
          onMouseLeave={interactive ? () => setHoverRating(0) : undefined}
        >
          {i <= displayRating ? <FaStar /> : <FaRegStar />}
        </span>
      );
    }
    return stars;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
                  <button
                    className="read-more-btn"
                    onClick={() => setIsFullDescription(!isFullDescription)}
                    aria-expanded={isFullDescription}
                  >
                    {isFullDescription ? 'Read Less' : 'Read More'}
                  </button>
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
              {averageRating > 0 && (
                <p>
                  <strong>Average Rating:</strong> {averageRating.toFixed(1)} / 5 <FaStar color='orange' /> ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
                </p>
              )}
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

      {/* Reviews Section */}
      {Object.keys(book).length > 0 && (
        <div className="reviews-section">
          <div className="reviews-header">
            <div className="reviews-title">
              <h2>⭐ Reviews & Ratings</h2>
              {reviews.length > 0 && (
                <div className="average-rating">
                  <span className="rating-number">{averageRating.toFixed(1)}</span>
                  <div className="rating-stars">
                    {renderStars(Math.round(averageRating))}
                  </div>
                  <span className="review-count">({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})</span>
                </div>
              )}
            </div>
            
            {!showReviewForm && (
              <button 
                className="write-review-btn"
                onClick={() => setShowReviewForm(true)}
              >
                {userReview ? '✏️ Edit Review' : '✍️ Write Review'}
              </button>
            )}
          </div>

          {/* Review Form */}
          {showReviewForm && (
            <div className="review-form">
              <h3>{userReview ? 'Edit Your Review' : 'Write a Review'}</h3>
              
              <div className="rating-input">
                <label>Your Rating:</label>
                <div className="star-input">
                  {renderStars(reviewRating, true, 'large')}
                </div>
              </div>

              <div className="review-text-input">
                <label>Your Review (optional):</label>
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Share your thoughts about this book..."
                  rows={4}
                />
              </div>

              <div className="anonymous-toggle">
                <label className="anonymous-label">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                  />
                  <span>Post as Anonymous</span>
                  <small className="anonymous-hint">
                    {isAnonymous 
                      ? 'Your name will be hidden from other users' 
                      : 'Your name will be visible to other users'}
                  </small>
                </label>
              </div>

              <div className="review-form-actions">
                <button 
                  className="cancel-btn"
                  onClick={() => {
                    setShowReviewForm(false);
                    if (userReview) {
                      setReviewRating(userReview.rating);
                      setReviewText(userReview.review_text || '');
                      setIsAnonymous(userReview.is_anonymous || false);
                    } else {
                      setReviewRating(0);
                      setReviewText('');
                      setIsAnonymous(false);
                    }
                  }}
                >
                  Cancel
                </button>
                {userReview && (
                  <button 
                    className="delete-btn"
                    onClick={handleDeleteReview}
                  >
                    <FaTrash /> Delete
                  </button>
                  
                )}
                <button 
                  className="submit-btn"
                  onClick={handleSubmitReview}
                  disabled={submittingReview || reviewRating === 0}
                >
                  {submittingReview ? 'Submitting...' : userReview ? 'Update Review' : 'Submit Review'}
                </button>
              </div>
            </div>
          )}

          {/* Reviews List */}
          <div className="reviews-list">
            {reviews.length === 0 ? (
              <div className="no-reviews">
                <p>No reviews yet. Be the first to review this book!</p>
              </div>
            ) : (
              reviews.map(review => (
                <div key={review.id} className="review-card">
                  <div className="review-header">
                    <div className="reviewer-info">
                      <span className="reviewer-name">{review.user_name}</span>
                      <span className="review-date">{formatDate(review.created_at)}</span>
                    </div>
                    <div className="review-rating">
                      {renderStars(review.rating)}
                    </div>
                  </div>
                  {review.review_text && (
                    <p className="review-text">{review.review_text}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
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