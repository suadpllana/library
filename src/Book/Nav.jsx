import React from 'react'
import "./Nav.css"
import {Link, useNavigate} from "react-router-dom"
import CategoryBooks from './CategoryBooks';
import {useState, useRef, useEffect} from "react"
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const Nav = () => {
  const [showCategories, setShowCategories] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const dropdownRef = useRef(null);

  const toggleMoreMenu = () => {
    setShowMoreMenu(!showMoreMenu);
  };

  const handleMenuItemClick = () => {
    setShowMoreMenu(false);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowMoreMenu(false);
      }
    };

    if (showMoreMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [showMoreMenu]);

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
          <Link to="/">🏠 Home</Link>
                <Link to="/wishlist" onClick={handleMenuItemClick}>💫 Wishlist</Link>
                <Link to="/loaned-books" onClick={handleMenuItemClick}>📋 Loaned Books</Link>

          <button 
            className="category-trigger"
            onMouseLeave={() => setShowCategories(false)} 
            onMouseEnter={() => setShowCategories(true)}
            onFocus={() => setShowCategories(true)}
            onBlur={() => setShowCategories(false)}
            aria-haspopup="true"
            aria-expanded={showCategories}
          >
            📂 Category
          </button>
          {showCategories && <CategoryBooks setShowCategories={setShowCategories}/>}
          <Link to="/authors">👨‍💼 Authors</Link>
          <div className="nav-dropdown" ref={dropdownRef}>
            <span className={`nav-dropdown-trigger ${showMoreMenu ? 'open' : ''}`} onClick={toggleMoreMenu}>My Library <span className="arrow">▾</span></span>
            {showMoreMenu && (
              <div className="nav-dropdown-menu">
          <Link to="/discover">✨ Discover</Link>
          <Link to="/search">🔍 Search</Link>

                <Link to="/collections" onClick={handleMenuItemClick}>📚 Collections</Link>
                <Link to="/history" onClick={handleMenuItemClick}>📖 Reading History</Link>
              </div>
            )}
          </div>
          <Link to="/profile">👤 Profile</Link>
          <button onClick={handleSignOut} className="sign-out-btn">🚪 Sign Out</button>
        </div>
      </nav>
  )
}

export default Nav
