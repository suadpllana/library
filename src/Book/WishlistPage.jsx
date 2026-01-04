import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './WishlistPage.css';
import { toast } from 'react-toastify';
import { FaArrowLeftLong } from "react-icons/fa6";
import WishlistModal from './WishlistModal';
import { supabase } from '../lib/supabase';

const WishlistPage = () => {
  const [watchlist, setWatchlist] = useState([]);
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loanStatuses, setLoanStatuses] = useState({});
  const [requestingLoan, setRequestingLoan] = useState({});

  useEffect(() => {
    fetchWishlist();
  }, []);

  useEffect(() => {
    if (watchlist.length > 0) {
      checkLoanStatuses();
    }
  }, [watchlist]);

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

  const checkLoanStatuses = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return;
      }

      const bookIds = watchlist.map(book => book.id);
      const { data, error } = await supabase
        .from('loan_requests')
        .select('book_id, status')
        .eq('user_id', user.id)
        .in('book_id', bookIds)
        .in('status', ['pending', 'approved']);

      if (error) {
        console.error('Error checking loan statuses:', error);
        return;
      }

      const statusMap = {};
      data?.forEach(loan => {
        statusMap[loan.book_id] = loan.status;
      });
      setLoanStatuses(statusMap);
    } catch (error) {
      console.error('Error checking loan statuses:', error);
    }
  };

  const handleRequestLoan = async (e, book) => {
    e.stopPropagation();
    
    try {
      setRequestingLoan(prev => ({ ...prev, [book.id]: true }));
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        toast.error('Please sign in to request a loan');
        return;
      }

      const { error } = await supabase
        .from('loan_requests')
        .insert({
          user_id: user.id,
          book_id: book.id,
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

      setLoanStatuses(prev => ({ ...prev, [book.id]: 'pending' }));
      toast.success('Loan request submitted!');
    } catch (error) {
      console.error('Error requesting loan:', error);
      toast.error('Failed to request loan');
    } finally {
      setRequestingLoan(prev => ({ ...prev, [book.id]: false }));
    }
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
                <div className="wishlist-actions">
                  <button
                    className={`loan-button ${loanStatuses[book.id] === 'pending' ? 'pending' : ''} ${loanStatuses[book.id] === 'approved' ? 'approved' : ''}`}
                    onClick={(e) => handleRequestLoan(e, book)}
                    disabled={requestingLoan[book.id] || loanStatuses[book.id] === 'pending' || loanStatuses[book.id] === 'approved'}
                  >
                    {loanStatuses[book.id] === 'pending' ? '⏳ Loan Pending' : 
                     loanStatuses[book.id] === 'approved' ? '✓ Loan Approved' : 
                     requestingLoan[book.id] ? 'Requesting...' : '📚 Request Loan'}
                  </button>
                  <button
                    className="remove-button"
                    onClick={(e) => handleRemoveFromWatchlist(e, book)}
                  >
                    Remove from Watchlist
                  </button>
                </div>
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
