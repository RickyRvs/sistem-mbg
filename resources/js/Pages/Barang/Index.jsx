// resources/js/Pages/Barang/Index.jsx
import { router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import MbgLayout from '@/Layouts/MbgLayout';
import PageHeader from '@/Components/PageHeader';
import Pagination from '@/Components/Pagination';
import { btn, btnGhost, card, input, label, select, tableWrap, td, th, tr } from '@/lib/ui';
import { angka } from '@/lib/format';

const satuanUmum = ['kg', 'gram', 'liter', 'ekor', 'butir', 'ikat', 'pcs', 'pack', 'karung'];
const hariIni = () => new Date().toLocaleDateString('sv-SE');

const badge = {
  kering: 'bg-amber-50 text-amber-700 ring-amber-200',
  sayur: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  livestock: 'bg-rose-50 text-rose-700 ring-rose-200',
  lainnya: 'bg-slate-100 text-slate-600 ring-slate-200',
};
// warna untuk kategori buatan sendiri, dipilih tetap berdasarkan namanya
const warnaCadangan = [
  'bg-sky-50 text-sky-700 ring-sky-200',
  'bg-violet-50 text-violet-700 ring-violet-200',
  'bg-teal-50 text-teal-700 ring-teal-200',
  'bg-orange-50 text-orange-700 ring-orange-200',
  'bg-pink-50 text-pink-700 ring-pink-200',
];
const badgeKat = (k) => badge[k] ?? warnaCadangan[[...String(k)].reduce((a, c) => a + c.charCodeAt(0), 0) % warnaCadangan.length];

const statusStok = {
  belum: ['Belum ada stok', 'bg-slate-100 text-slate-500 ring-slate-200', 'bg-slate-300'],
  habis: ['Habis', 'bg-red-50 text-red-700 ring-red-200', 'bg-red-500'],
  menipis: ['Menipis', 'bg-amber-50 text-amber-700 ring-amber-200', 'bg-amber-500'],
  aman: ['Aman', 'bg-emerald-50 text-emerald-700 ring-emerald-200', 'bg-emerald-500'],
};

const ikon = {
  stok: ['M21 8l-9-5-9 5v8l9 5 9-5V8z', 'M3 8l9 5 9-5', 'M12 13v8'],
  edit: ['M12 20h9', 'M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z'],
  hapus: ['M3 6h18', 'M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2', 'M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6', 'M10 11v6', 'M14 11v6'],
  tag: ['M20.6 13.4l-7.2 7.2a2 2 0 01-2.8 0L3 13V3h10l7.6 7.6a2 2 0 010 2.8z', 'M7.5 7.5h.01'],
};

function IconBtn({ nama, tip, kelas = 'text-slate-600 hover:bg-slate-100', ...rest }) {
  return (
    <button
      type="button"
      title={tip}
      aria-label={tip}
      className={`grid h-9 w-9 place-items-center rounded-lg transition disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent ${kelas}`}
      {...rest}
    >
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {ikon[nama].map((d, i) => <path key={i} d={d} />)}
      </svg>
    </button>
  );
}

const Err = ({ m }) => (m ? <p className="mt-1 text-xs text-red-600">{m}</p> : null);

function Dropdown({ label: judul, value, options, onChange }) {
  const [buka, setBuka] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const klik = (e) => ref.current && !ref.current.contains(e.target) && setBuka(false);
    const esc = (e) => e.key === 'Escape' && setBuka(false);
    document.addEventListener('mousedown', klik);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', klik);
      document.removeEventListener('keydown', esc);
    };
  }, []);

  const dipilih = options.find((o) => o.value === value) ?? options[0];

  return (
    <div ref={ref} className="relative">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">{judul}</p>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={buka}
        onClick={() => setBuka(!buka)}
        className="flex h-10 w-full min-w-[170px] items-center justify-between gap-3 rounded-lg bg-white px-3 text-sm font-medium text-slate-700 ring-1 ring-slate-300 transition hover:ring-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0A1F4A]"
      >
        <span className="truncate capitalize">{dipilih.label}</span>
        <span className="flex items-center gap-2">
          {dipilih.count != null && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{dipilih.count}</span>}
          <svg viewBox="0 0 20 20" className={`h-4 w-4 text-slate-400 transition ${buka ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 8l5 5 5-5" /></svg>
        </span>
      </button>
      {buka && (
        <ul role="listbox" className="absolute z-30 mt-1 max-h-64 w-full min-w-[200px] overflow-auto rounded-xl bg-white p-1 shadow-lg ring-1 ring-slate-200">
          {options.map((o) => {
            const aktif = o.value === value;
            return (
              <li key={o.value || 'semua'} role="option" aria-selected={aktif}>
                <button
                  type="button"
                  onClick={() => { setBuka(false); onChange(o.value); }}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm capitalize transition ${
                    aktif ? 'bg-[#0A1F4A] text-white' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="truncate">{o.label}</span>
                  {o.count != null && <span className={`text-xs ${aktif ? 'text-white/70' : 'text-slate-400'}`}>{o.count}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div role="dialog" aria-modal="true" aria-label={title} className={`${card} w-full max-w-md`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-[#0A1F4A]">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Tutup" className="rounded p-1 text-slate-400 hover:text-slate-600">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// tambah, ubah nama, dan hapus kategori
function KategoriModal({ kategoris, onClose }) {
  const f = useForm({ nama: '' });
  const [edit, setEdit] = useState(null); // { id, nama }
  const [galat, setGalat] = useState('');

  const tambah = (e) => {
    e.preventDefault();
    setGalat('');
    f.post('/kategori', { preserveScroll: true, onSuccess: () => f.reset() });
  };

  const simpan = () => {
    router.patch(`/kategori/${edit.id}`, { nama: edit.nama }, {
      preserveScroll: true,
      onSuccess: () => { setEdit(null); setGalat(''); },
      onError: (e) => setGalat(e.nama || 'Gagal menyimpan.'),
    });
  };

  const hapus = (k) => {
    if (!confirm(`Hapus kategori ${k.nama}?`)) return;
    setGalat('');
    router.delete(`/kategori/${k.id}`, {
      preserveScroll: true,
      onError: (e) => setGalat(e.kategori || 'Gagal menghapus.'),
    });
  };

  return (
    <Modal title="Kelola kategori" onClose={onClose}>
      <form onSubmit={tambah} className="mb-4">
        <label className={label}>Kategori baru</label>
        <div className="flex gap-2">
          <input className={input} maxLength={30} placeholder="cth: bumbu, minuman" value={f.data.nama} onChange={(e) => f.setData('nama', e.target.value)} />
          <button className={btn} disabled={f.processing || !f.data.nama.trim()}>Tambah</button>
        </div>
        <Err m={f.errors.nama} />
      </form>

      {galat && <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{galat}</p>}

      <ul className="max-h-72 divide-y divide-slate-100 overflow-auto rounded-xl ring-1 ring-slate-200">
        {kategoris.map((k) => {
          const tetap = k.nama === 'lainnya';
          const sedangEdit = edit?.id === k.id;
          return (
            <li key={k.id} className="flex items-center gap-2 px-3 py-2">
              {sedangEdit ? (
                <>
                  <input
                    autoFocus
                    className={`${input} h-9`}
                    maxLength={30}
                    value={edit.nama}
                    onChange={(e) => setEdit({ ...edit, nama: e.target.value })}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); simpan(); } }}
                  />
                  <button type="button" className="text-sm font-medium text-[#0A1F4A]" onClick={simpan}>Simpan</button>
                  <button type="button" className="text-sm text-slate-400" onClick={() => { setEdit(null); setGalat(''); }}>Batal</button>
                </>
              ) : (
                <>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${badgeKat(k.nama)}`}>{k.nama}</span>
                  <span className="text-xs text-slate-400">{k.jumlah} barang</span>
                  <span className="ml-auto flex gap-1">
                    <IconBtn nama="edit" tip={tetap ? 'Kategori cadangan, tidak bisa diubah' : 'Ubah nama'} disabled={tetap} onClick={() => { setGalat(''); setEdit({ id: k.id, nama: k.nama }); }} />
                    <IconBtn
                      nama="hapus"
                      tip={tetap ? 'Kategori cadangan, tidak bisa dihapus' : k.jumlah > 0 ? 'Masih dipakai barang' : 'Hapus kategori'}
                      kelas="text-red-600 hover:bg-red-50"
                      disabled={tetap || k.jumlah > 0}
                      onClick={() => hapus(k)}
                    />
                  </span>
                </>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-slate-400">Kategori hanya bisa dihapus kalau tidak ada barang di dalamnya. Mengubah nama otomatis memindahkan semua barangnya.</p>
      <div className="mt-4 flex justify-end">
        <button type="button" className={btnGhost} onClick={onClose}>Tutup</button>
      </div>
    </Modal>
  );
}

// tambah, ubah nama, dan hapus supplier
function SupplierModal({ suppliers, onClose }) {
  const f = useForm({ nama: '' });
  const [edit, setEdit] = useState(null); // { id, nama }
  const [galat, setGalat] = useState('');

  const tambah = (e) => {
    e.preventDefault();
    setGalat('');
    f.post('/supplier', { preserveScroll: true, onSuccess: () => f.reset() });
  };

  const simpan = () => {
    router.patch(`/supplier/${edit.id}`, { nama: edit.nama }, {
      preserveScroll: true,
      onSuccess: () => { setEdit(null); setGalat(''); },
      onError: (e) => setGalat(e.nama || 'Gagal menyimpan.'),
    });
  };

  const hapus = (s) => {
    if (!confirm(`Hapus supplier ${s.nama}?`)) return;
    setGalat('');
    router.delete(`/supplier/${s.id}`, {
      preserveScroll: true,
      onError: (e) => setGalat(e.supplier || 'Gagal menghapus.'),
    });
  };

  return (
    <Modal title="Kelola supplier" onClose={onClose}>
      <form onSubmit={tambah} className="mb-4">
        <label className={label}>Supplier baru</label>
        <div className="flex gap-2">
          <input className={input} maxLength={100} placeholder="cth: CV Tani Makmur" value={f.data.nama} onChange={(e) => f.setData('nama', e.target.value)} />
          <button className={btn} disabled={f.processing || !f.data.nama.trim()}>Tambah</button>
        </div>
        <Err m={f.errors.nama} />
      </form>

      {galat && <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{galat}</p>}

      <ul className="max-h-72 divide-y divide-slate-100 overflow-auto rounded-xl ring-1 ring-slate-200">
        {suppliers.length === 0 && <li className="px-3 py-6 text-center text-sm text-slate-400">Belum ada supplier.</li>}
        {suppliers.map((s) => {
          const sedangEdit = edit?.id === s.id;
          return (
            <li key={s.id} className="flex items-center gap-2 px-3 py-2">
              {sedangEdit ? (
                <>
                  <input
                    autoFocus
                    className={`${input} h-9`}
                    maxLength={100}
                    value={edit.nama}
                    onChange={(e) => setEdit({ ...edit, nama: e.target.value })}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); simpan(); } }}
                  />
                  <button type="button" className="text-sm font-medium text-[#0A1F4A]" onClick={simpan}>Simpan</button>
                  <button type="button" className="text-sm text-slate-400" onClick={() => { setEdit(null); setGalat(''); }}>Batal</button>
                </>
              ) : (
                <>
                  <span className="text-sm font-medium text-slate-800">{s.nama}</span>
                  <span className="text-xs text-slate-400">{s.item} item PO</span>
                  <span className="ml-auto flex gap-1">
                    <IconBtn nama="edit" tip="Ubah nama" onClick={() => { setGalat(''); setEdit({ id: s.id, nama: s.nama }); }} />
                    <IconBtn
                      nama="hapus"
                      tip={s.dipakai ? 'Sudah dipakai di PO atau riwayat harga' : 'Hapus supplier'}
                      kelas="text-red-600 hover:bg-red-50"
                      disabled={s.dipakai}
                      onClick={() => hapus(s)}
                    />
                  </span>
                </>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-slate-400">Supplier dipilih per barang di tiap PO. Supplier yang sudah dipakai di PO atau riwayat harga tidak bisa dihapus, tapi namanya boleh diubah.</p>
      <div className="mt-4 flex justify-end">
        <button type="button" className={btnGhost} onClick={onClose}>Tutup</button>
      </div>
    </Modal>
  );
}

// dipakai untuk tambah (b = null) dan edit
function BarangModal({ b, kategoris, onClose }) {
  const baru = !b;
  const f = useForm({
    nama: b?.nama ?? '',
    kategori: b?.kategori ?? kategoris[0]?.nama ?? '',
    satuan: b?.satuan ?? 'kg',
    stok_minimum: b ? String(b.stok_minimum || '') : '',
  });
  const [lagi, setLagi] = useState(false);
  const [katBaru, setKatBaru] = useState(false);
  const namaRef = useRef(null);
  const kunciSatuan = !baru && b.dipakai;

  useEffect(() => { namaRef.current?.focus(); }, []);

  const pilihKategori = (v) => {
    if (v === '__baru') {
      setKatBaru(true);
      f.setData('kategori', '');
    } else {
      setKatBaru(false);
      f.setData('kategori', v);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    if (baru) {
      f.post('/barang', {
        preserveScroll: true,
        onSuccess: () => {
          setKatBaru(false); // kategori barunya sekarang sudah masuk daftar
          if (lagi) {
            f.reset('nama', 'stok_minimum');
            namaRef.current?.focus();
          } else onClose();
        },
      });
    } else {
      f.patch(`/barang/${b.id}`, { preserveScroll: true, onSuccess: onClose });
    }
  };

  return (
    <Modal title={baru ? 'Tambah barang' : 'Edit barang'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className={label}>Nama barang</label>
          <input ref={namaRef} className={input} placeholder="cth: Beras" value={f.data.nama} onChange={(e) => f.setData('nama', e.target.value)} />
          <Err m={f.errors.nama} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>Kategori</label>
            <select className={`${select} capitalize`} value={katBaru ? '__baru' : f.data.kategori} onChange={(e) => pilihKategori(e.target.value)}>
              {kategoris.map((k) => <option key={k.id} value={k.nama}>{k.nama}</option>)}
              <option value="__baru">＋ Kategori baru…</option>
            </select>
            {katBaru && (
              <input
                autoFocus
                className={`${input} mt-2`}
                maxLength={30}
                placeholder="Nama kategori baru"
                value={f.data.kategori}
                onChange={(e) => f.setData('kategori', e.target.value)}
              />
            )}
            <Err m={f.errors.kategori} />
          </div>
          <div>
            <label className={label}>Satuan</label>
            <input
              className={`${input} disabled:bg-slate-50 disabled:text-slate-400`}
              list="satuan-umum" placeholder="kg, liter, ekor"
              disabled={kunciSatuan}
              value={f.data.satuan} onChange={(e) => f.setData('satuan', e.target.value)}
            />
            {kunciSatuan && <p className="mt-1 text-xs text-slate-400">Dikunci karena barang sudah dipakai di PO atau stok.</p>}
            <Err m={f.errors.satuan} />
          </div>
        </div>
        <div>
          <label className={label}>Stok minimum ({f.data.satuan || 'satuan'})</label>
          <input type="number" min="0" step="0.001" className={input} placeholder="0" value={f.data.stok_minimum} onChange={(e) => f.setData('stok_minimum', e.target.value)} />
          <p className="mt-1 text-xs text-slate-400">Kalau stok sama dengan atau di bawah angka ini, status jadi "menipis". Isi 0 kalau tidak perlu dipantau.</p>
          <Err m={f.errors.stok_minimum} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          {baru ? (
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={lagi} onChange={(e) => setLagi(e.target.checked)} />
              Tambah lagi setelah simpan
            </label>
          ) : <span />}
          <div className="flex gap-3">
            <button type="button" className={btnGhost} onClick={onClose}>Batal</button>
            <button className={btn} disabled={f.processing}>{f.processing ? 'Menyimpan…' : 'Simpan'}</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

// dua mode: catat pemakaian (stok berkurang) dan opname (stok awal / hitung fisik)
function StokModal({ b, sppgs, sppgAwal, onClose }) {
  const [mode, setMode] = useState('pakai'); // 'pakai' | 'opname'
  const f = useForm({
    sppg_id: sppgs.length === 1 ? String(sppgs[0].id) : (sppgAwal || ''),
    barang_id: b.id,
    qty: '',
    stok_baru: '',
    tanggal: hariIni(),
    keterangan: '',
  });

  const sekarang = f.data.sppg_id ? (b.stok_sppg?.[f.data.sppg_id] ?? 0) : null;

  const qty = parseFloat(f.data.qty);
  const sisaSetelah = sekarang != null && !isNaN(qty) ? sekarang - Math.abs(qty) : null;
  const kelebihan = sisaSetelah != null && sisaSetelah < -0.0005;

  const selisih = sekarang != null && f.data.stok_baru !== '' ? parseFloat(f.data.stok_baru) - sekarang : null;

  const siap = f.data.sppg_id && (mode === 'pakai' ? f.data.qty !== '' && qty > 0 && !kelebihan : f.data.stok_baru !== '');

  const submit = (e) => {
    e.preventDefault();
    f.transform((d) =>
      mode === 'pakai'
        ? { sppg_id: d.sppg_id, barang_id: d.barang_id, tipe: 'keluar', qty: d.qty, tanggal: d.tanggal, keterangan: d.keterangan }
        : { sppg_id: d.sppg_id, barang_id: d.barang_id, stok_baru: d.stok_baru, keterangan: d.keterangan }
    );
    f.post(mode === 'pakai' ? '/stok' : '/stok/opname', { preserveScroll: true, onSuccess: onClose });
  };

  const tab = (k, nama) => (
    <button
      type="button"
      onClick={() => { setMode(k); f.clearErrors(); }}
      className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${mode === k ? 'bg-white text-[#0A1F4A] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
    >
      {nama}
    </button>
  );

  return (
    <Modal title={`Stok: ${b.nama}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {tab('pakai', 'Catat pemakaian')}
          {tab('opname', 'Hitung ulang (opname)')}
        </div>

        <p className="text-xs text-slate-500">
          {mode === 'pakai'
            ? 'Mengurangi stok karena barang dipakai. Stok bertambah otomatis saat PO diterima.'
            : 'Untuk stok awal atau cek fisik gudang. Selisihnya dicatat sebagai koreksi.'}
        </p>

        <div>
          <label className={label}>SPPG</label>
          <select className={select} value={f.data.sppg_id} onChange={(e) => f.setData('sppg_id', e.target.value)}>
            <option value="">Pilih SPPG</option>
            {sppgs.map((s) => <option key={s.id} value={s.id}>{s.nama}</option>)}
          </select>
          <Err m={f.errors.sppg_id} />
          {sekarang != null && (
            <p className="mt-1 text-xs text-slate-500">Stok tercatat saat ini: <b>{angka(sekarang)} {b.satuan}</b></p>
          )}
        </div>

        {mode === 'pakai' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label}>Jumlah dipakai ({b.satuan})</label>
              <input type="number" min="0" step="0.001" className={input} value={f.data.qty} onChange={(e) => f.setData('qty', e.target.value)} />
              <Err m={f.errors.qty} />
              {kelebihan && <p className="mt-1 text-xs text-red-600">Melebihi stok tercatat ({angka(sekarang)} {b.satuan}).</p>}
              {sisaSetelah != null && !kelebihan && (
                <p className="mt-1 text-xs text-slate-500">Sisa setelah dipakai: <b>{angka(Math.max(0, sisaSetelah))} {b.satuan}</b></p>
              )}
            </div>
            <div>
              <label className={label}>Tanggal</label>
              <input type="date" className={input} value={f.data.tanggal} onChange={(e) => f.setData('tanggal', e.target.value)} />
              <Err m={f.errors.tanggal} />
            </div>
          </div>
        ) : (
          <div>
            <label className={label}>Stok sebenarnya ({b.satuan})</label>
            <input type="number" min="0" step="0.001" className={input} placeholder="Hitungan fisik di gudang" value={f.data.stok_baru} onChange={(e) => f.setData('stok_baru', e.target.value)} />
            <Err m={f.errors.stok_baru} />
            {selisih != null && Math.abs(selisih) >= 0.0005 && (
              <p className={`mt-1 text-xs font-medium ${selisih > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                Akan dicatat koreksi {selisih > 0 ? '+' : ''}{angka(selisih)} {b.satuan}
              </p>
            )}
            {selisih != null && Math.abs(selisih) < 0.0005 && (
              <p className="mt-1 text-xs text-slate-400">Sama dengan stok tercatat, tidak ada yang berubah.</p>
            )}
          </div>
        )}

        <div>
          <label className={label}>Keterangan</label>
          <input className={input} maxLength={255} placeholder={mode === 'pakai' ? 'mis. menu Senin' : 'mis. stok awal, opname akhir bulan'} value={f.data.keterangan} onChange={(e) => f.setData('keterangan', e.target.value)} />
          <Err m={f.errors.keterangan} />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className={btnGhost} onClick={onClose}>Batal</button>
          <button className={btn} disabled={f.processing || !siap}>
            {f.processing ? 'Menyimpan…' : mode === 'pakai' ? 'Catat pemakaian' : 'Simpan stok'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// batang kecil: garis tengah = batas minimum
function MeterStok({ b }) {
  if (!(b.stok_minimum > 0)) return null;
  const lebar = Math.max(0, Math.min(1, b.stok / (b.stok_minimum * 2))) * 100;
  return (
    <span className="relative mt-1.5 block h-1.5 w-28 overflow-hidden rounded-full bg-slate-200" title={`Minimum ${angka(b.stok_minimum)} ${b.satuan}`}>
      <span className={`block h-full ${statusStok[b.status][2]}`} style={{ width: `${lebar}%` }} />
      <span className="absolute inset-y-0 left-1/2 w-px bg-slate-500/60" />
    </span>
  );
}

export default function Index({ barangs, filters, total, ringkas, kategoris, sppgs, suppliers }) {
  const { errors } = usePage().props;
  const [q, setQ] = useState(filters.q ?? '');
  const [modal, setModal] = useState(null); // { jenis: 'baru' | 'edit' | 'stok' | 'kategori' | 'supplier', b }
  const [tampilSppg, setTampilSppg] = useState(true);
  const [tutupGalat, setTutupGalat] = useState(false);

  const sppgId = filters.sppg_id ?? '';
  const sppgAktif = sppgs.find((s) => String(s.id) === sppgId);

  const cari = (extra) => {
    const params = { q, kategori: filters.kategori, status: filters.status, sppg_id: filters.sppg_id, ...extra };
    Object.keys(params).forEach((k) => params[k] === '' && delete params[k]);
    router.get('/barang', params, { preserveState: true, preserveScroll: true, replace: true });
  };

  // cari otomatis setelah berhenti mengetik
  useEffect(() => {
    if (q === (filters.q ?? '')) return;
    const t = setTimeout(() => cari({ q }), 350);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => { setTutupGalat(false); }, [errors?.hapus]);

  const hapus = (b) => {
    if (confirm(`Hapus ${b.nama}?`)) router.delete(`/barang/${b.id}`, { preserveScroll: true });
  };

  const opsiKategori = [
    { value: '', label: 'Semua kategori', count: total },
    ...kategoris.map((k) => ({ value: k.nama, label: k.nama, count: k.jumlah })),
  ];
  const opsiSppg = [{ value: '', label: 'Semua SPPG' }, ...sppgs.map((s) => ({ value: String(s.id), label: s.nama }))];
  const opsiStatus = [
    { value: '', label: 'Semua status' },
    { value: 'menipis', label: 'Menipis', count: ringkas.menipis },
    { value: 'habis', label: 'Habis', count: ringkas.habis },
  ];

  // kartu ringkasan sekaligus jadi filter status
  const kartu = [
    { key: '', nama: 'Total barang', nilai: angka(total), warna: 'text-[#0A1F4A]', bisa: true },
    { key: 'menipis', nama: 'Stok menipis', nilai: ringkas.menipis, warna: ringkas.menipis > 0 ? 'text-amber-600' : 'text-slate-400', bisa: ringkas.menipis > 0 },
    { key: 'habis', nama: 'Stok habis', nilai: ringkas.habis, warna: ringkas.habis > 0 ? 'text-red-600' : 'text-slate-400', bisa: ringkas.habis > 0 },
  ];

  const adaFilter = filters.q || filters.kategori || filters.status || sppgId;

  return (
    <MbgLayout title="Barang">
      <PageHeader
        title="Master barang"
        subtitle={sppgAktif ? `Stok di ${sppgAktif.nama}.` : 'Daftar barang, stok minimum, dan stok saat ini (gabungan semua SPPG).'}
      >
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnGhost} onClick={() => setModal({ jenis: 'supplier' })}>Kelola supplier</button>
          <button type="button" className={btnGhost} onClick={() => setModal({ jenis: 'kategori' })}>Kelola kategori</button>
          <button type="button" className={btn} onClick={() => setModal({ jenis: 'baru' })}>+ Tambah barang</button>
        </div>
      </PageHeader>

      <datalist id="satuan-umum">
        {satuanUmum.map((s) => <option key={s} value={s} />)}
      </datalist>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {kartu.map((k) => {
          const aktif = (filters.status ?? '') === k.key;
          return (
            <button
              key={k.nama}
              type="button"
              disabled={!k.bisa && !aktif}
              onClick={() => cari({ status: aktif ? '' : k.key })}
              className={`${card} border-l-4 border-l-[#CFAE6A] text-left transition enabled:hover:shadow-md disabled:cursor-default ${aktif && k.key ? 'ring-2 ring-[#0A1F4A]' : ''}`}
            >
              <p className="text-sm text-slate-500">{k.nama}{sppgAktif && k.key ? ` · ${sppgAktif.nama}` : ''}</p>
              <p className={`mt-1 text-2xl font-bold ${k.warna}`}>{k.nilai}</p>
              {k.key && k.bisa && <p className="mt-1 text-xs text-slate-400">{aktif ? 'Klik lagi untuk tampilkan semua' : 'Klik untuk menyaring'}</p>}
            </button>
          );
        })}
      </div>

      {errors.hapus && !tutupGalat && (
        <div role="alert" className="mb-3 flex items-start justify-between gap-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          <p>{errors.hapus}</p>
          <button type="button" onClick={() => setTutupGalat(true)} aria-label="Tutup" className="text-red-400 hover:text-red-700">✕</button>
        </div>
      )}

      <div className={`${card} mb-4`}>
        <div className="flex flex-wrap items-end gap-3">
          <Dropdown label="Kategori" value={filters.kategori ?? ''} options={opsiKategori} onChange={(v) => cari({ kategori: v })} />
          {sppgs.length > 1 && (
            <Dropdown label="Tampilan stok" value={sppgId} options={opsiSppg} onChange={(v) => cari({ sppg_id: v })} />
          )}
          <Dropdown label="Status" value={filters.status ?? ''} options={opsiStatus} onChange={(v) => cari({ status: v })} />

          <div className="min-w-[220px] flex-1">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Cari</p>
            <input className={`${input} h-10`} placeholder="Cari barang..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>

          {sppgs.length > 1 && !sppgAktif && (
            <button
              type="button"
              role="switch"
              aria-checked={tampilSppg}
              onClick={() => setTampilSppg(!tampilSppg)}
              className="flex h-10 items-center gap-2 text-sm text-slate-600"
            >
              <span className={`relative h-5 w-9 rounded-full transition ${tampilSppg ? 'bg-[#0A1F4A]' : 'bg-slate-300'}`}>
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${tampilSppg ? 'left-[18px]' : 'left-0.5'}`} />
              </span>
              Rincian per SPPG
            </button>
          )}
        </div>

        {adaFilter ? (
          <button
            type="button"
            onClick={() => { setQ(''); router.get('/barang', {}, { replace: true }); }}
            className="mt-3 text-xs font-medium text-[#0A1F4A] underline-offset-2 hover:underline"
          >
            Reset semua filter
          </button>
        ) : null}
      </div>

      <div className={tableWrap}>
        <table className="w-full">
          <thead className="bg-[#0A1F4A]">
            <tr>
              {['Barang', 'Kategori', sppgAktif ? `Stok · ${sppgAktif.nama}` : 'Stok', 'Minimum', 'Status', ''].map((h, i) => <th key={i} className={th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {barangs.data.length === 0 && (
              <tr>
                <td className={`${td} py-10 text-center text-slate-400`} colSpan={6}>
                  {adaFilter ? 'Tidak ada barang yang cocok dengan filter.' : 'Belum ada barang. Klik "Tambah barang" untuk mulai.'}
                </td>
              </tr>
            )}
            {barangs.data.map((b) => {
              const [teksStatus, kelasStatus] = statusStok[b.status];
              const rincian = Object.entries(b.stok_sppg ?? {}).map(([id, s]) => [
                (sppgs.find((x) => String(x.id) === id)?.nama ?? `SPPG ${id}`).replace(/^SPPG\s+/i, ''),
                s,
              ]);
              return (
                <tr key={b.id} className={`${tr} align-top`}>
                  <td className={`${td} font-medium text-slate-900`}>
                    {b.nama} <span className="ml-1 text-xs font-normal text-slate-400">/{b.satuan}</span>
                  </td>
                  <td className={td}>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${badgeKat(b.kategori)}`}>{b.kategori}</span>
                  </td>
                  <td className={`${td} whitespace-nowrap`}>
                    <span className="font-semibold">{angka(b.stok)} {b.satuan}</span>
                    <MeterStok b={b} />
                    {!sppgAktif && tampilSppg && sppgs.length > 1 && rincian.length > 0 && (
                      <ul className="mt-2 min-w-[170px] space-y-0.5 border-t border-slate-100 pt-1.5 text-xs text-slate-500">
                        {rincian.map(([nama, sisa]) => (
                          <li key={nama} className="flex justify-between gap-4">
                            <span>{nama}</span>
                            <b className="font-semibold text-slate-700">{angka(sisa)} {b.satuan}</b>
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td className={`${td} whitespace-nowrap text-slate-500`}>{b.stok_minimum > 0 ? `${angka(b.stok_minimum)} ${b.satuan}` : '-'}</td>
                  <td className={td}>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${kelasStatus}`}>{teksStatus}</span>
                  </td>
                  <td className={`${td} whitespace-nowrap`}>
                    <div className="flex justify-end gap-1">
                      <IconBtn nama="stok" tip="Catat pemakaian / atur stok" kelas="text-[#0A1F4A] hover:bg-slate-100" onClick={() => setModal({ jenis: 'stok', b })} />
                      <IconBtn nama="edit" tip="Edit barang" onClick={() => setModal({ jenis: 'edit', b })} />
                      <IconBtn
                        nama="hapus"
                        tip={b.dipakai ? `${b.alasan_dipakai}, jadi tidak bisa dihapus` : 'Hapus barang'}
                        kelas="text-red-600 hover:bg-red-50"
                        disabled={b.dipakai}
                        onClick={() => hapus(b)}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pagination data={barangs} />

      {modal?.jenis === 'baru' && <BarangModal kategoris={kategoris} onClose={() => setModal(null)} />}
      {modal?.jenis === 'edit' && <BarangModal key={modal.b.id} b={modal.b} kategoris={kategoris} onClose={() => setModal(null)} />}
      {modal?.jenis === 'stok' && <StokModal key={modal.b.id} b={modal.b} sppgs={sppgs} sppgAwal={sppgId} onClose={() => setModal(null)} />}
      {modal?.jenis === 'kategori' && <KategoriModal kategoris={kategoris} onClose={() => setModal(null)} />}
      {modal?.jenis === 'supplier' && <SupplierModal suppliers={suppliers} onClose={() => setModal(null)} />}
    </MbgLayout>
  );
}