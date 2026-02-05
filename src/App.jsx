import React, { Suspense, lazy } from 'react';
import Nav from "./Book/Nav"
import {HashRouter as Router, Routes, Route, Navigate} from "react-router-dom";
import {ToastContainer} from "react-toastify"
import Auth from './components/Auth/Auth';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';

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
                  <>
                    <Nav />
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
                    </Routes>
                    <AiWidget />
                    <ChatSupport />
                  </>
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
