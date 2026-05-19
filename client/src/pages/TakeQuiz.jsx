import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api.js';
import { button, card, cn, form as formStyles, layout, text } from '../lib/ui.js';

function TakeQuiz({ token, quizId, onBack, onResult }) {
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;
    apiRequest(`/quizzes/${quizId}`, { token }).then((data) => {
      if (!ignore) setQuiz(data);
    }).catch((err) => {
      if (!ignore) setError(err.message);
    });
    return () => {
      ignore = true;
    };
  }, [quizId, token]);

  async function submit(event) {
    event.preventDefault();
    try {
      const result = await apiRequest(`/quizzes/${quiz.id}/attempts`, {
        method: 'POST',
        token,
        body: JSON.stringify({
          answers: quiz.questions.map((question) => ({
            question_id: question.id,
            option_id: answers[question.id],
          })),
        }),
      });
      onResult(result.attempt_id);
    } catch (err) {
      setError(err.message);
    }
  }

  if (!quiz) {
    return <main className={cn(layout.panel, layout.singlePanel)}>{error || 'Loading quiz...'}</main>;
  }

  return (
    <main className={cn(layout.panel, layout.singlePanel)}>
      <button className={cn(button.ghost, 'mb-5')} onClick={onBack}>Back</button>
      <p className={text.eyebrow}>Quiz attempt</p>
      <h1>{quiz.title}</h1>
      <form className="mt-5.5 grid gap-4" onSubmit={submit}>
        {quiz.questions.map((question, index) => (
          <fieldset className={card.question} key={question.id}>
            <legend className="p-0 font-black">{index + 1}. {question.text}</legend>
            {question.options.map((option) => (
              <label className="grid grid-cols-[22px_minmax(0,1fr)] items-center rounded-lg border border-indigo-100 bg-white/90 p-3.5 text-[#1f2437] transition hover:-translate-y-px hover:border-indigo-200 hover:shadow-[0_12px_24px_rgba(79,70,229,0.08)]" key={option.id}>
                <input className={formStyles.radio} type="radio" name={`q-${question.id}`} value={option.id} checked={answers[question.id] === option.id} onChange={() => setAnswers({ ...answers, [question.id]: option.id })} required />
                <span>{option.text}</span>
              </label>
            ))}
          </fieldset>
        ))}
        {error && <p className={text.error}>{error}</p>}
        <button className={button.primary}>Submit answers</button>
      </form>
    </main>
  );
}

export default TakeQuiz;
