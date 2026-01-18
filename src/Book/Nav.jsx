import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from "react-router-dom";
import CategoryBooks from './CategoryBooks';
import logo from '../assets/Gemini_Generated_Image_rnvudnrnvudnrnvu.png';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { toast } from 'react-toastify';
import NotificationBell from '../components/NotificationBell';
import ThemeToggle from '../components/ThemeToggle';
import "./Nav.css";

const Nav = () => {
  const [showCategories, setShowCategories] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, user } = useAuth();
  const [wishlistCount, setWishlistCount] = useState(0);
  const dropdownRef = useRef(null);
  const categoryRef = useRef(null);

  const isActive = (path) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
  const isDropdownActive = () => ['/discover', '/search', '/collections', '/history', '/stats', '/notes'].some(path => location.pathname.startsWith(path));

  const toggleMoreMenu = () => setShowMoreMenu(!showMoreMenu);
  const handleMenuItemClick = () => setShowMoreMenu(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setShowMoreMenu(false);
      if (categoryRef.current && !categoryRef.current.contains(event.target)) setShowCategories(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchWishlistCount = async () => {
      if (!user) { setWishlistCount(0); return; }
      const { count } = await supabase.from('wishlist').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
      setWishlistCount(count || 0);
    };
    fetchWishlistCount();
  }, [user]);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Successfully signed out');
      navigate('/auth');
    } catch (error) {
      toast.error('Failed to sign out');
    }
  };

  return (
    <nav className="nav">
      <div className="nav-inner">
        {/* 1. LOGO SECTION */}
        <div className="nav-left">
          <Link to="/" className="logo-link" aria-label="Librium home">
            <img src={logo} alt="Librium" className="logo-img" />
            <span className="logo-text">Librium</span>
          </Link>
        </div>

        {/* 2. LINKS SECTION (Wishlist to Profile) */}
        <div className="nav-center">
          <Link to="/wishlist" className={isActive('/wishlist') ? 'active' : ''}>
            💫 Wishlist {wishlistCount > 0 && <span className="wishlist-badge">{wishlistCount}</span>}
          </Link>
          <Link to="/loaned-books" className={isActive('/loaned-books') ? 'active' : ''}>📋 Loaned Books</Link>
          
          <div className="category-wrapper" ref={categoryRef}>
            <button className={`category-trigger ${showCategories ? 'open' : ''}`} onClick={() => setShowCategories(!showCategories)}>
              📂 Category <span className="arrow">▾</span>
            </button>
            {showCategories && <CategoryBooks setShowCategories={setShowCategories} showCategories={showCategories}/>}
          </div>

          <Link to="/authors" className={isActive('/authors') ? 'active' : ''}>👨‍💼 Authors</Link>

          <div className="nav-dropdown" ref={dropdownRef}>
            <span className={`nav-dropdown-trigger ${showMoreMenu ? 'open' : ''} ${isDropdownActive() ? 'active' : ''}`} onClick={toggleMoreMenu}>
              My Library <span className="arrow">▾</span>
            </span>
            {showMoreMenu && (
              <div className="nav-dropdown-menu">
                <Link to="/discover" onClick={handleMenuItemClick}>✨ Discover</Link>
                <Link to="/search" onClick={handleMenuItemClick}>🔍 Search</Link>
                <Link to="/collections" onClick={handleMenuItemClick}>📚 Collections</Link>
                <Link to="/history" onClick={handleMenuItemClick}>📖 History</Link>
              </div>
            )}
          </div>

          <Link to="/profile" className={isActive('/profile') ? 'active' : ''}>👤 Profile</Link>
        </div>

        {/* 3. NOTIF & SIGN OUT SECTION */}
        <div className="nav-right">
          <NotificationBell />
          <button onClick={handleSignOut} className="sign-out-btn">🚪 Sign Out</button>
          {/* <ThemeToggle /> */}
        </div>
      </div>
    </nav>
  );
};

export default Nav;