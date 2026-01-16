import React, { useState, useEffect, useRef } from 'react';
import { categories } from './categories';
import { useNavigate } from "react-router-dom";

const CategoryBooks = ({ setShowCategories, showCategories }) => {
  const [categoryBooks, setCategoryBooks] = useState([]);
  const [categoryName, setCategoryName] = useState();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const hasFetchedInitial = useRef(false);

  useEffect(() => {
    if (!hasFetchedInitial.current && categoryName === "") {
      bookInfo("philosophy"); 
      hasFetchedInitial.current = true;
    }
  }, []); 

  async function bookInfo(category) {
    setLoading(true);
    let query;
    
      const categoryQuery = category.toLowerCase().replace(/\s+/g, '+');
      query = `subject:${categoryQuery}&maxResults=25`;
    
    try {
      const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${query}`);
      const data = await response.json();
      setCategoryBooks(data.items || []);
      setCategoryName(category);
      navigate("/category", {
        state: { categoryBooks: data.items || [], categoryName: category, loading: false }
      });
      setShowCategories(false); 
    } catch (error) {
      console.error("Error fetching books:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="book-category">
      <div className="book-category-inner">
        {categories?.map(category => (
          <div key={category.name} className="category-item" onClick={() => bookInfo(category.name)}>
            <p>{category.emoji} {category.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryBooks;