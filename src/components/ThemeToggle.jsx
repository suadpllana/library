import React from 'react';
import { FaSun, FaMoon } from 'react-icons/fa6';
import { useTheme } from '../context/ThemeContext';
import './ThemeToggle.css';

const ThemeToggle = () => {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <button 
      className={`theme-toggle ${isDarkMode ? 'dark' : 'light'}`}
      onClick={toggleTheme}
      aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
    >
      <div className="toggle-track">
        <span className="toggle-icon sun">
          <FaSun />
        </span>
        <span className="toggle-icon moon">
          <FaMoon />
        </span>
        <span className="toggle-thumb"></span>
      </div>
    </button>
  );
};

export default ThemeToggle;
