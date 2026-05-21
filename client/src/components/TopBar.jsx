import { roleLabels } from '../constants/roles.js';
import { brand, button } from '../lib/ui.js';

function TopBar({ user, onDashboard, onLogout }) {
  return (
    <header className="sticky top-0 z-[5] grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-indigo-100 bg-white/80 px-[clamp(18px,4vw,54px)] py-4.5 shadow-[0_12px_30px_rgba(79,70,229,0.08)] backdrop-blur-2xl max-[920px]:grid-cols-[1fr_auto] max-sm:px-3.5">
      <button className={brand.lockup} onClick={onDashboard}>
        <span className={brand.mark}>Q</span>
        <span>Quizline</span>
      </button>
      <div className="flex items-center gap-2.5 text-slate-500 max-[920px]:col-span-full max-[920px]:justify-between">
        <span>{user.name}</span>
        <strong className="rounded-full bg-gradient-to-r from-indigo-50 to-pink-50 px-3 py-1.5 text-sm text-[#5d4df7]">{roleLabels[user.role]}</strong>
      </div>
      <button className={button.ghost} onClick={onLogout}>Sign out</button>
    </header>
  );
}

export default TopBar;