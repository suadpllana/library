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
import ConfirmDialog from '../components/ConfirmDialog';
import UserSearch from './UserSearch';
import "./Nav.css";

const Nav = () => {
  const [showCategories, setShowCategories] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const [wishlistCount, setWishlistCount] = useState(0);
  const dropdownRef = useRef(null);
  const categoryRef = useRef(null);

  const isActive = (path) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
  const isDropdownActive = () => ['/discover', '/search', '/collections', '/history', '/stats', '/notes', '/profile'].some(path => location.pathname.startsWith(path));
  const isCategoryPage = () => location.pathname.startsWith('/category');
  const currentCategoryName = location.state?.categoryName || null;

  const toggleMoreMenu = () => setShowMoreMenu(!showMoreMenu);
  const handleMenuItemClick = () => setShowMoreMenu(false);

  // Close menus when routing/navigation changes
  useEffect(() => {
    setShowMoreMenu(false);
    setMobileMenuOpen(false);
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
      toast.success(t('signOutSuccess'));
      navigate('/auth');
    } catch (error) {
      toast.error(t('somethingWentWrong'));
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

        {/* 2. LINKS SECTION (Wishlist to Community) */}
        <div className={`nav-center ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          <Link to="/wishlist" className={isActive('/wishlist') ? 'active' : ''}>
            💫 {t('wishlist')} {wishlistCount > 0 && <span className="wishlist-badge">{wishlistCount}</span>}
          </Link>
          <Link to="/loaned-books" className={isActive('/loaned-books') ? 'active' : ''}>📋 {t('Loans')}</Link>
          <Link to="/fees" className={isActive('/fees') ? 'active' : ''}>💰 {t('fees') || 'Fees'}</Link>
          
          <div className="category-wrapper" ref={categoryRef}>
            <button className={`category-trigger ${showCategories ? 'open' : ''} ${isCategoryPage() ? 'active' : ''}`} onClick={() => setShowCategories(!showCategories)}>
              📂 {t('category')} <span className="arrow">▾</span>
            </button>
            {showCategories && <CategoryBooks setShowCategories={setShowCategories} showCategories={showCategories}/>}
          </div>

          <Link to="/authors" className={isActive('/authors') ? 'active' : ''}>👨‍💼 {t('authors')}</Link>

          <div className="nav-dropdown" ref={dropdownRef}>
            <span 
              className={`nav-dropdown-trigger ${showMoreMenu ? 'open' : ''} ${isDropdownActive() ? 'active' : ''}`} 
              onClick={toggleMoreMenu}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleMoreMenu(); } }}
              role="button"
              tabIndex={0}
              aria-expanded={showMoreMenu}
              aria-haspopup="true"
            >
              📚 {t('Library')} <span className="arrow">▾</span>
            </span>
            {showMoreMenu && (
              <div className="nav-dropdown-menu" role="menu">
                <Link to="/discover" onClick={handleMenuItemClick} role="menuitem">✨ {t('discover')}</Link>
                <Link to="/search" onClick={handleMenuItemClick} role="menuitem">🔍 {t('search')}</Link>
                <Link to="/collections" onClick={handleMenuItemClick} role="menuitem">📚 {t('collections')}</Link>
                <Link to="/history" onClick={handleMenuItemClick} role="menuitem">📖 {t('history')}</Link>
                <Link to="/notes" onClick={handleMenuItemClick} role="menuitem">📝 {t('Notes') || 'Notes'}</Link>
                <Link to="/stats" onClick={handleMenuItemClick} role="menuitem">📊 {t('Stats') || 'Statistics'}</Link>
                <Link to="/profile" onClick={handleMenuItemClick} role="menuitem">👤 {t('profile')}</Link>
              </div>
            )}
          </div>

          <Link to="/community" className={isActive('/community') ? 'active' : ''}>💬 {t('community')}</Link>
        </div>

        {/* Mobile hamburger toggle */}
        <button 
          className={`mobile-menu-toggle ${mobileMenuOpen ? 'open' : ''}`}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation menu"
          aria-expanded={mobileMenuOpen}
        >
          <span></span><span></span><span></span>
        </button>

        {/* 3. NOTIF & SIGN OUT SECTION */}
        <div className="nav-right">
          <UserSearch />
          <NotificationBell />
          <div className="lang-select-wrapper">
            <select
              className="lang-select"
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              aria-label="Language selector"
            >
              <option value="en">🇬🇧 EN</option>
              <option value="sq">🇦🇱 SQ</option>
              <option value="de">🇩🇪 DE</option>
              <option value="es">🇪🇸 ES</option>
            </select>
          </div>
          <button onClick={() => setShowSignOutConfirm(true)} className="sign-out-btn">🚪 {t('signOut')}</button>
        </div>
      </div>

      {/* Sign Out Confirmation Modal */}
      <ConfirmDialog
        isOpen={showSignOutConfirm}
        onClose={() => setShowSignOutConfirm(false)}
        onConfirm={handleSignOut}
        title={`${t('leavingSoSoon')} 👋`}
        message={t('confirmSignOut')}
        confirmLabel={t('signOut')}
        cancelLabel={t('stayLoggedIn')}
        type="question"
      />
    </nav>
  );
};

export default Nav;