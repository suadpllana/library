import Book from "./Book/Book"
import Nav from "./Book/Nav"
import {HashRouter as Router, Routes, Route, Navigate} from "react-router-dom";
import CategoryBooks from "./Book/CategoryBooks";
import CategoryPage from "./Book/CategoryPage";
import {ToastContainer} from "react-toastify"
import BookPage from "./Book/BookPage";
import WishlistPage from './Book/WishlistPage';
import Authors from "./Book/Authors";
import AuthorPage from "./Book/AuthorPage";
import Auth from './components/Auth/Auth';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProfilePage from './Book/ProfilePage';
import LoanedBooks from './Book/LoanedBooks';
import AdminDashboard from './components/Admin/AdminDashboard';
// New feature imports
import Discover from './Book/Discover';
import AdvancedSearch from './Book/AdvancedSearch';
import MyCollections from './Book/MyCollections';
import CollectionDetail from './Book/CollectionDetail';
import ReadingHistory from './Book/ReadingHistory';

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
    <AuthProvider>
      <>
        <Router>
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
                    </Routes>
                  </>
                </UserRoute>
              }
            />
          </Routes>
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
      
      </>
    </AuthProvider>
  )
} export default App
