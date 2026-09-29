// resources/js/Pages/Laporan/Index.jsx
import { Link, router, useForm, usePage } from '@inertiajs/react';
import { Fragment, useEffect, useState } from 'react';
import MbgLayout from '@/Layouts/MbgLayout';
import PageHeader from '@/Components/PageHeader';
import RupiahInput from '@/Components/RupiahInput';
import { btn, btnGhost, card, input, label, rupiah, select, statusBadge, statusColor, tableWrap, td, th, tr } from '@/lib/ui';

const angka = (n) => Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 });
const persen = (v, t) => (t > 0 ? Math.round((v / t) * 100) : 0);
const fmt = (d) => d.toLocaleDateString('sv-SE');
const tglPendek = (s) => new Date(`${s}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
const tglPanjang = (s) => new Date(`${s}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
const tambahHari = (base, n) => {
  const d = new Date(`${base}T00:00:00`);
  d.setDate(d.getDate() + n);
  return fmt(d);
};
const rp = (n) => (n < 0 ? `-${rupiah(Math.abs(n))}` : rupiah(n));

const Err = ({ m }) => (m ? <p className="mt-1 text-xs text-red-600">{m}</p> : null);

function Delta({ v }) {
  if (v == null) return null;
  const warna = v > 0 ? 'text-amber-600' : v < 0 ? 'text-emerald-600' : 'text-slate-400';
  return <span className={`text-xs font-medium ${warna}`}>{v > 0 ? '▲' : v < 0 ? '▼' : '•'} {Math.abs(v)}%</span>;
}

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
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

// tambah (m = null) dan ubah modal belanja
function ModalBelanjaForm({ m, sppgs, sppgAwal, onClose }) {
  const baru = !m;
  const f = useForm({
    sppg_id: m ? String(m.sppg_id) : sppgs.length === 1 ? String(sppgs[0].id) : (sppgAwal || ''),
    tanggal_mulai: m?.mulai ?? fmt(new Date()),
    tanggal_selesai: m?.selesai ?? tambahHari(fmt(new Date()), 9),
    jumlah: m ? String(Math.round(m.jumlah)) : '',
    keterangan: m?.keterangan ?? '',
  });

  const hari = f.data.tanggal_mulai && f.data.tanggal_selesai && f.data.tanggal_selesai >= f.data.tanggal_mulai
    ? Math.round((new Date(`${f.data.tanggal_selesai}T00:00:00`) - new Date(`${f.data.tanggal_mulai}T00:00:00`)) / 864e5) + 1
    : 0;
  const jatah = hari > 0 ? (parseFloat(f.data.jumlah) || 0) / hari : 0;

  const setMulai = (v) => f.setData((d) => ({
    ...d,
    tanggal_mulai: v,
    tanggal_selesai: d.tanggal_selesai && d.tanggal_selesai < v ? tambahHari(v, 9) : d.tanggal_selesai,
  }));

  const submit = (e) => {
    e.preventDefault();
    const opsi = { preserveScroll: true, onSuccess: onClose };
    if (baru) f.post('/modal-belanja', opsi);
    else f.patch(`/modal-belanja/${m.id}`, opsi);
  };

  return (
    <Modal title={baru ? 'Tambah modal belanja' : 'Ubah modal belanja'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className={label}>SPPG</label>
          <select className={select} value={f.data.sppg_id} onChange={(e) => f.setData('sppg_id', e.target.value)}>
            <option value="">Pilih SPPG</option>
            {sppgs.map((s) => <option key={s.id} value={s.id}>{s.nama}</option>)}
          </select>
          <Err m={f.errors.sppg_id} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>Mulai</label>
            <input type="date" className={input} value={f.data.tanggal_mulai} onChange={(e) => setMulai(e.target.value)} />
            <Err m={f.errors.tanggal_mulai} />
          </div>
          <div>
            <label className={label}>Selesai</label>
            <input type="date" min={f.data.tanggal_mulai} className={input} value={f.data.tanggal_selesai} onChange={(e) => f.setData('tanggal_selesai', e.target.value)} />
            <Err m={f.errors.tanggal_selesai} />
          </div>
        </div>
        <div className="-mt-2 flex flex-wrap items-center gap-1.5">
          {[['7 hari', 6], ['10 hari', 9], ['14 hari', 13]].map(([nama, n]) => (
            <button key={nama} type="button" className="rounded-full px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-300 hover:bg-slate-50" onClick={() => f.setData('tanggal_selesai', tambahHari(f.data.tanggal_mulai, n))}>{nama}</button>
          ))}
          {hari > 0 && <span className="ml-1 text-xs text-slate-400">{hari} hari</span>}
        </div>
        <div>
          <label className={label}>Jumlah modal</label>
          <RupiahInput className="w-full" placeholder="cth: 80.000.000" value={f.data.jumlah} onChange={(v) => f.setData('jumlah', v)} />
          <Err m={f.errors.jumlah} />
          {jatah > 0 && <p className="mt-1 text-xs text-slate-500">Jatah per hari: <b>{rupiah(jatah)}</b></p>}
        </div>
        <div>
          <label className={label}>Keterangan</label>
          <input className={input} maxLength={255} value={f.data.keterangan} onChange={(e) => f.setData('keterangan', e.target.value)} />
          <Err m={f.errors.keterangan} />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className={btnGhost} onClick={onClose}>Batal</button>
          <button className={btn} disabled={f.processing}>{f.processing ? 'Menyimpan…' : 'Simpan'}</button>
        </div>
      </form>
    </Modal>
  );
}

// modal belanja: satu baris per periode, klik untuk lihat rincian harian
function TabelModal({ modal, onTambah, onEdit, onHapus }) {
  const [buka, setBuka] = useState(null);

  return (
    <section className="mb-6">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-700">Modal belanja & margin</h2>
        <button type="button" className={btnGhost} onClick={onTambah}>+ Tambah modal</button>
      </div>

      {modal.length === 0 ? (
        <div className={`${card} py-5 text-center text-sm text-slate-400`}>Belum ada modal di rentang ini.</div>
      ) : (
        <div className={tableWrap}>
          <table className="w-full">
            <thead className="bg-[#0A1F4A]">
              <tr>{['Periode', 'Modal', 'Jatah/hari', 'Terpakai', 'Sisa / margin', ''].map((h, i) => <th key={i} className={th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {modal.map((m) => {
                const sisa = m.sisa_berjalan;
                const minus = sisa != null && sisa < 0;
                const terbuka = buka === m.id;
                return (
                  <Fragment key={m.id}>
                    <tr className={`${tr} cursor-pointer`} onClick={() => setBuka(terbuka ? null : m.id)}>
                      <td className={td}>
                        <span className="font-medium text-slate-900">{m.sppg}</span>
                        <span className="block text-xs text-slate-400">
                          {tglPendek(m.mulai)} – {tglPendek(m.selesai)} · {m.hari_berjalan}/{m.hari} hari
                        </span>
                      </td>
                      <td className={`${td} whitespace-nowrap`}>{rupiah(m.jumlah)}</td>
                      <td className={`${td} whitespace-nowrap`}>{rupiah(m.jatah)}</td>
                      <td className={`${td} whitespace-nowrap`}>
                        {rupiah(m.terpakai)}
                        <span className="ml-1 text-xs text-slate-400">{persen(m.terpakai, m.jumlah)}%</span>
                      </td>
                      <td className={`${td} whitespace-nowrap font-semibold ${sisa == null ? 'text-slate-400' : minus ? 'text-red-600' : 'text-emerald-600'}`}>
                        {sisa != null ? rp(sisa) : '-'}
                        <span className="block text-xs font-normal text-slate-400">{m.periode_selesai ? (minus ? 'defisit' : 'margin') : 'sementara'}</span>
                      </td>
                      <td className={`${td} whitespace-nowrap text-right`} onClick={(e) => e.stopPropagation()}>
                        <button type="button" className="px-2 text-sm text-slate-500 hover:text-[#0A1F4A]" onClick={() => onEdit(m)}>Ubah</button>
                        <button type="button" className="px-2 text-sm text-red-500 hover:text-red-700" onClick={() => onHapus(m)}>Hapus</button>
                      </td>
                    </tr>
                    {terbuka && (
                      <tr>
                        <td colSpan={6} className="bg-slate-50 px-4 py-3">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-left text-slate-400">
                                <th className="py-1 font-medium">Tanggal</th>
                                <th className="py-1 font-medium">Jatah</th>
                                <th className="py-1 font-medium">Belanja</th>
                                <th className="py-1 font-medium">Selisih</th>
                                <th className="py-1 font-medium">Kumulatif</th>
                              </tr>
                            </thead>
                            <tbody>
                              {m.harian.map((h) => (
                                <tr key={h.tanggal} className={h.berjalan ? 'text-slate-700' : 'text-slate-300'}>
                                  <td className="py-1">{tglPendek(h.tanggal)}</td>
                                  <td className="py-1">{rupiah(h.jatah)}</td>
                                  <td className="py-1">{h.berjalan ? rupiah(h.belanja) : '-'}</td>
                                  <td className={`py-1 ${h.selisih != null && h.selisih < 0 ? 'text-red-600' : ''}`}>{h.selisih != null ? rp(h.selisih) : '-'}</td>
                                  <td className={`py-1 font-semibold ${h.kumulatif != null && h.kumulatif < 0 ? 'text-red-600' : ''}`}>{h.kumulatif != null ? rp(h.kumulatif) : '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <p className="mt-2 text-xs text-slate-400">Selisih = jatah − belanja hari itu. Kumulatif menjumlahkan dari hari pertama, jadi hari minus ditutup dari sisa hari sebelumnya.</p>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Kosong({ teks }) {
  return <tr><td className={`${td} py-8 text-center text-slate-400`} colSpan={9}>{teks}</td></tr>;
}

export default function Index({ filter, sppgs, ringkasan, modal, perKategori, perBarang, perSupplier, perSppg, pos }) {
  const { errors } = usePage().props;
  const [dari, setDari] = useState(filter.dari);
  const [sampai, setSampai] = useState(filter.sampai);
  const [sppgId, setSppgId] = useState(filter.sppg_id ?? '');
  const [memuat, setMemuat] = useState(false);
  const [tab, setTab] = useState('barang');
  const [cariBarang, setCariBarang] = useState('');
  const [semuaBarang, setSemuaBarang] = useState(false);
  const [formModal, setFormModal] = useState(null);

  const tampil = (extra = {}) => {
    const params = { dari, sampai, sppg_id: sppgId, ...extra };
    Object.keys(params).forEach((k) => params[k] === '' && delete params[k]);
    router.get('/laporan', params, {
      preserveState: true,
      preserveScroll: true,
      onStart: () => setMemuat(true),
      onFinish: () => setMemuat(false),
    });
  };

  const preset = (d, s) => {
    setDari(d);
    setSampai(s);
    tampil({ dari: d, sampai: s });
  };

  const sekarang = new Date();
  const presets = [
    ['7 hari', () => preset(fmt(new Date(Date.now() - 6 * 864e5)), fmt(sekarang))],
    ['30 hari', () => preset(fmt(new Date(Date.now() - 29 * 864e5)), fmt(sekarang))],
    ['Bulan ini', () => preset(fmt(new Date(sekarang.getFullYear(), sekarang.getMonth(), 1)), fmt(sekarang))],
    ['Bulan lalu', () => preset(fmt(new Date(sekarang.getFullYear(), sekarang.getMonth() - 1, 1)), fmt(new Date(sekarang.getFullYear(), sekarang.getMonth(), 0)))],
  ];

  const sppgAktif = sppgs.find((s) => String(s.id) === (filter.sppg_id ?? ''));

  const barangTersaring = perBarang.filter((b) => b.barang.toLowerCase().includes(cariBarang.trim().toLowerCase()));
  const barangTampil = semuaBarang || cariBarang ? barangTersaring : barangTersaring.slice(0, 10);

  const hapusModal = (m) => {
    if (window.confirm(`Hapus modal belanja ${m.sppg} (${tglPanjang(m.mulai)} – ${tglPanjang(m.selesai)})?`)) {
      router.delete(`/modal-belanja/${m.id}`, { preserveScroll: true });
    }
  };

  const tabs = [
    ['barang', 'Barang'],
    ['kategori', 'Kategori'],
    ['supplier', 'Supplier'],
    ['po', 'PO'],
    ...(perSppg.length > 1 ? [['sppg', 'SPPG']] : []),
  ];

  const ringkas = [
    ['Total belanja', rupiah(ringkasan.total), <span key="d" className="flex items-center gap-1"><Delta v={ringkasan.delta_total} /></span>],
    ['PO', ringkasan.jumlah_po, null],
    ['Porsi', angka(ringkasan.porsi), null],
    ['Per porsi', ringkasan.per_porsi ? rupiah(ringkasan.per_porsi) : '-', <Delta key="p" v={ringkasan.delta_per_porsi} />],
  ];

  return (
    <MbgLayout title="Laporan">
      <PageHeader
        title="Laporan belanja"
        subtitle={`${tglPanjang(filter.dari)} – ${tglPanjang(filter.sampai)} · ${sppgAktif ? sppgAktif.nama : 'Semua SPPG'}`}
      />

      {/* filter: satu baris */}
      <form onSubmit={(e) => { e.preventDefault(); tampil(); }} className={`${card} mb-4 flex flex-wrap items-end gap-3`}>
        <div className="flex flex-wrap gap-1.5">
          {presets.map(([nama, fn]) => (
            <button key={nama} type="button" onClick={fn} className="rounded-full px-3 py-1.5 text-sm font-medium text-slate-600 ring-1 ring-slate-300 transition hover:bg-slate-50">{nama}</button>
          ))}
        </div>
        <div>
          <input type="date" aria-label="Dari" className={`${input} w-40`} value={dari} onChange={(e) => setDari(e.target.value)} />
          <Err m={errors?.dari} />
        </div>
        <span className="pb-2 text-slate-400">–</span>
        <div>
          <input type="date" aria-label="Sampai" className={`${input} w-40`} value={sampai} onChange={(e) => setSampai(e.target.value)} />
          <Err m={errors?.sampai} />
        </div>
        {sppgs.length > 1 && (
          <select aria-label="SPPG" className={`${select} w-44`} value={sppgId} onChange={(e) => { setSppgId(e.target.value); tampil({ sppg_id: e.target.value }); }}>
            <option value="">Semua SPPG</option>
            {sppgs.map((s) => <option key={s.id} value={s.id}>{s.nama}</option>)}
          </select>
        )}
        <button className={btn} disabled={memuat}>{memuat ? 'Memuat…' : 'Tampilkan'}</button>
      </form>

      {/* ringkasan: satu strip */}
      <div className={`${card} mb-2 grid grid-cols-2 gap-4 lg:grid-cols-4 transition ${memuat ? 'opacity-60' : ''}`}>
        {ringkas.map(([l, v, extra]) => (
          <div key={l}>
            <p className="text-xs text-slate-400">{l}</p>
            <p className="text-lg font-bold text-[#0A1F4A]">{v}</p>
            {extra}
          </div>
        ))}
      </div>
      <p className="mb-6 text-xs text-slate-400">
        Diterima {rupiah(ringkasan.total_diterima)} · Menunggu barang {rupiah(ringkasan.total_menunggu)}
        {ringkasan.dikecualikan > 0 && ` · ${ringkasan.dikecualikan} PO draft/dikirim belum dihitung`}
      </p>

      <TabelModal modal={modal} onTambah={() => setFormModal({ m: null })} onEdit={(m) => setFormModal({ m })} onHapus={hapusModal} />

      {/* rincian: satu tabel per tab */}
      <section>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
            {tabs.map(([k, nama]) => (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                className={`rounded-md px-3 py-1 text-sm font-medium transition ${tab === k ? 'bg-white text-[#0A1F4A] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {nama}
              </button>
            ))}
          </div>
          {tab === 'barang' && (
            <input className={`${input} w-48`} placeholder="Cari barang..." value={cariBarang} onChange={(e) => setCariBarang(e.target.value)} />
          )}
        </div>

        <div className={tableWrap}>
          {tab === 'barang' && (
            <table className="w-full">
              <thead className="bg-[#0A1F4A]"><tr>{['Barang', 'Qty', 'Rata-rata', 'Rentang', 'Total'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
              <tbody>
                {barangTampil.length === 0 && <Kosong teks="Tidak ada data barang." />}
                {barangTampil.map((b) => (
                  <tr key={b.barang_id} className={tr}>
                    <td className={`${td} font-medium text-slate-900`}>{b.barang}</td>
                    <td className={`${td} whitespace-nowrap`}>{angka(b.qty)} {b.satuan}</td>
                    <td className={`${td} whitespace-nowrap`}>{rupiah(b.rata)}</td>
                    <td className={`${td} whitespace-nowrap text-xs text-slate-500`}>
                      {rupiah(b.min)} – {rupiah(b.max)}
                      {b.fluktuasi >= 10 && <span className={`${statusBadge} ml-2 bg-amber-50 text-amber-700 ring-amber-200`}>{b.fluktuasi}%</span>}
                    </td>
                    <td className={`${td} whitespace-nowrap font-medium`}>{rupiah(b.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'kategori' && (
            <table className="w-full">
              <thead className="bg-[#0A1F4A]"><tr>{['Kategori', 'Porsi dari total', 'Total'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
              <tbody>
                {perKategori.length === 0 && <Kosong teks="Belum ada data." />}
                {perKategori.map((k) => (
                  <tr key={k.kategori} className={tr}>
                    <td className={`${td} font-medium capitalize text-slate-900`}>{k.kategori}</td>
                    <td className={td}>{persen(k.total, ringkasan.total)}%</td>
                    <td className={`${td} font-medium`}>{rupiah(k.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'supplier' && (
            <table className="w-full">
              <thead className="bg-[#0A1F4A]"><tr>{['Supplier', 'PO', 'Total'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
              <tbody>
                {perSupplier.length === 0 && <Kosong teks="Belum ada data." />}
                {perSupplier.map((s) => (
                  <tr key={s.supplier} className={tr}>
                    <td className={`${td} font-medium text-slate-900`}>{s.supplier}</td>
                    <td className={td}>{s.jumlah_po}</td>
                    <td className={`${td} font-medium`}>{rupiah(s.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'po' && (
            <table className="w-full">
              <thead className="bg-[#0A1F4A]"><tr>{['Nomor', 'SPPG', 'Tanggal', 'Status', 'Total', 'Per PM'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
              <tbody>
                {pos.length === 0 && <Kosong teks="Belum ada PO dikonfirmasi di rentang ini." />}
                {pos.map((p) => (
                  <tr key={p.id} className={tr}>
                    <td className={td}>
                      <Link href={`/po/${p.id}`} className="font-medium text-[#0A1F4A] underline decoration-[#CFAE6A] underline-offset-4">{p.nomor}</Link>
                      {p.supplier && <span className="block text-xs text-slate-400">{p.supplier}</span>}
                    </td>
                    <td className={td}>{p.sppg}</td>
                    <td className={`${td} whitespace-nowrap`}>{p.tanggal}</td>
                    <td className={td}><span className={`${statusBadge} ${statusColor[p.status]}`}>{p.status}</span></td>
                    <td className={`${td} whitespace-nowrap font-medium`}>{rupiah(p.total)}</td>
                    <td className={`${td} whitespace-nowrap`}>{p.per_pm ? rupiah(p.per_pm) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'sppg' && (
            <table className="w-full">
              <thead className="bg-[#0A1F4A]"><tr>{['SPPG', 'PO', 'Porsi', 'Per porsi', 'Total'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
              <tbody>
                {perSppg.map((s) => (
                  <tr key={s.sppg} className={tr}>
                    <td className={`${td} font-medium text-slate-900`}>{s.sppg}</td>
                    <td className={td}>{s.jumlah_po}</td>
                    <td className={td}>{angka(s.porsi)}</td>
                    <td className={td}>{s.per_porsi ? rupiah(s.per_porsi) : '-'}</td>
                    <td className={`${td} font-medium`}>{rupiah(s.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {tab === 'barang' && !cariBarang && barangTersaring.length > 10 && (
          <div className="mt-3 text-center">
            <button type="button" className="text-sm font-medium text-[#0A1F4A] underline decoration-[#CFAE6A] underline-offset-4" onClick={() => setSemuaBarang((v) => !v)}>
              {semuaBarang ? 'Tampilkan 10 teratas saja' : `Tampilkan semua ${barangTersaring.length} barang`}
            </button>
          </div>
        )}
      </section>

      {formModal && (
        <ModalBelanjaForm
          key={formModal.m?.id ?? 'baru'}
          m={formModal.m}
          sppgs={sppgs}
          sppgAwal={filter.sppg_id ?? ''}
          onClose={() => setFormModal(null)}
        />
      )}
    </MbgLayout>
  );
}