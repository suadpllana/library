import React from 'react'
import { useEffect } from 'react';
import "./LoanedBooks.css"  
const LoanedBooks = ({loanedBooks, setLoanedBooks}) => {

  useEffect(() => {
    const loanedBooksData = localStorage.getItem("loanedBooksData");
    if (loanedBooksData) {
      setLoanedBooks(JSON.parse(loanedBooksData));
    }
  }
  , []);


  return (
    <div className='loaned-books'>
        {loanedBooks.length > 0 ? (
          <div className='loaned-books-header'>

           <h2>Loaned Books</h2>
           <table border="1" className='loaned-books-table'>
            <thead>
              <tr>
                <th>Book Title</th>
                <th>Book Author</th>
                <th>Name</th>
                <th>Borrow Date</th>
                <th>Return Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loanedBooks.map((book) => (
                <tr key={book.id}>
                  <td>{book?.bookData?.volumeInfo?.title}</td>
                  <td>{book.bookData.volumeInfo.authors ? book.bookData.volumeInfo.authors : "Not found"}</td>
                  <td>{book.clientName}</td>
                  <td>{book.borrowDate}</td>
                  <td>{book.returnDate}</td>
                  <td>Active</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
         
          
          
        ) : (
          <p>No books loaned yet.</p>
        )}  
      </div>
  )
}

export default LoanedBooks
