import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import translations from '../i18n/translations';
import { toast } from 'react-toastify';
import { notifyLoanUpdate } from '../lib/emailNotifications';
import { FaArrowLeftLong, FaClockRotateLeft, FaBook, FaCalendarCheck, FaHourglass, FaCircleCheck, FaCircleXmark, FaBoxArchive, FaList, FaGrip, FaFileExport, FaRotateLeft, FaBan } from 'react-icons/fa6';
import { MdFilterListOff } from 'react-icons/md';
import ConfirmDialog from '../components/ConfirmDialog';
import './LoanedBooks.css';

const LoanedBooks = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useLanguage();
  const t = translations[language];
  const [loanedBooks, setLoanedBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [extendingLoan, setExtendingLoan] = useState(null);
  const [returningLoan, setReturningLoan] = useState(null);
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'
  const [cancellingLoan, setCancellingLoan] = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(null);

  const filters = useMemo(() => [
    { id: 'all', label: t.allBooks, icon: <FaBook /> },
    { id: 'pending', label: t.pending, icon: <FaHourglass /> },
    { id: 'approved', label: t.active, icon: <FaCircleCheck /> },
    { id: 'rejected', label: t.rejected, icon: <FaCircleXmark /> },
    { id: 'returned', label: t.returned, icon: <FaBoxArchive /> }
  ], [t]);

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
      toast.error(t.somethingWentWrong);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString(language === 'sq' ? 'sq-AL' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDaysRemaining = (dueDate) => {
    if (!dueDate) return null;
    const now = new Date();
    const due = new Date(dueDate);
    const diffTime = due - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusInfo = (status) => {
    const statusMap = {
      pending: { class: 'status-pending', label: t.pending, icon: '⏳' },
      approved: { class: 'status-approved', label: t.active, icon: '✅' },
      rejected: { class: 'status-rejected', label: t.rejected, icon: '❌' },
      returned: { class: 'status-returned', label: t.returned, icon: '📦' }
    };
    return statusMap[status] || { class: '', label: status, icon: '📚' };
  };

  // Check if loan is overdue
  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  // Request loan extension (adds 14 days, max 2 extensions)
  const handleExtendLoan = async (loan) => {
    // Check extension limit
    const extensionCount = (loan.notes?.match(/\[Extended/g) || []).length;
    if (extensionCount >= 2) {
      toast.error(t.maxExtensionsReached);
      return;
    }

    setExtendingLoan(loan.id);
    try {
      const currentDueDate = new Date(loan.due_date);
      const newDueDate = new Date(currentDueDate);
      newDueDate.setDate(newDueDate.getDate() + 14);

      const existingNotes = loan.notes || '';
      const extensionNote = `${existingNotes ? existingNotes + '\n' : ''}[Extended +14 days on ${new Date().toLocaleDateString()}]`;

      const { error } = await supabase
        .from('loan_requests')
        .update({ 
          due_date: newDueDate.toISOString(),
          notes: extensionNote
        })
        .eq('id', loan.id)
        .eq('user_id', user.id);

      if (error) throw error;

      setLoanedBooks(prev => prev.map(b => 
        b.id === loan.id ? { ...b, due_date: newDueDate.toISOString() } : b
      ));
      
      toast.success(t.loanExtended);
      // Queue email notification
      notifyLoanUpdate(user.id, loan.book_title, 'extended').catch(() => {});
    } catch (error) {
      console.error('Error extending loan:', error);
      toast.error(t.somethingWentWrong);
    } finally {
      setExtendingLoan(null);
    }
  };

  // Mark book as returned
  const handleReturnBook = async (loan) => {
    setReturningLoan(loan.id);
    try {
      const { error } = await supabase
        .from('loan_requests')
        .update({ 
          status: 'returned',
          returned_at: new Date().toISOString()
        })
        .eq('id', loan.id)
        .eq('user_id', user.id);

      if (error) throw error;

      setLoanedBooks(prev => prev.map(b => 
        b.id === loan.id ? { ...b, status: 'returned', returned_at: new Date().toISOString() } : b
      ));
      
      toast.success(t.bookReturned);
      // Queue email notification
      notifyLoanUpdate(user.id, loan.book_title, 'returned').catch(() => {});
    } catch (error) {
      console.error('Error returning book:', error);
      toast.error(t.somethingWentWrong);
    } finally {
      setReturningLoan(null);
    }
  };

  // Filter books based on active filter and search term
  const filteredBooks = useMemo(() => loanedBooks
    .filter(book => activeFilter === 'all' || book.status === activeFilter)
    .filter(book => {
      if (!searchTerm.trim()) return true;
      const search = searchTerm.toLowerCase();
      const title = (book.book_title || '').toLowerCase();
      const authors = Array.isArray(book.book_authors) 
        ? book.book_authors.join(' ').toLowerCase()
        : (book.book_authors || '').toLowerCase();
      return title.includes(search) || authors.includes(search);
    }), [loanedBooks, activeFilter, searchTerm]);

  // Count for each status
  const statusCounts = useMemo(() => {
    const counts = { all: loanedBooks.length };
    for (const book of loanedBooks) {
      counts[book.status] = (counts[book.status] || 0) + 1;
    }
    return counts;
  }, [loanedBooks]);

  const getStatusCount = (status) => statusCounts[status] || 0;

  // Cancel pending loan request
  const handleCancelLoan = async () => {
    if (!confirmCancel) return;
    setCancellingLoan(confirmCancel.id);
    try {
      const { error } = await supabase
        .from('loan_requests')
        .delete()
        .eq('id', confirmCancel.id)
        .eq('user_id', user.id)
        .eq('status', 'pending');

      if (error) throw error;
      setLoanedBooks(prev => prev.filter(b => b.id !== confirmCancel.id));
      toast.success(t.loanCancelledSuccessfully || 'Loan request cancelled');
    } catch (error) {
      console.error('Error cancelling loan:', error);
      toast.error(t.somethingWentWrong);
    } finally {
      setCancellingLoan(null);
      setConfirmCancel(null);
    }
  };

  // Re-request a rejected loan
  const handleReRequest = async (loan) => {
    try {
      const { error } = await supabase
        .from('loan_requests')
        .update({ 
          status: 'pending', 
          notes: null,
          requested_at: new Date().toISOString()
        })
        .eq('id', loan.id)
        .eq('user_id', user.id);

      if (error) throw error;
      setLoanedBooks(prev => prev.map(b => 
        b.id === loan.id ? { ...b, status: 'pending', notes: null, requested_at: new Date().toISOString() } : b
      ));
      toast.success(t.loanReRequested || 'Loan re-requested!');
    } catch (error) {
      console.error('Error re-requesting loan:', error);
      toast.error(t.somethingWentWrong);
    }
  };

  // Export loan history as CSV
  const exportLoanHistory = () => {
    if (loanedBooks.length === 0) {
      toast.error('No loans to export');
      return;
    }
    const csvContent = [
      'Title,Authors,Status,Requested,Due Date,Returned',
      ...loanedBooks.map(loan => {
        const title = (loan.book_title || '').replace(/,/g, ';');
        const authors = (Array.isArray(loan.book_authors) ? loan.book_authors.join('; ') : (loan.book_authors || 'Unknown')).replace(/,/g, ';');
        return `"${title}","${authors}","${loan.status}","${formatDate(loan.requested_at)}","${formatDate(loan.due_date)}","${formatDate(loan.returned_at)}"`;
      })
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `loan_history_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success('Loan history exported!');
  };

  // Stats summary
  const stats = useMemo(() => ({
    total: loanedBooks.length,
    active: loanedBooks.filter(b => b.status === 'approved').length,
    overdue: loanedBooks.filter(b => b.status === 'approved' && isOverdue(b.due_date)).length,
    pending: loanedBooks.filter(b => b.status === 'pending').length
  }), [loanedBooks]);

  const renderLoanCard = (loan) => {
    const statusInfo = getStatusInfo(loan.status);
    const daysRemaining = getDaysRemaining(loan.due_date);
    const overdue = loan.status === 'approved' && isOverdue(loan.due_date);

    return (
      <div key={loan.id} className={`loan-card ${overdue ? 'overdue' : ''}`}>
        <div className="loan-card-image">
          <img 
            src={loan.book_image || 'https://placehold.co/128x192?text=No+Image'} 
            alt={loan.book_title}
            onClick={() => navigate(`/book/${loan.book_id}`)}
          />
          <span className={`card-status-badge ${statusInfo.class}`}>
            {statusInfo.icon} {statusInfo.label}
          </span>
        </div>
        
        <div className="loan-card-content">
          <h3 
            className="loan-card-title"
            onClick={() => navigate(`/book/${loan.book_id}`)}
          >
            {loan.book_title}
          </h3>
          <p className="loan-card-author">
            {Array.isArray(loan.book_authors) 
              ? loan.book_authors.join(', ') 
              : (loan.book_authors || t.unknownAuthor)}
          </p>

          <div className="loan-card-details">
            <div className="detail-row">
              <span className="detail-label">{t.requested}:</span>
              <span className="detail-value">{formatDate(loan.requested_at)}</span>
            </div>

            {loan.status === 'approved' && (
              <>
                <div className="detail-row">
                  <span className="detail-label">{t.dueDate}:</span>
                  <span className={`detail-value ${overdue ? 'overdue-text' : ''}`}>
                    {formatDate(loan.due_date)}
                  </span>
                </div>
                {daysRemaining !== null && (
                  <div className={`days-remaining ${overdue ? 'overdue' : daysRemaining <= 3 ? 'warning' : ''}`}>
                    {overdue 
                      ? `${Math.abs(daysRemaining)} ${t.daysOverdue}`
                      : `${daysRemaining} ${t.daysRemaining}`
                    }
                  </div>
                )}
              </>
            )}

            {loan.status === 'returned' && (
              <div className="detail-row">
                <span className="detail-label">{t.returned}:</span>
                <span className="detail-value">{formatDate(loan.returned_at)}</span>
              </div>
            )}

            {loan.status === 'rejected' && loan.notes && (
              <div className="rejection-note">
                <strong>{t.reason}:</strong> {loan.notes}
              </div>
            )}
          </div>

          {loan.status === 'approved' && (
            <div className="loan-card-actions">
              <button
                className="extend-btn"
                onClick={() => handleExtendLoan(loan)}
                disabled={extendingLoan === loan.id}
                title={t.extendLoan}
              >
                <FaClockRotateLeft />
                {extendingLoan === loan.id ? `${t.extending}...` : t.extend}
              </button>
              <button
                className="return-btn"
                onClick={() => handleReturnBook(loan)}
                disabled={returningLoan === loan.id}
                title={t.markAsReturned}
              >
                <FaBoxArchive />
                {returningLoan === loan.id ? `${t.returning}...` : t.return_}
              </button>
            </div>
          )}

          {loan.status === 'pending' && (
            <div className="loan-card-actions">
              <button
                className="cancel-btn"
                onClick={() => setConfirmCancel(loan)}
                disabled={cancellingLoan === loan.id}
              >
                <FaBan />
                {cancellingLoan === loan.id ? 'Cancelling...' : (t.cancelRequest || 'Cancel Request')}
              </button>
            </div>
          )}

          {loan.status === 'rejected' && (
            <div className="loan-card-actions">
              <button
                className="rerequest-btn"
                onClick={() => handleReRequest(loan)}
              >
                <FaRotateLeft />
                {t.reRequest || 'Re-request'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="loaned-books-page">
      <div className="loaned-books-container">
        {/* Header */}
        <div className="loaned-books-header">
          <div className="header-left">
            <h1>📚 {t.myLoanedBooks}</h1>
            <p className="header-subtitle">{t.trackManageBooks}</p>
          </div>
          <button 
            onClick={() => navigate(-1)}
            className="back-button"
          >
            <FaArrowLeftLong /> {t.goBack}
          </button>
          {loanedBooks.length > 0 && (
            <button className="export-history-btn" onClick={exportLoanHistory}>
              <FaFileExport /> {t.export || 'Export'}
            </button>
          )}
        </div>

        {/* Stats Summary */}
        {!loading && loanedBooks.length > 0 && (
          <div className="stats-summary">
            <div className="stat-item">
              <div className="stat-icon total"><FaBook /></div>
              <div className="stat-info">
                <span className="stat-number">{stats.total}</span>
                <span className="stat-label">{t.totalLoans}</span>
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-icon active"><FaCircleCheck /></div>
              <div className="stat-info">
                <span className="stat-number">{stats.active}</span>
                <span className="stat-label">{t.active}</span>
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-icon pending"><FaHourglass /></div>
              <div className="stat-info">
                <span className="stat-number">{stats.pending}</span>
                <span className="stat-label">{t.pending}</span>
              </div>
            </div>
            {stats.overdue > 0 && (
              <div className="stat-item overdue">
                <div className="stat-icon overdue"><FaCalendarCheck /></div>
                <div className="stat-info">
                  <span className="stat-number">{stats.overdue}</span>
                  <span className="stat-label">{t.overdue}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>{t.loadingYourLoanedBooks}</p>
          </div>
        ) : loanedBooks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📚</div>
            <h2>{t.noLoanedBooksYet}</h2>
            <p>{t.noLoanedBooks}</p>
            <button 
              onClick={() => navigate('/')}
              className="explore-button"
            >
              <FaBook /> {t.exploreBooks}
            </button>
          </div>
        ) : (
          <>
            {/* Controls Bar */}
            <div className="controls-bar">
              {/* Search */}
              <div className="search-container">
                <input
                  type="text"
                  placeholder={t.searchBooks || 'Search by title or author...'}
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

              {/* View Toggle */}
              <div className="view-toggle">
                <button 
                  className={`view-btn ${viewMode === 'cards' ? 'active' : ''}`}
                  onClick={() => setViewMode('cards')}
                  title={t.cardView}
                >
                  <FaGrip />
                </button>
                <button 
                  className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
                  onClick={() => setViewMode('table')}
                  title={t.tableView}
                >
                  <FaList />
                </button>
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
                <p>{t.noLoanedBooksYet}</p>
                {searchTerm && <span className="search-hint">{t.tryAgain}</span>}
                <button 
                  onClick={() => { setActiveFilter('all'); setSearchTerm(''); }}
                  className="show-all-btn"
                >
                  {t.clearFilters || 'Clear Filters'}
                </button>
              </div>
            ) : viewMode === 'cards' ? (
              /* Card View */
              <div className="loans-grid">
                {filteredBooks.map(loan => renderLoanCard(loan))}
              </div>
            ) : (
              /* Table View */
              <div className="table-container">
                <table className="loaned-books-table">
                  <thead>
                    <tr>
                      <th>{t.book_}</th>
                      <th>{t.authors_}</th>
                      <th>{t.requested}</th>
                      <th>{t.status}</th>
                      <th>{t.dueDate}</th>
                      <th>{t.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBooks.map((loan) => {
                      const statusInfo = getStatusInfo(loan.status);
                      const overdue = loan.status === 'approved' && isOverdue(loan.due_date);
                      
                      return (
                        <React.Fragment key={loan.id}>
                          <tr className={overdue ? 'overdue-row' : ''}>
                            <td className="book-cell">
                              <img 
                                src={loan.book_image || 'https://placehold.co/128x192?text=No+Image'} 
                                alt={loan.book_title}
                                className="book-thumbnail"
                                onClick={() => navigate(`/book/${loan.book_id}`)}
                              />
                              <span 
                                className="book-title"
                                onClick={() => navigate(`/book/${loan.book_id}`)}
                              >
                                {loan.book_title}
                              </span>
                            </td>
                            <td className="author-cell">
                              {Array.isArray(loan.book_authors) 
                                ? loan.book_authors.join(', ') 
                                : (loan.book_authors || t.unknownAuthor)}
                            </td>
                            <td>{formatDate(loan.requested_at)}</td>
                            <td>
                              <span className={`status-badge ${statusInfo.class}`}>
                                {statusInfo.label}
                              </span>
                            </td>
                            <td className="due-date-cell">
                              {loan.status === 'approved' ? (
                                <span className={overdue ? 'overdue-text' : ''}>
                                  {formatDate(loan.due_date)}
                                  {overdue && <span className="overdue-badge">{t.overdue}</span>}
                                </span>
                              ) : '—'}
                            </td>
                            <td className="actions-cell">
                              {loan.status === 'approved' && (
                                <div className="table-actions">
                                  <button
                                    className="extend-btn small"
                                    onClick={() => handleExtendLoan(loan)}
                                    disabled={extendingLoan === loan.id}
                                    title={t.extendBy14Days}
                                  >
                                    <FaClockRotateLeft />
                                  </button>
                                  <button
                                    className="return-btn small"
                                    onClick={() => handleReturnBook(loan)}
                                    disabled={returningLoan === loan.id}
                                    title={t.markAsReturned}
                                  >
                                    <FaBoxArchive />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                          {loan.status === 'rejected' && loan.notes && (
                            <tr className="rejection-reason-row">
                              <td colSpan="6">
                                <strong>{t.rejectionReason}:</strong> {loan.notes}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!confirmCancel}
        onClose={() => setConfirmCancel(null)}
        onConfirm={handleCancelLoan}
        title={t.cancelLoanRequest || 'Cancel Loan Request'}
        message={`Are you sure you want to cancel the loan request for "${confirmCancel?.book_title || 'this book'}"?`}
      />
    </div>
  );
};

export default LoanedBooks;
