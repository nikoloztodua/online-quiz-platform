import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api.js';
import { formatDate } from '../lib/formatDate.js';
import { button, card, cn, layout, text } from '../lib/ui.js';

function StatCard({ label, value, hint }) {
  return (
    <div className="rounded-lg border border-indigo-100 bg-linear-to-br from-white to-[#fafaff] p-4 shadow-[0_14px_28px_rgba(79,70,229,0.08)]">
      <p className="text-3xl font-black text-[#1f2437]">{value}</p>
      <p className={text.small}>{label}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function formatDuration(seconds) {
  if (!seconds) return '—';
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes ? `${minutes}m ${remainder}s` : `${remainder}s`;
}

function AdminQuizDetail({ token, quizId, onBack }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;
    apiRequest(`/admin/quizzes/${quizId}`, { token })
      .then((result) => { if (!ignore) setData(result); })
      .catch((err) => { if (!ignore) setError(err.message); });
    return () => { ignore = true; };
  }, [quizId, token]);

  if (error) {
    return <main className={cn(layout.panel, layout.singlePanel)}><p className={text.error}>{error}</p><button className={cn(button.ghost, 'mt-4')} onClick={onBack}>Back to quizzes</button></main>;
  }
  if (!data) return <main className={cn(layout.panel, layout.singlePanel)}><p>Loading quiz analytics...</p></main>;

  const { quiz, statistics, leaderboard, question_statistics: questionStats } = data;

  return (
    <main className={cn(layout.panel, 'mx-auto my-8 w-[min(1100px,calc(100%-36px))]')}>
      <button className={cn(button.ghost, 'mb-5')} onClick={onBack}>← Back to quizzes</button>
      <div className={layout.sectionHeading}>
        <div>
          <p className={text.eyebrow}>Quiz analytics</p>
          <h1>{quiz.title}</h1>
          <p className="mt-3 text-slate-600">{quiz.description || 'No description provided.'}</p>
          <p className={cn(text.small, 'mt-2')}>By {quiz.teacher_name} · {quiz.teacher_email} · Created {formatDate(quiz.created_at)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={card.pill}>{quiz.question_count} questions</span>
          <span className={card.pill}>{quiz.duration_minutes} minutes</span>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-4 gap-3 max-[920px]:grid-cols-2 max-sm:grid-cols-1">
        <StatCard label="Average score" value={`${statistics.average_percentage}%`} />
        <StatCard label="Highest score" value={`${statistics.highest_percentage}%`} hint={`Lowest: ${statistics.lowest_percentage}%`} />
        <StatCard label="Submissions" value={statistics.submissions} hint={`${statistics.unique_students} unique students`} />
        <StatCard label="Completion rate" value={`${statistics.completion_rate}%`} hint={`${statistics.in_progress} currently in progress`} />
        <StatCard label="Average time" value={formatDuration(statistics.average_duration_seconds)} />
      </div>

      <section className="mb-8">
        <p className={text.eyebrow}>Leaderboard</p>
        <h2 className="mb-4">Top student performance</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead><tr>
              {['Rank', 'Student', 'Best score', 'Average', 'Submissions', 'Last submitted'].map((heading) => (
                <th className="border-b border-indigo-100 bg-[#f8f7ff] px-3 py-3 text-left text-xs uppercase text-slate-500 whitespace-nowrap" key={heading}>{heading}</th>
              ))}
            </tr></thead>
            <tbody>
              {leaderboard.map((entry, index) => (
                <tr key={entry.student_id}>
                  <td className="border-b border-indigo-100 px-3 py-3 font-black">#{index + 1}</td>
                  <td className="border-b border-indigo-100 px-3 py-3"><strong>{entry.student_name}</strong><small className="block text-slate-500">{entry.student_email}</small></td>
                  <td className="border-b border-indigo-100 px-3 py-3 font-bold">{entry.best_score}/{entry.best_total} ({entry.best_percentage}%)</td>
                  <td className="border-b border-indigo-100 px-3 py-3">{entry.average_percentage}%</td>
                  <td className="border-b border-indigo-100 px-3 py-3">{entry.attempts}</td>
                  <td className="border-b border-indigo-100 px-3 py-3 whitespace-nowrap">{formatDate(entry.last_submitted_at)}</td>
                </tr>
              ))}
              {!leaderboard.length && <tr><td className="px-3 py-5 text-slate-500" colSpan={6}>No submitted attempts yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <p className={text.eyebrow}>Question insights</p>
        <h2 className="mb-4">Accuracy by question</h2>
        <div className="grid gap-3">
          {questionStats.map((question, index) => (
            <article className={card.question} key={question.id}>
              <div className={layout.rowBetween}>
                <strong>{index + 1}. {question.text}</strong>
                <span className={card.pill}>{question.correct_percentage}% correct</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-indigo-50">
                <div className="h-full rounded-full bg-gradient-to-r from-[#5d4df7] to-emerald-500" style={{ width: `${question.correct_percentage}%` }} />
              </div>
              <small className={text.small}>{question.correct} correct out of {question.answered} answers</small>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export default AdminQuizDetail;
