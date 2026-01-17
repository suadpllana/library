import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FaArrowLeftLong, FaClockRotateLeft } from 'react-icons/fa6';
import { MdFilterListOff } from 'react-icons/md';
import './LoanedBooks.css';

const LoanedBooks = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loanedBooks, setLoanedBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [extendingLoan, setExtendingLoan] = useState(null);

  const filters = [
    { id: 'all', label: 'All', icon: '📚' },
    { id: 'pending', label: 'Pending', icon: '⏳' },
    { id: 'approved', label: 'Approved', icon: '✅' },
    { id: 'rejected', label: 'Rejected', icon: '❌' },
    { id: 'returned', label: 'Returned', icon: '📦' }
  ];

  useEffect(() => {
    if (user?.id) {
      fetchLoanedBooks();
    }
  }, [user?.id]);

  const fetchLoanedBooks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('loan_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('requested_at', { ascending: false });

      if (error) throw error;
      setLoanedBooks(data || []);
    } catch (error) {
      console.error('Error fetching loaned books:', error);
      toast.error('Failed to fetch loaned books');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      pending: 'status-pending',
      approved: 'status-approved',
      rejected: 'status-rejected',
      returned: 'status-returned'
    };
    return <span className={`status-badge ${statusClasses[status]}`}>{status}</span>;
  };

  // Check if loan is overdue
  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  // Request loan extension (adds 30 days)
  const handleExtendLoan = async (loan) => {
    if (!isOverdue(loan.due_date)) {
      toast.info('You can only extend overdue loans');
      return;
    }

    setExtendingLoan(loan.id);
    try {
      const currentDueDate = new Date(loan.due_date);
      const newDueDate = new Date(currentDueDate);
      newDueDate.setDate(newDueDate.getDate() + 30);

      const { error } = await supabase
        .from('loan_requests')
        .update({ 
          due_date: newDueDate.toISOString(),
          notes: `Extended by 30 days on ${new Date().toLocaleDateString()}`
        })
        .eq('id', loan.id)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state
      setLoanedBooks(prev => prev.map(b => 
        b.id === loan.id ? { ...b, due_date: newDueDate.toISOString() } : b
      ));
      
      toast.success('Loan extended by 30 days!');
    } catch (error) {
      console.error('Error extending loan:', error);
      toast.error('Failed to extend loan');
    } finally {
      setExtendingLoan(null);
    }
  };

  // Filter books based on active filter and search term
  const filteredBooks = loanedBooks
    .filter(book => activeFilter === 'all' || book.status === activeFilter)
    .filter(book => {
      if (!searchTerm.trim()) return true;
      const search = searchTerm.toLowerCase();
      const title = (book.book_title || '').toLowerCase();
      const authors = Array.isArray(book.book_authors) 
        ? book.book_authors.join(' ').toLowerCase()
        : (book.book_authors || '').toLowerCase();
      return title.includes(search) || authors.includes(search);
    });

  // Count for each status
  const getStatusCount = (status) => {
    if (status === 'all') return loanedBooks.length;
    return loanedBooks.filter(book => book.status === status).length;
  };

  return (
    <div className="loaned-books-page">
      <div className="loaned-books-container">
        <div className="loaned-books-header">
          <h1>📚 My Loaned Books</h1>
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
              padding: '0.5rem',
              fontSize: '1rem'
            }}
          >
            <FaArrowLeftLong /> Go Back
          </button>
        </div>

        {loading ? (
          <div className="loading">Loading your loaned books...</div>
        ) : loanedBooks.length === 0 ? (
          <div className="no-data">
            <p>You haven't loaned any books yet.</p>
            <button 
              onClick={() => navigate('/')}
              className="explore-button"
            >
              Explore Books
            </button>
          </div>
        ) : (
          <>
            {/* Search Bar */}
            <div className="search-container">
              <div className="search-input-wrapper">
                <input
                  type="text"
                  placeholder="Search by title or author..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
                {searchTerm && (
                  <button 
                    className="clear-search"
                    onClick={() => setSearchTerm('')}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="filter-tabs">
              {filters.map(filter => (
                <button
                  key={filter.id}
                  className={`filter-tab ${activeFilter === filter.id ? 'active' : ''} ${filter.id !== 'all' ? `filter-${filter.id}` : ''}`}
                  onClick={() => setActiveFilter(filter.id)}
                >
                  <span className="filter-icon">{filter.icon}</span>
                  <span className="filter-label">{filter.label}</span>
                  <span className="filter-count">{getStatusCount(filter.id)}</span>
                </button>
              ))}
            </div>

            {filteredBooks.length === 0 ? (
              <div className="no-filtered-data">
                <MdFilterListOff className="no-data-icon" />
                <p>No {activeFilter} books found</p>
                <button 
                  onClick={() => setActiveFilter('all')}
                  className="show-all-btn"
                >
                  Show All Books
                </button>
              </div>
            ) : (
              <div className="table-container">
                <table className="loaned-books-table">
                  <thead>
                    <tr>
                      <th>Book</th>
                      <th>Author(s)</th>
                      <th>Requested Date</th>
                      <th>Status</th>
                      <th>Due Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBooks.map((loan) => (
                      <React.Fragment key={loan.id}>
                        <tr className={loan.status === 'approved' && isOverdue(loan.due_date) ? 'overdue-row' : ''}>
                          <td className="book-cell">
                            <img 
                              src={loan.book_image} 
                              alt={loan.book_title}
                              className="book-thumbnail"
                            />
                            <span className="book-title">{loan.book_title}</span>
                          </td>
                          <td>
                            {Array.isArray(loan.book_authors) 
                              ? loan.book_authors.join(', ') 
                              : (loan.book_authors || 'Unknown Author')}
                          </td>
                          <td>{formatDate(loan.requested_at)}</td>
                          <td>{getStatusBadge(loan.status)}</td>
                          <td className="due-date">
                            {loan.status === 'approved' ? (
                              <span className={isOverdue(loan.due_date) ? 'overdue' : ''}>
                                {formatDate(loan.due_date)}
                                {isOverdue(loan.due_date) && <span className="overdue-badge">Overdue</span>}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="actions-cell">
                            {loan.status === 'approved' && isOverdue(loan.due_date) && (
                              <button
                                className="extend-btn"
                                onClick={() => handleExtendLoan(loan)}
                                disabled={extendingLoan === loan.id}
                                title="Extend loan by 30 days"
                              >
                                <FaClockRotateLeft />
                                {extendingLoan === loan.id ? 'Extending...' : 'Extend'}
                              </button>
                            )}
                          </td>
                        </tr>
                        {loan.status === 'rejected' && (
                          <tr className="rejection-reason-row">
                            <td colSpan="6">
                              <strong>Rejection Reason:</strong> {loan.notes || 'No reason provided'}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default LoanedBooks;
