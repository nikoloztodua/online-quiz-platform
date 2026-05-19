import { useState } from 'react';
import heroImage from '../assets/hero.png';
import { apiRequest } from '../lib/api.js';
import { brand, button, cn, form as formStyles, layout, text } from '../lib/ui.js';

function AuthPage({ onSession }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student' });
  const [status, setStatus] = useState({ loading: false, error: '' });

  async function submit(event) {
    event.preventDefault();
    setStatus({ loading: true, error: '' });
    try {
      if (mode === 'register') {
        await apiRequest('/auth/register', {
          method: 'POST',
          body: JSON.stringify(form),
        });
      }
      const session = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: form.email, password: form.password }),
      });
      onSession(session.token, session.user);
    } catch (error) {
      setStatus({ loading: false, error: error.message });
    }
  }

  return (
    <main className="grid min-h-svh grid-cols-[minmax(0,1.1fr)_minmax(340px,460px)] items-center gap-[clamp(24px,5vw,72px)] p-[clamp(24px,5vw,70px)] max-[920px]:grid-cols-1 max-sm:p-3.5">
      <section
        className="relative flex min-h-[calc(100svh-140px)] flex-col justify-center gap-7 overflow-hidden rounded-lg bg-cover bg-center p-[clamp(28px,5vw,70px)] text-white shadow-[0_22px_60px_rgba(79,70,229,0.14)] after:pointer-events-none after:absolute after:inset-4.5 after:rounded-lg after:border after:border-white/20 max-[920px]:min-h-[430px] max-sm:p-6"
        style={{ backgroundImage: `linear-gradient(135deg, rgba(79,70,229,0.92), rgba(147,51,234,0.72) 48%, rgba(236,72,153,0.6)), url(${heroImage})` }}
      >
        <div className={cn(brand.lockup, 'relative z-1 text-white')}>
          <span className={brand.mark}>Q</span>
          <span>Quizline</span>
        </div>
        <h1 className="relative z-1 max-w-3xl font-black">Online quizzes for classrooms that need quick feedback.</h1>
        <p className="relative z-1 max-w-2xl text-lg text-white/80">Teachers publish assessments, students answer online, and results are graded immediately.</p>
        <div className="relative z-1 grid max-w-[460px] grid-cols-2 gap-3 max-sm:grid-cols-1" aria-hidden="true">
          <span className="flex min-h-19 items-end rounded-lg bg-gradient-to-br from-emerald-500 to-teal-700 p-3.5 font-black text-white shadow-[0_18px_40px_rgba(15,23,42,0.16)]">Science Fun</span>
          <span className="flex min-h-19 items-end rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 p-3.5 font-black text-white shadow-[0_18px_40px_rgba(15,23,42,0.16)]">Math Master</span>
          <span className="flex min-h-19 items-end rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 p-3.5 font-black text-white shadow-[0_18px_40px_rgba(15,23,42,0.16)]">Social Studies</span>
          <span className="flex min-h-19 items-end rounded-lg bg-gradient-to-br from-pink-500 to-rose-600 p-3.5 font-black text-white shadow-[0_18px_40px_rgba(15,23,42,0.16)]">English Language</span>
        </div>
        <div className="relative z-1 flex flex-wrap gap-3">
          <span className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/20 px-4 py-3 backdrop-blur-xl"><strong>3</strong> roles</span>
          <span className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/20 px-4 py-3 backdrop-blur-xl"><strong>Live</strong> scoring</span>
          <span className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/20 px-4 py-3 backdrop-blur-xl"><strong>REST</strong> API</span>
        </div>
      </section>
      <section className={cn(layout.panel, 'p-7.5')}>
        <div className="mb-5.5 grid grid-cols-2 gap-1.5 rounded-lg bg-[#f0edff] p-1.5">
          <button className={cn('min-h-10 rounded-md font-bold text-slate-500', mode === 'login' && 'bg-white text-indigo-700 shadow-[0_10px_22px_rgba(79,70,229,0.14)]')} onClick={() => setMode('login')}>Login</button>
          <button className={cn('min-h-10 rounded-md font-bold text-slate-500', mode === 'register' && 'bg-white text-indigo-700 shadow-[0_10px_22px_rgba(79,70,229,0.14)]')} onClick={() => setMode('register')}>Register</button>
        </div>
        <form onSubmit={submit} className={layout.formStack}>
          {mode === 'register' && (
            <label className={formStyles.label}>
              Name
              <input className={formStyles.control} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </label>
          )}
          <label className={formStyles.label}>
            Email
            <input className={formStyles.control} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </label>
          <label className={formStyles.label}>
            Password
            <input className={formStyles.control} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
          </label>
          {mode === 'register' && (
            <label className={formStyles.label}>
              Role
              <select className={formStyles.control} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="admin">Admin</option>
              </select>
            </label>
          )}
          {status.error && <p className={text.error}>{status.error}</p>}
          <button className={button.primary} disabled={status.loading}>{status.loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create account'}</button>
        </form>
      </section>
    </main>
  );
}

export default AuthPage;
