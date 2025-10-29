import { useState, useEffect } from 'react';
import './TeacherPanel.css';
import QuestionManager from './QuestionManager';
import CodeChallengeManager from './CodeChallengeManager';
import apiService from '../services/api';

interface UserData {
  id: number;
  profileImage: string;
  firstName: string;
  lastName: string;
  nickname: string;
  subject: string;
  role?: string;
  email: string;
}

interface Announcement {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  authorId: number;
}

interface Statistics {
  totalQuestions: number;
  totalStudents: number;
  submittedTests: number;
  averageScore: number;
}

interface TeacherPanelProps {
  onLogout: () => void;
}

function TeacherPanel({ onLogout }: TeacherPanelProps) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [activeTab, setActiveTab] = useState<'answers' | 'announcements' | 'statistics' | 'results' | 'questions' | 'codechallenges'>('answers');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();
    loadStatistics();
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
        setUserData(user);
        localStorage.setItem('userData', JSON.stringify(user));
      }
    } catch (error) {
      console.error('Foydalanuvchi ma\'lumotlarini yuklashda xatolik:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const stats = await apiService.getTeacherStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Statistika ma\'lumotlarini yuklashda xatolik:', error);
      // Default qiymatlar
      setStatistics({
        totalQuestions: 0,
        totalStudents: 0,
        submittedTests: 0,
        averageScore: 0
      });
    }
  };

  const handleLogout = async () => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Chiqishda xatolik:', error);
    } finally {
      localStorage.clear();
      onLogout();
    }
  };

  const handleSettings = () => {
    setShowProfileMenu(false);
    alert('Sozlamalar sahifasi ishlab chiqilmoqda...');
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

  return (
    <div className="teacher-panel">
      {/* Font Awesome CDN */}
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      
      <nav className="navbar">
        <div className="navbar-brand">
          <h1>O'qituvchi Paneli</h1>
          <span className="user-subject">{userData.subject}</span>
        </div>
        
        <div className="navbar-menu">
          <button 
            className={`nav-btn ${activeTab === 'answers' ? 'active' : ''}`}
            onClick={() => setActiveTab('answers')}
          >
            <i className="fas fa-inbox"></i>
            <span>Kelgan javoblar</span>
          </button>
          <button 
            className={`nav-btn ${activeTab === 'announcements' ? 'active' : ''}`}
            onClick={() => setActiveTab('announcements')}
          >
            <i className="fas fa-bullhorn"></i>
            <span>E'lonlar</span>
          </button>
          <button 
            className={`nav-btn ${activeTab === 'statistics' ? 'active' : ''}`}
            onClick={() => setActiveTab('statistics')}
          >
            <i className="fas fa-chart-bar"></i>
            <span>Statistika</span>
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
          {/* Code Challenges tab - teacher only */}
          {userData.role === 'teacher' && (
            <button 
              className={`nav-btn ${activeTab === 'codechallenges' ? 'active' : ''}`}
              onClick={() => setActiveTab('codechallenges')}
              style={{ display: 'flex' }}
            >
              <i className="fas fa-terminal"></i>
              <span>Kod savollar</span>
            </button>
          )}
          
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
                <div className="user-info">
                  <strong>{userData.firstName} {userData.lastName}</strong>
                  <span>@{userData.nickname}</span>
                </div>
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
        {activeTab === 'answers' && (
          <AnswersSection />
        )}

        {activeTab === 'announcements' && (
          <AnnouncementsManager />
        )}

        {activeTab === 'statistics' && (
          <StatisticsSection statistics={statistics} />
        )}

        {activeTab === 'results' && (
          <ResultsSection />
        )}

        {activeTab === 'questions' && (
          <QuestionManager />
        )}

        {activeTab === 'codechallenges' && (
          // show code-only manager; only usable by teachers (server enforces permissions)
          <CodeChallengeManager />
        )}
      </div>
    </div>
  );
}

// Kelgan javoblar bo'limi
function AnswersSection() {
  const [answers, setAnswers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState<number | null>(null);
  const [score, setScore] = useState<number>(0);

  useEffect(() => {
    loadAnswers();
  }, []);

  const loadAnswers = async () => {
    try {
      setLoading(true);
      const response = await apiService.getSubmissions();
      setAnswers(response);
    } catch (error) {
      console.error('Javoblarni yuklashda xatolik:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluate = async (answerId: string) => {
    if (!score) return;
    
    try {
      const evaluationData = {
        score,
        status: score === 100 ? 'accepted' : score > 0 ? 'partially_accepted' : 'rejected',
        feedback: '', // TODO: Feedback qo'shish imkoniyatini yaratish
        // Test javoblari uchun
        checkedTestCases: [] // TODO: Test natijalarini tekshirish imkoniyatini yaratish
      };

      await apiService.evaluateSubmission(answerId, evaluationData);
      setEvaluating(null);
      setScore(0);
      loadAnswers(); // Yangilangan ro'yxatni yuklash

      // Muvaffaqiyatli xabar
      const toast = document.createElement('div');
      toast.className = 'toast success';
      toast.textContent = 'Javob muvaffaqiyatli baholandi';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    } catch (error) {
      console.error('Baholashda xatolik:', error);
      alert('Baholashda xatolik yuz berdi');
    }
  };

  if (loading) {
    return (
      <div className="answers-section">
        <div className="section-header">
          <h2>
            <i className="fas fa-inbox"></i>
            Kelgan javoblar
          </h2>
        </div>
        <div className="loading-state">
          <i className="fas fa-spinner"></i>
          <p>Javoblar yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="answers-section">
      <div className="section-header">
        <h2>
          <i className="fas fa-inbox"></i>
          Kelgan javoblar
        </h2>
        <button className="refresh-btn" onClick={loadAnswers}>
          <i className="fas fa-sync-alt"></i>
          Yangilash
        </button>
      </div>
      
      {answers.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-inbox"></i>
          <p>Hozircha javoblar yo'q</p>
        </div>
      ) : (
        <div className="answers-list">
          {answers.map((answer) => (
            <div key={answer.id} className="answer-card">
              <div className="answer-header">
                <h3>{answer.studentName}</h3>
                <span className="question-title">{answer.questionTitle}</span>
                <span className="answer-type">
                  <i className={`fas ${
                    answer.type === 'test' ? 'fa-check-circle' : 
                    answer.type === 'code' ? 'fa-code' : 'fa-file-alt'
                  }`}></i>
                  {answer.type === 'test' ? 'Test' : 
                   answer.type === 'code' ? 'Kod' : 'Matn'}
                </span>
              </div>
              <div className="answer-content">
                {answer.type === 'test' ? (
                  <div className="test-answer">
                    <p>Tanlangan javob: {answer.selectedOption + 1}-variant</p>
                    {answer.options && (
                      <div className="options-list">
                        {answer.options.map((option: string, index: number) => (
                          <div 
                            key={index} 
                            className={`option ${index === answer.selectedOption ? 'selected' : ''} ${index === answer.correctOption ? 'correct' : ''}`}
                          >
                            <span className="option-number">{index + 1}</span>
                            <span className="option-text">{option}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={answer.type === 'code' ? 'code-answer' : 'text-answer'}>
                    <pre><code>{answer.answer}</code></pre>
                  </div>
                )}
              </div>
              <div className="answer-footer">
                <div className="answer-info">
                  <span className="date">
                    <i className="fas fa-clock"></i>
                    {new Date(answer.submittedAt).toLocaleString('uz-UZ')}
                  </span>
                  {answer.timeSpent && (
                    <span className="time-spent">
                      <i className="fas fa-hourglass-end"></i>
                      {Math.floor(answer.timeSpent / 60)}:{(answer.timeSpent % 60).toString().padStart(2, '0')}
                    </span>
                  )}
                </div>
                <div className="answer-actions">
                  {evaluating === answer.id ? (
                    <div className="evaluation-form">
                      <input
                        type="number"
                        min="0"
                        max={answer.maxScore || 100}
                        value={score}
                        onChange={(e) => setScore(Number(e.target.value))}
                        placeholder="Ball"
                      />
                      <button 
                        className="save-score-btn"
                        onClick={() => handleEvaluate(answer.id)}
                        disabled={!score}
                      >
                        <i className="fas fa-save"></i>
                        Saqlash
                      </button>
                      <button 
                        className="cancel-btn"
                        onClick={() => {
                          setEvaluating(null);
                          setScore(0);
                        }}
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  ) : (
                    answer.score ? (
                      <span className="score-badge">
                        <i className="fas fa-star"></i>
                        {answer.score} ball
                      </span>
                    ) : (
                      <button 
                        className="evaluate-btn"
                        onClick={() => setEvaluating(answer.id)}
                      >
                        <i className="fas fa-check"></i>
                        Baholash
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Statistika bo'limi
function StatisticsSection({ statistics }: { statistics: Statistics | null }) {
  if (!statistics) {
    return (
      <div className="statistics-section">
        <div className="section-header">
          <h2>
            <i className="fas fa-chart-bar"></i>
            Statistika
          </h2>
        </div>
        <div className="loading-state">
          <i className="fas fa-spinner"></i>
          <p>Statistika yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="statistics-section">
      <h2>
        <i className="fas fa-chart-bar"></i>
        Statistika
      </h2>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-file-alt"></i>
          </div>
          <div className="stat-info">
            <h3>{statistics.totalQuestions}</h3>
            <p>Jami savollar</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-users"></i>
          </div>
          <div className="stat-info">
            <h3>{statistics.totalStudents}</h3>
            <p>Talabalar soni</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-check-circle"></i>
          </div>
          <div className="stat-info">
            <h3>{statistics.submittedTests}</h3>
            <p>Topshirilgan testlar</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-percentage"></i>
          </div>
          <div className="stat-info">
            <h3>{statistics.averageScore}%</h3>
            <p>O'rtacha natija</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Natijalar bo'limi
function ResultsSection() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    try {
      setLoading(true);
      const response = await apiService.getResults();
      setResults(response);
    } catch (error) {
      console.error('Natijalarni yuklashda xatolik:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="results-section">
        <div className="section-header">
          <h2>
            <i className="fas fa-trophy"></i>
            Natijalar
          </h2>
        </div>
        <div className="loading-state">
          <i className="fas fa-spinner"></i>
          <p>Natijalar yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="results-section">
      <div className="section-header">
        <h2>
          <i className="fas fa-trophy"></i>
          Natijalar
        </h2>
        <button className="refresh-btn" onClick={loadResults}>
          <i className="fas fa-sync-alt"></i>
          Yangilash
        </button>
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
                <th>Talaba</th>
                <th>Test</th>
                <th>Ball</th>
                <th>Foiz</th>
                <th>Sana</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result) => (
                <tr key={result.id}>
                  <td>{result.studentName}</td>
                  <td>{result.testTitle}</td>
                  <td className="score">{result.score}/{result.maxScore}</td>
                  <td className="percentage">{result.percentage}%</td>
                  <td>{new Date(result.completedAt).toLocaleDateString('uz-UZ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// E'lonlar boshqaruvi
function AnnouncementsManager() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await apiService.getAnnouncements();
      setAnnouncements(response);
    } catch (error) {
      console.error('E\'lonlarni yuklashda xatolik:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      const newAnnouncement = await apiService.createAnnouncement({
        title,
        content
      });
      
      setAnnouncements(prev => [newAnnouncement, ...prev]);
      setTitle('');
      setContent('');
      setShowForm(false);
    } catch (error) {
      console.error('E\'lon yaratishda xatolik:', error);
      alert('E\'lon yaratishda xatolik yuz berdi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Bu e\'lonni o\'chirishni istaysizmi?')) {
      return;
    }

    try {
      await apiService.deleteAnnouncement(id);
      setAnnouncements(prev => prev.filter(announcement => announcement.id !== id));
    } catch (error) {
      console.error('E\'lonni o\'chirishda xatolik:', error);
      alert('E\'lonni o\'chirishda xatolik yuz berdi');
    }
  };

  if (loading) {
    return (
      <div className="announcements-manager">
        <div className="section-header">
          <h2>
            <i className="fas fa-bullhorn"></i>
            E'lonlar
          </h2>
        </div>
        <div className="loading-state">
          <i className="fas fa-spinner"></i>
          <p>E'lonlar yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="announcements-manager">
      <div className="section-header">
        <h2>
          <i className="fas fa-bullhorn"></i>
          E'lonlar
        </h2>
        <div className="section-actions">
          <button className="refresh-btn" onClick={loadAnnouncements}>
            <i className="fas fa-sync-alt"></i>
            Yangilash
          </button>
          <button 
            className="add-btn" 
            onClick={() => setShowForm(!showForm)}
            type="button"
          >
            <i className={`fas ${showForm ? 'fa-times' : 'fa-plus'}`}></i>
            {showForm ? 'Bekor qilish' : 'E\'lon qo\'shish'}
          </button>
        </div>
      </div>

      {showForm && (
        <form className="announcement-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>
              <i className="fas fa-heading"></i>
              E'lon sarlavhasi
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Sarlavhani kiriting"
              required
              disabled={submitting}
            />
          </div>
          <div className="form-group">
            <label>
              <i className="fas fa-file-text"></i>
              E'lon matni
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="E'lon matnini kiriting"
              rows={4}
              required
              disabled={submitting}
            />
          </div>
          <button type="submit" className="submit-btn" disabled={submitting}>
            <i className="fas fa-paper-plane"></i>
            {submitting ? 'Joylanmoqda...' : 'E\'lonni joylashtirish'}
          </button>
        </form>
      )}

      <div className="announcements-list">
        {announcements.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-bullhorn"></i>
            <p>Hozircha e'lonlar yo'q</p>
          </div>
        ) : (
          announcements.map((announcement) => (
            <div key={announcement.id} className="announcement-card">
              <div className="announcement-header">
                <h3>
                  <i className="fas fa-bullhorn"></i>
                  {announcement.title}
                </h3>
                <button 
                  className="delete-btn" 
                  onClick={() => handleDelete(announcement.id)}
                  type="button"
                >
                  <i className="fas fa-trash"></i>
                </button>
              </div>
              <p>{announcement.content}</p>
              <span className="date">
                <i className="fas fa-clock"></i>
                {new Date(announcement.createdAt).toLocaleString('uz-UZ')}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default TeacherPanel;