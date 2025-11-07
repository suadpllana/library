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
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  return user ? children : <Navigate to="/auth" />;
};

function App() {
  return (
    <AuthProvider>
      <>
        <Router>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/*"
              element={
                <PrivateRoute>
                  <>
                    <Nav />
                    <Routes>
                      <Route path="/" element={<Book />} />
                      <Route path="/category" element={<CategoryPage />} />
                      <Route path="/book/:id" element={<BookPage />} />
                      <Route path="/wishlist" element={<WishlistPage />} />
                      <Route path="/authors" element={<Authors />} />
                      <Route path="/authors/:authorName" element={<AuthorPage />} />
                      <Route path="/profile" element={<ProfilePage />} />
                    </Routes>
                  </>
                </PrivateRoute>
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
