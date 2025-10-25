import React from 'react'
import "./Nav.css"
import {Link, useNavigate} from "react-router-dom"
import CategoryBooks from './CategoryBooks';
import {useState} from "react"
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const Nav = () => {
  const [showCategories, setShowCategories] = useState(false);
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
          <a onMouseLeave={() => setShowCategories(false)} onMouseEnter={() => setShowCategories(true)}>Category</a>
          {showCategories && <CategoryBooks setShowCategories={setShowCategories}/>}
          <Link to="/authors">Authors</Link>
          <Link to="/wishlist">Wishlist</Link>
        <button onClick={handleSignOut} className="sign-out-btn">Sign Out</button>

        </div>
      </nav>
  )
}

export default Nav
