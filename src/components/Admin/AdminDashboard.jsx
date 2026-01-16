import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-toastify';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [loanRequests, setLoanRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [activities, setActivities] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalLoans: 0,
    pendingLoans: 0,
    approvedLoans: 0,
    overdueLoans: 0,
    returnedLoans: 0,
    totalReviews: 0,
    avgRating: 0,
    rejectedLoans: 0,
    totalWishlistItems: 0,
    totalCollections: 0
  });
  const [loading, setLoading] = useState(true);
  const [rejectingLoanId, setRejectingLoanId] = useState(null);
  const [rejectMessage, setRejectMessage] = useState('');
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [loanFilter, setLoanFilter] = useState('all');
  const [userSearch, setUserSearch] = useState('');
  const [inviteForm, setInviteForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'user'
  });
  const [inviting, setInviting] = useState(false);

  // Export functions
  const exportToCSV = (data, filename) => {
    if (data.length === 0) {
      toast.error('No data to export');
      return;
    }
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Handle values with commas or quotes
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value ?? '';
        }).join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success(`Exported ${data.length} records to ${filename}.csv`);
  };

  const exportLoans = () => {
    const exportData = loanRequests.map(loan => ({
      'Book Title': loan.book_title,
      'User': `${loan.profiles?.first_name || ''} ${loan.profiles?.last_name || ''}`.trim(),
      'User Email': loan.user_email || 'N/A',
      'Status': loan.status,
      'Requested Date': formatDate(loan.requested_at),
      'Due Date': formatDate(loan.due_date),
      'Returned Date': formatDate(loan.returned_at),
      'Notes': loan.notes || ''
    }));
    exportToCSV(exportData, 'loan_requests');
  };

  const exportUsers = () => {
    const exportData = users.map(u => ({
      'First Name': u.first_name || '',
      'Last Name': u.last_name || '',
      'Email': u.email || 'N/A',
      'Role': u.role || 'user',
      'Created': formatDate(u.created_at),
      'Last Updated': formatDate(u.updated_at)
    }));
    exportToCSV(exportData, 'users');
  };

  const exportReviews = () => {
    const exportData = reviews.map(r => ({
      'Book Title': r.book_title,
      'Reviewer': r.user_name,
      'Rating': r.rating,
      'Review': r.review_text || '',
      'Date': formatDate(r.created_at)
    }));
    exportToCSV(exportData, 'book_reviews');
  };

  const generateReport = () => {
    const report = {
      'Report Generated': new Date().toLocaleString(),
      'Total Users': stats.totalUsers,
      'Total Loans': stats.totalLoans,
      'Pending Loans': stats.pendingLoans,
      'Approved Loans': stats.approvedLoans,
      'Overdue Loans': stats.overdueLoans,
      'Returned Loans': stats.returnedLoans,
      'Rejected Loans': stats.rejectedLoans,
      'Total Reviews': stats.totalReviews,
      'Average Rating': stats.avgRating,
      'Total Wishlist Items': stats.totalWishlistItems,
      'Total Collections': stats.totalCollections
    };
    exportToCSV([report], 'library_report');
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  useEffect(() => {
    // Always fetch stats for the overview
    fetchStats();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    if (activeTab === 'overview') {
      await Promise.all([fetchStats(), fetchRecentActivity()]);
    } else if (activeTab === 'loans') {
      await fetchLoanRequests();
    } else if (activeTab === 'users') {
      await fetchUsers();
    } else if (activeTab === 'reviews') {
      await fetchReviews();
    } else if (activeTab === 'activity') {
      await fetchRecentActivity();
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    try {
      // Fetch user count
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Fetch loan stats
      const { data: loans } = await supabase
        .from('loan_requests')
        .select('status, due_date');

      const now = new Date();
      const pendingLoans = loans?.filter(l => l.status === 'pending').length || 0;
      const approvedLoans = loans?.filter(l => l.status === 'approved').length || 0;
      const returnedLoans = loans?.filter(l => l.status === 'returned').length || 0;
      const rejectedLoans = loans?.filter(l => l.status === 'rejected').length || 0;
      const overdueLoans = loans?.filter(l => 
        l.status === 'approved' && l.due_date && new Date(l.due_date) < now
      ).length || 0;

      // Fetch review stats
      const { data: reviewsData } = await supabase
        .from('book_reviews')
        .select('rating');

      const totalReviews = reviewsData?.length || 0;
      const avgRating = totalReviews > 0 
        ? (reviewsData.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1)
        : 0;

      // Fetch wishlist count
      const { count: wishlistCount } = await supabase
        .from('wishlist')
        .select('*', { count: 'exact', head: true });

      // Fetch collections count
      const { count: collectionsCount } = await supabase
        .from('reading_collections')
        .select('*', { count: 'exact', head: true });

      setStats({
        totalUsers: userCount || 0,
        totalLoans: loans?.length || 0,
        pendingLoans,
        approvedLoans,
        overdueLoans,
        returnedLoans,
        rejectedLoans,
        totalReviews,
        avgRating,
        totalWishlistItems: wishlistCount || 0,
        totalCollections: collectionsCount || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      // Get recent loan activities
      const { data: recentLoans } = await supabase
        .from('loan_requests')
        .select(`
          id, 
          status, 
          requested_at, 
          responded_at,
          book_title,
          user_id
        `)
        .order('requested_at', { ascending: false })
        .limit(10);

      // Get user profiles for activities
      const userIds = [...new Set(recentLoans?.map(l => l.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', userIds);

      const profilesMap = {};
      profiles?.forEach(p => { profilesMap[p.id] = p; });

      const activityList = (recentLoans || []).map(loan => ({
        id: loan.id,
        type: 'loan',
        action: loan.status === 'pending' ? 'requested' : loan.status,
        description: `${profilesMap[loan.user_id]?.first_name || 'User'} ${loan.status === 'pending' ? 'requested' : loan.status} "${loan.book_title}"`,
        timestamp: loan.responded_at || loan.requested_at,
        icon: loan.status === 'pending' ? '📚' : loan.status === 'approved' ? '✅' : loan.status === 'rejected' ? '❌' : '📥'
      }));

      setActivities(activityList);
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  };

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('book_reviews')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user profiles
      const userIds = [...new Set(data?.map(r => r.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', userIds);

      const profilesMap = {};
      profiles?.forEach(p => { profilesMap[p.id] = p; });

      const reviewsWithUsers = (data || []).map(review => ({
        ...review,
        user_name: profilesMap[review.user_id] 
          ? `${profilesMap[review.user_id].first_name} ${profilesMap[review.user_id].last_name}`
          : 'Unknown User'
      }));

      setReviews(reviewsWithUsers);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const fetchLoanRequests = async () => {
    try {
      // First fetch loan requests
      const { data: loans, error: loansError } = await supabase
        .from('loan_requests')
        .select('*')
        .order('requested_at', { ascending: false });

      if (loansError) throw loansError;

      // Then fetch profiles for each unique user_id
      const userIds = [...new Set(loans.map(loan => loan.user_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Fetch user emails from auth.users (using RPC or direct query if possible)
      let emailsMap = {};
      try {
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
        if (!authError && authUsers?.users) {
          authUsers.users.forEach(u => {
            emailsMap[u.id] = u.email;
          });
        }
      } catch (e) {
        console.error('Could not fetch user emails - admin API might not be available');
      }

      // Merge profiles and emails into loans
      const profilesMap = {};
      profiles?.forEach(p => { profilesMap[p.id] = p; });

      const loansWithProfiles = loans.map(loan => ({
        ...loan,
        profiles: profilesMap[loan.user_id] || { first_name: 'Unknown', last_name: 'User' },
        user_email: emailsMap[loan.user_id] || 'N/A'
      }));

      setLoanRequests(loansWithProfiles || []);
    } catch (error) {
      console.error('Error fetching loan requests:', error);
      toast.error('Failed to fetch loan requests');
    }
  };

  const fetchUsers = async () => {
    try {
      console.log('Fetching users...');
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Detailed error:', error);
        throw error;
      }

      // Fetch user emails from auth.users via RPC function
      const userIds = data?.map(u => u.id) || [];
      let emailsMap = {};
      
      if (userIds.length > 0) {
        const { data: emailsData, error: emailsError } = await supabase
          .rpc('get_user_emails', { user_ids: userIds });

        if (!emailsError && emailsData) {
          emailsData.forEach(item => {
            emailsMap[item.user_id] = item.email;
          });
        }
      }

      // Merge emails with user profiles
      const usersWithEmails = (data || []).map(u => ({
        ...u,
        email: emailsMap[u.id] || 'N/A'
      }));

      console.log('Users fetched:', usersWithEmails);
      setUsers(usersWithEmails || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error(`Failed to fetch users: ${error.message}`);
    }
  };

  const handleLoanAction = async (loanId, action, message = '') => {
    try {
      const updateData = {
        status: action,
        responded_at: new Date().toISOString(),
        responded_by: user.id
      };

      if (action === 'approved') {
        // Set due date to 14 days from now
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 14);
        updateData.due_date = dueDate.toISOString();
      }

      if (action === 'rejected') {
        updateData.notes = message || 'Loan request rejected by administrator';
      }


      const { data, error } = await supabase
        .from('loan_requests')
        .update(updateData)
        .eq('id', loanId)
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Update result:', data);

      toast.success(`Loan request ${action}!`);
      setRejectingLoanId(null);
      setRejectMessage('');
      fetchLoanRequests();
    } catch (error) {
      console.error('Error updating loan request:', error);
      toast.error('Failed to update loan request');
    }
  };

  const handleMarkReturned = async (loanId) => {
    try {
      const { error } = await supabase
        .from('loan_requests')
        .update({
          status: 'returned',
          returned_at: new Date().toISOString()
        })
        .eq('id', loanId);

      if (error) throw error;

      toast.success('Book marked as returned!');
      fetchLoanRequests();
    } catch (error) {
      console.error('Error marking as returned:', error);
      toast.error('Failed to mark as returned');
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    try {
      // Delete user via RPC function
      const { data, error } = await supabase.rpc('delete_user', {
        p_user_id: userId
      });

      if (error) throw error;

      toast.success(`User ${userName} deleted successfully`);
      setDeletingUserId(null);
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(`Failed to delete user: ${error.message}`);
    }
  };

  const handleInviteUser = async () => {
    if (!inviteForm.email || !inviteForm.password || !inviteForm.firstName) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (inviteForm.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setInviting(true);
    try {
      const { data, error } = await supabase.rpc('invite_user', {
        p_email: inviteForm.email,
        p_password: inviteForm.password,
        p_first_name: inviteForm.firstName,
        p_last_name: inviteForm.lastName || '',
        p_role: inviteForm.role
      });

      if (error) throw error;

      toast.success(`User ${inviteForm.email} invited successfully as ${inviteForm.role}!`);
      setShowInviteModal(false);
      setInviteForm({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        role: 'user'
      });
      fetchUsers();
    } catch (error) {
      console.error('Error inviting user:', error);
      toast.error(`Failed to invite user: ${error.message}`);
    } finally {
      setInviting(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleDeleteReview = async (reviewId) => {
    if (!confirm('Are you sure you want to delete this review?')) return;
    
    try {
      const { error } = await supabase
        .from('book_reviews')
        .delete()
        .eq('id', reviewId);

      if (error) throw error;

      toast.success('Review deleted successfully');
      fetchReviews();
      fetchStats();
    } catch (error) {
      console.error('Error deleting review:', error);
      toast.error('Failed to delete review');
    }
  };

  const getFilteredLoans = () => {
    if (loanFilter === 'all') return loanRequests;
    if (loanFilter === 'overdue') {
      const now = new Date();
      return loanRequests.filter(l => 
        l.status === 'approved' && l.due_date && new Date(l.due_date) < now
      );
    }
    return loanRequests.filter(l => l.status === loanFilter);
  };

  const getFilteredUsers = () => {
    if (!userSearch) return users;
    const search = userSearch.toLowerCase();
    return users.filter(u => 
      u.first_name?.toLowerCase().includes(search) ||
      u.last_name?.toLowerCase().includes(search) ||
      u.email?.toLowerCase().includes(search)
    );
  };

  const isOverdue = (loan) => {
    if (loan.status !== 'approved' || !loan.due_date) return false;
    return new Date(loan.due_date) < new Date();
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

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <h1>📊 Admin Dashboard</h1>
        <div className="admin-user-info">
          <span>Welcome, {user?.user_metadata?.first_name || 'Admin'}</span>
          <button onClick={handleSignOut} className="sign-out-btn">
            Sign Out
          </button>
        </div>
      </header>

      <nav className="admin-tabs">
        <button 
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button 
          className={`tab-btn ${activeTab === 'loans' ? 'active' : ''}`}
          onClick={() => setActiveTab('loans')}
        >
          📚 Loans {stats.pendingLoans > 0 && <span className="badge">{stats.pendingLoans}</span>}
        </button>
        <button 
          className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 Users
        </button>
        <button 
          className={`tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
          onClick={() => setActiveTab('reviews')}
        >
          ⭐ Reviews
        </button>
        <button 
          className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          📋 Activity
        </button>
      </nav>
      
      <main className="admin-content">
        {loading ? (
          <div className="loading">
            <div className="loading-spinner"></div>
            <p>Loading...</p>
          </div>
        ) : activeTab === 'overview' ? (
          /* OVERVIEW TAB */
          <div className="overview-section">
            <h2>Library Overview</h2>
            
            <div className="stats-grid">
              <div className="stat-card users">
                <div className="stat-icon">👥</div>
                <div className="stat-info">
                  <span className="stat-value">{stats.totalUsers}</span>
                  <span className="stat-label">Total Users</span>
                </div>
              </div>
              
              <div className="stat-card loans">
                <div className="stat-icon">📚</div>
                <div className="stat-info">
                  <span className="stat-value">{stats.totalLoans}</span>
                  <span className="stat-label">Total Loans</span>
                </div>
              </div>
              
              <div className="stat-card pending">
                <div className="stat-icon">⏳</div>
                <div className="stat-info">
                  <span className="stat-value">{stats.pendingLoans}</span>
                  <span className="stat-label">Pending Requests</span>
                </div>
              </div>
              
              <div className="stat-card active">
                <div className="stat-icon">✅</div>
                <div className="stat-info">
                  <span className="stat-value">{stats.approvedLoans}</span>
                  <span className="stat-label">Active Loans</span>
                </div>
              </div>
              
              <div className="stat-card overdue">
                <div className="stat-icon">⚠️</div>
                <div className="stat-info">
                  <span className="stat-value">{stats.overdueLoans}</span>
                  <span className="stat-label">Overdue</span>
                </div>
              </div>
              
              <div className="stat-card returned">
                <div className="stat-icon">📥</div>
                <div className="stat-info">
                  <span className="stat-value">{stats.returnedLoans}</span>
                  <span className="stat-label">Returned</span>
                </div>
              </div>
              
              <div className="stat-card reviews">
                <div className="stat-icon">⭐</div>
                <div className="stat-info">
                  <span className="stat-value">{stats.totalReviews}</span>
                  <span className="stat-label">Book Reviews</span>
                </div>
              </div>
              
              <div className="stat-card rating">
                <div className="stat-icon">🌟</div>
                <div className="stat-info">
                  <span className="stat-value">{stats.avgRating}</span>
                  <span className="stat-label">Avg Rating</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="quick-actions">
              <h3>Quick Actions</h3>
              <div className="action-buttons">
                <button 
                  className="quick-action-btn"
                  onClick={() => setActiveTab('loans')}
                >
                  <span className="action-icon">📚</span>
                  <span>View Loan Requests</span>
                  {stats.pendingLoans > 0 && (
                    <span className="action-badge">{stats.pendingLoans} pending</span>
                  )}
                </button>
                <button 
                  className="quick-action-btn"
                  onClick={() => {
                    setActiveTab('users');
                    setShowInviteModal(true);
                  }}
                >
                  <span className="action-icon">➕</span>
                  <span>Invite New User</span>
                </button>
                <button 
                  className="quick-action-btn"
                  onClick={() => {
                    setActiveTab('loans');
                    setLoanFilter('overdue');
                  }}
                >
                  <span className="action-icon">⚠️</span>
                  <span>View Overdue Books</span>
                  {stats.overdueLoans > 0 && (
                    <span className="action-badge warning">{stats.overdueLoans} overdue</span>
                  )}
                </button>
                <button 
                  className="quick-action-btn"
                  onClick={() => setActiveTab('reviews')}
                >
                  <span className="action-icon">⭐</span>
                  <span>Moderate Reviews</span>
                </button>
              </div>
            </div>

            {/* Export & Reports Section */}
            <div className="export-section">
              <h3>📊 Reports & Export</h3>
              <div className="export-buttons">
                <button className="export-btn" onClick={generateReport}>
                  <span>📋</span> Generate Summary Report
                </button>
                <button className="export-btn" onClick={exportLoans}>
                  <span>📚</span> Export Loans (CSV)
                </button>
                <button className="export-btn" onClick={exportUsers}>
                  <span>👥</span> Export Users (CSV)
                </button>
                <button className="export-btn" onClick={exportReviews}>
                  <span>⭐</span> Export Reviews (CSV)
                </button>
              </div>
            </div>

            {/* Recent Activity Preview */}
            <div className="recent-activity-preview">
              <h3>Recent Activity</h3>
              {activities.length === 0 ? (
                <p className="no-activity">No recent activity</p>
              ) : (
                <div className="activity-list-preview">
                  {activities.slice(0, 5).map((activity) => (
                    <div key={activity.id} className="activity-item">
                      <span className="activity-icon">{activity.icon}</span>
                      <span className="activity-description">{activity.description}</span>
                      <span className="activity-time">{formatDate(activity.timestamp)}</span>
                    </div>
                  ))}
                </div>
              )}
              {activities.length > 5 && (
                <button 
                  className="view-all-btn"
                  onClick={() => setActiveTab('activity')}
                >
                  View All Activity →
                </button>
              )}
            </div>
          </div>
        ) : activeTab === 'loans' ? (
          /* LOANS TAB */
          <div className="loans-section">
            <div className="section-header">
              <h2>Loan Requests ({loanRequests.length})</h2>
              <div className="loan-filters">
                <button 
                  className={`filter-btn ${loanFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setLoanFilter('all')}
                >
                  All
                </button>
                <button 
                  className={`filter-btn ${loanFilter === 'pending' ? 'active' : ''}`}
                  onClick={() => setLoanFilter('pending')}
                >
                  Pending {stats.pendingLoans > 0 && `(${stats.pendingLoans})`}
                </button>
                <button 
                  className={`filter-btn ${loanFilter === 'approved' ? 'active' : ''}`}
                  onClick={() => setLoanFilter('approved')}
                >
                  Active
                </button>
                <button 
                  className={`filter-btn ${loanFilter === 'overdue' ? 'active' : ''}`}
                  onClick={() => setLoanFilter('overdue')}
                >
                  Overdue {stats.overdueLoans > 0 && `(${stats.overdueLoans})`}
                </button>
                <button 
                  className={`filter-btn ${loanFilter === 'returned' ? 'active' : ''}`}
                  onClick={() => setLoanFilter('returned')}
                >
                  Returned
                </button>
              </div>
            </div>
            {getFilteredLoans().length === 0 ? (
              <p className="no-data">No loan requests {loanFilter !== 'all' && `with status "${loanFilter}"`}</p>
            ) : (
              <div className="table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Book</th>
                      <th>User</th>
                      <th>Requested</th>
                      <th>Status</th>
                      <th>Due Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredLoans().map((loan) => (
                      <tr key={loan.id} className={isOverdue(loan) ? 'overdue-row' : ''}>
                        <td className="book-cell">
                          <img 
                            src={loan.book_image} 
                            alt={loan.book_title}
                            className="book-thumbnail"
                          />
                          <div className="book-info">
                            <span className="book-title">{loan.book_title}</span>
                            <span className="book-authors">
                              {loan.book_authors?.join(', ') || 'Unknown Author'}
                            </span>
                          </div>
                        </td>
                        <td>
                          {loan.profiles?.first_name} {loan.profiles?.last_name}
                        </td>
                        <td>{formatDate(loan.requested_at)}</td>
                        <td>
                          {getStatusBadge(loan.status)}
                          {isOverdue(loan) && (
                            <span className="overdue-badge">OVERDUE</span>
                          )}
                        </td>
                        <td className={isOverdue(loan) ? 'overdue-date' : ''}>
                          {formatDate(loan.due_date)}
                          {isOverdue(loan) && loan.due_date && (
                            <span className="days-overdue">
                              ({Math.floor((new Date() - new Date(loan.due_date)) / (1000 * 60 * 60 * 24))} days)
                            </span>
                          )}
                        </td>
                        <td className="actions-cell">
                          {loan.status === 'pending' && (
                            <>
                              <button 
                                className="action-btn approve"
                                onClick={() => handleLoanAction(loan.id, 'approved')}
                              >
                                ✓ Approve
                              </button>
                              <button 
                                className="action-btn reject"
                                onClick={() => setRejectingLoanId(loan.id)}
                              >
                                ✗ Reject
                              </button>
                            </>
                          )}
                          {loan.status === 'approved' && (
                            <button 
                              className="action-btn return"
                              onClick={() => handleMarkReturned(loan.id)}
                            >
                              📥 Mark Returned
                            </button>
                          )}
                          {(loan.status === 'rejected' || loan.status === 'returned') && (
                            <span className="no-actions">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : activeTab === 'users' ? (
          /* USERS TAB */
          <div className="users-section">
            <div className="section-header">
              <h2>Users ({users.length})</h2>
              <div className="users-actions">
                <div className="search-box">
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                </div>
                <button 
                  className="invite-btn"
                  onClick={() => setShowInviteModal(true)}
                >
                  ➕ Invite User
                </button>
              </div>
            </div>
            {getFilteredUsers().length === 0 ? (
              <p className="no-data">
                {userSearch ? 'No users found matching your search' : 'No users registered yet'}
              </p>
            ) : (
              <div className="table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Last Updated</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredUsers().map((u) => (
                      <tr key={u.id}>
                        <td>
                          {u.first_name} {u.last_name}
                          {u.id === user?.id && <span className="you-badge">(You)</span>}
                        </td>
                        <td>{u.email}</td>
                        <td>
                          <span className={`role-badge ${u.role === 'admin' ? 'role-admin' : 'role-user'}`}>
                            {u.role || 'user'}
                          </span>
                        </td>
                        <td>{formatDate(u.updated_at)}</td>
                        <td>
                          {u.role === 'admin' ? (
                            <span className="no-actions">—</span>
                          ) : (
                            <button
                              className="delete-btn"
                              onClick={() => setDeletingUserId(u.id)}
                              title="Delete user"
                            >
                              🗑️ Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : activeTab === 'reviews' ? (
          /* REVIEWS TAB */
          <div className="reviews-section">
            <div className="section-header">
              <h2>Book Reviews ({reviews.length})</h2>
            </div>
            {reviews.length === 0 ? (
              <p className="no-data">No reviews yet</p>
            ) : (
              <div className="reviews-list">
                {reviews.map((review) => (
                  <div key={review.id} className="review-card">
                    <div className="review-header">
                      <div className="review-book">
                        {review.book_image && (
                          <img src={review.book_image} alt={review.book_title} />
                        )}
                        <div className="review-book-info">
                          <h4>{review.book_title}</h4>
                          <p className="review-authors">
                            {review.book_authors?.join(', ') || 'Unknown Author'}
                          </p>
                        </div>
                      </div>
                      <div className="review-rating">
                        {'⭐'.repeat(review.rating)}
                        <span className="rating-number">({review.rating}/5)</span>
                      </div>
                    </div>
                    <div className="review-body">
                      <p className="review-text">{review.review_text || 'No written review'}</p>
                    </div>
                    <div className="review-footer">
                      <span className="review-author">By: {review.user_name}</span>
                      <span className="review-date">{formatDate(review.created_at)}</span>
                      <button 
                        className="delete-review-btn"
                        onClick={() => handleDeleteReview(review.id)}
                      >
                        🗑️ Delete Review
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'activity' ? (
          /* ACTIVITY TAB */
          <div className="activity-section">
            <div className="section-header">
              <h2>Activity Log</h2>
            </div>
            {activities.length === 0 ? (
              <p className="no-data">No activity recorded yet</p>
            ) : (
              <div className="activity-timeline">
                {activities.map((activity) => (
                  <div key={activity.id} className="timeline-item">
                    <div className="timeline-icon">{activity.icon}</div>
                    <div className="timeline-content">
                      <p className="timeline-description">{activity.description}</p>
                      <span className="timeline-time">{formatDate(activity.timestamp)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </main>

      {/* Rejection Modal */}
      {rejectingLoanId && (
        <div className="modal-overlay">
          <div className="rejection-modal">
            <h2>Reject Loan Request</h2>
            <p>Please provide a reason for rejecting this loan request:</p>
            <textarea
              className="rejection-textarea"
              placeholder="e.g., Not enough stock, Book is damaged, etc."
              value={rejectMessage}
              onChange={(e) => setRejectMessage(e.target.value)}
              rows="4"
            />
            <div className="modal-actions">
              <button
                className="modal-btn cancel"
                onClick={() => {
                  setRejectingLoanId(null);
                  setRejectMessage('');
                }}
              >
                Cancel
              </button>
              <button
                className="modal-btn confirm"
                onClick={() => handleLoanAction(rejectingLoanId, 'rejected', rejectMessage)}
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {deletingUserId && (
        <div className="modal-overlay">
          <div className="rejection-modal delete-modal">
            <h2>⚠️ Delete User</h2>
            <p>
              Are you sure you want to permanently delete this user and all their data? 
              This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button
                className="modal-btn cancel"
                onClick={() => setDeletingUserId(null)}
              >
                Cancel
              </button>
              <button
                className="modal-btn delete-confirm"
                onClick={() => {
                  const userToDelete = users.find(u => u.id === deletingUserId);
                  handleDeleteUser(deletingUserId, `${userToDelete?.first_name} ${userToDelete?.last_name}`);
                }}
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite User Modal */}
      {showInviteModal && (
        <div className="modal-overlay">
          <div className="invite-modal">
            <h2>➕ Invite New User</h2>
            <p>Create a new user account. They can sign in immediately with these credentials.</p>
            
            <div className="invite-form">
              <div className="form-group">
                <label htmlFor="invite-email">Email *</label>
                <input
                  id="invite-email"
                  type="email"
                  placeholder="user@example.com"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label htmlFor="invite-password">Password *</label>
                <input
                  id="invite-password"
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={inviteForm.password}
                  onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="invite-firstname">First Name *</label>
                  <input
                    id="invite-firstname"
                    type="text"
                    placeholder="John"
                    value={inviteForm.firstName}
                    onChange={(e) => setInviteForm({ ...inviteForm, firstName: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="invite-lastname">Last Name</label>
                  <input
                    id="invite-lastname"
                    type="text"
                    placeholder="Doe"
                    value={inviteForm.lastName}
                    onChange={(e) => setInviteForm({ ...inviteForm, lastName: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="invite-role">Role *</label>
                <select
                  id="invite-role"
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="modal-btn cancel"
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteForm({
                    email: '',
                    password: '',
                    firstName: '',
                    lastName: '',
                    role: 'user'
                  });
                }}
                disabled={inviting}
              >
                Cancel
              </button>
              <button
                className="modal-btn invite-confirm"
                onClick={handleInviteUser}
                disabled={inviting}
              >
                {inviting ? 'Inviting...' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
