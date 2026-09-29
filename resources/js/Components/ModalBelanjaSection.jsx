import { useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import SimpleModal from '@/Components/SimpleModal';
import RupiahInput from '@/Components/RupiahInput';
import { btn, btnGhost, card, input, label, select } from '@/lib/ui';
import { angka, rupiah } from '@/lib/format';

// tanggal lokal (bukan UTC)
const fmt = (d) => d.toLocaleDateString('sv-SE');
const hariIni = () => fmt(new Date());
const tambahHari = (base, n) => {
  const d = new Date(`${base}T00:00:00`);
  d.setDate(d.getDate() + n);
  return fmt(d);
};
const selisihHari = (a, b) => Math.round((new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`)) / 864e5);
const tglPendek = (s) => new Date(`${s}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
const tglPanjang = (s) => new Date(`${s}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

const Err = ({ m }) => (m ? <p className="mt-1 text-xs text-red-600">{m}</p> : null);

// ---------- form catat / ubah modal ----------
function FormModal({ m, sppgs, sppgAwal, onClose }) {
  const baru = !m;
  const f = useForm({
    sppg_id: m ? String(m.sppg_id) : sppgs.length === 1 ? String(sppgs[0].id) : sppgAwal || '',
    tanggal_mulai: m?.mulai ?? hariIni(),
    tanggal_selesai: m?.selesai ?? tambahHari(hariIni(), 9),
    jumlah: m ? String(Math.round(m.jumlah)) : '',
    keterangan: m?.keterangan ?? '',
  });

  const hari = f.data.tanggal_mulai && f.data.tanggal_selesai ? selisihHari(f.data.tanggal_mulai, f.data.tanggal_selesai) + 1 : 0;
  const jumlah = parseFloat(f.data.jumlah);
  const jatah = hari > 0 && jumlah > 0 ? jumlah / hari : null;

  // ganti tanggal mulai: panjang periode dipertahankan
  const setMulai = (v) => {
    const panjang = hari > 0 ? hari : 10;
    f.setData((d) => ({ ...d, tanggal_mulai: v, tanggal_selesai: v ? tambahHari(v, panjang - 1) : d.tanggal_selesai }));
  };
  const setPanjang = (n) => f.setData('tanggal_selesai', tambahHari(f.data.tanggal_mulai, n - 1));

  const submit = (e) => {
    e.preventDefault();
    const opsi = { preserveScroll: true, onSuccess: onClose };
    baru ? f.post('/modal-belanja', opsi) : f.patch(`/modal-belanja/${m.id}`, opsi);
  };

  const chip = 'rounded-full px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-300 transition hover:bg-slate-50';

  return (
    <SimpleModal title={baru ? 'Catat modal belanja' : 'Ubah modal belanja'} onClose={onClose}>
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
            <label className={label}>Tanggal mulai</label>
            <input type="date" className={input} value={f.data.tanggal_mulai} onChange={(e) => setMulai(e.target.value)} />
            <Err m={f.errors.tanggal_mulai} />
          </div>
          <div>
            <label className={label}>Tanggal selesai</label>
            <input type="date" min={f.data.tanggal_mulai} className={input} value={f.data.tanggal_selesai} onChange={(e) => f.setData('tanggal_selesai', e.target.value)} />
            <Err m={f.errors.tanggal_selesai} />
          </div>
        </div>
        <div className="-mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-400">Panjang periode:</span>
          {[7, 10, 14].map((n) => <button key={n} type="button" className={chip} onClick={() => setPanjang(n)}>{n} hari</button>)}
          {hari > 0 && <span className="ml-1 text-xs text-slate-500">sekarang {hari} hari</span>}
        </div>

        <div>
          <label className={label}>Jumlah modal</label>
          <RupiahInput placeholder="cth: 80.000.000" value={f.data.jumlah} onChange={(v) => f.setData('jumlah', v)} />
          <Err m={f.errors.jumlah} />
          {jatah != null && (
            <p className="mt-1 text-xs text-slate-500">Jatah per hari: <b>{rupiah(Math.round(jatah))}</b> ({rupiah(jumlah)} ÷ {hari} hari)</p>
          )}
        </div>

        <div>
          <label className={label}>Keterangan <span className="font-normal text-slate-400">(boleh kosong)</span></label>
          <input className={input} maxLength={255} placeholder="mis. modal tahap 2 September" value={f.data.keterangan} onChange={(e) => f.setData('keterangan', e.target.value)} />
          <Err m={f.errors.keterangan} />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className={btnGhost} onClick={onClose}>Batal</button>
          <button className={btn} disabled={f.processing}>{f.processing ? 'Menyimpan…' : 'Simpan'}</button>
        </div>
      </form>
    </SimpleModal>
  );
}

// ---------- grafik: batang = belanja harian, garis putus-putus = jatah ----------
function GrafikModal({ harian, jatah }) {
  const maks = Math.max(jatah, ...harian.map((d) => d.belanja), 1) * 1.1;
  const lebar = 600, tinggi = 140;
  const slot = lebar / harian.length;
  const yJatah = tinggi - (jatah / maks) * tinggi;

  return (
    <div>
      <svg viewBox={`0 0 ${lebar} ${tinggi}`} preserveAspectRatio="none" className="h-36 w-full" role="img" aria-label="Belanja harian dibanding jatah harian">
        {harian.map((d, i) => {
          const h = Math.max(d.belanja > 0 ? 2 : 0, (d.belanja / maks) * tinggi);
          const lebih = d.belanja > jatah;
          return (
            <rect
              key={d.tanggal}
              x={i * slot + slot * 0.12}
              y={tinggi - h}
              width={slot * 0.76}
              height={h}
              rx="2"
              fill={lebih ? '#d97706' : '#CFAE6A'}
              opacity={d.berjalan ? 1 : 0.35}
            >
              <title>{`${tglPanjang(d.tanggal)}: belanja ${rupiah(d.belanja)}`}</title>
            </rect>
          );
        })}
        <line x1="0" x2={lebar} y1={yJatah} y2={yJatah} stroke="#0A1F4A" strokeWidth="1.5" strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>{tglPendek(harian[0].tanggal)}</span>
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-[#CFAE6A]" />dalam jatah</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-amber-600" />melebihi jatah</span>
          <span className="flex items-center gap-1"><span className="h-0 w-4 border-t-2 border-dashed border-[#0A1F4A]" />jatah {rupiah(Math.round(jatah))}</span>
        </span>
        <span>{tglPendek(harian[harian.length - 1].tanggal)}</span>
      </div>
    </div>
  );
}

// ---------- satu periode modal ----------
function KartuModal({ m, tampilSppg, terbuka, onToggle, onEdit, onHapus }) {
  const belumMulai = !m.periode_selesai && m.hari_berjalan === 0;
  const sisa = m.periode_selesai ? m.sisa : m.sisa_berjalan;
  const minus = sisa != null && sisa < 0;
  const persenPakai = m.jumlah > 0 ? Math.min(100, (m.terpakai / m.jumlah) * 100) : 0;

  let judulSisa = 'Sisa sampai hari ini';
  if (m.periode_selesai) judulSisa = minus ? 'Kekurangan modal' : 'Margin akhir periode';
  else if (belumMulai) judulSisa = 'Belum dimulai';

  const warnaSisa = sisa == null ? 'text-slate-400' : minus ? 'text-red-600' : 'text-emerald-600';

  return (
    <div className={`${card} border-l-4 border-l-[#CFAE6A]`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-[#0A1F4A]">
            {tglPanjang(m.mulai)} – {tglPanjang(m.selesai)}
            <span className="ml-2 text-sm font-normal text-slate-500">{m.hari} hari</span>
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {tampilSppg && <>{m.sppg}{m.keterangan ? ' · ' : ''}</>}{m.keterangan}
            {m.periode_selesai && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-slate-500">selesai</span>}
          </p>
        </div>
        <div className="flex gap-1">
          <button type="button" onClick={onEdit} className="rounded-lg px-2.5 py-1 text-sm text-slate-600 transition hover:bg-slate-100">Ubah</button>
          <button type="button" onClick={onHapus} className="rounded-lg px-2.5 py-1 text-sm text-red-600 transition hover:bg-red-50">Hapus</button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs text-slate-400">Modal periode</p>
          <p className="mt-0.5 text-lg font-bold text-[#0A1F4A]">{rupiah(m.jumlah)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Jatah per hari</p>
          <p className="mt-0.5 text-lg font-bold text-[#0A1F4A]">{rupiah(Math.round(m.jatah))}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Terpakai</p>
          <p className="mt-0.5 text-lg font-bold text-[#0A1F4A]">{rupiah(m.terpakai)}</p>
          <p className="text-xs text-slate-400">{Math.round(persenPakai)}% dari modal</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">{judulSisa}</p>
          <p className={`mt-0.5 text-lg font-bold ${warnaSisa}`}>{sisa == null ? '-' : `${minus ? '−' : ''}${rupiah(Math.abs(sisa))}`}</p>
          {!m.periode_selesai && m.hari_berjalan > 0 && (
            <p className="text-xs text-slate-400">hari ke-{m.hari_berjalan} dari {m.hari}</p>
          )}
        </div>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full ${m.terpakai > m.jumlah ? 'bg-red-500' : 'bg-[#CFAE6A]'}`} style={{ width: `${persenPakai}%` }} />
      </div>

      <button type="button" onClick={onToggle} aria-expanded={terbuka} className="mt-4 text-sm font-medium text-[#0A1F4A] underline decoration-[#CFAE6A] underline-offset-4">
        {terbuka ? 'Sembunyikan rincian harian' : 'Lihat rincian harian'}
      </button>

      {terbuka && (
        <div className="mt-4 space-y-4">
          <GrafikModal harian={m.harian} jatah={m.jatah} />

          <div className="max-h-80 overflow-auto rounded-xl ring-1 ring-slate-200">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Tanggal</th>
                  <th className="px-3 py-2 text-right font-medium">Jatah</th>
                  <th className="px-3 py-2 text-right font-medium">Belanja</th>
                  <th className="px-3 py-2 text-right font-medium">Selisih hari itu</th>
                  <th className="px-3 py-2 text-right font-medium">Sisa kumulatif</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {m.harian.map((d) => (
                  <tr key={d.tanggal} className={d.berjalan ? '' : 'text-slate-300'}>
                    <td className="whitespace-nowrap px-3 py-1.5">{tglPendek(d.tanggal)}</td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-right">{angka(d.jatah)}</td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-right">{d.belanja > 0 ? angka(d.belanja) : '-'}</td>
                    <td className={`whitespace-nowrap px-3 py-1.5 text-right ${d.selisih == null ? '' : d.selisih < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {d.selisih == null ? '-' : `${d.selisih < 0 ? '−' : '+'}${angka(Math.abs(d.selisih))}`}
                    </td>
                    <td className={`whitespace-nowrap px-3 py-1.5 text-right font-medium ${d.kumulatif == null ? '' : d.kumulatif < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                      {d.kumulatif == null ? '-' : `${d.kumulatif < 0 ? '−' : ''}${angka(Math.abs(d.kumulatif))}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400">
            Hari yang belanjanya melebihi jatah otomatis ditutup dari sisa hari sebelumnya. Sisa kumulatif di hari terakhir adalah margin.
          </p>
        </div>
      )}
    </div>
  );
}

// ---------- bagian utama ----------
export default function ModalBelanjaSection({ modal, sppgs, sppgAwal = '' }) {
  const [form, setForm] = useState(null); // { m } — m null = tambah
  const [terbuka, setTerbuka] = useState(null);

  const hapus = (m) => {
    if (!window.confirm(`Hapus modal ${tglPanjang(m.mulai)} – ${tglPanjang(m.selesai)} (${rupiah(m.jumlah)})?`)) return;
    router.delete(`/modal-belanja/${m.id}`, { preserveScroll: true });
  };

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Modal belanja</h2>
        <button type="button" className={btn} onClick={() => setForm({ m: null })}>+ Catat modal</button>
      </div>

      {modal.length === 0 ? (
        <div className={`${card} py-8 text-center text-sm text-slate-400`}>
          Tidak ada modal belanja yang periodenya masuk di rentang tanggal ini. Klik "Catat modal" saat modal cair untuk melihat jatah harian dan margin.
        </div>
      ) : (
        <div className="space-y-4">
          {modal.map((m) => (
            <KartuModal
              key={m.id}
              m={m}
              tampilSppg={sppgs.length > 1}
              terbuka={terbuka === m.id}
              onToggle={() => setTerbuka(terbuka === m.id ? null : m.id)}
              onEdit={() => setForm({ m })}
              onHapus={() => hapus(m)}
            />
          ))}
        </div>
      )}

      {form && <FormModal key={form.m?.id ?? 'baru'} m={form.m} sppgs={sppgs} sppgAwal={sppgAwal} onClose={() => setForm(null)} />}
    </section>
  );
}