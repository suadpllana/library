import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  
  // Pagination state
  const [usersPage, setUsersPage] = useState(0);
  const [usersTotalCount, setUsersTotalCount] = useState(0);
  const [loansPage, setLoansPage] = useState(0);
  const [loansTotalCount, setLoansTotalCount] = useState(0);
  const [reviewsPage, setReviewsPage] = useState(0);
  const [reviewsTotalCount, setReviewsTotalCount] = useState(0);
  const PAGE_SIZE = 20;
  
  const [inviteForm, setInviteForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'user'
  });
  const [inviting, setInviting] = useState(false);

  // Chat state
  const [chatConversations, setChatConversations] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [adminReply, setAdminReply] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [unreadChats, setUnreadChats] = useState(0);
  const chatMessagesEndRef = useRef(null);

  // ===== NEW FEATURE STATES =====
  
  // Analytics state
  const [analyticsData, setAnalyticsData] = useState({
    loansByMonth: [],
    usersByMonth: [],
    ratingDistribution: [0, 0, 0, 0, 0],
    topBooks: [],
    topBorrowers: [],
    loansByDay: [0, 0, 0, 0, 0, 0, 0],
    reviewsByMonth: [],
    avgRatingByMonth: []
  });

  // Bulk selection
  const [selectedLoans, setSelectedLoans] = useState([]);
  const [selectedReviews, setSelectedReviews] = useState([]);

  // User detail panel
  const [userDetailId, setUserDetailId] = useState(null);
  const [userDetail, setUserDetail] = useState(null);
  const [userDetailLoading, setUserDetailLoading] = useState(false);

  // Extend loan modal
  const [extendingLoanId, setExtendingLoanId] = useState(null);
  const [extendDays, setExtendDays] = useState(7);

  // Announcements
  const [announcements, setAnnouncements] = useState([]);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({ title: '', message: '', type: 'info' });
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false);

  // System Settings
  const [systemSettings, setSystemSettings] = useState({
    maxLoanDays: 14,
    maxLoansPerUser: 3,
    maintenanceMode: false,
    autoApproveLoans: false,
    allowNewRegistrations: true,
    reviewsMustBeApproved: false,
    maxReviewLength: 2000,
    enableChatSupport: true
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Review search/filter
  const [reviewSearch, setReviewSearch] = useState('');
  const [reviewFilter, setReviewFilter] = useState('all');

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
    } else if (activeTab === 'chat') {
      await fetchChatConversations();
    } else if (activeTab === 'analytics') {
      await fetchAnalytics();
    } else if (activeTab === 'announcements') {
      await fetchAnnouncements();
    } else if (activeTab === 'settings') {
      await fetchSystemSettings();
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

  // Chat Functions
  const fetchChatConversations = async () => {
    try {
      // Get all unique user conversations with their latest message
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by user_id and get latest message + unread count
      const conversationsMap = {};
      (data || []).forEach(msg => {
        if (!conversationsMap[msg.user_id]) {
          conversationsMap[msg.user_id] = {
            user_id: msg.user_id,
            user_name: msg.user_name,
            user_email: msg.user_email,
            latest_message: msg.message,
            latest_time: msg.created_at,
            unread_count: 0,
            messages: []
          };
        }
        conversationsMap[msg.user_id].messages.push(msg);
        if (msg.sender_type === 'user' && !msg.is_read) {
          conversationsMap[msg.user_id].unread_count++;
        }
      });

      const conversations = Object.values(conversationsMap).sort(
        (a, b) => new Date(b.latest_time) - new Date(a.latest_time)
      );

      setChatConversations(conversations);
      
      // Calculate total unread
      const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);
      setUnreadChats(totalUnread);

      // If a chat is selected, update its messages
      if (selectedChat) {
        const updatedChat = conversations.find(c => c.user_id === selectedChat.user_id);
        if (updatedChat) {
          setSelectedChat(updatedChat);
          setChatMessages(updatedChat.messages.sort((a, b) => 
            new Date(a.created_at) - new Date(b.created_at)
          ));
        }
      }
    } catch (error) {
      console.error('Error fetching chat conversations:', error);
    }
  };

  const selectConversation = async (conversation) => {
    setSelectedChat(conversation);
    setChatMessages(conversation.messages.sort((a, b) => 
      new Date(a.created_at) - new Date(b.created_at)
    ));

    // Mark messages as read
    try {
      await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('user_id', conversation.user_id)
        .eq('sender_type', 'user')
        .eq('is_read', false);

      // Refresh conversations to update unread count
      fetchChatConversations();
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const sendAdminReply = async (e) => {
    e.preventDefault();
    if (!adminReply.trim() || !selectedChat || sendingReply) return;

    setSendingReply(true);
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          user_id: selectedChat.user_id,
          user_name: selectedChat.user_name,
          user_email: selectedChat.user_email,
          message: adminReply.trim(),
          sender_type: 'admin',
          is_read: false
        });

      if (error) throw error;

      setAdminReply('');
      fetchChatConversations();
      toast.success('Reply sent!');
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error('Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  // Set up real-time subscription for chat
  useEffect(() => {
    const channel = supabase
      .channel('admin_chat_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
        },
        () => {
          if (activeTab === 'chat') {
            fetchChatConversations();
          } else {
            // Just update unread count
            fetchUnreadChatCount();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTab, selectedChat]);

  const fetchUnreadChatCount = async () => {
    try {
      const { count, error } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('sender_type', 'user')
        .eq('is_read', false);

      if (error) throw error;
      setUnreadChats(count || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  // Fetch unread chat count on mount
  useEffect(() => {
    fetchUnreadChatCount();
  }, []);

  // Scroll to bottom when chat messages change
  useEffect(() => {
    chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

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

  const fetchUsers = async (page = usersPage) => {
    try {
      console.log('Fetching users...');
      
      // First get total count
      const { count, error: countError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      if (countError) throw countError;
      setUsersTotalCount(count || 0);
      
      // Then fetch paginated data
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('updated_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

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
      const { data, error } = await supabase
        .from('book_reviews')
        .delete()
        .eq('id', reviewId)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.error('No review was deleted — it may not exist or you lack permissions');
        // still refresh to be safe
        fetchReviews();
        fetchStats();
        return;
      }

      toast.success('Review deleted successfully');
      fetchReviews();
      fetchStats();
    } catch (error) {
      console.error('Error deleting review:', error);
      toast.error('Failed to delete review');
    }
  };

  // ===== NEW FEATURES =====

  // Analytics
  const fetchAnalytics = async () => {
    try {
      // Fetch all loans for analytics
      const { data: allLoans } = await supabase
        .from('loan_requests')
        .select('status, requested_at, due_date, book_title, book_id, user_id');

      // Fetch all reviews
      const { data: allReviews } = await supabase
        .from('book_reviews')
        .select('rating, created_at, book_title');

      // Fetch all users
      const { data: allUsers } = await supabase
        .from('profiles')
        .select('id, created_at, first_name, last_name');

      const now = new Date();
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({ label: d.toLocaleString('default', { month: 'short' }), year: d.getFullYear(), month: d.getMonth() });
      }

      // Loans by month
      const loansByMonth = months.map(m => {
        const count = (allLoans || []).filter(l => {
          const d = new Date(l.requested_at);
          return d.getMonth() === m.month && d.getFullYear() === m.year;
        }).length;
        return { label: m.label, count };
      });

      // Users by month
      const usersByMonth = months.map(m => {
        const count = (allUsers || []).filter(u => {
          const d = new Date(u.created_at);
          return d.getMonth() === m.month && d.getFullYear() === m.year;
        }).length;
        return { label: m.label, count };
      });

      // Reviews by month
      const reviewsByMonth = months.map(m => {
        const monthReviews = (allReviews || []).filter(r => {
          const d = new Date(r.created_at);
          return d.getMonth() === m.month && d.getFullYear() === m.year;
        });
        return { label: m.label, count: monthReviews.length };
      });

      // Rating distribution
      const ratingDist = [0, 0, 0, 0, 0];
      (allReviews || []).forEach(r => {
        if (r.rating >= 1 && r.rating <= 5) ratingDist[r.rating - 1]++;
      });

      // Top borrowed books
      const bookCounts = {};
      (allLoans || []).forEach(l => {
        const key = l.book_title || 'Unknown';
        bookCounts[key] = (bookCounts[key] || 0) + 1;
      });
      const topBooks = Object.entries(bookCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([title, count]) => ({ title, count }));

      // Top borrowers
      const userCounts = {};
      (allLoans || []).forEach(l => { userCounts[l.user_id] = (userCounts[l.user_id] || 0) + 1; });
      const userMap = {};
      (allUsers || []).forEach(u => { userMap[u.id] = `${u.first_name || ''} ${u.last_name || ''}`.trim(); });
      const topBorrowers = Object.entries(userCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id, count]) => ({ name: userMap[id] || 'Unknown', count }));

      // Loans by day of week
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const loansByDay = [0, 0, 0, 0, 0, 0, 0];
      (allLoans || []).forEach(l => {
        const day = new Date(l.requested_at).getDay();
        loansByDay[day]++;
      });

      setAnalyticsData({
        loansByMonth,
        usersByMonth,
        ratingDistribution: ratingDist,
        topBooks,
        topBorrowers,
        loansByDay: dayNames.map((name, i) => ({ name, count: loansByDay[i] })),
        reviewsByMonth
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  // Bar chart renderer (pure CSS)
  const renderBar = (value, maxValue, color = '#6366f1') => {
    const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;
    return (
      <div className="bar-container">
        <div className="bar-fill" style={{ width: `${pct}%`, background: color }}></div>
      </div>
    );
  };

  // Bulk loan actions
  const handleBulkLoanAction = async (action) => {
    if (selectedLoans.length === 0) {
      toast.error('No loans selected');
      return;
    }
    const actionLabel = action === 'approved' ? 'approve' : action === 'rejected' ? 'reject' : action;
    if (!confirm(`Are you sure you want to ${actionLabel} ${selectedLoans.length} loan(s)?`)) return;

    try {
      const updateData = {
        status: action,
        responded_at: new Date().toISOString(),
        responded_by: user.id
      };
      if (action === 'approved') {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (systemSettings.maxLoanDays || 14));
        updateData.due_date = dueDate.toISOString();
      }
      if (action === 'rejected') {
        updateData.notes = 'Bulk rejected by administrator';
      }

      for (const loanId of selectedLoans) {
        await supabase.from('loan_requests').update(updateData).eq('id', loanId);
      }

      toast.success(`${selectedLoans.length} loan(s) ${action} successfully`);
      setSelectedLoans([]);
      fetchLoanRequests();
      fetchStats();
    } catch (error) {
      console.error('Error bulk updating loans:', error);
      toast.error('Failed to update some loans');
    }
  };

  const toggleLoanSelection = (loanId) => {
    setSelectedLoans(prev => 
      prev.includes(loanId) ? prev.filter(id => id !== loanId) : [...prev, loanId]
    );
  };

  const toggleAllLoans = () => {
    const filtered = getFilteredLoans().filter(l => l.status === 'pending');
    if (selectedLoans.length === filtered.length) {
      setSelectedLoans([]);
    } else {
      setSelectedLoans(filtered.map(l => l.id));
    }
  };

  // Bulk review delete
  const handleBulkDeleteReviews = async () => {
    if (selectedReviews.length === 0) {
      toast.error('No reviews selected');
      return;
    }
    if (!confirm(`Delete ${selectedReviews.length} review(s)? This cannot be undone.`)) return;

    try {
      for (const reviewId of selectedReviews) {
        await supabase.from('book_reviews').delete().eq('id', reviewId);
      }
      toast.success(`${selectedReviews.length} review(s) deleted`);
      setSelectedReviews([]);
      fetchReviews();
      fetchStats();
    } catch (error) {
      console.error('Error bulk deleting reviews:', error);
      toast.error('Failed to delete some reviews');
    }
  };

  // User detail panel
  const fetchUserDetail = async (userId) => {
    setUserDetailLoading(true);
    setUserDetailId(userId);
    try {
      const targetUser = users.find(u => u.id === userId);

      const [loansRes, reviewsRes, wishlistRes, collectionsRes] = await Promise.all([
        supabase.from('loan_requests').select('*').eq('user_id', userId).order('requested_at', { ascending: false }),
        supabase.from('book_reviews').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('wishlist').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('reading_collections').select('*', { count: 'exact', head: true }).eq('user_id', userId)
      ]);

      setUserDetail({
        ...targetUser,
        loans: loansRes.data || [],
        reviews: reviewsRes.data || [],
        wishlistCount: wishlistRes.count || 0,
        collectionsCount: collectionsRes.count || 0
      });
    } catch (error) {
      console.error('Error fetching user detail:', error);
      toast.error('Failed to load user details');
    } finally {
      setUserDetailLoading(false);
    }
  };

  // Change user role
  const handleChangeRole = async (userId, newRole) => {
    if (!confirm(`Change this user's role to ${newRole}?`)) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);
      if (error) throw error;
      toast.success(`User role updated to ${newRole}`);
      fetchUsers();
      if (userDetailId === userId) {
        setUserDetail(prev => prev ? { ...prev, role: newRole } : prev);
      }
    } catch (error) {
      console.error('Error changing role:', error);
      toast.error('Failed to change user role');
    }
  };

  // Extend loan due date
  const handleExtendLoan = async () => {
    if (!extendingLoanId) return;
    try {
      const loan = loanRequests.find(l => l.id === extendingLoanId);
      if (!loan) return;
      
      const currentDue = loan.due_date ? new Date(loan.due_date) : new Date();
      currentDue.setDate(currentDue.getDate() + extendDays);

      const { error } = await supabase
        .from('loan_requests')
        .update({ 
          due_date: currentDue.toISOString(),
          notes: `${loan.notes ? loan.notes + ' | ' : ''}Extended by ${extendDays} days by admin`
        })
        .eq('id', extendingLoanId);

      if (error) throw error;
      toast.success(`Loan extended by ${extendDays} days`);
      setExtendingLoanId(null);
      setExtendDays(7);
      fetchLoanRequests();
    } catch (error) {
      console.error('Error extending loan:', error);
      toast.error('Failed to extend loan');
    }
  };

  // Announcements
  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      setAnnouncements([]);
    }
  };

  const handleSendAnnouncement = async () => {
    if (!announcementForm.title.trim() || !announcementForm.message.trim()) {
      toast.error('Please fill in title and message');
      return;
    }
    setSendingAnnouncement(true);
    try {
      const { error } = await supabase.from('announcements').insert({
        title: announcementForm.title.trim(),
        message: announcementForm.message.trim(),
        type: announcementForm.type,
        created_by: user.id,
        is_active: true
      });
      if (error) throw error;
      toast.success('Announcement published!');
      setShowAnnouncementModal(false);
      setAnnouncementForm({ title: '', message: '', type: 'info' });
      fetchAnnouncements();
    } catch (error) {
      console.error('Error sending announcement:', error);
      toast.error('Failed to publish announcement');
    } finally {
      setSendingAnnouncement(false);
    }
  };

  const handleToggleAnnouncement = async (id, currentActive) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .update({ is_active: !currentActive })
        .eq('id', id);
      if (error) throw error;
      toast.success(currentActive ? 'Announcement hidden' : 'Announcement activated');
      fetchAnnouncements();
    } catch (error) {
      console.error('Error toggling announcement:', error);
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!confirm('Delete this announcement permanently?')) return;
    try {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) throw error;
      toast.success('Announcement deleted');
      fetchAnnouncements();
    } catch (error) {
      toast.error('Failed to delete announcement');
    }
  };

  // System Settings
  const fetchSystemSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .single();
      if (!error && data) {
        setSystemSettings({
          maxLoanDays: data.max_loan_days ?? 14,
          maxLoansPerUser: data.max_loans_per_user ?? 3,
          maintenanceMode: data.maintenance_mode ?? false,
          autoApproveLoans: data.auto_approve_loans ?? false,
          allowNewRegistrations: data.allow_new_registrations ?? true,
          reviewsMustBeApproved: data.reviews_must_be_approved ?? false,
          maxReviewLength: data.max_review_length ?? 2000,
          enableChatSupport: data.enable_chat_support ?? true
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const { error } = await supabase.from('system_settings').upsert({
        id: 1,
        max_loan_days: systemSettings.maxLoanDays,
        max_loans_per_user: systemSettings.maxLoansPerUser,
        maintenance_mode: systemSettings.maintenanceMode,
        auto_approve_loans: systemSettings.autoApproveLoans,
        allow_new_registrations: systemSettings.allowNewRegistrations,
        reviews_must_be_approved: systemSettings.reviewsMustBeApproved,
        max_review_length: systemSettings.maxReviewLength,
        enable_chat_support: systemSettings.enableChatSupport,
        updated_at: new Date().toISOString(),
        updated_by: user.id
      });
      if (error) throw error;
      toast.success('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings — the settings table may not exist yet');
    } finally {
      setSavingSettings(false);
    }
  };

  // Filtered reviews
  const filteredReviews = useMemo(() => {
    let result = reviews;
    if (reviewSearch) {
      const s = reviewSearch.toLowerCase();
      result = result.filter(r =>
        r.book_title?.toLowerCase().includes(s) ||
        r.user_name?.toLowerCase().includes(s) ||
        r.review_text?.toLowerCase().includes(s)
      );
    }
    if (reviewFilter !== 'all') {
      result = result.filter(r => r.rating === parseInt(reviewFilter));
    }
    return result;
  }, [reviews, reviewSearch, reviewFilter]);

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

  // Memoized filtered users to avoid recalculation on every render
  const filteredUsers = useMemo(() => {
    if (!userSearch) return users;
    const search = userSearch.toLowerCase();
    return users.filter(u => 
      u.first_name?.toLowerCase().includes(search) ||
      u.last_name?.toLowerCase().includes(search) ||
      u.email?.toLowerCase().includes(search)
    );
  }, [users, userSearch]);

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
        <button 
          className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          💬 Chat {unreadChats > 0 && <span className="badge">{unreadChats}</span>}
        </button>
        <button 
          className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          📈 Analytics
        </button>
        <button 
          className={`tab-btn ${activeTab === 'announcements' ? 'active' : ''}`}
          onClick={() => setActiveTab('announcements')}
        >
          📢 Announcements
        </button>
        <button 
          className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          ⚙️ Settings
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
              <div className="loan-header-actions">
                {selectedLoans.length > 0 && (
                  <div className="bulk-actions">
                    <span className="bulk-count">{selectedLoans.length} selected</span>
                    <button className="bulk-btn approve" onClick={() => handleBulkLoanAction('approved')}>✓ Bulk Approve</button>
                    <button className="bulk-btn reject" onClick={() => handleBulkLoanAction('rejected')}>✗ Bulk Reject</button>
                    <button className="bulk-btn clear" onClick={() => setSelectedLoans([])}>Clear</button>
                  </div>
                )}
                <button className="export-btn-sm" onClick={exportLoans}>📥 Export CSV</button>
              </div>
            </div>
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
            {getFilteredLoans().length === 0 ? (
              <p className="no-data">No loan requests {loanFilter !== 'all' && `with status "${loanFilter}"`}</p>
            ) : (
              <div className="table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th className="checkbox-col">
                        <input 
                          type="checkbox" 
                          checked={selectedLoans.length > 0 && selectedLoans.length === getFilteredLoans().filter(l => l.status === 'pending').length}
                          onChange={toggleAllLoans}
                          title="Select all pending"
                        />
                      </th>
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
                        <td className="checkbox-col">
                          {loan.status === 'pending' && (
                            <input 
                              type="checkbox" 
                              checked={selectedLoans.includes(loan.id)}
                              onChange={() => toggleLoanSelection(loan.id)}
                            />
                          )}
                        </td>
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
                            <>
                              <button 
                                className="action-btn return"
                                onClick={() => handleMarkReturned(loan.id)}
                              >
                                📥 Returned
                              </button>
                              <button 
                                className="action-btn extend"
                                onClick={() => setExtendingLoanId(loan.id)}
                              >
                                📅 Extend
                              </button>
                            </>
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
              <h2>Users ({usersTotalCount || users.length})</h2>
              <div className="users-actions">
                <div className="search-box">
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                </div>
                <button className="export-btn-sm" onClick={exportUsers}>📥 Export CSV</button>
                <button 
                  className="invite-btn"
                  onClick={() => setShowInviteModal(true)}
                >
                  ➕ Invite User
                </button>
              </div>
            </div>
            {filteredUsers.length === 0 ? (
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
                    {filteredUsers.map((u) => (
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
                        <td className="actions-cell user-actions-cell">
                          <button
                            className="action-btn detail"
                            onClick={() => fetchUserDetail(u.id)}
                            title="View details"
                          >
                            👁️ View
                          </button>
                          {u.id !== user?.id && (
                            <>
                              <button
                                className="action-btn role"
                                onClick={() => handleChangeRole(u.id, u.role === 'admin' ? 'user' : 'admin')}
                                title={u.role === 'admin' ? 'Demote to user' : 'Promote to admin'}
                              >
                                {u.role === 'admin' ? '⬇️' : '⬆️'} {u.role === 'admin' ? 'Demote' : 'Promote'}
                              </button>
                              {u.role !== 'admin' && (
                                <button
                                  className="action-btn delete-sm"
                                  onClick={() => setDeletingUserId(u.id)}
                                  title="Delete user"
                                >
                                  🗑️
                                </button>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {/* Pagination controls */}
            {usersTotalCount > PAGE_SIZE && (
              <div className="pagination-controls">
                <button 
                  className="pagination-btn"
                  disabled={usersPage === 0}
                  onClick={() => {
                    const newPage = usersPage - 1;
                    setUsersPage(newPage);
                    fetchUsers(newPage);
                  }}
                >
                  ← Previous
                </button>
                <span className="pagination-info">
                  Page {usersPage + 1} of {Math.ceil(usersTotalCount / PAGE_SIZE)} 
                  ({usersTotalCount} total users)
                </span>
                <button 
                  className="pagination-btn"
                  disabled={(usersPage + 1) * PAGE_SIZE >= usersTotalCount}
                  onClick={() => {
                    const newPage = usersPage + 1;
                    setUsersPage(newPage);
                    fetchUsers(newPage);
                  }}
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        ) : activeTab === 'reviews' ? (
          /* REVIEWS TAB */
          <div className="reviews-section">
            <div className="section-header">
              <h2>Book Reviews ({reviews.length})</h2>
              <div className="reviews-header-actions">
                <div className="search-box">
                  <input
                    type="text"
                    placeholder="Search reviews..."
                    value={reviewSearch}
                    onChange={(e) => setReviewSearch(e.target.value)}
                  />
                </div>
                <select className="review-filter-select" value={reviewFilter} onChange={(e) => setReviewFilter(e.target.value)}>
                  <option value="all">All Ratings</option>
                  <option value="5">⭐⭐⭐⭐⭐ (5)</option>
                  <option value="4">⭐⭐⭐⭐ (4)</option>
                  <option value="3">⭐⭐⭐ (3)</option>
                  <option value="2">⭐⭐ (2)</option>
                  <option value="1">⭐ (1)</option>
                </select>
                {selectedReviews.length > 0 && (
                  <button className="bulk-btn reject" onClick={handleBulkDeleteReviews}>
                    🗑️ Delete {selectedReviews.length} Selected
                  </button>
                )}
                <button className="export-btn-sm" onClick={exportReviews}>📥 Export CSV</button>
              </div>
            </div>
            {filteredReviews.length === 0 ? (
              <p className="no-data">No reviews found</p>
            ) : (
              <div className="reviews-list">
                {filteredReviews.map((review) => (
                  <div key={review.id} className={`review-card ${selectedReviews.includes(review.id) ? 'selected' : ''}`}>
                    <div className="review-header">
                      <div className="review-select-area">
                        <input 
                          type="checkbox" 
                          checked={selectedReviews.includes(review.id)}
                          onChange={() => setSelectedReviews(prev => 
                            prev.includes(review.id) ? prev.filter(id => id !== review.id) : [...prev, review.id]
                          )}
                        />
                      </div>
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
        ) : activeTab === 'chat' ? (
          /* CHAT TAB */
          <div className="chat-section">
            <div className="section-header">
              <h2>💬 User Messages</h2>
              <span className="chat-subtitle">Respond to user inquiries</span>
            </div>
            
            <div className="chat-container">
              {/* Conversations List */}
              <div className="conversations-list">
                <h3>Conversations</h3>
                {chatConversations.length === 0 ? (
                  <p className="no-conversations">No conversations yet</p>
                ) : (
                  chatConversations.map((conv) => (
                    <div 
                      key={conv.user_id}
                      className={`conversation-item ${selectedChat?.user_id === conv.user_id ? 'active' : ''} ${conv.unread_count > 0 ? 'has-unread' : ''}`}
                      onClick={() => selectConversation(conv)}
                    >
                      <div className="conv-avatar">
                        {conv.user_name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <div className="conv-info">
                        <div className="conv-header">
                          <span className="conv-name">{conv.user_name || 'Unknown User'}</span>
                          {conv.unread_count > 0 && (
                            <span className="conv-unread">{conv.unread_count}</span>
                          )}
                        </div>
                        <p className="conv-preview">{conv.latest_message?.slice(0, 40)}...</p>
                        <span className="conv-time">{formatDate(conv.latest_time)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Chat Messages */}
              <div className="chat-messages-panel">
                {selectedChat ? (
                  <>
                    <div className="chat-panel-header">
                      <div className="chat-user-info">
                        <div className="chat-user-avatar">
                          {selectedChat.user_name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <h4>{selectedChat.user_name}</h4>
                          <span>{selectedChat.user_email}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="chat-messages-list">
                      {chatMessages.map((msg) => (
                        <div 
                          key={msg.id} 
                          className={`admin-chat-message ${msg.sender_type === 'admin' ? 'sent' : 'received'}`}
                        >
                          <div className="admin-msg-content">
                            <p>{msg.message}</p>
                            <span className="admin-msg-time">
                              {new Date(msg.created_at).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                      ))}
                      <div ref={chatMessagesEndRef} />
                    </div>

                    <form className="admin-reply-form" onSubmit={sendAdminReply}>
                      <input
                        type="text"
                        value={adminReply}
                        onChange={(e) => setAdminReply(e.target.value)}
                        placeholder="Type your reply..."
                        disabled={sendingReply}
                      />
                      <button type="submit" disabled={!adminReply.trim() || sendingReply}>
                        {sendingReply ? 'Sending...' : 'Send'}
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="no-chat-selected">
                    <div className="no-chat-icon">💬</div>
                    <p>Select a conversation to view messages</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : activeTab === 'analytics' ? (
          /* ANALYTICS TAB */
          <div className="analytics-section">
            <div className="section-header">
              <h2>📈 Analytics & Insights</h2>
            </div>

            <div className="analytics-grid">
              {/* Loans by Month */}
              <div className="analytics-card">
                <h3>📚 Loans per Month</h3>
                <div className="chart-area">
                  {analyticsData.loansByMonth.map((m, i) => (
                    <div key={i} className="chart-bar-group">
                      <span className="chart-value">{m.count}</span>
                      {renderBar(m.count, Math.max(...analyticsData.loansByMonth.map(x => x.count)), '#6366f1')}
                      <span className="chart-label">{m.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Users by Month */}
              <div className="analytics-card">
                <h3>👥 New Users per Month</h3>
                <div className="chart-area">
                  {analyticsData.usersByMonth.map((m, i) => (
                    <div key={i} className="chart-bar-group">
                      <span className="chart-value">{m.count}</span>
                      {renderBar(m.count, Math.max(...analyticsData.usersByMonth.map(x => x.count)), '#34d399')}
                      <span className="chart-label">{m.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rating Distribution */}
              <div className="analytics-card">
                <h3>⭐ Rating Distribution</h3>
                <div className="chart-area horizontal">
                  {analyticsData.ratingDistribution.map((count, i) => (
                    <div key={i} className="chart-row">
                      <span className="chart-row-label">{'⭐'.repeat(i + 1)}</span>
                      {renderBar(count, Math.max(...analyticsData.ratingDistribution), '#f59e0b')}
                      <span className="chart-row-value">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reviews by Month */}
              <div className="analytics-card">
                <h3>📝 Reviews per Month</h3>
                <div className="chart-area">
                  {analyticsData.reviewsByMonth.map((m, i) => (
                    <div key={i} className="chart-bar-group">
                      <span className="chart-value">{m.count}</span>
                      {renderBar(m.count, Math.max(...analyticsData.reviewsByMonth.map(x => x.count)), '#ec4899')}
                      <span className="chart-label">{m.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Loans by Day of Week */}
              <div className="analytics-card">
                <h3>📅 Busiest Days</h3>
                <div className="chart-area">
                  {analyticsData.loansByDay.map((d, i) => (
                    <div key={i} className="chart-bar-group">
                      <span className="chart-value">{d.count}</span>
                      {renderBar(d.count, Math.max(...analyticsData.loansByDay.map(x => x.count)), '#8b5cf6')}
                      <span className="chart-label">{d.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Books */}
              <div className="analytics-card full-width">
                <h3>🏆 Most Borrowed Books</h3>
                <div className="top-list">
                  {analyticsData.topBooks.length === 0 ? (
                    <p className="no-data">No loan data yet</p>
                  ) : (
                    analyticsData.topBooks.map((book, i) => (
                      <div key={i} className="top-list-item">
                        <span className="top-rank">#{i + 1}</span>
                        <span className="top-name">{book.title}</span>
                        <div className="top-bar-area">
                          {renderBar(book.count, analyticsData.topBooks[0]?.count, '#6366f1')}
                        </div>
                        <span className="top-count">{book.count} loans</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Top Borrowers */}
              <div className="analytics-card full-width">
                <h3>👑 Top Borrowers</h3>
                <div className="top-list">
                  {analyticsData.topBorrowers.length === 0 ? (
                    <p className="no-data">No borrower data yet</p>
                  ) : (
                    analyticsData.topBorrowers.map((b, i) => (
                      <div key={i} className="top-list-item">
                        <span className="top-rank">#{i + 1}</span>
                        <span className="top-name">{b.name}</span>
                        <div className="top-bar-area">
                          {renderBar(b.count, analyticsData.topBorrowers[0]?.count, '#34d399')}
                        </div>
                        <span className="top-count">{b.count} loans</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'announcements' ? (
          /* ANNOUNCEMENTS TAB */
          <div className="announcements-section">
            <div className="section-header">
              <h2>📢 Announcements</h2>
              <button className="invite-btn" onClick={() => setShowAnnouncementModal(true)}>
                ➕ New Announcement
              </button>
            </div>
            {announcements.length === 0 ? (
              <p className="no-data">No announcements yet. Create one to broadcast to all users.</p>
            ) : (
              <div className="announcements-list">
                {announcements.map((ann) => (
                  <div key={ann.id} className={`announcement-card type-${ann.type} ${!ann.is_active ? 'inactive' : ''}`}>
                    <div className="announcement-header">
                      <div className="announcement-title-area">
                        <span className={`ann-type-badge ${ann.type}`}>
                          {ann.type === 'info' ? 'ℹ️' : ann.type === 'warning' ? '⚠️' : ann.type === 'success' ? '✅' : '🚨'} {ann.type}
                        </span>
                        <h4>{ann.title}</h4>
                        {!ann.is_active && <span className="ann-inactive-badge">Hidden</span>}
                      </div>
                      <span className="announcement-date">{formatDate(ann.created_at)}</span>
                    </div>
                    <p className="announcement-message">{ann.message}</p>
                    <div className="announcement-actions">
                      <button 
                        className={`action-btn ${ann.is_active ? 'reject' : 'approve'}`}
                        onClick={() => handleToggleAnnouncement(ann.id, ann.is_active)}
                      >
                        {ann.is_active ? '👁️‍🗨️ Hide' : '👁️ Show'}
                      </button>
                      <button 
                        className="action-btn delete-sm"
                        onClick={() => handleDeleteAnnouncement(ann.id)}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'settings' ? (
          /* SETTINGS TAB */
          <div className="settings-section">
            <div className="section-header">
              <h2>⚙️ System Settings</h2>
              <button 
                className="invite-btn" 
                onClick={handleSaveSettings}
                disabled={savingSettings}
              >
                {savingSettings ? '⏳ Saving...' : '💾 Save Settings'}
              </button>
            </div>

            <div className="settings-grid">
              <div className="settings-group">
                <h3>📚 Loan Settings</h3>
                
                <div className="setting-item">
                  <div className="setting-info">
                    <label>Default Loan Duration (days)</label>
                    <p>How many days a user can keep a borrowed book</p>
                  </div>
                  <input 
                    type="number" 
                    className="setting-input"
                    value={systemSettings.maxLoanDays}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, maxLoanDays: parseInt(e.target.value) || 14 }))}
                    min={1} max={90}
                  />
                </div>

                <div className="setting-item">
                  <div className="setting-info">
                    <label>Max Active Loans per User</label>
                    <p>Maximum number of concurrent active loans per user</p>
                  </div>
                  <input 
                    type="number" 
                    className="setting-input"
                    value={systemSettings.maxLoansPerUser}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, maxLoansPerUser: parseInt(e.target.value) || 3 }))}
                    min={1} max={20}
                  />
                </div>

                <div className="setting-item">
                  <div className="setting-info">
                    <label>Auto-Approve Loans</label>
                    <p>Automatically approve loan requests without admin action</p>
                  </div>
                  <label className="toggle-switch">
                    <input 
                      type="checkbox" 
                      checked={systemSettings.autoApproveLoans}
                      onChange={(e) => setSystemSettings(prev => ({ ...prev, autoApproveLoans: e.target.checked }))}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              <div className="settings-group">
                <h3>👥 User Settings</h3>

                <div className="setting-item">
                  <div className="setting-info">
                    <label>Allow New Registrations</label>
                    <p>Allow new users to create accounts</p>
                  </div>
                  <label className="toggle-switch">
                    <input 
                      type="checkbox" 
                      checked={systemSettings.allowNewRegistrations}
                      onChange={(e) => setSystemSettings(prev => ({ ...prev, allowNewRegistrations: e.target.checked }))}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="setting-item">
                  <div className="setting-info">
                    <label>Maintenance Mode</label>
                    <p>Show maintenance page to non-admin users</p>
                  </div>
                  <label className="toggle-switch">
                    <input 
                      type="checkbox" 
                      checked={systemSettings.maintenanceMode}
                      onChange={(e) => setSystemSettings(prev => ({ ...prev, maintenanceMode: e.target.checked }))}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              <div className="settings-group">
                <h3>⭐ Review Settings</h3>

                <div className="setting-item">
                  <div className="setting-info">
                    <label>Reviews Require Approval</label>
                    <p>New reviews must be manually approved by admin</p>
                  </div>
                  <label className="toggle-switch">
                    <input 
                      type="checkbox" 
                      checked={systemSettings.reviewsMustBeApproved}
                      onChange={(e) => setSystemSettings(prev => ({ ...prev, reviewsMustBeApproved: e.target.checked }))}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="setting-item">
                  <div className="setting-info">
                    <label>Max Review Length</label>
                    <p>Maximum character count for reviews</p>
                  </div>
                  <input 
                    type="number" 
                    className="setting-input"
                    value={systemSettings.maxReviewLength}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, maxReviewLength: parseInt(e.target.value) || 2000 }))}
                    min={100} max={10000}
                  />
                </div>
              </div>

              <div className="settings-group">
                <h3>💬 Chat Settings</h3>

                <div className="setting-item">
                  <div className="setting-info">
                    <label>Enable Chat Support</label>
                    <p>Show the chat support widget to users</p>
                  </div>
                  <label className="toggle-switch">
                    <input 
                      type="checkbox" 
                      checked={systemSettings.enableChatSupport}
                      onChange={(e) => setSystemSettings(prev => ({ ...prev, enableChatSupport: e.target.checked }))}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="settings-group danger-zone">
                <h3>⚠️ Danger Zone</h3>
                <div className="setting-item">
                  <div className="setting-info">
                    <label>Export All Data</label>
                    <p>Export all library data as CSV files</p>
                  </div>
                  <button className="action-btn approve" onClick={generateReport}>📋 Export Report</button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </main>

      {/* User Detail Panel */}
      {userDetailId && (
        <div className="modal-overlay" onClick={() => { setUserDetailId(null); setUserDetail(null); }}>
          <div className="user-detail-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-x" onClick={() => { setUserDetailId(null); setUserDetail(null); }}>×</button>
            {userDetailLoading ? (
              <div className="loading"><div className="loading-spinner"></div><p>Loading user details...</p></div>
            ) : userDetail ? (
              <>
                <div className="user-detail-header">
                  <div className="user-detail-avatar">
                    {userDetail.first_name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <h2>{userDetail.first_name} {userDetail.last_name}</h2>
                    <span className={`role-badge ${userDetail.role === 'admin' ? 'role-admin' : 'role-user'}`}>{userDetail.role || 'user'}</span>
                    <p className="user-detail-email">{userDetail.email}</p>
                    <p className="user-detail-joined">Joined: {formatDate(userDetail.created_at)}</p>
                  </div>
                </div>

                <div className="user-detail-stats">
                  <div className="user-stat-card">
                    <span className="user-stat-value">{userDetail.loans?.length || 0}</span>
                    <span className="user-stat-label">Total Loans</span>
                  </div>
                  <div className="user-stat-card">
                    <span className="user-stat-value">{userDetail.loans?.filter(l => l.status === 'approved').length || 0}</span>
                    <span className="user-stat-label">Active Loans</span>
                  </div>
                  <div className="user-stat-card">
                    <span className="user-stat-value">{userDetail.reviews?.length || 0}</span>
                    <span className="user-stat-label">Reviews</span>
                  </div>
                  <div className="user-stat-card">
                    <span className="user-stat-value">{userDetail.wishlistCount}</span>
                    <span className="user-stat-label">Wishlist</span>
                  </div>
                  <div className="user-stat-card">
                    <span className="user-stat-value">{userDetail.collectionsCount}</span>
                    <span className="user-stat-label">Collections</span>
                  </div>
                </div>

                {userDetail.loans?.length > 0 && (
                  <div className="user-detail-section">
                    <h3>📚 Recent Loans</h3>
                    <div className="user-detail-list">
                      {userDetail.loans.slice(0, 5).map((loan) => (
                        <div key={loan.id} className="user-detail-item">
                          <span className="detail-item-title">{loan.book_title}</span>
                          <span>{getStatusBadge(loan.status)}</span>
                          <span className="detail-item-date">{formatDate(loan.requested_at)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {userDetail.reviews?.length > 0 && (
                  <div className="user-detail-section">
                    <h3>⭐ Recent Reviews</h3>
                    <div className="user-detail-list">
                      {userDetail.reviews.slice(0, 5).map((review) => (
                        <div key={review.id} className="user-detail-item">
                          <span className="detail-item-title">{review.book_title}</span>
                          <span>{'⭐'.repeat(review.rating)}</span>
                          <span className="detail-item-date">{formatDate(review.created_at)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="no-data">User not found</p>
            )}
          </div>
        </div>
      )}

      {/* Extend Loan Modal */}
      {extendingLoanId && (
        <div className="modal-overlay">
          <div className="rejection-modal">
            <h2>📅 Extend Loan Due Date</h2>
            <p>Extend the due date for this loan:</p>
            <div className="extend-options">
              {[3, 7, 14, 30].map(days => (
                <button 
                  key={days}
                  className={`extend-option-btn ${extendDays === days ? 'active' : ''}`}
                  onClick={() => setExtendDays(days)}
                >
                  {days} days
                </button>
              ))}
            </div>
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => { setExtendingLoanId(null); setExtendDays(7); }}>
                Cancel
              </button>
              <button className="modal-btn invite-confirm" onClick={handleExtendLoan}>
                Extend by {extendDays} days
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Announcement Modal */}
      {showAnnouncementModal && (
        <div className="modal-overlay">
          <div className="invite-modal">
            <h2>📢 New Announcement</h2>
            <p>Broadcast a message to all users.</p>
            <div className="invite-form">
              <div className="form-group">
                <label>Type</label>
                <select 
                  value={announcementForm.type}
                  onChange={(e) => setAnnouncementForm(prev => ({ ...prev, type: e.target.value }))}
                >
                  <option value="info">ℹ️ Info</option>
                  <option value="warning">⚠️ Warning</option>
                  <option value="success">✅ Success</option>
                  <option value="urgent">🚨 Urgent</option>
                </select>
              </div>
              <div className="form-group">
                <label>Title *</label>
                <input 
                  type="text"
                  placeholder="Announcement title..."
                  value={announcementForm.title}
                  onChange={(e) => setAnnouncementForm(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Message *</label>
                <textarea
                  placeholder="Write your announcement message..."
                  value={announcementForm.message}
                  onChange={(e) => setAnnouncementForm(prev => ({ ...prev, message: e.target.value }))}
                  rows="4"
                  className="rejection-textarea"
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => { setShowAnnouncementModal(false); setAnnouncementForm({ title: '', message: '', type: 'info' }); }} disabled={sendingAnnouncement}>
                Cancel
              </button>
              <button className="modal-btn invite-confirm" onClick={handleSendAnnouncement} disabled={sendingAnnouncement}>
                {sendingAnnouncement ? 'Publishing...' : '📢 Publish'}
              </button>
            </div>
          </div>
        </div>
      )}

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
