import { useState, useEffect } from 'react'
import Login from './components/Login'
import StudentPanel from './components/student/StudentPanel'
import TeacherPanel from './components/teacher/TeacherPanel'
import './App.css'
import Signup from './components/Signup'
import apiService from './services/api'

type AppState = 'login' | 'signup' | 'student' | 'teacher';

function App() {
  const [appState, setAppState] = useState<AppState>('login');

  useEffect(() => {
    // Avtomatik login tekshirish va aktual rolni backenddan olish
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (isLoggedIn === 'true') {
      (async () => {
        try {
          const profile = await apiService.getUserProfile();
          const roleLower: 'teacher' | 'student' = (profile.profile.role === 'teacher') ? 'teacher' : 'student';
          // Store capitalized for UI, use lowercase internally for routing
          localStorage.setItem('userType', roleLower === 'teacher' ? 'Teacher' : 'Student');
          setAppState(roleLower);
        } catch {
          setAppState('login');
        }
      })();
    }
  }, []);

  const handleLogin = (type: 'teacher' | 'student') => {
    setAppState(type);
  };

  // setup flow removed

  const handleLogout = () => {
    localStorage.clear();
    setAppState('login');
  };

  return (
    <>
      {appState === 'login' && <Login onLogin={handleLogin} onSwitch={() => setAppState('signup')} />}
      {appState === 'signup' && <Signup onLogin={handleLogin} onSwitch={() => setAppState('login')} />}
      {appState === 'student' && <StudentPanel onLogout={handleLogout} />}
      {appState === 'teacher' && <TeacherPanel onLogout={handleLogout} />}
    </>
  )
}

export default App
