export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export const layout = {
  appShell: 'min-h-svh bg-[linear-gradient(140deg,rgba(238,242,255,0.8),rgba(255,255,255,0.55)_42%,rgba(253,242,248,0.58)),linear-gradient(25deg,rgba(236,253,245,0.62),rgba(255,255,255,0)_52%)]',
  panel: 'rounded-lg border border-indigo-100 bg-white/90 p-[clamp(18px,3vw,30px)] shadow-[0_22px_60px_rgba(79,70,229,0.14)] backdrop-blur-[18px]',
  singlePanel: 'mx-auto my-8 w-[min(980px,calc(100%_-_36px))]',
  sectionHeading: 'mb-6 flex items-start justify-between gap-4 max-sm:flex-col max-sm:items-stretch',
  twoColumn: 'grid grid-cols-2 gap-4 max-[920px]:grid-cols-1',
  formStack: 'grid gap-4',
  listStack: 'grid gap-4',
  rowBetween: 'flex items-center justify-between gap-3 max-sm:flex-col max-sm:items-stretch',
};

export const text = {
  eyebrow: 'mb-2.5 text-xs font-black uppercase tracking-normal text-[#5d4df7]',
  error: 'font-bold text-rose-600',
  small: 'text-sm text-slate-500',
};

export const brand = {
  lockup: 'inline-flex items-center gap-2.5 font-black tracking-normal text-[#1f2437]',
  mark: 'grid size-[42px] place-items-center rounded-lg bg-gradient-to-br from-[#5d4df7] via-violet-500 to-pink-500 font-black text-white shadow-[0_14px_34px_rgba(93,77,247,0.28)]',
};

export const form = {
  label: 'grid gap-2 text-sm font-bold text-slate-500',
  control: 'w-full rounded-lg border-2 border-indigo-100 bg-white px-3.5 py-3 text-[#1f2437] outline-none focus:border-[#5d4df7] focus:shadow-[0_0_0_4px_rgba(93,77,247,0.12)]',
  textarea: 'min-h-22 w-full resize-y rounded-lg border-2 border-indigo-100 bg-white px-3.5 py-3 text-[#1f2437] outline-none focus:border-[#5d4df7] focus:shadow-[0_0_0_4px_rgba(93,77,247,0.12)]',
  radio: 'w-auto accent-[#5d4df7]',
};

export const button = {
  primary: 'min-h-10 rounded-lg border border-transparent bg-gradient-to-r from-[#5d4df7] to-violet-500 px-4 py-2.5 font-extrabold text-white shadow-[0_16px_30px_rgba(93,77,247,0.25)] transition hover:-translate-y-px hover:shadow-[0_20px_38px_rgba(93,77,247,0.32)]',
  secondary: 'min-h-10 rounded-lg border border-transparent bg-gradient-to-r from-slate-900 to-indigo-700 px-4 py-2.5 font-extrabold text-white shadow-[0_14px_26px_rgba(15,23,42,0.18)] transition hover:-translate-y-px',
  ghost: 'min-h-10 rounded-lg border border-indigo-100 bg-white px-4 py-2.5 font-extrabold text-[#1f2437] transition hover:border-indigo-200 hover:text-indigo-700 hover:shadow-[0_12px_26px_rgba(79,70,229,0.1)]',
  danger: 'min-h-10 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 font-extrabold text-rose-600 transition hover:border-rose-300 hover:bg-rose-100',
};

export const card = {
  question: 'grid gap-3.5 rounded-lg border border-indigo-100 bg-gradient-to-br from-white to-[#fafaff] p-5 shadow-[0_14px_28px_rgba(79,70,229,0.08)]',
  listItem: 'flex w-full items-center justify-between gap-3 rounded-lg border border-indigo-100 bg-white/90 p-3.5 text-left text-[#1f2437] transition hover:-translate-y-px hover:border-[#5d4df7] hover:shadow-[0_14px_28px_rgba(79,70,229,0.12)]',
  pill: 'w-fit rounded-full bg-gradient-to-r from-indigo-50 to-violet-50 px-3 py-1.5 text-sm font-black text-[#5d4df7]',
};