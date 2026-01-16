import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
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
  const [role, setRole] = useState('user');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signUp, user, userRole } = useAuth();

  // Check for password reset token in URL (from email link)
  useEffect(() => {
    const hashParams = new URLSearchParams(location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const type = hashParams.get('type');
    
    if (accessToken && type === 'recovery') {
      setIsResetPassword(true);
      setIsForgotPassword(false);
      setIsSignUp(false);
    }
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
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://suadpllana.github.io/library/#/auth',
      });
      
      if (error) throw error;
      
      setSuccessMessage('Password reset link sent! Please check your email.');
      toast.success('Password reset link sent! Check your email.');
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
      setError('Passwords do not match');
      toast.error('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      toast.error('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });
      
      if (error) throw error;
      
      setSuccessMessage('Password updated successfully!');
      toast.success('Password updated successfully! You can now sign in.');
      
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
        const { error } = await signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
              role: role
            }
          }
        });
        if (error) throw error;
        toast.success('Account created! Please check your email to confirm your account.');
        setError('Please check your email to confirm your account');
        return;
      } else {
        const { error } = await signIn({
          email,
          password,
        });
        if (error) throw error;
        toast.success('Successfully signed in!');
        navigate('/');
      }
    } catch (error) {
      setError(error.message);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'https://suadpllana.github.io/#/library',
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

  return (
    <div className="auth-container">
      <div className="auth-box">
        {/* Reset Password Form (when user clicks link from email) */}
        {isResetPassword ? (
          <>
            <h2>Reset Password</h2>
            {error && <div className="error-message">{error}</div>}
            {successMessage && <div className="success-message">{successMessage}</div>}
            <form onSubmit={handleResetPassword}>
              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  minLength={6}
                />
              </div>
              <div className="form-group">
                <label>Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  minLength={6}
                />
              </div>
              <button type="submit" disabled={loading}>
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </>
        ) : isForgotPassword ? (
          /* Forgot Password Form */
          <>
            <h2>Forgot Password</h2>
            {error && <div className="error-message">{error}</div>}
            {successMessage && <div className="success-message">{successMessage}</div>}
            <p className="forgot-password-description">
              Enter your email address and we'll send you a link to reset your password.
            </p>
            <form onSubmit={handleForgotPassword}>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>
              <button type="submit" disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
            <p>
              Remember your password?{' '}
              <button
                className="switch-auth"
                onClick={() => {
                  setIsForgotPassword(false);
                  setError(null);
                  setSuccessMessage(null);
                }}
              >
                Sign In
              </button>
            </p>
          </>
        ) : (
          /* Sign In / Sign Up Form */
          <>
            <h2>{isSignUp ? 'Sign Up' : 'Sign In'}</h2>
            {error && <div className="error-message">{error}</div>}
            <form onSubmit={handleAuth}>
              {isSignUp && (
                <>
                  <div className="form-group">
                    <label>First Name</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required={isSignUp}
                    />
                  </div>
                  <div className="form-group">
                    <label>Last Name</label>
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
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {!isSignUp && (
                <div className="forgot-password-link">
                  <button
                    type="button"
                    className="switch-auth"
                    onClick={() => {
                      setIsForgotPassword(true);
                      setError(null);
                    }}
                  >
                    Forgot Password?
                  </button>
                </div>
              )}
              <button type="submit" disabled={loading}>
                {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
              </button>
            </form>

            <div className="divider">
              <span>Or continue with</span>
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
              Sign in with Google
            </button>

            <p>
              {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
              <button
                className="switch-auth"
                onClick={() => setIsSignUp(!isSignUp)}
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default Auth;