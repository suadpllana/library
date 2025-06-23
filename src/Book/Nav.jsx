import React from 'react'
import "./Nav.css"
import {Link} from "react-router-dom"
import CategoryBooks from './CategoryBooks';
import {useState} from "react"
const Nav = () => {
  const [showCategories, setShowCategories] = useState(false)
  return (
      <nav className="nav">
      <Link to="/library" >Home</Link>
      <a  onMouseLeave={() => setShowCategories(false)} onMouseEnter={() => setShowCategories(true)} >Category</a>
        {showCategories && <CategoryBooks setShowCategories={setShowCategories}/>}
        <Link to="/library/authors">Authors</Link>
        <Link to="/library/wishlist">Wishlist</Link>

      </nav>
  )
}

export default Nav
