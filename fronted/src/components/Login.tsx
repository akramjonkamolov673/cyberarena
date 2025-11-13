import { useEffect, useState } from 'react';
import './Login.css';
import logoImage from '../logo/logo.png';
import apiService, { API_BASE_URL } from '../services/api';

interface LoginProps {
  onLogin: (userType: 'teacher' | 'student') => void;
  onSwitch?: () => void;
}

function Login({ onLogin, onSwitch }: LoginProps) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID as string | undefined;
  const GITHUB_REDIRECT_URI = (import.meta.env.VITE_GITHUB_REDIRECT_URI as string | undefined) || `${window.location.origin}/`;

  const loadGoogleScript = () => {
    return new Promise<void>((resolve, reject) => {
      if (document.getElementById('google-accounts-sdk')) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.id = 'google-accounts-sdk';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Google skriptini yuklab bo\'lmadi'));
      document.head.appendChild(script);
    });
  };

  const handleGithubLogin = async () => {
    setError('');
    if (!GITHUB_CLIENT_ID) {
      setError('GitHub Client ID topilmadi. VITE_GITHUB_CLIENT_ID ni .env faylida sozlang.');
      return;
    }
    const params = new URLSearchParams({
      client_id: GITHUB_CLIENT_ID,
      redirect_uri: GITHUB_REDIRECT_URI,
      scope: 'read:user user:email',
      allow_signup: 'true',
    });
    window.location.href = `https://github.com/login/oauth/authorize?${params.toString()}`;
  };

  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    if (!code) return;
    const run = async () => {
      try {
        setIsLoading(true);
        await apiService.githubAuth(code);
        const userProfile = await apiService.getUserProfile();
        const roleLower: 'teacher' | 'student' = (userProfile.profile.role === 'teacher') ? 'teacher' : 'student';
        const roleDisplay = roleLower === 'teacher' ? 'Teacher' : 'Student';
        const avatarPath = userProfile.profile.avatar || '';
        const avatarUrl = avatarPath ? (avatarPath.startsWith('http') ? avatarPath : `${API_BASE_URL}${avatarPath}`) : '';
        localStorage.setItem('userType', roleDisplay);
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userData', JSON.stringify({
          username: userProfile.username,
          email: userProfile.email,
          firstName: userProfile.first_name,
          lastName: userProfile.last_name,
          groupId: userProfile.profile.group ?? null,
          profileImage: avatarUrl,
        }));
        url.searchParams.delete('code');
        window.history.replaceState({}, document.title, url.toString());
        onLogin(roleLower);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'GitHub orqali kirishda xatolik');
      } finally {
        setIsLoading(false);
      }
    };
    run();
  }, []);

  const handleGoogleLogin = async () => {
    setError('');
    if (!GOOGLE_CLIENT_ID) {
      setError('Google Client ID topilmadi. VITE_GOOGLE_CLIENT_ID ni .env faylida sozlang.');
      return;
    }

    try {
      setIsLoading(true);
      await loadGoogleScript();

      await new Promise<void>((resolve) => {
        const checkGoogle = () => {
          if (window.google && window.google.accounts) {
            resolve();
          } else {
            setTimeout(checkGoogle, 100);
          }
        };
        checkGoogle();
      });

      const tokenResponse = await new Promise<{ access_token: string }>((resolve, reject) => {
        try {
          const client = window.google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: 'openid email profile',
            callback: (response: any) => {
              if (response && response.access_token) {
                resolve({ access_token: response.access_token });
              } else {
                reject(new Error('Google access token olinmadi'));
              }
            },
            error_callback: (error: any) => {
              reject(new Error('Google autentifikatsiyada xatolik yuz berdi'));
            }
          });
          client.requestAccessToken();
        } catch (err) {
          reject(err);
        }
      });

      const authResponse = await apiService.googleAuth(tokenResponse.access_token);
      
      if (!authResponse || !authResponse.token) {
        throw new Error('Serverdan noto\'g\'ri javob qaytardi');
      }

      apiService.setAuthToken(authResponse.token);
      localStorage.setItem('token', authResponse.token);
      localStorage.setItem('isLoggedIn', 'true');

      const userProfile = await apiService.getUserProfile();
      const roleLower: 'teacher' | 'student' = (userProfile.profile.role === 'teacher') ? 'teacher' : 'student';
      const roleDisplay = roleLower === 'teacher' ? 'Teacher' : 'Student';
      const avatarPath = userProfile.profile.avatar || '';
      const avatarUrl = avatarPath ? (avatarPath.startsWith('http') ? avatarPath : `${API_BASE_URL}${avatarPath}`) : '';

      localStorage.setItem('userType', roleDisplay);
      localStorage.setItem('userData', JSON.stringify({
        username: userProfile.username,
        email: userProfile.email,
        firstName: userProfile.first_name,
        lastName: userProfile.last_name,
        groupId: userProfile.profile.group ?? null,
        profileImage: avatarUrl,
      }));

      onLogin(roleLower);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google orqali kirishda xatolik');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      // Backend ga login so'rovi yuborish
      await apiService.login({
        username: login,
        password: password,
      });

      // Foydalanuvchi profilini olish
      const userProfile = await apiService.getUserProfile();
      
      // User type ni aniqlash (profile dan)
      const roleLower: 'teacher' | 'student' = (userProfile.profile.role === 'teacher') ? 'teacher' : 'student';
      const roleDisplay = roleLower === 'teacher' ? 'Teacher' : 'Student';
      
      // LocalStorage ga saqlash
      const avatarPath = userProfile.profile.avatar || '';
      const avatarUrl = avatarPath ? (avatarPath.startsWith('http') ? avatarPath : `${API_BASE_URL}${avatarPath}`) : '';
      localStorage.setItem('userType', roleDisplay);
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userData', JSON.stringify({
        username: userProfile.username,
        email: userProfile.email,
        firstName: userProfile.first_name,
        lastName: userProfile.last_name,
        groupId: userProfile.profile.group ?? null,
        profileImage: avatarUrl,
      }));

      // Login muvaffaqiyatli
      onLogin(roleLower);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login yoki parol noto\'g\'ri!');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo-circle">
            <img src={logoImage} alt="Cyber Arena Logo" />
          </div>
          <h2>Cyber Arena</h2>
          <p>Tizimga kirish</p>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="login">Login yoki Email</label>
            <input
              type="text"
              id="login"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="Login yoki email kiriting"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Parol</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Parolni kiriting (1234)"
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="login-button" disabled={isLoading}>
            {isLoading ? 'Kirish...' : 'Kirish'}
          </button>

          <div className="divider">
            <span>yoki</span>
          </div>

          <div className="social-login">
            <button type="button" className="social-btn google-btn" onClick={handleGoogleLogin} disabled={isLoading}>
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google bilan kirish
            </button>
            <button type="button" className="social-btn github-btn" onClick={handleGithubLogin} disabled={isLoading}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              GitHub bilan kirish
            </button>
          </div>

          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <button type="button" className="login-button" onClick={onSwitch}>
              Ro'yxatdan o'tish
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;
