import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FaArrowLeftLong, FaFilter } from 'react-icons/fa6';
import { MdFilterList, MdFilterListOff } from 'react-icons/md';
import './LoanedBooks.css';

const LoanedBooks = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loanedBooks, setLoanedBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');

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

  // Filter books based on active filter
  const filteredBooks = activeFilter === 'all' 
    ? loanedBooks 
    : loanedBooks.filter(book => book.status === activeFilter);

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
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBooks.map((loan) => (
                      <React.Fragment key={loan.id}>
                        <tr>
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
                            {loan.status === 'approved' ? formatDate(loan.due_date) : '—'}
                          </td>
                        </tr>
                        {loan.status === 'rejected' && (
                          <tr className="rejection-reason-row">
                            <td colSpan="5">
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
