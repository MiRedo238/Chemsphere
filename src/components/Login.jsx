import React, { useState, useEffect } from 'react';
import { LogIn, Eye, EyeOff, Beaker } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const { loginWithGoogle, loginWithCredentials, error, clearError, user } = useAuth();
  const [loginMethod, setLoginMethod] = useState('google');
  const [showPassword, setShowPassword] = useState(false);
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });
  const [loginLoading, setLoginLoading] = useState(false);
  const navigate = useNavigate();

  // Redirect if user is already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleCredentialLogin = async (e) => {
    e.preventDefault();
    
    if (!credentials.email || !credentials.password) {
      return;
    }

    setLoginLoading(true);
    clearError();

    try {
      const result = await loginWithCredentials(credentials.email, credentials.password);
      if (result?.success) {
        console.log('✅ Login successful, navigating to dashboard...');
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      console.error('Login failed:', err);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoginLoading(true);
    clearError();
    
    try {
      const result = await loginWithGoogle();
      if (result?.user) {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      console.error('Google login failed:', err);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleMethodChange = (method) => {
    setLoginMethod(method);
    clearError();
    setCredentials({ email: '', password: '' });
  };

  // If user exists, show loading while redirecting
  if (user) {
    return (
      <div className="login-container">
        <div className="login-loading">
          <div className="spinner"></div>
          <p>Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo">
            <Beaker className="logo-icon" />
            <h1>ChemSphere</h1>
          </div>
          <h2>Welcome Back</h2>
          <p>Sign in to manage your laboratory inventory</p>
        </div>

        <div className="login-method-tabs">
          <button
            type="button"
            onClick={() => handleMethodChange('google')}
            className={`tab-button ${loginMethod === 'google' ? 'active' : ''}`}
          >
            Google Login
          </button>
          <button
            type="button"
            onClick={() => handleMethodChange('credentials')}
            className={`tab-button ${loginMethod === 'credentials' ? 'active' : ''}`}
          >
            Email & Password
          </button>
        </div>

        {error && (
          <div className="error-message">
            <p>{error}</p>
          </div>
        )}

        {loginLoading ? (
          <div className="login-loading">
            <div className="spinner"></div>
            <p>Signing in...</p>
          </div>
        ) : loginMethod === 'google' ? (
          <div className="google-login-section">
            <button
              onClick={handleGoogleLogin}
              className="google-login-button"
              disabled={loginLoading}
            >
              <svg className="google-icon" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Sign in with Google
            </button>
          </div>
        ) : (
          <form onSubmit={handleCredentialLogin} className="credentials-form">
            <div className="input-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={credentials.email}
                onChange={handleInputChange}
                placeholder="Enter your email"
                className="login-input"
              />
            </div>

            <div className="input-group">
              <label htmlFor="password">Password</label>
              <div className="password-input-container">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={credentials.password}
                  onChange={handleInputChange}
                  placeholder="Enter your password"
                  className="login-input password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading || !credentials.email || !credentials.password}
              className="login-button"
            >
              <LogIn size={18} />
              Sign In
            </button>
          </form>
        )}

        <div className="login-footer">
          <p>Don't have an account? <a href="/signup" className="footer-link">Contact administrator</a></p>
        </div>
      </div>
    </div>
  );
};

export default Login;