export const card = 'rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm';

export const btn =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-[#CFAE6A] px-5 py-2.5 text-sm font-semibold text-[#0A1F4A] shadow-sm transition hover:bg-[#d9bb7c] focus:outline-none focus:ring-2 focus:ring-[#CFAE6A]/50 disabled:cursor-not-allowed disabled:opacity-50';

export const btnNavy =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-[#0A1F4A] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#132a5e] focus:outline-none focus:ring-2 focus:ring-[#0A1F4A]/40 disabled:opacity-50';

export const btnGhost =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-50';

export const btnDanger =
  'inline-flex items-center rounded-lg px-2.5 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50';

export const input =
  'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#0A1F4A] focus:outline-none focus:ring-2 focus:ring-[#0A1F4A]/15';

export const select = input;

export const label = 'mb-1.5 block text-sm font-medium text-slate-700';

export const tableWrap = 'overflow-x-auto rounded-2xl border border-slate-200/70 bg-white shadow-sm';

export const th = 'whitespace-nowrap px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-white/90';

export const td = 'px-5 py-3.5 text-sm text-slate-700';

export const tr = 'border-t border-slate-100 transition hover:bg-slate-50/80';

export const rupiah = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

export const statusColor = {
  draft: 'bg-slate-100 text-slate-600 ring-slate-200',
  dikirim: 'bg-blue-50 text-blue-700 ring-blue-200',
  dikonfirmasi: 'bg-amber-50 text-amber-700 ring-amber-200',
  diterima: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
};

export const statusBadge = 'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset';