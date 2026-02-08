import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { toast } from 'react-toastify';
import ConfirmDialog from '../components/ConfirmDialog';
import { FaArrowLeft, FaMoneyBillWave, FaClock, FaCheckCircle, FaTimesCircle, FaHourglass, FaExclamationTriangle, FaBook } from 'react-icons/fa';
import './FeesPage.css';

const FEE_PER_DAY = 1; // $1 per day

const FeesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [overdueLoans, setOverdueLoans] = useState([]);
  const [feePayments, setFeePayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmPay, setConfirmPay] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user?.id) fetchData();
  }, [user?.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all approved loans that are overdue OR returned late
      const { data: loans, error: loanError } = await supabase
        .from('loan_requests')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['approved', 'returned'])
        .not('due_date', 'is', null)
        .order('due_date', { ascending: true });

      if (loanError) throw loanError;

      // Filter to only overdue loans
      const now = new Date();
      const overdue = (loans || []).filter(loan => {
        const dueDate = new Date(loan.due_date);
        if (loan.status === 'approved') {
          return dueDate < now;
        }
        // For returned loans, check if returned after due date
        if (loan.status === 'returned' && loan.returned_at) {
          return new Date(loan.returned_at) > dueDate;
        }
        return false;
      });

      setOverdueLoans(overdue);

      // Fetch existing fee payments
      const { data: fees, error: feeError } = await supabase
        .from('fee_payments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (feeError) throw feeError;
      setFeePayments(fees || []);
    } catch (error) {
      console.error('Error fetching fees:', error);
      toast.error(t('somethingWentWrong'));
    } finally {
      setLoading(false);
    }
  };

  const calculateDaysOverdue = (loan) => {
    const dueDate = new Date(loan.due_date);
    const endDate = loan.status === 'returned' && loan.returned_at
      ? new Date(loan.returned_at)
      : new Date();
    const diffTime = endDate - dueDate;
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  };

  const calculateFee = (loan) => {
    return calculateDaysOverdue(loan) * FEE_PER_DAY;
  };

  const getFeePaymentForLoan = (loanId) => {
    return feePayments.find(fp => fp.loan_id === loanId);
  };

  const getFeeStatus = (loan) => {
    const payment = getFeePaymentForLoan(loan.id);
    if (!payment) return 'unpaid';
    return payment.status;
  };

  const handleMarkPaid = async () => {
    if (!confirmPay) return;
    setSubmitting(true);
    try {
      const daysOverdue = calculateDaysOverdue(confirmPay);
      const amount = calculateFee(confirmPay);
      const existingPayment = getFeePaymentForLoan(confirmPay.id);

      if (existingPayment) {
        // Update existing payment
        const { error } = await supabase
          .from('fee_payments')
          .update({
            status: 'pending',
            amount,
            days_overdue: daysOverdue,
            paid_at: new Date().toISOString()
          })
          .eq('id', existingPayment.id)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        // Create new fee payment
        const { error } = await supabase
          .from('fee_payments')
          .insert({
            user_id: user.id,
            loan_id: confirmPay.id,
            amount,
            days_overdue: daysOverdue,
            status: 'pending',
            paid_at: new Date().toISOString()
          });
        if (error) throw error;
      }

      toast.success(t('feePaidPending') || 'Fee marked as paid — awaiting admin verification');
      await fetchData();
    } catch (error) {
      console.error('Error submitting fee payment:', error);
      toast.error(t('somethingWentWrong'));
    } finally {
      setSubmitting(false);
      setConfirmPay(null);
    }
  };

  const totalOwed = useMemo(() => {
    return overdueLoans.reduce((sum, loan) => {
      const status = getFeeStatus(loan);
      if (status === 'verified') return sum;
      return sum + calculateFee(loan);
    }, 0);
  }, [overdueLoans, feePayments]);

  const totalPaid = useMemo(() => {
    return feePayments
      .filter(fp => fp.status === 'verified')
      .reduce((sum, fp) => sum + Number(fp.amount), 0);
  }, [feePayments]);

  const pendingCount = useMemo(() => {
    return feePayments.filter(fp => fp.status === 'pending').length;
  }, [feePayments]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const map = {
      unpaid: { icon: <FaExclamationTriangle />, label: t('unpaid') || 'Unpaid', cls: 'status-unpaid' },
      pending: { icon: <FaHourglass />, label: t('pendingVerification') || 'Pending Verification', cls: 'status-pending' },
      verified: { icon: <FaCheckCircle />, label: t('verified') || 'Verified', cls: 'status-verified' },
      rejected: { icon: <FaTimesCircle />, label: t('paymentRejected') || 'Rejected', cls: 'status-rejected' }
    };
    const s = map[status] || map.unpaid;
    return <span className={`fee-status-badge ${s.cls}`}>{s.icon} {s.label}</span>;
  };

  if (loading) {
    return (
      <div className="fees-page">
        <div className="fees-loading">
          <div className="loading-spinner"></div>
          <p>{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fees-page">
      <div className="fees-container">
        {/* Header */}
        <div className="fees-header">
          <div className="fees-header-left">
            <h1><FaMoneyBillWave /> {t('lateFees') || 'Late Fees'}</h1>
            <p className="fees-subtitle">{t('lateFeesDesc') || 'Books returned after the due date incur a $1/day late fee'}</p>
          </div>
          <button onClick={() => navigate(-1)} className="back-button">
            <FaArrowLeft /> {t('goBack')}
          </button>
        </div>

        {/* Summary Cards */}
        <div className="fees-summary">
          <div className="fee-summary-card total-owed">
            <div className="summary-icon"><FaExclamationTriangle /></div>
            <div className="summary-info">
              <span className="summary-amount">${totalOwed.toFixed(2)}</span>
              <span className="summary-label">{t('totalOwed') || 'Total Owed'}</span>
            </div>
          </div>
          <div className="fee-summary-card total-paid">
            <div className="summary-icon"><FaCheckCircle /></div>
            <div className="summary-info">
              <span className="summary-amount">${totalPaid.toFixed(2)}</span>
              <span className="summary-label">{t('totalPaid') || 'Total Paid'}</span>
            </div>
          </div>
          <div className="fee-summary-card pending-payments">
            <div className="summary-icon"><FaClock /></div>
            <div className="summary-info">
              <span className="summary-amount">{pendingCount}</span>
              <span className="summary-label">{t('pendingPayments') || 'Pending Verification'}</span>
            </div>
          </div>
          <div className="fee-summary-card overdue-count">
            <div className="summary-icon"><FaBook /></div>
            <div className="summary-info">
              <span className="summary-amount">{overdueLoans.length}</span>
              <span className="summary-label">{t('overdueBooks') || 'Overdue Books'}</span>
            </div>
          </div>
        </div>

        {/* Fees List */}
        {overdueLoans.length === 0 ? (
          <div className="fees-empty">
            <div className="empty-icon">🎉</div>
            <h2>{t('noLateFees') || 'No Late Fees!'}</h2>
            <p>{t('noLateFeesDesc') || 'You have no overdue books. Keep up the good work!'}</p>
          </div>
        ) : (
          <div className="fees-list">
            <h2 className="fees-list-title">{t('overdueBooks') || 'Overdue Books'}</h2>
            {overdueLoans.map(loan => {
              const daysOverdue = calculateDaysOverdue(loan);
              const fee = calculateFee(loan);
              const status = getFeeStatus(loan);
              const payment = getFeePaymentForLoan(loan.id);

              return (
                <div key={loan.id} className={`fee-card ${status}`}>
                  <div className="fee-card-book" onClick={() => navigate(`/book/${loan.book_id}`)}>
                    <img
                      src={loan.book_image || 'https://placehold.co/80x120?text=No+Image'}
                      alt={loan.book_title}
                      className="fee-book-img"
                    />
                    <div className="fee-book-info">
                      <h3>{loan.book_title}</h3>
                      <p className="fee-book-author">
                        {Array.isArray(loan.book_authors)
                          ? loan.book_authors.join(', ')
                          : loan.book_authors || t('unknownAuthor')}
                      </p>
                      <div className="fee-dates">
                        <span><FaClock /> {t('dueDate') || 'Due'}: {formatDate(loan.due_date)}</span>
                        {loan.status === 'returned' && (
                          <span>{t('returned') || 'Returned'}: {formatDate(loan.returned_at)}</span>
                        )}
                        {loan.status === 'approved' && (
                          <span className="still-overdue">{t('stillOverdue') || 'Still not returned'}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="fee-card-details">
                    <div className="fee-calculation">
                      <span className="fee-days">{daysOverdue} {t('daysLate') || 'days late'}</span>
                      <span className="fee-rate">× ${FEE_PER_DAY}/{t('day') || 'day'}</span>
                      <span className="fee-total">${fee.toFixed(2)}</span>
                    </div>

                    <div className="fee-card-status">
                      {getStatusBadge(status)}
                    </div>

                    {status === 'rejected' && payment?.admin_note && (
                      <div className="fee-rejection-note">
                        <strong>{t('adminNote') || 'Admin Note'}:</strong> {payment.admin_note}
                      </div>
                    )}

                    <div className="fee-card-actions">
                      {(status === 'unpaid' || status === 'rejected') && (
                        <button
                          className="pay-fee-btn"
                          onClick={() => setConfirmPay(loan)}
                          disabled={submitting}
                        >
                          <FaMoneyBillWave /> {t('iHavePaid') || 'I Have Paid the Fee'}
                        </button>
                      )}
                      {status === 'pending' && (
                        <p className="pending-message">
                          <FaHourglass /> {t('awaitingVerification') || 'Awaiting admin verification...'}
                        </p>
                      )}
                      {status === 'verified' && (
                        <p className="verified-message">
                          <FaCheckCircle /> {t('paymentVerified') || 'Payment verified'}
                          {payment?.verified_at && ` — ${formatDate(payment.verified_at)}`}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!confirmPay}
        onClose={() => setConfirmPay(null)}
        onConfirm={handleMarkPaid}
        title={t('confirmPayment') || 'Confirm Payment'}
        message={
          confirmPay
            ? `${t('confirmPaymentMsg') || 'You are confirming that you have paid'} $${calculateFee(confirmPay).toFixed(2)} ${t('forLateReturn') || 'for the late return of'} "${confirmPay?.book_title}". ${t('adminWillVerify') || 'An admin will verify your payment.'}`
            : ''
        }
        confirmLabel={t('confirmPayment') || 'Confirm Payment'}
        cancelLabel={t('cancel')}
        type="question"
      />
    </div>
  );
};

export default FeesPage;
