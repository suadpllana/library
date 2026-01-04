import React from 'react'
import "./Nav.css"
import {Link, useNavigate} from "react-router-dom"
import CategoryBooks from './CategoryBooks';
import {useState} from "react"
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const Nav = () => {
  const [showCategories, setShowCategories] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const navigate = useNavigate();
  const { signOut, user } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Successfully signed out');
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out');
    }
  };

  return (
      <nav className="nav">
        <div className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/discover">Discover</Link>
          <Link to="/search">Search</Link>
          <a onMouseLeave={() => setShowCategories(false)} onMouseEnter={() => setShowCategories(true)}>Category</a>
          {showCategories && <CategoryBooks setShowCategories={setShowCategories}/>}
          <Link to="/authors">Authors</Link>
          <div 
            className="nav-dropdown" 
            onMouseEnter={() => setShowMoreMenu(true)} 
            onMouseLeave={() => setShowMoreMenu(false)}
          >
            <span className="nav-dropdown-trigger">My Library ▾</span>
            {showMoreMenu && (
              <div className="nav-dropdown-menu">
                <Link to="/wishlist">💫 Wishlist</Link>
                <Link to="/collections">📚 Collections</Link>
                <Link to="/history">📖 Reading History</Link>
                <Link to="/loaned-books">📋 Loaned Books</Link>
              </div>
            )}
          </div>
          <Link to="/profile">Profile</Link>
          <button onClick={handleSignOut} className="sign-out-btn">Sign Out</button>
        </div>
      </nav>
  )
}

export default Nav
