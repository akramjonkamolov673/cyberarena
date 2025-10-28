nimport { useState } from 'react';
import './AccountSetup.css';
import apiService from '../services/api';

interface AccountSetupProps {
  userType: 'teacher' | 'student';
  onComplete: () => void;
}

function AccountSetup({ userType, onComplete }: AccountSetupProps) {
  const [profileImage, setProfileImage] = useState<string>('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState('');
  const [extraField, setExtraField] = useState(''); // Guruh nomi yoki Fan
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      // Profile ma'lumotlarini tayyorlash
      const profileData = {
        profile: {
          nickname,
          first_name: firstName,
          last_name: lastName,
          role: userType,
          subject: userType === 'teacher' ? extraField : undefined,
          // avatar: profileImage, // Keyinroq file upload qo'shamiz
        }
      };

      // Backend ga yuborish
      await apiService.updateUserProfile(profileData);
      
      // LocalStorage ga saqlash
      const userData = {
        profileImage,
        firstName,
        lastName,
        nickname,
        [userType === 'student' ? 'groupName' : 'subject']: extraField,
        userType,
        setupCompleted: true
      };
      localStorage.setItem('userData', JSON.stringify(userData));
      
      // Setup tugadi
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xatolik yuz berdi. Qaytadan urinib ko\'ring.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="setup-container">
      <div className="setup-card">
        <div className="setup-header">
          <h2>⚙️ ACCOUNT SOZLASH</h2>
          <p>Profilingizni to'ldiring</p>
        </div>

        <form onSubmit={handleSubmit} className="setup-form">
          <div className="profile-image-upload">
            <div className="image-preview">
              {profileImage ? (
                <img src={profileImage} alt="Profile" />
              ) : (
                <div className="placeholder">📷</div>
              )}
            </div>
            <label htmlFor="image-upload" className="upload-btn">
              Profil rasmi yuklash
            </label>
            <input
              type="file"
              id="image-upload"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
            />
          </div>

          <div className="form-group">
            <label htmlFor="firstName">Ism</label>
            <input
              type="text"
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Ismingizni kiriting"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="lastName">Familya</label>
            <input
              type="text"
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Familyangizni kiriting"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="nickname">Nickname</label>
            <input
              type="text"
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Nickname kiriting"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="extraField">
              {userType === 'student' ? 'Guruh nomi' : 'Qaysi fan'}
            </label>
            <input
              type="text"
              id="extraField"
              value={extraField}
              onChange={(e) => setExtraField(e.target.value)}
              placeholder={userType === 'student' ? 'Guruh nomini kiriting' : 'Fan nomini kiriting'}
              required
            />
          </div>

          {error && <div className="error-message" style={{color: 'red', marginTop: '10px', textAlign: 'center'}}>{error}</div>}

          <button type="submit" className="save-btn" disabled={isLoading}>
            {isLoading ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AccountSetup;
