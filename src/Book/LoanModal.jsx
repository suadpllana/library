import React from 'react'
import "./Loan.css"
import {useState} from "react";
import { ToastContainer, toast } from "react-toastify";
import LibraryRules from './LibraryRules';
const LoanModal = ({setLoanModal , modalData, setLoanedBooks}) => {
  const [clientName, setClientName] = useState(""); 
 

    const formatDate = (dateString) => {
        const date = new Date(dateString);
      
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0'); 
        const year = date.getFullYear();
      
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
      
        return `${day}-${month}-${year} ${hours}:${minutes}`;
      };
      
      
   
      const getReturnDate = (dateString) => {
        const date = new Date(dateString);
      
       
        date.setDate(date.getDate() + 30);
      
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
      
        return `${day}-${month}-${year} ${hours}:${minutes}`;
      };
      const borrowDate = formatDate(new Date());
      const returnDate = getReturnDate(new Date());
      
      
      function loanedBook(e) {

        e.preventDefault();
        toast.success("Book loaned successfully");
        setLoanModal(false);

        setLoanedBooks((prevBooks) => [
          ...prevBooks,
          {
            id: Math.random(),
            borrowDate,
            returnDate,
            bookData: modalData[0],
            clientName
          }
        ])
      }

  return (
    <div className="loan-container" onClick={() => setLoanModal(false)}>

  <form onSubmit={loanedBook} className="loan" onClick={(e) => e.stopPropagation()}>
  <span onClick={() => setLoanModal(prev => !prev)} className="close">
              {" "}
              x
            </span>
        <LibraryRules/>
        <h1>Loan the book</h1>
        <p><strong>Name of the book: </strong> {modalData[0].volumeInfo?.title.slice(0, 60)}</p>
        <p><strong>Your Name: </strong> <input  type="text" placeholder="Write your name" onChange={(e) => setClientName(e.target.value)}  required/></p>

        <button className="loan-the-book-button" type="submit">Loan the book</button>
        


        </form>
    </div>
  
  )
}

export default LoanModal
