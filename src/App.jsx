import React, { Suspense, lazy, useState, useEffect } from 'react';
import Nav from "./Book/Nav"
import {HashRouter as Router, Routes, Route, Navigate, useLocation} from "react-router-dom";
import {ToastContainer} from "react-toastify"
import Auth from './components/Auth/Auth';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';
import { supabase } from './lib/supabase';

// Lazy-loaded route components for code splitting
const Book = lazy(() => import("./Book/Book"));
const CategoryPage = lazy(() => import("./Book/CategoryPage"));
const BookPage = lazy(() => import("./Book/BookPage"));
const WishlistPage = lazy(() => import('./Book/WishlistPage'));
const Authors = lazy(() => import("./Book/Authors"));
const AuthorPage = lazy(() => import("./Book/AuthorPage"));
const ProfilePage = lazy(() => import('./Book/ProfilePage'));
const LoanedBooks = lazy(() => import('./Book/LoanedBooks'));
const AdminDashboard = lazy(() => import('./components/Admin/AdminDashboard'));
const AiWidget = lazy(() => import('./components/AiWidget'));
const ChatSupport = lazy(() => import('./components/ChatSupport'));
const Discover = lazy(() => import('./Book/Discover'));
const AdvancedSearch = lazy(() => import('./Book/AdvancedSearch'));
const MyCollections = lazy(() => import('./Book/MyCollections'));
const CollectionDetail = lazy(() => import('./Book/CollectionDetail'));
const ReadingHistory = lazy(() => import('./Book/ReadingHistory'));
const ReadingStats = lazy(() => import('./Book/ReadingStats'));
const BookNotes = lazy(() => import('./Book/BookNotes'));
const Community = lazy(() => import('./Book/Community'));
const PublicProfile = lazy(() => import('./Book/PublicProfile'));
const FeesPage = lazy(() => import('./Book/FeesPage'));
const UsernameModal = lazy(() => import('./components/UsernameModal'));
const AnnouncementBanner = lazy(() => import('./components/AnnouncementBanner'));

const LoadingFallback = () => (
  <div className="loading-screen" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
    <div className="spinner"></div>
  </div>
);

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  return user ? children : <Navigate to="/auth" />;
};


const UserRoute = ({ children }) => {
  const { user, userRole, loading } = useAuth();
  
  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/auth" />;
  }
  
  // Wait for userRole to be fetched (it should default to 'user')
  if (userRole === null) {
    return <div className="loading-screen">Loading...</div>;
  }
  
  if (userRole === 'banned') {
    return (
      <div className="banned-screen" style={{ 
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
        minHeight: '100vh', background: '#0f0f1a', color: '#fff', textAlign: 'center', padding: '2rem' 
      }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🚫</div>
        <h1 style={{ marginBottom: '0.5rem' }}>Account Suspended</h1>
        <p style={{ color: '#a5a5c0', maxWidth: '400px', lineHeight: 1.6 }}>
          Your account has been suspended by an administrator. 
          If you believe this is a mistake, please contact support.
        </p>
      </div>
    );
  }
   if (userRole === 'admin') {
    return <Navigate to="/admin" />;
  }
  
  return children;
};

const AdminRoute = ({ children }) => {
  const { user, userRole, loading } = useAuth();
  
  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/auth" />;
  }
  
  // Wait for userRole to be fetched
  if (userRole === null) {
    return <div className="loading-screen">Loading...</div>;
  }
  
  if (userRole !== 'admin') {
    return <Navigate to="/" />;
  }
  
  return children;
};

const UserLayout = () => {
  const location = useLocation();
  const { user } = useAuth();
  const isCommunity = location.pathname === '/community';
  const [aiOpen, setAiOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [needsUsername, setNeedsUsername] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(true);

  useEffect(() => {
    const checkUsername = async () => {
      if (!user) { setCheckingUsername(false); return; }
      try {
        const { data } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();
        setNeedsUsername(!data?.username);
      } catch {
        setNeedsUsername(false);
      } finally {
        setCheckingUsername(false);
      }
    };
    checkUsername();
  }, [user]);

  const handleAiToggle = (open) => {
    setAiOpen(open);
    if (open) setChatOpen(false);
  };

  const handleChatToggle = (open) => {
    setChatOpen(open);
    if (open) setAiOpen(false);
  };

  return (
    <>
      <a href="#main-content" className="skip-to-content">Skip to content</a>
      <Nav />
      <Suspense fallback={null}>
        <AnnouncementBanner />
      </Suspense>
      {!checkingUsername && needsUsername && (
        <Suspense fallback={null}>
          <UsernameModal onComplete={() => setNeedsUsername(false)} />
        </Suspense>
      )}
      <main id="main-content">
      <Routes>
        <Route path="/" element={<Book />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/search" element={<AdvancedSearch />} />
        <Route path="/category" element={<CategoryPage />} />
        <Route path="/book/:id" element={<BookPage />} />
        <Route path="/wishlist" element={<WishlistPage />} />
        <Route path="/loaned-books" element={<LoanedBooks />} />
        <Route path="/authors" element={<Authors />} />
        <Route path="/authors/:authorName" element={<AuthorPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/collections" element={<MyCollections />} />
        <Route path="/collection/:id" element={<CollectionDetail />} />
        <Route path="/history" element={<ReadingHistory />} />
        <Route path="/stats" element={<ReadingStats />} />
        <Route path="/notes" element={<BookNotes />} />
        <Route path="/community" element={<Community />} />
        <Route path="/user/:username" element={<PublicProfile />} />
        <Route path="/fees" element={<FeesPage />} />
      </Routes>
      </main>
      {!isCommunity && <AiWidget externalOpen={aiOpen} onToggle={handleAiToggle} />}
      {!isCommunity && <ChatSupport externalOpen={chatOpen} onToggle={handleChatToggle} />}
    </>
  );
};

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
        <ErrorBoundary>
          <Router>
            <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route
                path="/admin/*"
                element={
                  <AdminRoute>
                    <Routes>
                      <Route path="/" element={<AdminDashboard />} />
                      <Route path="*" element={<AdminDashboard />} />
                    </Routes>
                  </AdminRoute>
                }
            />
            <Route
              path="/*"
              element={
                <UserRoute>
                  <UserLayout />
                </UserRoute>
              }
            />
          </Routes>
          </Suspense>
        </Router>
        <ToastContainer
          position="bottom-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
          closeButton={false}
        />
        </ErrorBoundary>
      </AuthProvider>
    </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
