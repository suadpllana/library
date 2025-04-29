import Book from "./Book/Book"
import Nav from "./Book/Nav"
import {HashRouter as Router,Routes,Route} from "react-router-dom";
import { useState, useEffect } from 'react';
import LoanedBooks from "./Book/LoanedBooks";
function App() {
  const [loanedBooks, setLoanedBooks] = useState(() => {
    const loanedBooksData = localStorage.getItem("loanedBooksData");
    return loanedBooksData ? JSON.parse(loanedBooksData) : [];
  });

  useEffect(() => {
    localStorage.setItem("loanedBooksData", JSON.stringify(loanedBooks));
  }, [loanedBooks]);
  
  return (
    <>
  
     
      <Router>
      <Nav/>
        <Routes>
          <Route path="/library" element={<Book setLoanedBooks={setLoanedBooks}/>}/>
          <Route path ="/" element={<Book setLoanedBooks={setLoanedBooks}/>}/>
          <Route path="/library/loans" element={<LoanedBooks setLoanedBooks={setLoanedBooks} loanedBooks={loanedBooks} />}/>
        </Routes>
      </Router>
    </>
  )
}

export default App
