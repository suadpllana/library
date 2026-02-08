import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import './WishlistPage.css';
import { toast } from 'react-toastify';
import { FaArrowLeftLong, FaPlus, FaTrash } from "react-icons/fa6";
import { MdGridView, MdViewList, MdSort } from "react-icons/md";
import { FaFileExport, FaCheckSquare, FaRegSquare } from 'react-icons/fa';
import WishlistModal from './WishlistModal';
import AddBookModal from './AddBookModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../context/LanguageContext';
import translations from '../i18n/translations';

const WishlistPage = () => {
  const { language } = useLanguage();
  const t = translations[language];
  const [watchlist, setWatchlist] = useState([]);
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [openAddModal, setOpenAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loanStatuses, setLoanStatuses] = useState({});
  const [requestingLoan, setRequestingLoan] = useState({});
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'
  const [removingBook, setRemovingBook] = useState(null); // book to confirm removal
  const [selectedBooks, setSelectedBooks] = useState([]); // bulk selection
  const [selectMode, setSelectMode] = useState(false);

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
        toast.error(t.pleaseSignIn);
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
      toast.error(t.somethingWentWrong);
    } finally {
      setLoading(false);
    }
  };

  const normalizedSearch = (searchTerm || '').toLowerCase().trim();
  const filteredBooks = useMemo(() => (watchlist || []).filter(book => {
    if (!normalizedSearch) return true;
    const title = (book?.title || '').toLowerCase();
    const authors = (Array.isArray(book?.authors) ? book.authors.join(' ') : (book?.authors || '')).toLowerCase();
    return title.includes(normalizedSearch) || authors.includes(normalizedSearch);
  }), [watchlist, normalizedSearch]);


  const handleRemoveFromWatchlist = async (e, book) => {
    e.stopPropagation();
    setRemovingBook(book);
  };

  const confirmRemove = async () => {
    if (!removingBook) return;
    try {
      const { error } = await supabase
        .from('wishlist')
        .delete()
        .eq('id', removingBook.id);

      if (error) throw error;

      const updatedWatchlist = watchlist.filter(item => item.id !== removingBook.id);
      setWatchlist(updatedWatchlist);
      localStorage.setItem("wishlist_order", JSON.stringify(updatedWatchlist));
      toast.success(t.removedFromWishlist);
    } catch (error) {
      console.error('Error removing book from wishlist:', error);
      toast.error(t.somethingWentWrong);
    } finally {
      setRemovingBook(null);
    }
  };

  const handleBulkRemove = async () => {
    if (selectedBooks.length === 0) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      for (const bookId of selectedBooks) {
        await supabase.from('wishlist').delete().eq('id', bookId).eq('user_id', user.id);
      }
      const updatedWatchlist = watchlist.filter(item => !selectedBooks.includes(item.id));
      setWatchlist(updatedWatchlist);
      localStorage.setItem("wishlist_order", JSON.stringify(updatedWatchlist));
      toast.success(`${selectedBooks.length} book(s) removed`);
      setSelectedBooks([]);
      setSelectMode(false);
    } catch (error) {
      console.error('Error bulk removing:', error);
      toast.error(t.somethingWentWrong);
    }
  };

  const exportWishlist = () => {
    if (watchlist.length === 0) {
      toast.error('No books to export');
      return;
    }
    const csvContent = [
      'Title,Authors,Added Date',
      ...watchlist.map(book => {
        const title = (book.title || '').replace(/,/g, ';');
        const authors = (book.authors?.join('; ') || 'Unknown').replace(/,/g, ';');
        const date = book.created_at ? new Date(book.created_at).toLocaleDateString() : 'N/A';
        return `"${title}","${authors}","${date}"`;
      })
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `wishlist_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success('Wishlist exported!');
  };

  const toggleBookSelection = (bookId) => {
    setSelectedBooks(prev => 
      prev.includes(bookId) ? prev.filter(id => id !== bookId) : [...prev, bookId]
    );
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
        toast.error(t.pleaseSignIn);
        return;
      }

      const { error } = await supabase
        .from('loan_requests')
        .insert({
          user_id: user.id,
          book_id: book.id,
          book_title: book.title || t.unknownTitle,
          book_authors: book.authors || [],
          book_image: book.imageLinks?.smallThumbnail || 'https://placehold.co/128x192?text=No+Image',
          status: 'pending'
        });

      if (error) {
        if (error.code === '23505') {
          toast.error(t.alreadyRequested || 'You already have an active request for this book');
        } else {
          toast.error(t.somethingWentWrong);
        }
        return;
      }

      setLoanStatuses(prev => ({ ...prev, [book.id]: { status: 'pending', notes: null } }));
      toast.success(t.loanRequestSubmitted || 'Loan request submitted!');
    } catch (error) {
      console.error('Error requesting loan:', error);
      toast.error(t.somethingWentWrong);
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
        <FaArrowLeftLong /> {t.goBack}
      </h3>
      <h1>{t.myWishlist}</h1>

      {watchlist?.length > 0 && (
        <p style={{ textAlign: "center", color: "#a5a5c0" }}>{watchlist.length} {t.booksWishlisted || 'books wishlisted'}</p>
      )}

      {/* Toolbar */}
      <div className="wishlist-toolbar">
        <div className="toolbar-left">
          <button 
            className="add-book-btn"
            onClick={() => setOpenAddModal(true)}
          >
            <FaPlus /> {t.addBook || 'Add Book'}
          </button>
          <button className="sort-wishlist-btn" onClick={() => setOpenModal(true)}>
            <MdSort /> {t.sort || 'Sort'}
          </button>
          <button className="export-btn" onClick={exportWishlist} title="Export wishlist">
            <FaFileExport /> {t.export || 'Export'}
          </button>
          <button 
            className={`select-btn ${selectMode ? 'active' : ''}`}
            onClick={() => { setSelectMode(!selectMode); setSelectedBooks([]); }}
            title="Select multiple"
          >
            {selectMode ? <FaCheckSquare /> : <FaRegSquare />} {t.select || 'Select'}
          </button>
          {selectMode && selectedBooks.length > 0 && (
            <button className="bulk-remove-btn" onClick={handleBulkRemove}>
              <FaTrash /> {t.removeSelected || 'Remove'} ({selectedBooks.length})
            </button>
          )}
        </div>
        <div className="toolbar-right">
          <input
            type="text"
            placeholder={t.searchBooksByTitleAuthor || 'Search books by title or author...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <div className="view-toggle">
            <button 
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title={t.listView}
            >
              <MdViewList />
            </button>
            <button 
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title={t.gridView}
            >
              <MdGridView />
            </button>
          </div>
        </div>
      </div>

      {watchlist.length === 0 ? (
        <div className="empty-wishlist">
          <span className="empty-icon">📚</span>
          <p>{t.emptyWishlist}</p>
          <button onClick={() => setOpenAddModal(true)} className="add-first-btn">
            <FaPlus /> {t.addFirstWishlistBook || 'Add your first book'}
          </button>
        </div>
      ) : (
        <div className={`watchlist-container ${viewMode}`}>
          {filteredBooks?.map((book) => (
            <div key={book.id} className={`watchlist-item ${viewMode} ${selectedBooks.includes(book.id) ? 'selected' : ''}`}>
              {selectMode && (
                <label className="select-checkbox" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedBooks.includes(book.id)}
                    onChange={() => toggleBookSelection(book.id)}
                  />
                </label>
              )}
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
                      {book.title || t.unknownTitle}
                    </h3>
                    <p
                      className="author"
                      onClick={() => book.authors?.[0] && navigate(`/authors/${book.authors[0]}`)}
                      style={{ cursor: book.authors?.[0] ? 'pointer' : 'default' }}
                    >
                      {t.by} {book.authors?.join(', ') || t.unknownAuthor}
                    </p>
                    <div className="wishlist-actions">
                      <button
                        className={`loan-button ${loanStatuses[book.id]?.status === 'pending' ? 'pending' : ''} ${loanStatuses[book.id]?.status === 'approved' ? 'approved' : ''} ${loanStatuses[book.id]?.status === 'rejected' ? 'rejected' : ''}`}
                        onClick={(e) => handleRequestLoan(e, book)}
                        disabled={requestingLoan[book.id] || loanStatuses[book.id]?.status === 'pending' || loanStatuses[book.id]?.status === 'approved'}
                      >
                        {loanStatuses[book.id]?.status === 'pending' ? `⏳ ${t.loanPending || 'Loan Pending'}` : 
                         loanStatuses[book.id]?.status === 'approved' ? `✓ ${t.loanApproved || 'Loan Approved'}` : 
                         loanStatuses[book.id]?.status === 'rejected' ? `❌ ${t.loanRejected || 'Loan Rejected'}` :
                         requestingLoan[book.id] ? `${t.requesting || 'Requesting'}...` : `📚 ${t.requestLoan}`}
                      </button>
                      <button
                        className="remove-button"
                        onClick={(e) => handleRemoveFromWatchlist(e, book)}
                      >
                        <FaTrash /> {t.remove || 'Remove'}
                      </button>
                    </div>
                    {loanStatuses[book.id]?.status === 'rejected' && (
                      <div className="rejection-message">
                        <strong>{t.rejectionReason || 'Rejection reason'}:</strong> {loanStatuses[book.id]?.notes || t.noReasonProvided || 'No reason provided'}
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
                    <h4 onClick={() => handleBookClick(book)}>{book.title || t.unknownTitle}</h4>
                    <p>{book.authors?.[0] || t.unknownAuthor}</p>
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
        <p>{t.noBookMatchedSearch || 'No book matched the search'}</p>
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

      <ConfirmDialog
        isOpen={!!removingBook}
        onClose={() => setRemovingBook(null)}
        onConfirm={confirmRemove}
        title="Remove from Wishlist"
        message={`Are you sure you want to remove "${removingBook?.title || 'this book'}" from your wishlist?`}
      />
    </div>
  );
};

export default WishlistPage;
