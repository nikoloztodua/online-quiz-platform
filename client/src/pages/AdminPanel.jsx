import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api.js';
import { formatDate } from '../lib/formatDate.js';
import { roleLabels } from '../constants/roles.js';
import { button, card, cn, form as formStyles, layout, text } from '../lib/ui.js';

const EMPTY_NEW_USER = { name: '', email: '', password: '', role: 'student' };

const th = 'border-b border-indigo-100 bg-gradient-to-r from-[#f8f7ff] to-white px-2.5 py-3.5 text-left text-xs uppercase tracking-normal text-slate-500 whitespace-nowrap';
const td = 'border-b border-indigo-100 px-2.5 py-3.5 text-left whitespace-nowrap';

function StatCard({ label, value }) {
  return (
    <div className="rounded-lg border border-indigo-100 bg-gradient-to-br from-white to-[#fafaff] p-4 shadow-[0_14px_28px_rgba(79,70,229,0.08)]">
      <p className="text-3xl font-black text-[#1f2437]">{value}</p>
      <p className={text.small}>{label}</p>
    </div>
  );
}

function AdminPanel({ token, user }) {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [newUser, setNewUser] = useState(EMPTY_NEW_USER);
  const [createState, setCreateState] = useState({ loading: false, error: '', success: '' });

  async function load() {
    try {
      const [userList, statSummary] = await Promise.all([
        apiRequest('/admin/users', { token }),
        apiRequest('/admin/stats', { token }),
      ]);
      setUsers(userList);
      setStats(statSummary);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    let ignore = false;
    Promise.all([
      apiRequest('/admin/users', { token }),
      apiRequest('/admin/stats', { token }),
    ])
      .then(([userList, statSummary]) => {
        if (ignore) return;
        setUsers(userList);
        setStats(statSummary);
      })
      .catch((err) => { if (!ignore) setError(err.message); });
    return () => { ignore = true; };
  }, [token]);

  async function createUser(event) {
    event.preventDefault();
    setCreateState({ loading: true, error: '', success: '' });
    try {
      const created = await apiRequest('/admin/users', { method: 'POST', token, body: JSON.stringify(newUser) });
      setNewUser(EMPTY_NEW_USER);
      setCreateState({ loading: false, error: '', success: `Created ${roleLabels[created.role]} account for ${created.email}.` });
      load();
    } catch (err) {
      setCreateState({ loading: false, error: err.message, success: '' });
    }
  }

  async function updateUser(id, role) {
    try {
      await apiRequest(`/admin/users/${id}`, { method: 'PUT', token, body: JSON.stringify({ role }) });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteUser(id) {
    if (!confirm('Delete this user and related records?')) return;
    try {
      await apiRequest(`/admin/users/${id}`, { method: 'DELETE', token });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  const term = query.trim().toLowerCase();
  const visibleUsers = term
    ? users.filter((account) => account.name.toLowerCase().includes(term) || account.email.toLowerCase().includes(term))
    : users;

  return (
    <main className={cn(layout.panel, 'mx-auto my-8 w-[min(1100px,calc(100%_-_36px))]')}>
      <div className={layout.sectionHeading}>
        <div>
          <p className={text.eyebrow}>Admin dashboard</p>
          <h1>Manage the platform.</h1>
        </div>
      </div>
      {error && <p className={text.error}>{error}</p>}

      {stats && (
        <div className="mb-7 grid grid-cols-3 gap-3 max-[920px]:grid-cols-2 max-sm:grid-cols-1">
          <StatCard label="Total users" value={stats.users} />
          <StatCard label="Students" value={stats.usersByRole.student} />
          <StatCard label="Teachers" value={stats.usersByRole.teacher} />
          <StatCard label="Admins" value={stats.usersByRole.admin} />
          <StatCard label="Quizzes" value={stats.quizzes} />
          <StatCard label="Attempts" value={stats.attempts} />
        </div>
      )}

      <section className={cn(card.question, 'mb-7')}>
        <p className={text.eyebrow}>Create account</p>
        <form onSubmit={createUser} className="grid grid-cols-4 items-end gap-3 max-[920px]:grid-cols-2 max-sm:grid-cols-1">
          <label className={formStyles.label}>Name<input className={formStyles.control} value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} required /></label>
          <label className={formStyles.label}>Email<input className={formStyles.control} type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} required /></label>
          <label className={formStyles.label}>Password<input className={formStyles.control} type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} required minLength={6} /></label>
          <label className={formStyles.label}>Role
            <select className={formStyles.control} value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          {createState.error && <p className={cn(text.error, 'col-span-full')}>{createState.error}</p>}
          {createState.success && <p className="col-span-full font-bold text-emerald-600">{createState.success}</p>}
          <button className={cn(button.primary, 'col-span-full w-fit')} disabled={createState.loading}>
            {createState.loading ? 'Creating...' : 'Create account'}
          </button>
        </form>
      </section>

      <div className={cn(layout.sectionHeading, 'mb-4')}>
        <div>
          <p className={text.eyebrow}>Users</p>
          <h2 className="text-xl font-black">{visibleUsers.length} shown</h2>
        </div>
        <input className={cn(formStyles.control, 'max-w-xs')} placeholder="Search name or email..." value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={th}>Name</th>
              <th className={th}>Email</th>
              <th className={th}>Role</th>
              <th className={th}>Joined</th>
              <th className={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleUsers.map((account) => (
              <tr key={account.id}>
                <td className={td}>{account.name}</td>
                <td className={td}>{account.email}</td>
                <td className={td}>
                  <select className={formStyles.control} value={account.role} onChange={(event) => updateUser(account.id, event.target.value)} disabled={account.id === user.id}>
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className={td}>{formatDate(account.created_at)}</td>
                <td className={td}>
                  <button className={button.danger} disabled={account.id === user.id} onClick={() => deleteUser(account.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {visibleUsers.length === 0 && (
              <tr><td className={cn(td, 'text-slate-500')} colSpan={5}>No users match your search.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

export default AdminPanel;