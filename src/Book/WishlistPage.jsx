import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './WishlistPage.css';
import { toast } from 'react-toastify';
import { FaArrowLeftLong } from "react-icons/fa6";
import WishlistModal from './WishlistModal';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const WishlistPage = () => {
  const [watchlist, setWatchlist] = useState([]);
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWishlist();
  }, []);

  const fetchWishlist = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('Authentication error:', authError);
        toast.error('Please sign in to view your wishlist');
        setLoading(false);
        return;
      }

      const { data: wishlistItems, error } = await supabase
        .from('wishlist')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted = wishlistItems.map(item => ({
        ...item,
        imageLinks: { smallThumbnail: item.image_url },
        title: item.title,
        authors: item.authors
      }));

      setWatchlist(formatted);
      localStorage.setItem("wishlist_order", JSON.stringify(formatted));
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      toast.error('Failed to load wishlist');
    } finally {
      setLoading(false);
    }
  };

  const filteredBooks = watchlist?.filter(book =>
    book?.title?.toLowerCase().includes(searchTerm?.toLowerCase())
  );

  const handleRemoveFromWatchlist = async (e, book) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from('wishlist')
        .delete()
        .eq('id', book.id);

      if (error) throw error;

      const updatedWatchlist = watchlist.filter(item => item.id !== book.id);
      setWatchlist(updatedWatchlist);
      localStorage.setItem("wishlist_order", JSON.stringify(updatedWatchlist)); // ✅ update localStorage
      toast.success("Book removed from wishlist");
    } catch (error) {
      console.error('Error removing book from wishlist:', error);
      toast.error("Failed to remove book from wishlist");
    }
  };

  const handleBookClick = (book) => {
    navigate(`/book/${book.id}`, { state: { book: { volumeInfo: book } } });
  };

  const handleSortedWishlist = (sorted) => {
    setWatchlist(sorted);
    localStorage.setItem("wishlist_order", JSON.stringify(sorted));
  };

  return (
    <div className="watchlist-page">
      <h3
        style={{ textAlign: "left", marginTop: "3rem", cursor: "pointer" }}
        onClick={() => navigate(-1)}
      >
        <FaArrowLeftLong /> Go Back
      </h3>
      <h1>My Wishlist</h1>

      {watchlist?.length > 0 && (
        <p style={{ textAlign: "center" }}>{watchlist.length} books wishlisted</p>
      )}

      <input
        type="text"
        placeholder="Search the wishlisted book"
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <button className="sort-wishlist" onClick={() => setOpenModal(true)}>
        Sort the wishlist
      </button>

      {watchlist.length === 0 ? (
        <p>Your wishlist is empty.</p>
      ) : (
        <div className="watchlist-container">
          {filteredBooks?.map((book, index) => (
            <div key={index} className="watchlist-item">
              <div className="watchlist-image">
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
                <p
                  className="author"
                  onClick={() => navigate(`/authors/${book.authors[0]}`)}
                >
                  by {book.authors?.join(', ') || 'Unknown Author'}
                </p>
                <button
                  className="remove-button"
                  onClick={(e) => handleRemoveFromWatchlist(e, book)}
                >
                  Remove from Watchlist
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {watchlist.length !== 0 && filteredBooks.length === 0 && (
        <p>No book matched the search</p>
      )}

      {openModal && (
        <WishlistModal
          watchlist={watchlist}
          setWatchlist={handleSortedWishlist} // ✅ use this to update localStorage too
          setOpenModal={setOpenModal}
        />
      )}
    </div>
  );
};

export default WishlistPage;
