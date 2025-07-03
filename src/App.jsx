import Book from "./Book/Book"
import Nav from "./Book/Nav"
import {HashRouter as Router,Routes,Route} from "react-router-dom";
import { useState, useEffect } from 'react';
import CategoryBooks from "./Book/CategoryBooks";
import CategoryPage from "./Book/CategoryPage";
import {ToastContainer} from "react-toastify"
import BookPage from "./Book/BookPage";
import WishlistPage from './Book/WishlistPage';
import Authors from "./Book/Authors";
import AuthorPage from "./Book/AuthorPage";
function App() {



  
  return (
    <>
  
     
      <Router>
      <Nav/>
        <Routes>
          <Route path ="/" element={<Book />}/>
          <Route path="/category" element={<CategoryPage />} />
          <Route path="/book/:id" element={<BookPage/>} />
          <Route path="/wishlist" element={<WishlistPage/>} />
          <Route path="/authors" element={<Authors />} />
          <Route path="/authors/:authorName" element={<AuthorPage/>} />
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
      />
    </>
  )
}

export default App
