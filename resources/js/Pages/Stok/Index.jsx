// resources/js/Pages/Stok/Index.jsx
import { Link, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import MbgLayout from '@/Layouts/MbgLayout';
import PageHeader from '@/Components/PageHeader';
import Pagination from '@/Components/Pagination';
import { card, input, select } from '@/lib/ui';
import { angka } from '@/lib/format';

const hariIni = () => new Date().toLocaleDateString('sv-SE');

// [teks, kelas badge, kelas garis kiri kartu, kelas meter]
const status = {
  belum: ['Belum ada stok', 'bg-slate-100 text-slate-500 ring-slate-200', 'border-l-slate-300', 'bg-slate-300'],
  habis: ['Habis', 'bg-red-50 text-red-700 ring-red-200', 'border-l-red-500', 'bg-red-500'],
  menipis: ['Menipis', 'bg-amber-50 text-amber-700 ring-amber-200', 'border-l-amber-400', 'bg-amber-500'],
  aman: ['Aman', 'bg-emerald-50 text-emerald-700 ring-emerald-200', 'border-l-emerald-400', 'bg-emerald-500'],
};

function KartuStok({ s, isi, setIsi, sibuk, boleh, ubah }) {
  const [teks, kelasBadge, kelasGaris, kelasMeter] = status[s.status] ?? status.belum;
  const nilai = isi[s.id] ?? '';
  const kosong = !(parseFloat(nilai) > 0);
  const mati = sibuk === s.id || !boleh || kosong;
  const lebar = s.minimum > 0 ? Math.max(0, Math.min(1, s.stok / (s.minimum * 2))) * 100 : null;

  return (
    <div className={`flex flex-col gap-2 rounded-xl border-l-4 bg-white p-3 shadow-sm ring-1 ring-slate-200 ${kelasGaris}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{s.nama}</p>
          <p className="text-[11px] capitalize text-slate-400">{s.kategori}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${kelasBadge}`}>{teks}</span>
      </div>

      <div>
        <p className="text-xl font-bold leading-tight text-[#0A1F4A]">
          {angka(s.stok)} <span className="text-sm font-medium text-slate-500">{s.satuan}</span>
        </p>
        {lebar != null && (
          <span className="relative mt-1.5 block h-1 w-full overflow-hidden rounded-full bg-slate-200" title={`Minimum ${angka(s.minimum)} ${s.satuan}`}>
            <span className={`block h-full ${kelasMeter}`} style={{ width: `${lebar}%` }} />
            <span className="absolute inset-y-0 left-1/2 w-px bg-slate-500/60" />
          </span>
        )}
        <p className="mt-1 text-[11px] text-slate-400">
          {s.minimum > 0 ? `Min ${angka(s.minimum)} ${s.satuan}` : 'Tanpa minimum'}
          {s.sisa_hari != null && ` · cukup ±${s.sisa_hari} hari`}
        </p>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={mati}
          onClick={() => ubah(s, 'keluar')}
          title="Kurangi stok (dipakai)"
          aria-label={`Kurangi stok ${s.nama}`}
          className="h-9 w-9 shrink-0 rounded-lg bg-red-50 text-lg font-bold leading-none text-red-600 ring-1 ring-red-200 transition enabled:hover:bg-red-100 disabled:opacity-30"
        >−</button>
        <input
          type="number" min="0" step="0.001" inputMode="decimal"
          aria-label={`Jumlah ${s.nama}`}
          className={`${input} h-9 min-w-0 flex-1 text-center text-sm`}
          placeholder={s.satuan}
          value={nilai}
          onChange={(e) => setIsi((x) => ({ ...x, [s.id]: e.target.value }))}
        />
        <button
          type="button"
          disabled={mati}
          onClick={() => ubah(s, 'masuk')}
          title="Tambah stok"
          aria-label={`Tambah stok ${s.nama}`}
          className="h-9 w-9 shrink-0 rounded-lg bg-emerald-50 text-lg font-bold leading-none text-emerald-600 ring-1 ring-emerald-200 transition enabled:hover:bg-emerald-100 disabled:opacity-30"
        >+</button>
      </div>

      <Link
        href={`/barang?q=${encodeURIComponent(s.nama)}`}
        className="self-end text-[11px] font-medium text-[#0A1F4A] underline decoration-[#CFAE6A] underline-offset-4"
      >
        Detail →
      </Link>
    </div>
  );
}

export default function Index({ stok, filters, sppgs, ringkas, kartuKategori }) {
  const [q, setQ] = useState(filters.q ?? '');
  const [isi, setIsi] = useState({});
  const [sibuk, setSibuk] = useState(null);
  const [galat, setGalat] = useState(null);
  const [info, setInfo] = useState(null);
  const timerInfo = useRef(null);

  // kalau cuma ada satu SPPG, langsung dipakai
  const sppgId = filters.sppg_id || (sppgs.length === 1 ? String(sppgs[0].id) : '');
  const boleh = !!sppgId;
  const perhatian = ringkas.menipis + ringkas.habis;

  const pindah = (extra) => {
    const params = {
      q,
      kategori: filters.kategori,
      sppg_id: filters.sppg_id,
      kurang: filters.kurang ? 1 : '',
      ...extra,
    };
    Object.keys(params).forEach((k) => (params[k] === '' || params[k] === false) && delete params[k]);
    router.get('/stok', params, { preserveState: true, preserveScroll: true, replace: true });
  };

  useEffect(() => {
    if (q === (filters.q ?? '')) return;
    const t = setTimeout(() => pindah({ q }), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => () => clearTimeout(timerInfo.current), []);

  const ubah = (s, tipe) => {
    const qty = parseFloat(isi[s.id]);
    if (!sppgId || !(qty > 0)) return;
    setGalat(null);
    router.post('/stok', {
      sppg_id: sppgId,
      barang_id: s.id,
      tipe,
      qty,
      tanggal: hariIni(),
      keterangan: tipe === 'masuk' ? 'Tambah stok manual' : 'Pemakaian manual',
    }, {
      preserveScroll: true,
      preserveState: true,
      onStart: () => setSibuk(s.id),
      onSuccess: () => {
        setIsi((x) => ({ ...x, [s.id]: '' }));
        setInfo(`${s.nama} ${tipe === 'masuk' ? 'ditambah' : 'dikurangi'} ${angka(qty)} ${s.satuan}`);
        clearTimeout(timerInfo.current);
        timerInfo.current = setTimeout(() => setInfo(null), 3000);
      },
      onError: (e) => setGalat(`${s.nama}: ${e.qty ?? e.sppg_id ?? 'gagal disimpan.'}`),
      onFinish: () => setSibuk(null),
    });
  };

  const pil = (aktif) =>
    `rounded-full px-3 py-1 text-xs font-medium capitalize ring-1 transition ${
      aktif ? 'bg-[#0A1F4A] text-white ring-[#0A1F4A]' : 'bg-white text-slate-600 ring-slate-300 hover:bg-slate-50'
    }`;

  const adaFilter = filters.q || filters.kategori || filters.kurang;

  return (
    <MbgLayout title="Stok">
      <PageHeader title="Stok live" subtitle="Lihat sisa stok, lalu tambah atau kurangi langsung dari kartunya." />

      {/* ringkasan: satu baris kecil */}
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-lg bg-white px-3 py-1.5 shadow-sm ring-1 ring-slate-200">
          <span className="text-slate-500">Jenis barang</span> <b className="ml-1 text-[#0A1F4A]">{ringkas.total}</b>
        </span>
        <button
          type="button"
          disabled={ringkas.menipis === 0}
          onClick={() => pindah({ kurang: 1 })}
          className="rounded-lg bg-white px-3 py-1.5 shadow-sm ring-1 ring-slate-200 transition enabled:hover:ring-amber-300 disabled:cursor-default"
        >
          <span className="text-slate-500">Menipis</span>{' '}
          <b className={`ml-1 ${ringkas.menipis > 0 ? 'text-amber-600' : 'text-slate-400'}`}>{ringkas.menipis}</b>
        </button>
        <button
          type="button"
          disabled={ringkas.habis === 0}
          onClick={() => pindah({ kurang: 1 })}
          className="rounded-lg bg-white px-3 py-1.5 shadow-sm ring-1 ring-slate-200 transition enabled:hover:ring-red-300 disabled:cursor-default"
        >
          <span className="text-slate-500">Habis</span>{' '}
          <b className={`ml-1 ${ringkas.habis > 0 ? 'text-red-600' : 'text-slate-400'}`}>{ringkas.habis}</b>
        </button>
      </div>

      {/* cari + pilih SPPG dalam satu baris */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          className={`${input} h-9 min-w-[200px] flex-1 text-sm`}
          placeholder="Cari barang, mis. bawang"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {sppgs.length > 1 && (
          <select
            aria-label="SPPG"
            className={`${select} h-9 w-48 text-sm`}
            value={filters.sppg_id ?? ''}
            onChange={(e) => pindah({ sppg_id: e.target.value })}
          >
            <option value="">Semua SPPG</option>
            {sppgs.map((s) => <option key={s.id} value={s.id}>{s.nama}</option>)}
          </select>
        )}
      </div>

      {/* kategori */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        <button type="button" className={pil(!filters.kategori)} onClick={() => pindah({ kategori: '' })}>
          Semua
        </button>
        {kartuKategori.map((k) => (
          <button key={k.nama} type="button" className={pil(filters.kategori === k.nama)} onClick={() => pindah({ kategori: k.nama })}>
            {k.nama} <span className="opacity-60">{k.jumlah}</span>
            {k.menipis + k.habis > 0 && <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-amber-400 align-middle" title="Ada yang perlu diisi ulang" />}
          </button>
        ))}
        {filters.kurang ? (
          <button type="button" className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-200" onClick={() => pindah({ kurang: '' })}>
            Hanya yang perlu diisi ulang ✕
          </button>
        ) : perhatian > 0 ? (
          <button type="button" className="rounded-full px-3 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200 hover:bg-amber-50" onClick={() => pindah({ kurang: 1 })}>
            Perlu diisi ulang ({perhatian})
          </button>
        ) : null}
      </div>

      {!boleh && (
        <p className="mb-3 rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
          Stok yang tampil adalah gabungan semua SPPG. Pilih satu SPPG dulu kalau mau menambah atau mengurangi stok.
        </p>
      )}

      {info && (
        <div role="status" className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 ring-1 ring-emerald-200">
          ✓ {info}
        </div>
      )}

      {galat && (
        <div role="alert" className="mb-3 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <p>{galat}</p>
          <button type="button" onClick={() => setGalat(null)} aria-label="Tutup" className="text-red-400 hover:text-red-700">✕</button>
        </div>
      )}

      {/* daftar kartu */}
      {stok.data.length === 0 ? (
        <div className={`${card} py-8 text-center text-sm text-slate-400`}>
          {adaFilter ? 'Tidak ada barang yang cocok.' : 'Belum ada barang.'}
        </div>
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {stok.data.map((s) => (
            <KartuStok key={s.id} s={s} isi={isi} setIsi={setIsi} sibuk={sibuk} boleh={boleh} ubah={ubah} />
          ))}
        </div>
      )}

      <Pagination data={stok} />

      <p className="mt-5 text-center text-xs text-slate-400">
        Perlu lihat riwayat, ubah stok minimum, atau kelola barang? Buka <Link href="/barang" className="font-medium text-[#0A1F4A] underline decoration-[#CFAE6A] underline-offset-4">Master barang</Link>.
      </p>
    </MbgLayout>
  );
}