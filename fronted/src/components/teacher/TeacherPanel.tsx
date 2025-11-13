import { useState, useEffect } from 'react';
import './TeacherPanel.css';
import QuestionManager from './QuestionManager';
import CodeChallenge from './CodeChallenge';
import apiService from '../../services/api';

interface UserData {
  id: number;
  profileImage: string;
  firstName: string;
  lastName: string;
  nickname: string;
  subject?: string;
  role?: string;
  email: string;
}

interface TeacherPanelProps {
  onLogout: () => void;
}

type TabType = 'questions' | 'codeChallenge' | 'codeBattle';

function TeacherPanel({ onLogout }: TeacherPanelProps) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('questions');
  
  // Import ChallengeGroupPage dynamically to avoid circular dependencies
  const [ChallengeGroupPage, setChallengeGroupPage] = useState<React.ComponentType | null>(null);
  
  useEffect(() => {
    // Dynamically import ChallengeGroupPage when needed
    if (activeTab === 'codeBattle' && !ChallengeGroupPage) {
      import('./ChallengeGroupPage').then(module => {
        setChallengeGroupPage(() => module.default);
      });
    }
  }, [activeTab, ChallengeGroupPage]);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      // LocalStorage'dan foydalanuvchi ma'lumotlarini olish
      const localData = localStorage.getItem('userData');
      if (localData) {
        setUserData(JSON.parse(localData));
      } else {
        // Agar localStorage'da ma'lumot bo'lmasa, API dan so'rov yuborish
        const user = await apiService.getCurrentUser();
        // Map API response to UserData
        const userData: UserData = {
          id: user.id,
          profileImage: user.profile?.avatar || '/default-avatar.png',
          firstName: user.first_name || '',
          lastName: user.last_name || '',
          nickname: user.username,
          subject: '', // subject maydoni mavjud emas, bo'sh qoldiramiz
          role: user.profile?.role,
          email: user.email
        };
        
        setUserData(userData);
        localStorage.setItem('userData', JSON.stringify(userData));
      }
    } catch (error) {
      console.error('Foydalanuvchi ma\'lumotlarini yuklashda xatolik:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiService.logout();
      localStorage.removeItem('userData');
      onLogout();
    } catch (error) {
      console.error('Chiqishda xatolik:', error);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <i className="fas fa-spinner"></i>
        Yuklanmoqda...
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="error-state">
        <i className="fas fa-exclamation-triangle"></i>
        <p>Foydalanuvchi ma'lumotlari topilmadi</p>
        <button onClick={loadUserData} className="retry-btn">
          Qayta urinish
        </button>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'codeBattle':
        return ChallengeGroupPage ? <ChallengeGroupPage /> : <div>Loading CodeBattle...</div>;
      case 'codeChallenge':
        return <CodeChallenge />;
      case 'questions':
      default:
        return <QuestionManager />;
    }
  };

  return (
    <div className="teacher-panel">
      <header className="navbar">
        <div className="navbar-brand">
          <h1>O'qituvchi paneli</h1>
        </div>
        <nav className="nav-links">
          <button 
            className={`nav-link ${activeTab === 'questions' ? 'active' : ''}`}
            onClick={() => setActiveTab('questions')}
          >
            Savollar
          </button>
          <button 
            className={`nav-link ${activeTab === 'codeChallenge' ? 'active' : ''}`}
            onClick={() => setActiveTab('codeChallenge')}
          >
            CodeTrain
          </button>
          <button 
            className={`nav-link ${activeTab === 'codeBattle' ? 'active' : ''}`}
            onClick={() => setActiveTab('codeBattle')}
          >
            CodeBattle
          </button>
          <button className="nav-button" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i> Chiqish
          </button>
        </nav>
        <div className="user-menu">
          <div 
            className="user-avatar"
          >
            <img 
              src={userData?.profileImage || '/default-avatar.png'} 
              alt={userData?.firstName || 'Foydalanuvchi'} 
            />
            <span>{userData?.firstName || 'Foydalanuvchi'}</span>
          </div>
        </div>
      </header>

      <main className="panel-content">
        {renderContent()}
      </main>
    </div>
  );
}

export default TeacherPanel;