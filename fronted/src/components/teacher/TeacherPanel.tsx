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

type TabType = 'questions' | 'codeChallenge' | 'codeBattle' | 'reviews';

function TeacherPanel({ onLogout }: TeacherPanelProps) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('questions');
  
  // Import ChallengeGroupPage dynamically to avoid circular dependencies
  const [ChallengeGroupPage, setChallengeGroupPage] = useState<React.ComponentType | null>(null);
  const [ReviewPage, setReviewPage] = useState<React.ComponentType | null>(null);
  
  useEffect(() => {
    // Dynamically import components when needed
    if (activeTab === 'codeBattle' && !ChallengeGroupPage) {
      import('./ChallengeGroupPage').then(module => {
        setChallengeGroupPage(() => module.default);
      });
    } else if (activeTab === 'reviews' && !ReviewPage) {
      import('./review/Review').then(module => {
        setReviewPage(() => module.default);
      });
    }
  }, [activeTab, ChallengeGroupPage, ReviewPage]);

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

  const getTabButtonClasses = (tab: TabType) => {
    const base =
      'rounded-lg border px-4 py-2 text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2';
    const active =
      'bg-gradient-to-r from-blue-900 to-blue-600 text-white shadow-lg shadow-blue-900/30 border-blue-700';
    const inactive = 'text-slate-600 border-transparent hover:border-blue-200 hover:bg-blue-50';

    return `${base} ${activeTab === tab ? active : inactive}`;
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
      case 'reviews':
        return ReviewPage ? <ReviewPage /> : <div>Loading Javoblar...</div>;
      case 'questions':
      default:
        return <QuestionManager />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-50 border-b-4 border-blue-900 bg-white shadow-lg">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-blue-900 to-blue-600 text-2xl">
              👨‍🏫
            </div>
            <div>
              <p className="text-lg font-bold text-blue-900">O'qituvchi paneli</p>
              <p className="text-sm text-slate-500">Darslarni boshqarish va kuzatish</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <nav className="flex flex-wrap items-center gap-2">
              <button className={getTabButtonClasses('questions')} onClick={() => setActiveTab('questions')}>
                Savollar
              </button>
              <button className={getTabButtonClasses('codeChallenge')} onClick={() => setActiveTab('codeChallenge')}>
                CodeTrain
              </button>
              <button className={getTabButtonClasses('codeBattle')} onClick={() => setActiveTab('codeBattle')}>
                CodeBattle
              </button>
              <button className={getTabButtonClasses('reviews')} onClick={() => setActiveTab('reviews')}>
                Javoblar
              </button>
            </nav>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1">
                <img
                  className="h-10 w-10 rounded-full border border-white object-cover shadow-sm"
                  src={userData?.profileImage || '/default-avatar.png'}
                  alt={userData?.firstName || 'Foydalanuvchi'}
                />
                <span className="text-sm font-semibold text-blue-900">{userData?.firstName || 'Foydalanuvchi'}</span>
              </div>
              <button
                className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                onClick={handleLogout}
              >
                <i className="fas fa-sign-out-alt" /> Chiqish
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">{renderContent()}</main>
    </div>
  );
}

export default TeacherPanel;