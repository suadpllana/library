import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import translations from '../../i18n/translations';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-toastify';
import './Auth.css';

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signUp, user, userRole } = useAuth();
  const { language } = useLanguage();
  const t = translations[language];

  // Check for password reset token in URL (from email link)
  useEffect(() => {
    const hashParams = new URLSearchParams(location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    const type = hashParams.get('type');

    const handleRecoverySession = async () => {
      if (accessToken && type === 'recovery') {
        try {
          if (typeof supabase.auth.setSession === 'function') {
            await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          } else if (typeof supabase.auth.getSessionFromUrl === 'function') {
            // Fallback for other client APIs
            await supabase.auth.getSessionFromUrl();
          }
        } catch (err) {
          console.error('Error establishing recovery session:', err);
        }

        setIsResetPassword(true);
        setIsForgotPassword(false);
        setIsSignUp(false);

        // Clear the hash to avoid leaving tokens visible in the URL
        try {
          window.location.hash = '/auth';
        } catch (err) {
          // ignore
        }
      }
    };

    handleRecoverySession();
  }, [location]);

  // Redirect authenticated users to dashboard
  useEffect(() => {
    // Don't redirect if user is resetting password
    if (isResetPassword) return;
    
    if (user && userRole) {
      if (userRole === 'admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    }
  }, [user, userRole, navigate, isResetPassword]);

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Check if email exists in database first
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (!existingProfile) {
        setError('No account found with this email address.');
        setLoading(false);
        return;
      }

      const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin + window.location.pathname.split('/').slice(0, -1).join('/') || 'https://suadpllana.github.io/library';
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl}/#/auth`,
      });
      
      if (error) throw error;
      
      setSuccessMessage(t.passwordResetSent);
      toast.success(t.passwordResetSent);
    } catch (error) {
      setError(error.message);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    if (password !== confirmPassword) {
      setError(t.passwordsDoNotMatch);
      toast.error(t.passwordsDoNotMatch);
      setLoading(false);
      return;
    }

    // Strong password validation
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      toast.error('Password must be at least 8 characters');
      setLoading(false);
      return;
    }
    
    // Check for password complexity
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    
    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      setError('Password must contain uppercase, lowercase, and a number');
      toast.error('Password must contain uppercase, lowercase letters, and a number');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });
      
      if (error) throw error;
      
      setSuccessMessage(t.profileUpdated);
      toast.success(t.profileUpdated);
      
      // Clear the hash and redirect to sign in
      setTimeout(() => {
        setIsResetPassword(false);
        setPassword('');
        setConfirmPassword('');
        window.location.hash = '/auth';
      }, 2000);
    } catch (error) {
      setError(error.message);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      if (isSignUp) {
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          setError('Please enter a valid email address');
          toast.error('Please enter a valid email address');
          setLoading(false);
          return;
        }
        
        // Validate passwords on signup
        if (password !== confirmPassword) {
          setError(t.passwordsDoNotMatch);
          toast.error(t.passwordsDoNotMatch);
          setLoading(false);
          return;
        }

        // Strong password validation
        if (password.length < 8) {
          setError('Password must be at least 8 characters');
          toast.error('Password must be at least 8 characters');
          setLoading(false);
          return;
        }
        
        // Check for password complexity
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumber = /\d/.test(password);
        
        if (!hasUpperCase || !hasLowerCase || !hasNumber) {
          setError('Password must contain uppercase, lowercase, and a number');
          toast.error('Password must contain uppercase, lowercase letters, and a number');
          setLoading(false);
          return;
        }
        
        // Validate name fields
        const trimmedFirstName = firstName.trim();
        const trimmedLastName = lastName.trim();
        
        if (!trimmedFirstName || trimmedFirstName.length < 2 || trimmedFirstName.length > 50) {
          setError('First name must be 2-50 characters');
          toast.error('First name must be 2-50 characters');
          setLoading(false);
          return;
        }
        
        if (!trimmedLastName || trimmedLastName.length < 2 || trimmedLastName.length > 50) {
          setError('Last name must be 2-50 characters');
          toast.error('Last name must be 2-50 characters');
          setLoading(false);
          return;
        }

        const { error } = await signUp({
          email,
          password,
          options: {
            data: {
              first_name: trimmedFirstName,
              last_name: trimmedLastName
            }
          }
        });
        if (error) throw error;
        toast.success(t.signUpSuccessCheck);
        setError('Please check your email to confirm your account');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        return;
      } else {
        const { error } = await signIn({
          email,
          password,
        });
        if (error) throw error;
        toast.success(t.signedInSuccess);
        navigate('/');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      setLoading(true);
      setError(null);

      const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin + window.location.pathname.split('/').slice(0, -1).join('/') || 'https://suadpllana.github.io/library';
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${siteUrl}/`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error with Google auth:', error);
      setError(error.message || 'Failed to sign in with Google');
      toast.error(error.message || 'Failed to sign in with Google');
      setLoading(false);
    }
  };

  const handleToggleAuth = () => {
    setIsSignUp((prev) => !prev);
    setIsForgotPassword(false);
    setIsResetPassword(false);
    setError(null);
    setSuccessMessage(null);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFirstName('');
    setLastName('');
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        {isResetPassword ? (
          <>
            <h2>{t.resetPasswordTitle}</h2>
            {error && <div className="error-message">{error}</div>}
            {successMessage && <div className="success-message">{successMessage}</div>}
            <form onSubmit={handleResetPassword}>
              <div className="form-group">
                <label>{t.newPassword}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.enterNewPassword}
                  required
                  minLength={6}
                />
              </div>
              <div className="form-group">
                <label>{t.confirmPassword}</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t.enterNewPasswordAgain}
                  required
                  minLength={6}
                />
              </div>
              <button type="submit" disabled={loading}>
                {loading ? t.updating : t.updatePassword}
              </button>
            </form>
          </>
        ) : isForgotPassword ? (
          /* Forgot Password Form */
          <>
            <h2>{t.forgotPasswordTitle}</h2>
            {error && <div className="error-message">{error}</div>}
            {successMessage && <div className="success-message">{successMessage}</div>}
            <p className="forgot-password-description">
              {t.enterEmailForReset}
            </p>
            <form onSubmit={handleForgotPassword}>
              <div className="form-group">
                <label>{t.email}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.enterYourEmail}
                  required
                />
              </div>
              <button type="submit" disabled={loading}>
                {loading ? t.sending : t.sendResetLink}
              </button>
            </form>
            <p>
              {t.rememberPassword}{' '}
              <button
                className="switch-auth"
                onClick={() => {
                  setIsForgotPassword(false);
                  setError(null);
                  setSuccessMessage(null);
                }}
              >
                {t.signIn}
              </button>
            </p>
          </>
        ) : (
          /* Sign In / Sign Up Form */
          <>
            <h2>{isSignUp ? t.signUp : t.signIn}</h2>
            {error && <div className="error-message">{error}</div>}
            <form onSubmit={handleAuth}>
              {isSignUp && (
                <>
                  <div className="form-group">
                    <label>{t.firstName}</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required={isSignUp}
                    />
                  </div>
                  <div className="form-group">
                    <label>{t.lastName}</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required={isSignUp}
                    />
                  </div>
                  <div className="form-group">
                  
                  
                  </div>
                </>
              )}
              <div className="form-group">
                <label>{t.email}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>{t.password}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {isSignUp && (
                <div className="form-group">
                  <label>{t.confirmPassword}</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              )}
              {!isSignUp && (
                <div className="forgot-password-link">
                  <button
                    type="button"
                    className="switch-auth"
                    onClick={() => {
                      setIsForgotPassword(true);
                      setError(null);
                      setEmail('');
                      setPassword('');
                    }}
                  >
                    {t.forgotPassword}
                  </button>
                </div>
              )}
              <button type="submit" disabled={loading}>
                {loading ? t.loading : isSignUp ? t.signUp : t.signIn}
              </button>
            </form>

            <div className="divider">
              <span>{t.orContinueWith}</span>
            </div>

            <button 
              type="button"
              className="google-button"
              onClick={handleGoogleAuth}
              disabled={loading}
            >
              <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {isSignUp ? t.signUpWithGoogle : t.signInWithGoogle}
            </button>

            <p>
              {isSignUp ? t.haveAccount + ' ' : t.noAccount + ' '}
              <button
                className="switch-auth"
                onClick={handleToggleAuth}
              >
                {isSignUp ? t.signIn : t.signUp}
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default Auth;