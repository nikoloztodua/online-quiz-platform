import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../lib/api.js';
import { button, card, cn, form as formStyles, layout, text } from '../lib/ui.js';

function TakeQuiz({ token, quizId, onBack, onResult }) {
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [attemptId, setAttemptId] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;
    Promise.all([
      apiRequest(`/quizzes/${quizId}`, { token }),
      apiRequest(`/quizzes/${quizId}/attempts/start`, { method: 'POST', token }),
    ]).then(([quizData, attempt]) => {
      if (ignore) return;
      if (attempt.status === 'submitted') {
        onResult(attempt.attempt_id);
        return;
      }
      setQuiz(quizData);
      setAttemptId(attempt.attempt_id);
      setExpiresAt(attempt.expires_at);
      setAnswers(Object.fromEntries(attempt.answers.map((answer) => [
        answer.question_id,
        answer.option_id,
      ])));
    }).catch((err) => {
      if (!ignore) setError(err.message);
    });
    return () => {
      ignore = true;
    };
  }, [quizId, token, onResult]);

  const finishAttempt = useCallback(async () => {
    if (!quiz || !attemptId || submitting) return;
    setSubmitting(true);
    try {
      const result = await apiRequest(`/quizzes/${quiz.id}/attempts/${attemptId}/submit`, {
        method: 'POST',
        token,
      });
      onResult(result.attempt_id);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }, [attemptId, onResult, quiz, submitting, token]);

  useEffect(() => {
    if (!expiresAt) return undefined;
    const updateTimer = () => {
      const seconds = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setRemainingSeconds(seconds);
      if (seconds === 0) finishAttempt();
    };
    updateTimer();
    const timer = window.setInterval(updateTimer, 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt, finishAttempt]);

  async function chooseAnswer(questionId, optionId) {
    setAnswers((current) => ({ ...current, [questionId]: optionId }));
    setError('');
    try {
      await apiRequest(`/attempts/${attemptId}/answer`, {
        method: 'PUT',
        token,
        body: JSON.stringify({ question_id: questionId, option_id: optionId }),
      });
    } catch (err) {
      setError(err.message);
    }
  }

  function submit(event) {
    event.preventDefault();
    finishAttempt();
  }

  function formatTime(seconds) {
    const minutes = Math.floor((seconds || 0) / 60);
    const remainder = (seconds || 0) % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
  }

  if (!quiz) {
    return <main className={cn(layout.panel, layout.singlePanel)}>{error || 'Loading quiz...'}</main>;
  }

  return (
    <main className={cn(layout.panel, layout.singlePanel)}>
      <button className={cn(button.ghost, 'mb-5')} onClick={onBack}>Back</button>
      <p className={text.eyebrow}>Quiz attempt</p>
      <div className={cn(layout.rowBetween, 'sticky top-3 z-10 rounded-lg border border-indigo-100 bg-white/95 p-4 shadow-lg backdrop-blur')}>
        <h1>{quiz.title}</h1>
        <div
          className={cn(
            'min-w-28 rounded-lg px-4 py-3 text-center text-2xl font-black tabular-nums',
            remainingSeconds <= 60 ? 'bg-rose-100 text-rose-700' : 'bg-indigo-50 text-indigo-700',
          )}
          aria-live="polite"
        >
          {formatTime(remainingSeconds)}
        </div>
      </div>
      <p className={cn(text.small, 'mt-3')}>Your selected answers are saved automatically. The quiz submits when time runs out.</p>
      <form className="mt-5.5 grid gap-4" onSubmit={submit}>
        {quiz.questions.map((question, index) => (
          <fieldset className={card.question} key={question.id}>
            <legend className="p-0 font-black">{index + 1}. {question.text}</legend>
            {question.options.map((option) => (
              <label className="grid grid-cols-[22px_minmax(0,1fr)] items-center rounded-lg border border-indigo-100 bg-white/90 p-3.5 text-[#1f2437] transition hover:-translate-y-px hover:border-indigo-200 hover:shadow-[0_12px_24px_rgba(79,70,229,0.08)]" key={option.id}>
                <input className={formStyles.radio} type="radio" name={`q-${question.id}`} value={option.id} checked={answers[question.id] === option.id} onChange={() => chooseAnswer(question.id, option.id)} disabled={submitting || remainingSeconds === 0} />
                <span>{option.text}</span>
              </label>
            ))}
          </fieldset>
        ))}
        {error && <p className={text.error}>{error}</p>}
        <button className={button.primary} disabled={submitting}>{submitting ? 'Submitting…' : 'Submit answers'}</button>
      </form>
    </main>
  );
}

export default TakeQuiz;
