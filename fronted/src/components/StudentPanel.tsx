import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import './StudentPanel.css';

interface UserData {
  profileImage?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  groupId?: number | null;
  groupName?: string | null;
}

interface StudentPanelProps {
  onLogout: () => void;
}

interface QuestionItem {
  id: string;
  title: string;
  description?: string;
  type?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  languages?: string[];
  test_cases?: Array<{ input: string; expected_output: string }>;
  content?: string;
  options?: string[];
  correctAnswer?: number;
  // backend uses snake_case for times
  start_time?: string | null;
  end_time?: string | null;
  // older frontend used camelCase — accept both
  startDate?: string | null;
  endDate?: string | null;
  // duration in minutes (legacy) or time_limit in seconds (challenge)
  duration?: number;
  time_limit?: number;
  max_score?: number;
  memory_limit?: number;
  is_private?: boolean;
  assigned_users?: number[];
  allowed_groups?: any[];
  autocheck?: boolean;
  created_by?: any;
  created_at?: string;
}

function StudentPanel({ onLogout }: StudentPanelProps) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [activeTab, setActiveTab] = useState<'announcements' | 'questions' | 'profile' | 'results' | 'myresults'>('announcements');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  // Will be used when implementing code submission interface
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedChallenge, setSelectedChallenge] = useState<QuestionItem | null>(null);
  
  const handleOpenChallenge = (challenge: QuestionItem) => {
    setSelectedChallenge(challenge);
  };

  useEffect(() => {
    const load = async () => {
      const data = localStorage.getItem('userData');
      let parsed: UserData | null = null;
      if (data) {
        parsed = JSON.parse(data);
        setUserData(parsed);
      }

      // Guruh nomini olish
      try {
      if (parsed && parsed.groupId) {
        const groups = await apiService.getGroups();
        const found = groups.find((g: { id: number }) => g.id === parsed!.groupId!);
          if (found) {
            const newData = { ...parsed, groupName: found.name } as UserData;
            setUserData(newData);
            localStorage.setItem('userData', JSON.stringify(newData));
          }
        }
      } catch {}

      // E'lonlarni yuklash
      const storedAnnouncements = localStorage.getItem('announcements');
      if (storedAnnouncements) {
        setAnnouncements(JSON.parse(storedAnnouncements));
      }

      // Natijalarni yuklash
      const storedResults = localStorage.getItem('results');
      if (storedResults) {
        setResults(JSON.parse(storedResults));
      }

      // Savollarni API'dan olish
      try {
        const qs = await apiService.getQuestions();
        if (Array.isArray(qs)) setQuestions(qs as QuestionItem[]);
      } catch (err) {
        // agar API mavjud bo'lmasa yoki xato bo'lsa, fallback hozircha yo'q
        console.warn('Savollarni yuklashda xatolik:', err);
      }
    };
    load();
  }, []);

  // helper: filter visible questions for this student
  const getVisibleQuestions = () => {
    if (!userData) return [] as QuestionItem[];
    const now = new Date();
    return questions.filter(q => {
      // No `isActive` field on CodingChallenge; rely on start/end time and API access control
      const start = q.startDate ? new Date(q.startDate) : null;
      const end = q.endDate ? new Date(q.endDate) : null;
      if (start && start > now) return false;
      if (end && end < now) return false;
      return true;
    });
  };

  const handleLogout = () => {
    localStorage.clear();
    onLogout();
  };

  const handleSettings = () => {
    setShowProfileMenu(false);
    alert('Sozlamalar sahifasi ishlab chiqilmoqda...');
  };

  if (!userData) {
    return (
      <div className="loading">
        <i className="fas fa-spinner"></i>
        Yuklanmoqda...
      </div>
    );
  }

  return (
    <div className="student-panel">
      {/* Font Awesome CDN */}
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      
      <nav className="navbar">
        <div className="navbar-brand">
          <h1>Talaba Paneli</h1>
        </div>
        
        <div className="navbar-menu">
          <button 
            className={`nav-btn ${activeTab === 'announcements' ? 'active' : ''}`}
            onClick={() => setActiveTab('announcements')}
          >
            <i className="fas fa-bullhorn"></i>
            <span>E'lonlar</span>
          </button>
          <button 
            className={`nav-btn ${activeTab === 'results' ? 'active' : ''}`}
            onClick={() => setActiveTab('results')}
          >
            <i className="fas fa-trophy"></i>
            <span>Natijalar</span>
          </button>
          <button 
            className={`nav-btn ${activeTab === 'questions' ? 'active' : ''}`}
            onClick={() => setActiveTab('questions')}
          >
            <i className="fas fa-question-circle"></i>
            <span>Savollar</span>
          </button>
          <button 
            className={`nav-btn ${activeTab === 'myresults' ? 'active' : ''}`}
            onClick={() => setActiveTab('myresults')}
          >
            <i className="fas fa-chart-bar"></i>
            <span>Mening natijalarim</span>
          </button>
          <button 
            className={`nav-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <i className="fas fa-user"></i>
            <span>Profil</span>
          </button>
          
          <div className="profile-dropdown">
            <button 
              className="profile-btn"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
            >
              {userData.profileImage ? (
                <img src={userData.profileImage} alt="Profile" />
              ) : (
                <div className="profile-placeholder">
                  <i className="fas fa-user"></i>
                </div>
              )}
            </button>
            
            {showProfileMenu && (
              <div className="dropdown-menu">
                <button onClick={handleSettings}>
                  <i className="fas fa-cog"></i>
                  <span>Sozlash</span>
                </button>
                <button onClick={handleLogout}>
                  <i className="fas fa-sign-out-alt"></i>
                  <span>Chiqish</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="panel-content">
        {activeTab === 'profile' && (
          <div className="profile-section">
            <div className="profile-card">
              <div className="profile-image-large">
                {userData.profileImage ? (
                  <img src={userData.profileImage} alt="Profile" />
                ) : (
                  <div className="profile-placeholder-large">
                    <i className="fas fa-user-graduate"></i>
                  </div>
                )}
              </div>
              <h2>{userData.firstName || ''} {userData.lastName || ''}</h2>
              <p className="nickname">@{userData.username || ''}</p>
              <p className="group-info">
                <i className="fas fa-users"></i>
                <span>Guruh: {userData.groupName || '—'}</span>
              </p>
            </div>
          </div>
        )}

        {activeTab === 'announcements' && (
          <div className="announcements-section">
            <div className="section-header">
              <h2>
                <i className="fas fa-bullhorn"></i>
                E'lonlar
              </h2>
              <a href="#" className="view-all" onClick={(e) => e.preventDefault()}>
                Barchasini ko'rish
                <i className="fas fa-chevron-right"></i>
              </a>
            </div>
            {announcements.length === 0 ? (
              <div className="empty-state">
                <i className="fas fa-bullhorn"></i>
                <p>Hozircha e'lonlar yo'q</p>
              </div>
            ) : (
              <div className="announcements-list">
                {announcements.map((announcement, index) => (
                  <div key={index} className="announcement-card">
                    <h3>
                      <i className="fas fa-bullhorn"></i>
                      <span>{announcement.title}</span>
                    </h3>
                    <p>{announcement.content}</p>
                    <span className="date">
                      <i className="fas fa-clock"></i>
                      <span>{announcement.date}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'questions' && (
          <div className="questions-section">
            <div className="section-header">
              <h2>
                <i className="fas fa-question-circle"></i>
                {selectedChallenge ? 'Tanlangan masala' : 'Savollar'}
              </h2>
              {selectedChallenge ? (
                <button 
                  className="view-all" 
                  onClick={() => setSelectedChallenge(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <i className="fas fa-arrow-left"></i>
                  Masalalar ro'yxatiga qaytish
                </button>
              ) : (
                <a href="#" className="view-all" onClick={(e) => e.preventDefault()}>
                  Barchasini ko'rish
                  <i className="fas fa-chevron-right"></i>
                </a>
              )}
            </div>
            {(() => {
              if (selectedChallenge) {
                return (
                  <div className="selected-challenge">
                    <div className="challenge-card">
                      <h3>
                        <i className="fas fa-code"></i>
                        <span>{selectedChallenge.title}</span>
                      </h3>
                      {selectedChallenge.description && (
                        <div className="challenge-description">
                          <h4>Masala sharti:</h4>
                          <p>{selectedChallenge.description}</p>
                        </div>
                      )}
                      <div className="challenge-details">
                        <div className="detail-item">
                          <i className="fas fa-clock"></i>
                          <span>Vaqt limiti: {selectedChallenge.time_limit ? `${Math.ceil((selectedChallenge.time_limit) / 60)} daqiqa` : '—'}</span>
                        </div>
                        <div className="detail-item">
                          <i className="fas fa-memory"></i>
                          <span>Xotira limiti: {selectedChallenge.memory_limit ? `${selectedChallenge.memory_limit}MB` : '—'}</span>
                        </div>
                        <div className="detail-item">
                          <i className="fas fa-trophy"></i>
                          <span>Maksimal ball: {selectedChallenge.max_score || '—'}</span>
                        </div>
                        {selectedChallenge.languages && selectedChallenge.languages.length > 0 && (
                          <div className="detail-item">
                            <i className="fas fa-laptop-code"></i>
                            <span>Dasturlash tillari: {selectedChallenge.languages.join(', ')}</span>
                          </div>
                        )}
                      </div>
                      <div className="code-editor-placeholder">
                        <i className="fas fa-code"></i>
                        <p>Kod yozish interfeysi ishlab chiqilmoqda...</p>
                        <button className="submit-btn" onClick={() => setSelectedChallenge(null)}>
                          <i className="fas fa-arrow-left"></i>
                          Orqaga qaytish
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              const visible = getVisibleQuestions();
              if (visible.length === 0) {
                return (
                  <div className="empty-state">
                    <i className="fas fa-question-circle"></i>
                    <p>Hozircha mavjud savollar yo'q</p>
                  </div>
                );
              }

              return (
                <div className="questions-list">
                  {visible.map((q) => (
                    <div key={q.id} className="challenge-card">
                      <h3>
                        <i className="fas fa-code"></i>
                        <span>{q.title}</span>
                      </h3>
                      {q.description && <p>{q.description}</p>}
                      <div className="challenge-details">
                        <div className="detail-item">
                          <i className="fas fa-clock"></i>
                          <span>Vaqt: {q.time_limit ? `${Math.ceil((q.time_limit) / 60)} daqiqa` : '—'}</span>
                        </div>
                        <div className="detail-item">
                          <i className="fas fa-memory"></i>
                          <span>Xotira: {q.memory_limit ? `${q.memory_limit}MB` : '—'}</span>
                        </div>
                        <div className="detail-item">
                          <i className="fas fa-trophy"></i>
                          <span>Ball: {q.max_score || '—'}</span>
                        </div>
                        {q.languages && q.languages.length > 0 && (
                          <div className="detail-item">
                            <i className="fas fa-laptop-code"></i>
                            <span>Tillar: {q.languages.join(', ')}</span>
                          </div>
                        )}
                      </div>
                      <div className="challenge-footer">
                        <div className="date-range">
                          <i className="fas fa-calendar-alt"></i>
                          <span>
                            {(() => {
                              const s = q.startDate || q.start_time;
                              const e = q.endDate || q.end_time;
                              return `${s ? new Date(s).toLocaleString('uz-UZ') : '—'} — ${e ? new Date(e).toLocaleString('uz-UZ') : '—'}`;
                            })()}
                          </span>
                        </div>
                        <button className="submit-btn" onClick={() => handleOpenChallenge(q)}>
                          <i className="fas fa-play"></i>
                          Yechimni topshirish
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {activeTab === 'results' && (
          <div className="results-section">
            <div className="section-header">
              <h2>
                <i className="fas fa-trophy"></i>
                Natijalar (Reyting)
              </h2>
              <a href="#" className="view-all" onClick={(e) => e.preventDefault()}>
                Barchasini ko'rish
                <i className="fas fa-chevron-right"></i>
              </a>
            </div>
            {results.length === 0 ? (
              <div className="empty-state">
                <i className="fas fa-trophy"></i>
                <p>Hozircha natijalar yo'q</p>
              </div>
            ) : (
              <div className="results-table">
                <table>
                  <thead>
                    <tr>
                      <th>O'rin</th>
                      <th>Ism</th>
                      <th>Guruh</th>
                      <th>Ball</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((result, index) => (
                      <tr key={index}>
                        <td className="rank">#{index + 1}</td>
                        <td>{result.name}</td>
                        <td>{result.group}</td>
                        <td className="score">{result.score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'myresults' && (
          <div className="my-results-section">
            <div className="section-header">
              <h2>
                <i className="fas fa-chart-bar"></i>
                Mening natijalarim
              </h2>
              <a href="#" className="view-all" onClick={(e) => e.preventDefault()}>
                Batafsil
                <i className="fas fa-chevron-right"></i>
              </a>
            </div>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">
                  <i className="fas fa-file-alt"></i>
                </div>
                <div className="stat-info">
                  <h3>0</h3>
                  <p>Topshirgan testlar</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">
                  <i className="fas fa-check-circle"></i>
                </div>
                <div className="stat-info">
                  <h3>0</h3>
                  <p>To'g'ri javoblar</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">
                  <i className="fas fa-star"></i>
                </div>
                <div className="stat-info">
                  <h3>0</h3>
                  <p>Umumiy ball</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">
                  <i className="fas fa-chart-line"></i>
                </div>
                <div className="stat-info">
                  <h3>0%</h3>
                  <p>O'rtacha natija</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default StudentPanel;