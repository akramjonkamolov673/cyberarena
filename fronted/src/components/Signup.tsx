import { useEffect, useState } from 'react';
import apiService, { API_BASE_URL } from '../services/api';

interface SignupProps {
  onLogin: (userType: 'teacher' | 'student') => void;
  onSwitch?: () => void;
}

function Signup({ onLogin, onSwitch }: SignupProps) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [groupId, setGroupId] = useState<number | null>(null);
  const [groups, setGroups] = useState<Array<{ id: number; name: string }>>([]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadGroups = async () => {
      try {
        const gs = await apiService.getGroups();
        setGroups(gs);
      } catch (e) {
        // ignore, keep empty list
      }
    };
    loadGroups();
  }, []);

  const onAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setAvatarFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setAvatarPreview('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await apiService.registerForm({
        username,
        email,
        first_name: firstName,
        last_name: lastName,
        password,
        password2,
        group: groupId,
        avatarFile,
      });

      // fetch full profile and persist
      const profile = await apiService.getUserProfile();
      const roleLower: 'teacher' | 'student' = (profile.profile.role === 'teacher') ? 'teacher' : 'student';
      const roleDisplay = roleLower === 'teacher' ? 'Teacher' : 'Student';
      const avatarPath = profile.profile.avatar || '';
      const avatarUrl = avatarPath ? (avatarPath.startsWith('http') ? avatarPath : `${API_BASE_URL}${avatarPath}`) : '';
      localStorage.setItem('userType', roleDisplay);
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userData', JSON.stringify({
        username: profile.username,
        email: profile.email,
        firstName: profile.first_name,
        lastName: profile.last_name,
        groupId: profile.profile.group ?? null,
        profileImage: avatarUrl,
      }));

      onLogin(roleLower);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ro'yxatdan o'tishda xatolik");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h2>Ro'yxatdan o'tish</h2>
          <p>Hisob yaratish</p>
          {avatarPreview && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <img src={avatarPreview} alt="Avatar preview" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover' }} />
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>

          <div className="form-row" style={{ display: 'flex', gap: 8 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="firstName">Ism</label>
              <input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="lastName">Familya</label>
              <input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            </div>
          </div>

          <div className="form-row" style={{ display: 'flex', gap: 8 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="password">Parol</label>
              <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="password2">Parol (takror)</label>
              <input type="password" id="password2" value={password2} onChange={(e) => setPassword2(e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label>Guruh</label>
            <select value={groupId ?? ''} onChange={(e) => setGroupId(e.target.value ? Number(e.target.value) : null)}>
              <option value="">Tanlang</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Avatar</label>
            <input type="file" accept="image/*" onChange={onAvatarChange} />
          </div>

          {error && <div className="error-message" style={{ color: 'red', textAlign: 'center' }}>{error}</div>}

          <button type="submit" className="login-button" disabled={isLoading}>
            {isLoading ? "Ro'yxatdan o'tmoqda..." : "Ro'yxatdan o'tish"}
          </button>

          <div className="divider"><span>yoki</span></div>

          <div style={{ textAlign: 'center' }}>
            <button type="button" className="login-button" onClick={onSwitch}>Kirish</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Signup;
