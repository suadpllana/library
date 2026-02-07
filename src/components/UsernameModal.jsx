import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import translations from '../i18n/translations';
import { toast } from 'react-toastify';
import './UsernameModal.css';

const UsernameModal = ({ onComplete }) => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const t = translations[language];
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validateUsername = (val) => {
    if (val.length < 3) return t.usernameInvalid;
    if (val.length > 20) return t.usernameInvalid;
    if (!/^[a-zA-Z0-9_]+$/.test(val)) return t.usernameInvalid;
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = username.trim();
    const validationError = validateUsername(trimmed);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Check if username is already taken
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', trimmed.toLowerCase())
        .maybeSingle();

      if (existing) {
        setError(t.usernameTaken);
        setLoading(false);
        return;
      }

      // Update profile with username
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ username: trimmed.toLowerCase() })
        .eq('id', user.id);

      if (updateError) throw updateError;

      toast.success(`${t.welcomeUsername}, @${trimmed}! ${t.usernameSet}`);
      onComplete(trimmed.toLowerCase());
    } catch (err) {
      console.error('Error setting username:', err);
      setError('Failed to set username. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="username-modal-overlay">
      <div className="username-modal">
        <div className="username-modal-header">
          <span className="username-emoji">🔒</span>
          <h2>{t.chooseUsername}</h2>
          <p>{t.chooseUsernameDesc}</p>
        </div>

        <form onSubmit={handleSubmit} className="username-form">
          <div className="username-input-group">
            <span className="at-symbol">@</span>
            <input
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value.replace(/\s/g, ''));
                setError('');
              }}
              placeholder={t.usernamePlaceholder}
              maxLength={20}
              autoFocus
            />
          </div>
          {error && <p className="username-error">{error}</p>}
          <p className="username-hint">{t.usernameCharsHint}</p>
          <button type="submit" disabled={loading || !username.trim()}>
            {loading ? t.settingUp : t.setUsernameContinue}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UsernameModal;
