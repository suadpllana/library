import React from 'react'
import "./Nav.css"
import {Link} from "react-router-dom"
const Nav = () => {
  return (
    <nav className="nav">
      <Link to="/library" >Homepage</Link>
      <Link to="/library/loans" >Loans</Link>
      </nav>
  )
}

export default Nav
