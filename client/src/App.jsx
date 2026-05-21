import { useState } from 'react';
import TopBar from './components/TopBar.jsx';
import AdminPanel from './pages/AdminPanel.jsx';
import AuthPage from './pages/AuthPage.jsx';
import ResultPage from './pages/ResultPage.jsx';
import StudentDashboard from './pages/StudentDashboard.jsx';
import TakeQuiz from './pages/TakeQuiz.jsx';
import TeacherDashboard from './pages/TeacherDashboard.jsx';
import { layout } from './lib/ui.js';

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('quiz_token') || '');
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('quiz_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [view, setView] = useState('dashboard');
  const [selectedQuizId, setSelectedQuizId] = useState(null);
  const [selectedAttemptId, setSelectedAttemptId] = useState(null);

  const isAuthed = Boolean(token && user);

  function handleSession(nextToken, nextUser) {
    setToken(nextToken);
    setUser(nextUser);
    localStorage.setItem('quiz_token', nextToken);
    localStorage.setItem('quiz_user', JSON.stringify(nextUser));
    setView('dashboard');
  }

  function logout() {
    setToken('');
    setUser(null);
    localStorage.removeItem('quiz_token');
    localStorage.removeItem('quiz_user');
    setView('dashboard');
    setSelectedQuizId(null);
    setSelectedAttemptId(null);
  }

  function openQuiz(id) {
    setSelectedQuizId(id);
    setView('take');
  }

  function openResult(id) {
    setSelectedAttemptId(id);
    setView('result');
  }

  let content;

  if (!isAuthed) {
    content = <AuthPage onSession={handleSession} />;
  } else {
    switch (user.role) {
      case 'teacher':
        content = <TeacherDashboard token={token} user={user} />;
        break;
        
      case 'admin':
        content = <AdminPanel token={token} user={user} />;
        break;
        
      case 'student':
        if (view === 'take') {
          content = <TakeQuiz token={token} quizId={selectedQuizId} onBack={() => setView('dashboard')} onResult={openResult} />;
        } else if (view === 'result') {
          content = <ResultPage token={token} attemptId={selectedAttemptId} onBack={() => setView('dashboard')} />;
        } else {
          content = <StudentDashboard token={token} onTake={openQuiz} onResult={openResult} />;
        }
        break;

      default:
        content = <AuthPage onSession={handleSession} />;
        break;
    }
  }

  return (
    <div className={layout.appShell}>
      {isAuthed && (
        <TopBar 
          user={user} 
          onDashboard={() => {
            setSelectedQuizId(null);
            setSelectedAttemptId(null);
            setView('dashboard');
          }} 
          onLogout={logout} 
        />
      )}
      {content}
    </div>
  );
}

export default App;