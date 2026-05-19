import { useEffect, useState } from 'react';
import QuizEditor from '../components/QuizEditor.jsx';
import { apiRequest } from '../lib/api.js';
import { formatDate } from '../lib/formatDate.js';
import { button, card, layout, text } from '../lib/ui.js';

function TeacherDashboard({ token, user }) {
  const [quizzes, setQuizzes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    try {
      const data = await apiRequest('/quizzes', { token });
      setQuizzes(data.filter((quiz) => quiz.created_by === user.id));
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function selectQuiz(quiz) {
    try {
      const [detail, quizAttempts] = await Promise.all([
        apiRequest(`/quizzes/${quiz.id}`, { token }),
        apiRequest(`/quizzes/${quiz.id}/attempts`, { token }),
      ]);
      setSelected(detail);
      setAttempts(quizAttempts);
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteQuiz(id) {
    if (!confirm('Delete this quiz and all attempts?')) return;
    await apiRequest(`/quizzes/${id}`, { method: 'DELETE', token });
    setSelected(null);
    setAttempts([]);
    load();
  }

  useEffect(() => {
    let ignore = false;
    apiRequest('/quizzes', { token })
      .then((data) => {
        if (ignore) return;
        setQuizzes(data.filter((quiz) => quiz.created_by === user.id));
        setError('');
      })
      .catch((err) => {
        if (!ignore) setError(err.message);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [token, user.id]);

  return (
    <main className="grid grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)] items-start gap-5.5 p-[clamp(18px,4vw,44px)] max-[920px]:grid-cols-1">
      <section className={layout.panel}>
        <div className={layout.sectionHeading}>
          <div>
            <p className={text.eyebrow}>Teacher dashboard</p>
            <h1>Build quizzes and review performance.</h1>
          </div>
          <button className={button.secondary} onClick={() => setSelected(null)}>New quiz</button>
        </div>
        {error && <p className={text.error}>{error}</p>}
        <QuizEditor key={selected?.id || 'new'} token={token} quiz={selected} onSaved={() => { setSelected(null); load(); }} />
      </section>
      <aside className={layout.panel}>
        <h2 className="mb-3.5">Your quizzes</h2>
        {loading ? <p>Loading...</p> : quizzes.length === 0 ? <p>No quizzes yet.</p> : (
          <div className={layout.listStack}>
            {quizzes.map((quiz) => (
              <button className={card.listItem} key={quiz.id} onClick={() => selectQuiz(quiz)}>
                <span className="grid gap-1">
                  <strong>{quiz.title}</strong>
                  <small className={text.small}>{quiz.question_count} questions</small>
                </span>
                <span className={card.pill}>{formatDate(quiz.created_at)}</span>
              </button>
            ))}
          </div>
        )}
        {selected && (
          <div className="mt-6.5 grid gap-3.5 border-t border-indigo-100 pt-5.5">
            <div className={layout.rowBetween}>
              <h2>Results</h2>
              <button className={button.danger} onClick={() => deleteQuiz(selected.id)}>Delete</button>
            </div>
            {attempts.length === 0 ? <p>No submissions yet.</p> : attempts.map((attempt) => (
              <div className="flex justify-between gap-3 rounded-lg border border-indigo-100 bg-gradient-to-br from-white to-[#fafaff] p-3.5" key={attempt.id}>
                <span className="grid gap-1">
                  <strong>{attempt.student_name}</strong>
                  <small className={text.small}>{attempt.student_email}</small>
                </span>
                <b>{attempt.score}/{attempt.total}</b>
              </div>
            ))}
          </div>
        )}
      </aside>
    </main>
  );
}

export default TeacherDashboard;
