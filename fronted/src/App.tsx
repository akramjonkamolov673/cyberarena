import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login'
import StudentPanel from './components/student/StudentPanel'
import TeacherPanel from './components/teacher/TeacherPanel'
import TestInterface from './components/student/TestInterface';
import CodeTrainList from "./components/student/codetrain/CodeTrainList";
import CodeTrainProblem from "./components/student/codetrain/CodeTrainProblem";
import QuestionsList from "./components/student/QuestionsList";
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
    // Update the app state and force a re-render
    setAppState(type);
    
    // Store the user type in localStorage for persistence
    localStorage.setItem('userType', type === 'teacher' ? 'Teacher' : 'Student');
    
    // Force a page reload to ensure all components re-initialize with the new auth state
    window.location.href = '/';
  };

  // setup flow removed

  const handleLogout = () => {
    localStorage.clear();
    setAppState('login');
  };

  return (
    <Router>
      <Routes>
        {/* Auth Routes */}
        <Route path="/login" element={
          <Login onLogin={handleLogin} onSwitch={() => setAppState('signup')} />
        } />
        
        <Route path="/signup" element={
          <Signup onLogin={handleLogin} onSwitch={() => setAppState('login')} />
        } />
        
        {/* Student Routes */}
        <Route path="/student" element={
          appState === 'student' ? 
            <StudentPanel onLogout={handleLogout} /> : 
            <Login onLogin={handleLogin} onSwitch={() => setAppState('signup')} />
        }>
          <Route index element={<QuestionsList />} />
          <Route path="test/:testId" element={<TestInterface onLogout={handleLogout} />} />
          <Route path="codetrain" element={<CodeTrainList />} />
          <Route path="codetrain/:id" element={<CodeTrainProblem />} />
        </Route>

        {/* Teacher Routes */}
        <Route path="/teacher/*" element={
          appState === 'teacher' ? 
            <TeacherPanel onLogout={handleLogout} /> : 
            <Login onLogin={handleLogin} onSwitch={() => setAppState('signup')} />
        } />
        
        {/* Root Route - Redirect based on auth state */}
        <Route path="/" element={
          appState === 'login' ? 
            <Login onLogin={handleLogin} onSwitch={() => setAppState('signup')} /> :
            appState === 'signup' ?
              <Signup onLogin={handleLogin} onSwitch={() => setAppState('login')} /> :
              appState === 'student' ?
                <StudentPanel onLogout={handleLogout} /> :
                <TeacherPanel onLogout={handleLogout} />
        } />
        
        {/* Catch-all route */}
        <Route path="*" element={
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-red-600 mb-4">404 - Sahifa topilmadi</h1>
              <button 
                onClick={() => window.location.href = '/'}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Bosh sahifaga qaytish
              </button>
            </div>
          </div>
        } />
      </Routes>
    </Router>
  )
}

export default App
