import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from "react-router-dom";
import "./BookPage.css";
import { toast } from "react-toastify";
import { FaArrowLeftLong } from "react-icons/fa6";
const BookPage = () => {
  const location = useLocation();
  const book = location.state?.book?.volumeInfo || {};
  const id = location.state?.book?.id
  const navigate = useNavigate()

  const [isFullDescription, setIsFullDescription] = useState(false);
  const [watchlist, setWatchlist] = useState(() => {
    return JSON.parse(localStorage.getItem('watchlist')) || [];
  });

  useEffect(() => {
    localStorage.setItem('watchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  const isInWatchlist = watchlist.some(
    item => item.industryIdentifiers?.[0]?.identifier === book.industryIdentifiers?.[0]?.identifier
  );

  const handleWatchlistToggle = () => {
    if (isInWatchlist) {
      const updatedWatchlist = watchlist.filter(
        item => item.industryIdentifiers?.[0]?.identifier !== book.industryIdentifiers?.[0]?.identifier
      );
      setWatchlist(updatedWatchlist);
      toast.success("Book removed from watchlist");
    } else {
      const updatedWatchlist = [...watchlist, {id, ...book}];
      setWatchlist(updatedWatchlist);
      toast.success("Book added to watchlist");
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
                className="watchlist-button" 
                onClick={handleWatchlistToggle}
                style={{
                  backgroundColor: isInWatchlist ? '#e74c3c' : '#2ecc71',
                  color: 'white',
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  marginLeft: '10px'
                }}
              >
                {isInWatchlist ? 'Remove from Wishlist' : 'Add to Wishlist'}
              </button>
                  <h3 style={{textAlign: "left", marginTop: "3rem",  cursor: "pointer", color: "white"}}
            onClick={() => navigate(-1)}
        > <FaArrowLeftLong /> Go Back</h3>
            </div>
          </div>
        </div>
      ) : (
        <p>Something went wrong</p>
      )}
    </div>
  );
};

export default BookPage;