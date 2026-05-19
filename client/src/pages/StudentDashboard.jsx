import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../lib/api.js';
import { formatDate } from '../lib/formatDate.js';
import { button, card, cn, layout, text } from '../lib/ui.js';

function StudentDashboard({ token, onTake, onResult }) {
  const [quizzes, setQuizzes] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;
    Promise.all([
      apiRequest('/quizzes', { token }),
      apiRequest('/attempts/me', { token }),
    ]).then(([quizData, attemptData]) => {
      if (ignore) return;
      setQuizzes(quizData);
      setAttempts(attemptData);
    }).catch((err) => {
      if (!ignore) setError(err.message);
    });
    return () => {
      ignore = true;
    };
  }, [token]);

  const attemptedQuizIds = useMemo(() => new Set(attempts.map((attempt) => attempt.quiz_id)), [attempts]);

  return (
    <main className="grid grid-cols-[minmax(0,1fr)_minmax(300px,390px)] items-start gap-5.5 p-[clamp(18px,4vw,44px)] max-[920px]:grid-cols-1">
      <section className={layout.panel}>
        <div className={layout.sectionHeading}>
          <div>
            <p className={text.eyebrow}>Student dashboard</p>
            <h1>Choose a quiz and get instant results.</h1>
          </div>
        </div>
        {error && <p className={text.error}>{error}</p>}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
          {quizzes.map((quiz) => (
            <article className="relative grid content-start gap-3 overflow-hidden rounded-lg border border-indigo-100 bg-white p-5.5 pt-7 shadow-[0_14px_34px_rgba(79,70,229,0.1)] transition before:absolute before:inset-x-0 before:top-0 before:h-1.5 before:bg-gradient-to-r before:from-emerald-500 before:via-blue-500 before:to-pink-500 hover:-translate-y-1 hover:shadow-[0_22px_48px_rgba(79,70,229,0.16)]" key={quiz.id}>
              <span className={card.pill}>{quiz.question_count} questions</span>
              <h2>{quiz.title}</h2>
              <p>{quiz.description || 'No description provided.'}</p>
              <small className={text.small}>By {quiz.teacher_name}</small>
              <button className={button.primary} onClick={() => onTake(quiz.id)}>{attemptedQuizIds.has(quiz.id) ? 'Retake quiz' : 'Take quiz'}</button>
            </article>
          ))}
        </div>
      </section>
      <section className={layout.panel}>
        <h2>Recent scores</h2>
        {attempts.length === 0 ? <p>No attempts submitted yet.</p> : attempts.map((attempt) => (
          <button className={cn(card.listItem, 'mt-4')} key={attempt.id} onClick={() => onResult(attempt.id)}>
            <span className="grid gap-1">
              <strong>{attempt.quiz_title}</strong>
              <small className={text.small}>{formatDate(attempt.submitted_at)}</small>
            </span>
            <span className={card.pill}>{attempt.score}/{attempt.total}</span>
          </button>
        ))}
      </section>
    </main>
  );
}

export default StudentDashboard;
