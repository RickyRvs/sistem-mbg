// resources/js/Pages/Harga/Index.jsx
import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import MbgLayout from '@/Layouts/MbgLayout';
import PageHeader from '@/Components/PageHeader';
import Pagination from '@/Components/Pagination';
import { input, tableWrap, td, th, tr } from '@/lib/ui';
import { rupiah } from '@/lib/format';

function Sparkline({ data }) {
  if (data.length < 2) return <span className="text-slate-300">-</span>;
  const w = 80, h = 24;
  const min = Math.min(...data), max = Math.max(...data), r = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - 2 - ((v - min) / r) * (h - 4)}`).join(' ');
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={pts} fill="none" stroke="#0A1F4A" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function Perubahan({ v }) {
  if (v == null) return <span className="text-slate-400">-</span>;
  if (Math.abs(v) < 0.5) return <span className="text-slate-500">stabil</span>;
  const naik = v > 0;
  const tajam = v >= 10;
  const cls = naik
    ? tajam ? 'bg-red-100 text-red-800 ring-red-300 font-bold' : 'bg-red-50 text-red-700 ring-red-200'
    : 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`}>
      {naik ? '▲' : '▼'} {Math.abs(v).toFixed(1).replace('.', ',')}%
    </span>
  );
}

export default function Index({ barangs, filters, kategoris }) {
  const [q, setQ] = useState(filters.q ?? '');

  const cari = (extra) => {
    const params = { q, kategori: filters.kategori, ...extra };
    Object.keys(params).forEach((k) => params[k] === '' && delete params[k]);
    router.get('/harga', params, { preserveState: true, preserveScroll: true, replace: true });
  };

  useEffect(() => {
    if (q === (filters.q ?? '')) return;
    const t = setTimeout(() => cari({ q }), 350);
    return () => clearTimeout(t);
  }, [q]);

  const tabs = [['', 'Semua'], ...kategoris.map((k) => [k, k])];

  return (
    <MbgLayout title="Harga">
      <PageHeader title="Pantauan harga" subtitle="Perubahan dibandingkan harga pembelian sebelumnya. Merah tebal berarti naik 10% ke atas." />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {tabs.map(([val, nama]) => {
            const aktif = (filters.kategori ?? '') === val;
            return (
              <button
                key={nama}
                onClick={() => cari({ kategori: val })}
                className={`rounded-full px-3 py-1 text-sm font-medium capitalize ring-1 transition ${
                  aktif ? 'bg-[#0A1F4A] text-white ring-[#0A1F4A]' : 'bg-white text-slate-600 ring-slate-300 hover:bg-slate-50'
                }`}
              >
                {nama}
              </button>
            );
          })}
        </div>
        <input className={`${input} w-full sm:w-72`} placeholder="Cari barang..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className={tableWrap}>
        <table className="w-full">
          <thead className="bg-[#0A1F4A]">
            <tr>{['Barang', 'Harga terakhir', 'Sebelumnya', 'Perubahan', 'Rata-rata 30 hari', 'Rentang 30 hari', 'Tren'].map((h) => <th key={h} className={th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {barangs.data.length === 0 && (
              <tr><td className={`${td} py-10 text-center text-slate-400`} colSpan={7}>Belum ada riwayat harga.</td></tr>
            )}
            {barangs.data.map((b) => (
              <tr key={b.id} className={tr}>
                <td className={`${td} font-medium text-slate-900`}>
                  {b.nama} <span className="ml-1 text-xs text-slate-400">/{b.satuan}</span>
                </td>
                <td className={`${td} whitespace-nowrap font-semibold`}>{b.terakhir != null ? rupiah(b.terakhir) : '-'}</td>
                <td className={`${td} whitespace-nowrap text-slate-500`}>{b.sebelumnya != null ? rupiah(b.sebelumnya) : '-'}</td>
                <td className={td}><Perubahan v={b.perubahan} /></td>
                <td className={`${td} whitespace-nowrap text-slate-500`}>{b.rata30 != null ? rupiah(b.rata30) : '-'}</td>
                <td className={`${td} whitespace-nowrap text-xs text-slate-500`}>
                  {b.min30 != null ? `${rupiah(b.min30)} s/d ${rupiah(b.max30)}` : '-'}
                </td>
                <td className={td}><Sparkline data={b.tren} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination data={barangs} />
    </MbgLayout>
  );
}