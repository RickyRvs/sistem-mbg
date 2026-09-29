// resources/js/Components/Pagination.jsx
import { Link } from '@inertiajs/react';

const teks = (l) => l.replace(/&laquo;|previous/gi, '←').replace(/&raquo;|next/gi, '→').replace(/[←→]\s*[←→]?/g, (m) => m.trim()[0]);

export default function Pagination({ data }) {
  if (!data || data.last_page <= 1) return null;
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-slate-500">Menampilkan {data.from}-{data.to} dari {data.total}</p>
      <div className="flex flex-wrap gap-1">
        {data.links.map((l, i) =>
          l.url ? (
            <Link
              key={i}
              href={l.url}
              preserveScroll
              preserveState
              className={`rounded-lg px-3 py-1.5 text-sm ring-1 ${l.active ? 'bg-[#0A1F4A] text-white ring-[#0A1F4A]' : 'bg-white text-slate-600 ring-slate-300 hover:bg-slate-50'}`}
            >
              {teks(l.label)}
            </Link>
          ) : (
            <span key={i} className="rounded-lg px-3 py-1.5 text-sm text-slate-300 ring-1 ring-slate-200">{teks(l.label)}</span>
          )
        )}
      </div>
    </div>
  );
}