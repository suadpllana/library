import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from "react-router-dom";
import CategoryBooks from './CategoryBooks';
import logo from '../assets/Gemini_Generated_Image_rnvudnrnvudnrnvu.png';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
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
  const { lang, setLang, t } = useLanguage();
  const [wishlistCount, setWishlistCount] = useState(0);
  const dropdownRef = useRef(null);
  const categoryRef = useRef(null);

  const isActive = (path) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
  const isDropdownActive = () => ['/discover', '/search', '/collections', '/history', '/stats', '/notes'].some(path => location.pathname.startsWith(path));
  const isCategoryPage = () => location.pathname.startsWith('/category');
  const currentCategoryName = location.state?.categoryName || null;

  const toggleMoreMenu = () => setShowMoreMenu(!showMoreMenu);
  const handleMenuItemClick = () => setShowMoreMenu(false);

  // Close more menu when routing/navigation changes
  useEffect(() => {
    setShowMoreMenu(false);
  }, [location.pathname]);

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
            💫 {t('wishlist')} {wishlistCount > 0 && <span className="wishlist-badge">{wishlistCount}</span>}
          </Link>
          <Link to="/loaned-books" className={isActive('/loaned-books') ? 'active' : ''}>📋 {t('loanedBooks')}</Link>
          
          <div className="category-wrapper" ref={categoryRef}>
            <button className={`category-trigger ${showCategories ? 'open' : ''} ${isCategoryPage() ? 'active' : ''}`} onClick={() => setShowCategories(!showCategories)}>
              📂 {t('category')} <span className="arrow">▾</span>
            </button>
            {showCategories && <CategoryBooks setShowCategories={setShowCategories} showCategories={showCategories}/>}
          </div>

          <Link to="/authors" className={isActive('/authors') ? 'active' : ''}>👨‍💼 {t('authors')}</Link>

          <div className="nav-dropdown" ref={dropdownRef}>
            <span className={`nav-dropdown-trigger ${showMoreMenu ? 'open' : ''} ${isDropdownActive() ? 'active' : ''}`} onClick={toggleMoreMenu}>
              📚 {t('Library')} <span className="arrow">▾</span>
            </span>
            {showMoreMenu && (
              <div className="nav-dropdown-menu">
                <Link to="/discover" onClick={handleMenuItemClick}>✨ {t('discover')}</Link>
                <Link to="/search" onClick={handleMenuItemClick}>🔍 {t('search')}</Link>
                <Link to="/collections" onClick={handleMenuItemClick}>📚 {t('collections')}</Link>
                <Link to="/history" onClick={handleMenuItemClick}>📖 {t('history')}</Link>
              </div>
            )}
          </div>

          <Link to="/profile" className={isActive('/profile') ? 'active' : ''}>👤 {t('profile')}</Link>
        </div>

        {/* 3. NOTIF & SIGN OUT SECTION */}
        <div className="nav-right">
          <NotificationBell />
          <div className="lang-switch" role="listbox" aria-label="Language selector">
            <button
              className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
              aria-label="English"
              onClick={() => setLang('en')}
              title="English"
            >🇬🇧 EN</button>
            <button
              className={`lang-btn ${lang === 'sq' ? 'active' : ''}`}
              aria-label="Shqip"
              onClick={() => setLang('sq')}
              title="Shqip"
            >🇦🇱 SQ</button>
          </div>
          <button onClick={handleSignOut} className="sign-out-btn">🚪 {t('signOut')}</button>
        </div>
      </div>
    </nav>
  );
};

export default Nav;