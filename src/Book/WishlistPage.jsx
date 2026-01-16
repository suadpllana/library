import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './WishlistPage.css';
import { toast } from 'react-toastify';
import { FaArrowLeftLong, FaPlus, FaTrash } from "react-icons/fa6";
import { MdGridView, MdViewList, MdSort } from "react-icons/md";
import WishlistModal from './WishlistModal';
import AddBookModal from './AddBookModal';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

const WishlistPage = () => {
  const [watchlist, setWatchlist] = useState([]);
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [openAddModal, setOpenAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loanStatuses, setLoanStatuses] = useState({});
  const [requestingLoan, setRequestingLoan] = useState({});
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'

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
        .order('position', { ascending: true, nullsFirst: false })
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

  const handleBookAdded = () => {
    fetchWishlist();
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
        .select('book_id, status, notes')
        .eq('user_id', user.id)
        .in('book_id', bookIds)
        .in('status', ['pending', 'approved', 'rejected']);

      if (error) {
        console.error('Error checking loan statuses:', error);
        return;
      }

      const statusMap = {};
      data?.forEach(loan => {
        statusMap[loan.book_id] = { status: loan.status, notes: loan.notes };
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

      setLoanStatuses(prev => ({ ...prev, [book.id]: { status: 'pending', notes: null } }));
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
        <p style={{ textAlign: "center", color: "#a5a5c0" }}>{watchlist.length} books wishlisted</p>
      )}

      {/* Toolbar */}
      <div className="wishlist-toolbar">
        <div className="toolbar-left">
          <button 
            className="add-book-btn"
            onClick={() => setOpenAddModal(true)}
          >
            <FaPlus /> Add Book
          </button>
          <button className="sort-wishlist-btn" onClick={() => setOpenModal(true)}>
            <MdSort /> Sort
          </button>
        </div>
        <div className="toolbar-right">
          <input
            type="text"
            placeholder="Search books..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <div className="view-toggle">
            <button 
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List View"
            >
              <MdViewList />
            </button>
            <button 
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <MdGridView />
            </button>
          </div>
        </div>
      </div>

      {watchlist.length === 0 ? (
        <div className="empty-wishlist">
          <span className="empty-icon">📚</span>
          <p>Your wishlist is empty</p>
          <button onClick={() => setOpenAddModal(true)} className="add-first-btn">
            <FaPlus /> Add your first book
          </button>
        </div>
      ) : (
        <div className={`watchlist-container ${viewMode}`}>
          {filteredBooks?.map((book) => (
            <div key={book.id} className={`watchlist-item ${viewMode}`}>
              {viewMode === 'list' ? (
                // List View
                <>
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
                      onClick={() => book.authors?.[0] && navigate(`/authors/${book.authors[0]}`)}
                      style={{ cursor: book.authors?.[0] ? 'pointer' : 'default' }}
                    >
                      by {book.authors?.join(', ') || 'Unknown Author'}
                    </p>
                    <div className="wishlist-actions">
                      <button
                        className={`loan-button ${loanStatuses[book.id]?.status === 'pending' ? 'pending' : ''} ${loanStatuses[book.id]?.status === 'approved' ? 'approved' : ''} ${loanStatuses[book.id]?.status === 'rejected' ? 'rejected' : ''}`}
                        onClick={(e) => handleRequestLoan(e, book)}
                        disabled={requestingLoan[book.id] || loanStatuses[book.id]?.status === 'pending' || loanStatuses[book.id]?.status === 'approved'}
                      >
                        {loanStatuses[book.id]?.status === 'pending' ? '⏳ Loan Pending' : 
                         loanStatuses[book.id]?.status === 'approved' ? '✓ Loan Approved' : 
                         loanStatuses[book.id]?.status === 'rejected' ? '❌ Loan Rejected' :
                         requestingLoan[book.id] ? 'Requesting...' : '📚 Request Loan'}
                      </button>
                      <button
                        className="remove-button"
                        onClick={(e) => handleRemoveFromWatchlist(e, book)}
                      >
                        <FaTrash /> Remove
                      </button>
                    </div>
                    {loanStatuses[book.id]?.status === 'rejected' && (
                      <div className="rejection-message">
                        <strong>Rejection reason:</strong> {loanStatuses[book.id]?.notes || 'No reason provided'}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                // Grid View
                <div className="grid-card-content">
                  <button
                    className="grid-remove-btn"
                    onClick={(e) => handleRemoveFromWatchlist(e, book)}
                    title="Remove from wishlist"
                  >
                    <FaTrash />
                  </button>
                  <img
                    onClick={() => handleBookClick(book)}
                    src={book.imageLinks?.smallThumbnail || 'https://placehold.co/128x192?text=No+Image'}
                    alt={book.title || 'No Title'}
                    className="grid-book-cover"
                  />
                  <div className="grid-book-info">
                    <h4 onClick={() => handleBookClick(book)}>{book.title || 'Unknown Title'}</h4>
                    <p>{book.authors?.[0] || 'Unknown Author'}</p>
                  </div>
                  <button
                    className={`grid-loan-btn ${loanStatuses[book.id]?.status || ''}`}
                    onClick={(e) => handleRequestLoan(e, book)}
                    disabled={requestingLoan[book.id] || loanStatuses[book.id]?.status === 'pending' || loanStatuses[book.id]?.status === 'approved'}
                  >
                    {loanStatuses[book.id]?.status === 'pending' ? '⏳' : 
                     loanStatuses[book.id]?.status === 'approved' ? '✓' : 
                     loanStatuses[book.id]?.status === 'rejected' ? '❌' : '📚'}
                  </button>
                </div>
              )}
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
          setWatchlist={handleSortedWishlist}
          setOpenModal={setOpenModal}
          refreshWishlist={fetchWishlist}
        />
      )}

      {openAddModal && (
        <AddBookModal
          setOpenModal={setOpenAddModal}
          onBookAdded={handleBookAdded}
        />
      )}
    </div>
  );
};

export default WishlistPage;
