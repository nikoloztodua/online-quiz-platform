import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api.js';
import { formatDate } from '../lib/formatDate.js';
import { button, cn, form as formStyles, layout, text } from '../lib/ui.js';

function AdminPanel({ token, user }) {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');

  async function load() {
    try {
      setUsers(await apiRequest('/admin/users', { token }));
    } catch (err) {
      setError(err.message);
    }
  }

  async function updateUser(id, role) {
    await apiRequest(`/admin/users/${id}`, { method: 'PUT', token, body: JSON.stringify({ role }) });
    load();
  }

  async function deleteUser(id) {
    if (!confirm('Delete this user and related records?')) return;
    await apiRequest(`/admin/users/${id}`, { method: 'DELETE', token });
    load();
  }

  useEffect(() => {
    let ignore = false;
    apiRequest('/admin/users', { token })
      .then((data) => {
        if (!ignore) setUsers(data);
      })
      .catch((err) => {
        if (!ignore) setError(err.message);
      });
    return () => {
      ignore = true;
    };
  }, [token]);

  return (
    <main className={cn(layout.panel, 'mx-auto my-8 w-[min(1100px,calc(100%_-_36px))]')}>
      <div className={layout.sectionHeading}>
        <div>
          <p className={text.eyebrow}>Admin panel</p>
          <h1>Manage platform users.</h1>
        </div>
      </div>
      {error && <p className={text.error}>{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border-b border-indigo-100 bg-gradient-to-r from-[#f8f7ff] to-white px-2.5 py-3.5 text-left text-xs uppercase tracking-normal text-slate-500 whitespace-nowrap">Name</th>
              <th className="border-b border-indigo-100 bg-gradient-to-r from-[#f8f7ff] to-white px-2.5 py-3.5 text-left text-xs uppercase tracking-normal text-slate-500 whitespace-nowrap">Email</th>
              <th className="border-b border-indigo-100 bg-gradient-to-r from-[#f8f7ff] to-white px-2.5 py-3.5 text-left text-xs uppercase tracking-normal text-slate-500 whitespace-nowrap">Role</th>
              <th className="border-b border-indigo-100 bg-gradient-to-r from-[#f8f7ff] to-white px-2.5 py-3.5 text-left text-xs uppercase tracking-normal text-slate-500 whitespace-nowrap">Joined</th>
              <th className="border-b border-indigo-100 bg-gradient-to-r from-[#f8f7ff] to-white px-2.5 py-3.5 text-left text-xs uppercase tracking-normal text-slate-500 whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((account) => (
              <tr key={account.id}>
                <td className="border-b border-indigo-100 px-2.5 py-3.5 text-left whitespace-nowrap">{account.name}</td>
                <td className="border-b border-indigo-100 px-2.5 py-3.5 text-left whitespace-nowrap">{account.email}</td>
                <td className="border-b border-indigo-100 px-2.5 py-3.5 text-left whitespace-nowrap">
                  <select className={formStyles.control} value={account.role} onChange={(event) => updateUser(account.id, event.target.value)} disabled={account.id === user.id}>
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="border-b border-indigo-100 px-2.5 py-3.5 text-left whitespace-nowrap">{formatDate(account.created_at)}</td>
                <td className="border-b border-indigo-100 px-2.5 py-3.5 text-left whitespace-nowrap">
                  <button className={button.danger} disabled={account.id === user.id} onClick={() => deleteUser(account.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

export default AdminPanel;
