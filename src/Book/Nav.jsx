import React from 'react'
import "./Nav.css"
import {Link, useNavigate, useLocation} from "react-router-dom"
import CategoryBooks from './CategoryBooks';
import {useState, useRef, useEffect} from "react"
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import NotificationBell from '../components/NotificationBell';
import ThemeToggle from '../components/ThemeToggle';

const Nav = () => {
  const [showCategories, setShowCategories] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, user } = useAuth();
  const dropdownRef = useRef(null);

  // Helper to check if path is active
  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  // Check if any dropdown item is active
  const isDropdownActive = () => {
    return ['/discover', '/search', '/collections', '/history', '/stats', '/notes'].some(path => 
      location.pathname.startsWith(path)
    );
  };

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
          <Link to="/" className={isActive('/') ? 'active' : ''}>🏠 Home</Link>
          <Link to="/wishlist" className={isActive('/wishlist') ? 'active' : ''} onClick={handleMenuItemClick}>💫 Wishlist</Link>
          <Link to="/loaned-books" className={isActive('/loaned-books') ? 'active' : ''} onClick={handleMenuItemClick}>📋 Loaned Books</Link>

          <div 
            className="category-wrapper"
            onMouseEnter={() => setShowCategories(true)}
            onMouseLeave={() => setShowCategories(false)}
          >
            <button 
              className="category-trigger"
              onFocus={() => setShowCategories(true)}
              onBlur={() => setShowCategories(false)}
              aria-haspopup="true"
              aria-expanded={showCategories}
            >
              📂 Category
            </button>
            {showCategories && <CategoryBooks setShowCategories={setShowCategories} showCategories={showCategories}/>}
          </div>
          <Link to="/authors" className={isActive('/authors') ? 'active' : ''}>👨‍💼 Authors</Link>
          <div className="nav-dropdown" ref={dropdownRef}>
            <span className={`nav-dropdown-trigger ${showMoreMenu ? 'open' : ''} ${isDropdownActive() ? 'active' : ''}`} onClick={toggleMoreMenu}>My Library <span className="arrow">▾</span></span>
            {showMoreMenu && (
              <div className="nav-dropdown-menu">
                <Link to="/discover" className={isActive('/discover') ? 'active' : ''}>✨ Discover</Link>
                <Link to="/search" className={isActive('/search') ? 'active' : ''}>🔍 Search</Link>
                <Link to="/collections" className={isActive('/collections') ? 'active' : ''} onClick={handleMenuItemClick}>📚 Collections</Link>
                <Link to="/history" className={isActive('/history') ? 'active' : ''} onClick={handleMenuItemClick}>📖 Reading History</Link>
                <Link to="/stats" className={isActive('/stats') ? 'active' : ''} onClick={handleMenuItemClick}>📊 Statistics</Link>
                <Link to="/notes" className={isActive('/notes') ? 'active' : ''} onClick={handleMenuItemClick}>📝 Book Notes</Link>
              </div>
            )}
          </div>
          <Link to="/profile" className={isActive('/profile') ? 'active' : ''}>👤 Profile</Link>
          <ThemeToggle />
          <NotificationBell />
          <button onClick={handleSignOut} className="sign-out-btn">🚪 Sign Out</button>
        </div>
      </nav>
  )
}

export default Nav
