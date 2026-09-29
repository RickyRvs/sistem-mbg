import { useEffect, useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import MbgLayout from '@/Layouts/MbgLayout';
import PageHeader from '@/Components/PageHeader';
import Dropdown from '@/Components/Dropdown';
import { btn, input, statusBadge, statusColor, tableWrap, td, th, tr } from '@/lib/ui';
import { rupiah, tanggal } from '@/lib/format';

const statuses = ['draft', 'dikirim', 'dikonfirmasi', 'diterima'];
const dot = { draft: 'bg-slate-400', dikirim: 'bg-sky-500', dikonfirmasi: 'bg-amber-500', diterima: 'bg-emerald-500' };
const labelLink = (l) => l.replace('&laquo; Previous', '←').replace('Next &raquo;', '→');

// empat ruas kecil: berapa tahap yang sudah dilewati PO ini
function Tahap({ status }) {
  const idx = statuses.indexOf(status);
  return (
    <div className="mt-2 flex gap-1" aria-hidden="true">
      {statuses.map((s, i) => (
        <span key={s} className={`h-1 w-6 rounded-full ${i <= idx ? 'bg-[#CFAE6A]' : 'bg-slate-200'}`} />
      ))}
    </div>
  );
}

function AksiStatus({ p, sibuk, onUbah }) {
  const idx = statuses.indexOf(p.status);
  const prev = statuses[idx - 1];
  const next = statuses[idx + 1];

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {prev && (
        <button
          type="button"
          disabled={sibuk}
          onClick={() => onUbah(p, prev)}
          title={`Kembalikan ke ${prev}`}
          aria-label={`Kembalikan ke ${prev}`}
          className="rounded-md px-2 py-1 text-xs font-medium text-slate-500 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:opacity-40"
        >
          ← {prev}
        </button>
      )}
      {next && (
        <button
          type="button"
          disabled={sibuk || !!p.hambatan}
          onClick={() => onUbah(p, next)}
          title={p.hambatan ?? `Lanjutkan ke ${next}`}
          className="rounded-md bg-[#0A1F4A] px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-[#12306e] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
        >
          {sibuk ? 'Menyimpan…' : `${next} →`}
        </button>
      )}
      {next && p.hambatan && (
        <Link href={`/po/${p.id}`} className="text-xs text-amber-700 underline underline-offset-2">
          {p.hambatan}
        </Link>
      )}
    </div>
  );
}

// supplier sekarang per barang: tampilkan daftar nama, dan tandai kalau masih ada barang tanpa supplier
function KolomSupplier({ p }) {
  if (p.suppliers.length === 0) return <span className="text-slate-400">Belum ditentukan</span>;
  const sisa = p.suppliers.length - 2;
  return (
    <>
      <span>{p.suppliers.slice(0, 2).join(', ')}</span>
      {sisa > 0 && <span className="text-slate-400" title={p.suppliers.slice(2).join(', ')}> +{sisa}</span>}
      {p.item_tanpa_supplier > 0 && (
        <span className="mt-1 block text-xs text-amber-600">{p.item_tanpa_supplier} barang belum ada supplier</span>
      )}
    </>
  );
}

export default function Index({ pos, filters, counts }) {
  const { errors } = usePage().props;
  const [q, setQ] = useState(filters.q ?? '');
  const [sibukId, setSibukId] = useState(null);
  const [galat, setGalat] = useState(null);

  const cari = (extra) => {
    const params = { q, status: filters.status, ...extra };
    Object.keys(params).forEach((k) => params[k] === '' && delete params[k]);
    router.get('/po', params, { preserveState: true, preserveScroll: true, replace: true });
  };

  // pencarian jalan otomatis setelah berhenti mengetik
  useEffect(() => {
    if (q === (filters.q ?? '')) return;
    const t = setTimeout(() => cari({ q }), 350);
    return () => clearTimeout(t);
  }, [q]);

  const ubahStatus = (p, ke) => {
    const mundur = statuses.indexOf(ke) < statuses.indexOf(p.status);
    if (mundur) {
      const tarikStok = p.status === 'diterima' ? ' Stok yang sudah masuk dari PO ini akan ditarik lagi.' : '';
      if (!window.confirm(`Kembalikan ${p.nomor} ke "${ke}"?${tarikStok}`)) return;
    }
    setGalat(null);
    router.patch(`/po/${p.id}/status`, { status: ke }, {
      preserveScroll: true,
      preserveState: true,
      onStart: () => setSibukId(p.id),
      onError: (e) => setGalat({ nomor: p.nomor, pesan: e.status ?? 'Status gagal diubah.' }),
      onFinish: () => setSibukId(null),
    });
  };

  const totalSemua = Object.values(counts).reduce((s, n) => s + Number(n), 0);
  const tabs = [['', 'Semua', totalSemua], ...statuses.map((s) => [s, s, counts[s] ?? 0])];
  const tabAktif = tabs.find(([v]) => v === (filters.status ?? '')) ?? tabs[0];
  const pesanGalat = galat ?? (errors?.status ? { pesan: errors.status } : null);

  return (
    <MbgLayout title="Purchase Order">
      <PageHeader title="Purchase order" subtitle={`${pos.total} PO ditemukan`}>
        <Link href="/po/create" className={btn}>+ Buat PO</Link>
      </PageHeader>

      {pesanGalat && (
        <div role="alert" className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p>{pesanGalat.nomor && <strong>{pesanGalat.nomor}: </strong>}{pesanGalat.pesan}</p>
          <button type="button" onClick={() => setGalat(null)} className="text-red-400 hover:text-red-700" aria-label="Tutup">✕</button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-stretch gap-3">
        <Dropdown>
          <Dropdown.Trigger>
            <button
              type="button"
              className="flex h-full items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <span className="text-slate-400">Status</span>
              {tabAktif[0] && <span className={`h-2 w-2 rounded-full ${dot[tabAktif[0]]}`} />}
              <span className="capitalize">{tabAktif[1]}</span>
              <span className="tabular-nums text-slate-400">{tabAktif[2]}</span>
              <svg className="h-4 w-4 text-slate-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </button>
          </Dropdown.Trigger>

          <Dropdown.Content align="left">
            {tabs.map(([val, nama, n]) => {
              const aktif = (filters.status ?? '') === val;
              return (
                <button
                  key={nama}
                  type="button"
                  onClick={() => cari({ status: val })}
                  className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm capitalize transition hover:bg-slate-50 ${
                    aktif ? 'font-semibold text-[#0A1F4A]' : 'text-slate-600'
                  }`}
                >
                  {val ? <span className={`h-2 w-2 rounded-full ${dot[val]}`} /> : <span className="h-2 w-2" />}
                  <span className="flex-1">{nama}</span>
                  <span className={`text-xs tabular-nums ${n === 0 ? 'text-slate-300' : 'text-slate-400'}`}>{n}</span>
                  <span className="w-3 text-[#CFAE6A]">{aktif ? '✓' : ''}</span>
                </button>
              );
            })}
          </Dropdown.Content>
        </Dropdown>

        <input
          className={`${input} min-w-0 flex-1 sm:max-w-sm`}
          placeholder="Cari nomor, SPPG, atau supplier"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className={tableWrap}>
        <table className="w-full">
          <thead className="bg-[#0A1F4A]">
            <tr>{['Nomor', 'SPPG', 'Supplier', 'Tanggal', 'Status', 'Total belanja'].map((h) => <th key={h} className={th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {pos.data.length === 0 && (
              <tr>
                <td className={`${td} py-10 text-center text-slate-400`} colSpan={6}>
                  {filters.q || filters.status ? 'Tidak ada PO yang cocok dengan filter.' : 'Belum ada PO. Klik "Buat PO" untuk mulai.'}
                </td>
              </tr>
            )}
            {pos.data.map((p) => (
              <tr key={p.id} className={`${tr} align-top`}>
                <td className={td}>
                  <Link href={`/po/${p.id}`} className="font-medium text-[#0A1F4A] underline decoration-[#CFAE6A] underline-offset-4">{p.nomor}</Link>
                  <span className="mt-1 block text-xs text-slate-400">{p.item_total} barang</span>
                </td>
                <td className={td}>{p.sppg ?? '-'}</td>
                <td className={td}><KolomSupplier p={p} /></td>
                <td className={`${td} whitespace-nowrap`}>
                  {tanggal(p.tanggal)}
                  <span className="mt-1 block text-xs text-slate-400">
                    {p.tanggal_datang ? `Datang ${tanggal(p.tanggal_datang)}` : 'Tanggal datang belum diisi'}
                  </span>
                </td>
                <td className={td}>
                  <span className={`${statusBadge} ${statusColor[p.status]}`}>{p.status}</span>
                  <Tahap status={p.status} />
                  <AksiStatus p={p} sibuk={sibukId === p.id} onUbah={ubahStatus} />
                </td>
                <td className={`${td} whitespace-nowrap`}>
                  {p.item_berharga === 0 ? (
                    <span className="text-slate-400">Harga belum diisi</span>
                  ) : (
                    <>
                      <span className="font-medium">{rupiah(p.total_modal)}</span>
                      {p.item_berharga < p.item_total && (
                        <>
                          <span className="mt-1 block text-xs text-amber-600">{p.item_berharga}/{p.item_total} barang berharga</span>
                          <span className="mt-1 block h-1 w-24 overflow-hidden rounded-full bg-slate-200">
                            <span className="block h-full bg-amber-500" style={{ width: `${(p.item_berharga / p.item_total) * 100}%` }} />
                          </span>
                        </>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pos.last_page > 1 && (
        <div className="mt-4 flex flex-wrap justify-center gap-1">
          {pos.links.map((l, i) =>
            l.url ? (
              <Link
                key={i}
                href={l.url}
                preserveScroll
                className={`rounded-lg px-3 py-1.5 text-sm ring-1 ${l.active ? 'bg-[#0A1F4A] text-white ring-[#0A1F4A]' : 'bg-white text-slate-600 ring-slate-300 hover:bg-slate-50'}`}
              >
                {labelLink(l.label)}
              </Link>
            ) : (
              <span key={i} className="rounded-lg px-3 py-1.5 text-sm text-slate-300 ring-1 ring-slate-200">{labelLink(l.label)}</span>
            )
          )}
        </div>
      )}
    </MbgLayout>
  );
}