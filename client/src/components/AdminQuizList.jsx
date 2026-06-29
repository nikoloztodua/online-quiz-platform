import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api.js';
import { formatDate } from '../lib/formatDate.js';
import { button, cn, form as formStyles, layout, text } from '../lib/ui.js';

const th = 'border-b border-indigo-100 bg-[#f8f7ff] px-3 py-3 text-left text-xs uppercase text-slate-500 whitespace-nowrap';
const td = 'border-b border-indigo-100 px-3 py-3 text-left';

function AdminQuizList({ token, teachers, onOpen }) {
  const [quizzes, setQuizzes] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;
    const params = new URLSearchParams({ page: String(page), limit: '10' });
    if (search) params.set('search', search);
    if (teacherId) params.set('teacher_id', teacherId);
    apiRequest(`/admin/quizzes?${params}`, { token })
      .then((result) => {
        if (ignore) return;
        setQuizzes(result.items);
        setPagination(result.pagination);
        setError('');
      })
      .catch((err) => { if (!ignore) setError(err.message); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [page, search, teacherId, token]);

  function applySearch(event) {
    event.preventDefault();
    setLoading(true);
    setPage(1);
    setSearch(searchInput.trim());
  }

  return (
    <section>
      <div className={cn(layout.sectionHeading, 'mb-4')}>
        <div>
          <p className={text.eyebrow}>Quizzes</p>
          <h2 className="text-xl font-black">{pagination.total} quizzes</h2>
        </div>
        <form className="flex gap-2 max-sm:flex-col" onSubmit={applySearch}>
          <input className={cn(formStyles.control, 'min-w-64')} placeholder="Filter by quiz title..." value={searchInput} onChange={(event) => setSearchInput(event.target.value)} />
          <select className={formStyles.control} value={teacherId} onChange={(event) => { setLoading(true); setPage(1); setTeacherId(event.target.value); }}>
            <option value="">All teachers</option>
            {teachers.map((teacher) => <option value={teacher.id} key={teacher.id}>{teacher.name}</option>)}
          </select>
          <button className={button.secondary}>Filter</button>
          {(search || teacherId) && <button type="button" className={button.ghost} onClick={() => { setLoading(true); setSearchInput(''); setSearch(''); setTeacherId(''); setPage(1); }}>Clear</button>}
        </form>
      </div>
      {error && <p className={cn(text.error, 'mb-4')}>{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead><tr>
            <th className={th}>Quiz</th>
            <th className={th}>Teacher</th>
            <th className={th}>Questions</th>
            <th className={th}>Submissions</th>
            <th className={th}>Average</th>
            <th className={th}>Created</th>
            <th className={th}>Action</th>
          </tr></thead>
          <tbody>
            {quizzes.map((quiz) => (
              <tr key={quiz.id} className="hover:bg-indigo-50/40">
                <td className={td}><strong>{quiz.title}</strong><small className="block max-w-72 truncate text-slate-500">{quiz.description || 'No description'}</small></td>
                <td className={td}>{quiz.teacher_name}<small className="block text-slate-500">{quiz.teacher_email}</small></td>
                <td className={td}>{quiz.question_count}</td>
                <td className={td}>{quiz.submissions}</td>
                <td className={td}>{quiz.submissions ? `${quiz.average_percentage}%` : '—'}</td>
                <td className={cn(td, 'whitespace-nowrap')}>{formatDate(quiz.created_at)}</td>
                <td className={td}><button className={button.primary} onClick={() => onOpen(quiz.id)}>View analytics</button></td>
              </tr>
            ))}
            {!loading && quizzes.length === 0 && <tr><td className={cn(td, 'text-slate-500')} colSpan={7}>No quizzes match this filter.</td></tr>}
            {loading && <tr><td className={cn(td, 'text-slate-500')} colSpan={7}>Loading quizzes...</td></tr>}
          </tbody>
        </table>
      </div>
      <div className={cn(layout.rowBetween, 'mt-5')}>
        <p className={text.small}>Page {pagination.page} of {pagination.pages}</p>
        <div className="flex gap-2">
          <button className={button.ghost} disabled={page <= 1 || loading} onClick={() => { setLoading(true); setPage((current) => current - 1); }}>Previous</button>
          <button className={button.ghost} disabled={page >= pagination.pages || loading} onClick={() => { setLoading(true); setPage((current) => current + 1); }}>Next</button>
        </div>
      </div>
    </section>
  );
}

export default AdminQuizList;
