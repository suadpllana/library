import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { FaSearch, FaUser, FaTimes } from 'react-icons/fa';
import './UserSearch.css';

const UserSearch = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (value) => {
    setQuery(value);

    // Clear previous debounce
    if (debounceRef.current) clearTimeout(debounceRef.current);

    // Sanitize input for PostgREST injection prevention
    const sanitized = value.trim().replace(/[%_.,()\"'\\]/g, '');
    if (sanitized.length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('username, first_name, last_name')
          .not('username', 'is', null)
          .or(`username.ilike.%${sanitized}%,first_name.ilike.%${sanitized}%,last_name.ilike.%${sanitized}%`)
          .limit(8);

        if (error) throw error;
        setResults(data || []);
        setShowResults(true);
      } catch (error) {
        console.error('Error searching users:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const handleUserClick = (username) => {
    setShowResults(false);
    setQuery('');
    setResults([]);
    navigate(`/user/${username}`);
  };

  const getInitials = (profile) => {
    const first = profile.first_name?.[0] || '';
    const last = profile.last_name?.[0] || '';
    return (first + last).toUpperCase() || '?';
  };

  return (
    <div className="user-search-container" ref={containerRef}>
      <div className="user-search-input-wrapper">
        <FaSearch className="search-icon" />
        <input
          type="text"
          placeholder="Search users..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          maxLength={50}
          className="user-search-input"
        />
        {query && (
          <button
            className="clear-search-btn"
            onClick={() => { setQuery(''); setResults([]); setShowResults(false); }}
          >
            <FaTimes />
          </button>
        )}
      </div>

      {showResults && (
        <div className="user-search-dropdown">
          {loading ? (
            <div className="search-loading">
              <div className="mini-spinner"></div>
              <span>Searching...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="search-no-results">
              <FaUser />
              <span>No users found</span>
            </div>
          ) : (
            <div className="search-results-list">
              {results.map((user) => (
                <button
                  key={user.username}
                  className="search-result-item"
                  onClick={() => handleUserClick(user.username)}
                >
                  <div className="result-avatar">
                    <div className="result-initials">{getInitials(user)}</div>
                  </div>
                  <div className="result-info">
                    <span className="result-name">
                      {user.first_name} {user.last_name || ''}
                    </span>
                    <span className="result-username">@{user.username}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserSearch;
