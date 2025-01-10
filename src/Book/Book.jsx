import React, { useState, useRef, useEffect } from "react";
import "./Book.css";

const Book = () => {
  const [books,setBooks] = useState(() => {
    const booksData = localStorage.getItem("booksData");
    return booksData ? JSON.parse(booksData) : []
  });


  useEffect(() => {
      localStorage.setItem("booksData", JSON.stringify(books))
  } ,[books])


  const [title , setTitle] = useState("")

  async function getBookData() {
    try {
      if (title.trim() === "") return;


      
      const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${title}`);
      const data = await response.json();

      if(books.some(book => book.volumeInfo.title === data.items[0].volumeInfo.title)){
        return
      }
  
      if (data.items && data.items.length > 0) {
        const firstBook = data.items[0]; 
        setBooks((prevBooks) => [...prevBooks, firstBook]); 
      }
      console.log(books)
    } catch (err) {
      console.error(err);
    }
  }

function deleteBook(id){
  console.log(books)
  const filteredBooks = books.filter((book) => book.id !== id)
  setBooks(filteredBooks)
}
function enterBook(e){
  if(e.key === "Enter"){
    getBookData()
  }
}



  return (
    <div>
      <h1>Add your favorite books or make a book list you will read later!</h1>
      <input
      onKeyDown={(e) => enterBook(e)}
        className="title-input"
        placeholder="Enter  book's name"
      onChange={(e) => setTitle(e.target.value)}
        type="text"
      />
      <button className="add-book-button" onClick={getBookData}>
        Add book
      </button> 
    

      <div className="bookContainer">
       {books.length > 0 ? books.map((book ,index) => (
        <div  className="book" key={index}>
          {book.volumeInfo && book.volumeInfo.imageLinks ? 
               <img className="bookImage" src={book.volumeInfo.imageLinks.smallThumbnail} alt="" />
          : <></>}
        {book.volumeInfo && book.volume.title ? 
        <h2>Title: {book.volumeInfo.title}</h2> : <></>}
          
          <p> Authors:
          {book.volumeInfo && book.volumeInfo.authors[0] ? book.volumeInfo.authors.map(author => (
           <span> {author}</span>
          )) : <></>}
          </p>
           {book.volumeInfo && book.volumeInfo.categories[0] ? book.volumeInfo.categories.map(category => (
            <p>Category/ies: {category  }</p>
          )) : <></>}
          {book.searchInfo && book.searchInfo.textSnippet ?
          <p className="description">{book.searchInfo.textSnippet}</p>
           : <></>}
         <button className="delete-book-button" onClick={() => deleteBook(book.id)}>Delete Book</button>
        </div>
       )) : <></>}
      </div>



    </div>
  );
};

export default Book;
