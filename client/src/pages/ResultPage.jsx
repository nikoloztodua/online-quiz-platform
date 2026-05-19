import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api.js';
import { button, card, cn, layout, text } from '../lib/ui.js';

function ResultPage({ token, attemptId, onBack }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;
    apiRequest(`/attempts/${attemptId}`, { token }).then((data) => {
      if (!ignore) setResult(data);
    }).catch((err) => {
      if (!ignore) setError(err.message);
    });
    return () => {
      ignore = true;
    };
  }, [attemptId, token]);

  if (!result) {
    return <main className={cn(layout.panel, layout.singlePanel)}>{error || 'Loading result...'}</main>;
  }

  return (
    <main className={cn(layout.panel, layout.singlePanel)}>
      <button className={cn(button.ghost, 'mb-5')} onClick={onBack}>Back</button>
      <p className={text.eyebrow}>Results</p>
      <h1>{result.quiz.title}</h1>
      <div className="my-5.5 flex items-center justify-between gap-4 rounded-lg bg-gradient-to-br from-indigo-50 via-violet-50 to-pink-50 p-6 shadow-[inset_0_0_0_1px_rgba(99,102,241,0.08)] max-sm:flex-col max-sm:items-stretch">
        <strong className="text-5xl leading-none text-[#5d4df7]">{result.score}/{result.total}</strong>
        <span>{result.percentage}% score</span>
      </div>
      <div className="grid gap-4">
        {result.questions.map((question, index) => (
          <article className={card.question} key={question.id}>
            <h3>{index + 1}. {question.text}</h3>
            {question.options.map((option) => {
              const picked = option.id === question.selected_option_id;
              const correct = Boolean(option.is_correct);
              return (
                <div className={cn(
                  'flex justify-between gap-3 rounded-lg border border-indigo-100 bg-white p-3.5',
                  correct && 'border-emerald-300 bg-emerald-50',
                  picked && !correct && 'border-amber-300 bg-amber-50',
                )} key={option.id}>
                  <span>{option.text}</span>
                  <small className={text.small}>{correct ? 'Correct answer' : picked ? 'Your answer' : ''}</small>
                </div>
              );
            })}
          </article>
        ))}
      </div>
    </main>
  );
}

export default ResultPage;
