// resources/js/Pages/Supplier/Show.jsx
import { Link, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import MbgLayout from '@/Layouts/MbgLayout';
import PageHeader from '@/Components/PageHeader';
import Pagination from '@/Components/Pagination';
import { btnGhost, card, input, statusBadge, statusColor, tableWrap, td, th, tr } from '@/lib/ui';
import { angka, rupiah, tanggal } from '@/lib/format';

export default function Show({ supplier, pos, filters, ringkasan }) {
  const [q, setQ] = useState(filters.q ?? '');

  useEffect(() => {
    if (q === (filters.q ?? '')) return;
    const t = setTimeout(() => {
      router.get(`/supplier/${supplier.id}`, q ? { q } : {}, { preserveState: true, preserveScroll: true, replace: true });
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <MbgLayout title={supplier.nama}>
      <PageHeader title={supplier.nama} subtitle="Riwayat PO dari supplier ini">
        <Link href="/barang" className={btnGhost}>← Kembali</Link>
      </PageHeader>

      <div className={`${card} mb-4 flex flex-wrap items-center gap-x-10 gap-y-3`}>
        <div>
          <p className="text-xs text-slate-400">Jumlah PO</p>
          <p className="text-lg font-bold text-[#0A1F4A]">{ringkasan.jumlah_po}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Total belanja (dikonfirmasi/diterima)</p>
          <p className="text-lg font-bold text-[#0A1F4A]">{rupiah(ringkasan.total)}</p>
        </div>
        <input className={`${input} ml-auto w-full sm:w-64`} placeholder="Cari barang..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className={tableWrap}>
        <table className="w-full">
          <thead className="bg-[#0A1F4A]">
            <tr>{['PO', 'Tanggal', 'Barang dari supplier ini', 'Status', 'Total'].map((h) => <th key={h} className={th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {pos.data.length === 0 && (
              <tr><td className={`${td} py-10 text-center text-slate-400`} colSpan={5}>{filters.q ? 'Tidak ada PO yang cocok.' : 'Belum ada PO dari supplier ini.'}</td></tr>
            )}
            {pos.data.map((p) => (
              <tr key={p.id} className={`${tr} align-top`}>
                <td className={td}>
                  <Link href={`/po/${p.id}`} className="font-medium text-[#0A1F4A] underline decoration-[#CFAE6A] underline-offset-4">{p.nomor}</Link>
                  <span className="block text-xs text-slate-400">{p.sppg ?? '-'}</span>
                </td>
                <td className={`${td} whitespace-nowrap`}>
                  {tanggal(p.tanggal)}
                  <span className="block text-xs text-slate-400">{p.tanggal_datang ? `Datang ${tanggal(p.tanggal_datang)}` : 'Belum ada tanggal datang'}</span>
                </td>
                <td className={td}>
                  <ul className="space-y-0.5 text-sm">
                    {p.items.map((i) => (
                      <li key={i.id} className="flex flex-wrap justify-between gap-x-4">
                        <span>{i.barang} <span className="text-slate-400">{angka(i.qty)} {i.satuan}</span></span>
                        <span className="text-slate-600">{i.harga != null ? `${rupiah(i.harga)}/${i.satuan}` : <span className="text-slate-300">belum ada harga</span>}</span>
                      </li>
                    ))}
                  </ul>
                </td>
                <td className={td}><span className={`${statusBadge} ${statusColor[p.status]}`}>{p.status}</span></td>
                <td className={`${td} whitespace-nowrap font-medium`}>{p.total > 0 ? rupiah(p.total) : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination data={pos} />
    </MbgLayout>
  );
}