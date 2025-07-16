import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './WishlistPage.css';
import { toast } from 'react-toastify';
import { FaArrowLeftLong } from "react-icons/fa6";
const WishlistPage = () => {
  const [watchlist, setWatchlist] = useState(() => {
    return JSON.parse(localStorage.getItem('watchlist')) || [];
  });
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("")



  useEffect(() => {
    localStorage.setItem('watchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  const filteredBooks = watchlist.filter(book => book?.title?.toLowerCase().includes(searchTerm?.toLowerCase()))



  const handleRemoveFromWatchlist = (e, book) => {
    e.stopPropagation()
    const updatedWatchlist = watchlist.filter(
      item => item.industryIdentifiers?.[0]?.identifier !== book.industryIdentifiers?.[0]?.identifier
    );
    setWatchlist(updatedWatchlist);
    toast.success("Book removed from watchlist");
  };

  const handleBookClick = (book) => {
    navigate(`/book/${book.id}`, { state: { book: { volumeInfo: book } } });
  };

  return (
    <div className="watchlist-page">
         <h3 style={{textAlign: "left", marginTop: "3rem",  cursor: "pointer"}}
            onClick={() => navigate(-1)}
        > <FaArrowLeftLong/> Go Back</h3>
      <h1>My Wishlist</h1>
      <input  type="text" placeholder="Seach the wishlisted book" onChange={(e) => setSearchTerm(e.target.value  )} />
      {watchlist.length === 0 ? (
        <p>Your wishlist is empty.</p>
      ) : (
        <div className="watchlist-container">
          {filteredBooks?.map((book, index) => (
            <div   key={index} className="watchlist-item">
              <div  className="watchlist-image">
                <img
                onClick={() => handleBookClick(book)}
                  src={book.imageLinks?.smallThumbnail || 'https://placehold.co/128x192?text=No+Image'}
                  alt={book.title || 'No Title'}
              
                />
              </div>
              <div className="watchlist-details">
                <h3 
                  onClick={() => handleBookClick(book)}
                  style={{ cursor: 'pointer' }}
                >
                  {book.title || 'Unknown Title'}
                </h3>
                <p className="author" onClick={() => navigate(`/authors/${book.authors[0]}`)}>by {book.authors?.join(', ') || 'Unknown Author'}</p>
                <button
                  className="remove-button"
                  onClick={(e) => handleRemoveFromWatchlist(e, book)}               >
                  Remove from Watchlist
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {watchlist.length !== 0 && filteredBooks.length === 0 && <p>No book matched the search</p>}
    </div>
  );
};

export default WishlistPage;