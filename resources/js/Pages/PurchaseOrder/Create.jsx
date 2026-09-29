import { useMemo } from 'react';
import { Link, useForm } from '@inertiajs/react';
import MbgLayout from '@/Layouts/MbgLayout';
import PageHeader from '@/Components/PageHeader';
import { btn, btnGhost, card, input, label, select } from '@/lib/ui';
import { angka, tanggal } from '@/lib/format';

// tanggal lokal (bukan UTC) supaya di WIB dini hari tidak mundur sehari
const fmt = (d) => d.toLocaleDateString('sv-SE');
const hariIni = () => fmt(new Date());
const tambahHari = (base, n) => {
  const d = new Date(`${base}T00:00:00`);
  d.setDate(d.getDate() + n);
  return fmt(d);
};

const kosong = () => ({ barang_id: '', supplier_id: '', qty: '' });
// baris dianggap terisi kalau barang atau qty diisi (supplier saja tidak cukup)
const terisi = (i) => i.barang_id !== '' || i.qty !== '';
// buang baris yang benar-benar kosong; kalau semuanya kosong sisakan satu supaya pesan error tampil
const bersihkan = (items) => {
  const x = items.filter(terisi);
  return x.length ? x : items.slice(0, 1);
};

const kolom = 'sm:grid-cols-[1fr_1fr_110px_56px_64px]';

export default function Create({ sppgs, suppliers, barangs }) {
  const f = useForm({
    sppg_id: '',
    tanggal_po: hariIni(),
    tanggal_datang: '',
    jumlah_pm: '',
    keterangan: '',
    items: [kosong()],
  });

  const setItem = (idx, key, val) =>
    f.setData('items', f.data.items.map((it, i) => (i === idx ? { ...it, [key]: val } : it)));

  const setTanggalPo = (v) => {
    f.setData((d) => ({ ...d, tanggal_po: v, tanggal_datang: d.tanggal_datang && d.tanggal_datang < v ? '' : d.tanggal_datang }));
  };

  const tambahBaris = () => {
    const n = f.data.items.length;
    f.setData('items', [...f.data.items, kosong()]);
    setTimeout(() => document.querySelector(`[data-row="${n}"] select`)?.focus(), 30);
  };

  // isi supplier yang sama ke semua baris sekaligus
  const samakanSupplier = (id) => {
    if (!id) return;
    f.setData('items', f.data.items.map((it) => ({ ...it, supplier_id: id })));
  };

  const err = (k) => f.errors[k] && <p className="mt-1 text-xs text-red-600">{f.errors[k]}</p>;
  const dipilih = f.data.items.map((i) => String(i.barang_id));
  const jumlahError = Object.keys(f.errors).length;

  const submit = (e) => {
    e.preventDefault();
    f.transform((d) => ({ ...d, items: bersihkan(d.items) }));
    f.post('/po', {
      // indeks error mengikuti daftar yang sudah dibersihkan, jadi tampilan disamakan
      onError: () => f.setData('items', bersihkan(f.data.items)),
    });
  };

  // ringkasan di panel kanan
  const sppg = sppgs.find((s) => String(s.id) === String(f.data.sppg_id));
  const baris = f.data.items.filter((i) => i.barang_id && parseFloat(i.qty) > 0);
  const perSatuan = useMemo(() => {
    const m = {};
    baris.forEach((i) => {
      const b = barangs.find((x) => String(x.id) === String(i.barang_id));
      m[b?.satuan ?? '-'] = (m[b?.satuan ?? '-'] ?? 0) + parseFloat(i.qty);
    });
    return Object.entries(m);
  }, [f.data.items, barangs]);

  const namaSupplier = [...new Set(
    baris.map((i) => suppliers.find((s) => String(s.id) === String(i.supplier_id))?.nama).filter(Boolean)
  )];
  const tanpaSupplier = baris.filter((i) => !i.supplier_id).length;

  const chip = 'rounded-full px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-300 transition hover:bg-slate-50';

  return (
    <MbgLayout title="Buat PO">
      <PageHeader title="Buat purchase order" subtitle="Isi kebutuhan barang dan supplier tiap barang. Harga diisi setelah supplier konfirmasi.">
        <Link href="/po" className={btnGhost}>Batal</Link>
      </PageHeader>

      {jumlahError > 0 && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Ada {jumlahError} isian yang perlu diperbaiki. Cek pesan merah di bawah kolom terkait.
        </div>
      )}

      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className={card}>
            <h2 className="mb-4 font-semibold text-[#0A1F4A]">Informasi PO</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className={label}>SPPG</label>
                <select className={select} value={f.data.sppg_id} onChange={(e) => f.setData('sppg_id', e.target.value)}>
                  <option value="">Pilih SPPG</option>
                  {sppgs.map((s) => <option key={s.id} value={s.id}>{s.nama}</option>)}
                </select>
                {err('sppg_id')}
              </div>
              <div>
                <label className={label}>Jumlah penerima manfaat</label>
                <input type="number" min="0" className={input} placeholder="cth: 1753" value={f.data.jumlah_pm} onChange={(e) => f.setData('jumlah_pm', e.target.value)} />
                {err('jumlah_pm')}
              </div>
              <div>
                <label className={label}>Tanggal PO</label>
                <input type="date" className={input} value={f.data.tanggal_po} onChange={(e) => setTanggalPo(e.target.value)} />
                {err('tanggal_po')}
              </div>
              <div>
                <label className={label}>Tanggal datang</label>
                <input type="date" min={f.data.tanggal_po} className={input} value={f.data.tanggal_datang} onChange={(e) => f.setData('tanggal_datang', e.target.value)} />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[['Hari ini', 0], ['Besok', 1], ['+2 hari', 2]].map(([nama, n]) => (
                    <button key={nama} type="button" className={chip} onClick={() => f.setData('tanggal_datang', tambahHari(f.data.tanggal_po, n))}>{nama}</button>
                  ))}
                </div>
                <p className="mt-1 text-xs text-slate-400">Kapan barang diperkirakan sampai. Boleh dikosongkan dulu.</p>
                {err('tanggal_datang')}
              </div>
              <div className="md:col-span-2">
                <label className={label}>Keterangan</label>
                <input className={input} maxLength={255} placeholder="mis. bahan kering untuk Jumat" value={f.data.keterangan} onChange={(e) => f.setData('keterangan', e.target.value)} />
                <p className="mt-1 text-right text-xs text-slate-400">{f.data.keterangan.length}/255</p>
                {err('keterangan')}
              </div>
            </div>
          </div>

          <div className={card}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold text-[#0A1F4A]">Daftar barang</h2>
              <div className="flex items-center gap-3">
                <select
                  className={`${select} h-9 text-sm`}
                  value=""
                  onChange={(e) => samakanSupplier(e.target.value)}
                  aria-label="Isi supplier untuk semua baris"
                  disabled={suppliers.length === 0}
                >
                  <option value="">Samakan supplier semua baris…</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.nama}</option>)}
                </select>
                <span className="whitespace-nowrap text-xs text-slate-500">{baris.length} dari {f.data.items.length} baris terisi</span>
              </div>
            </div>
            {suppliers.length === 0 && (
              <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Belum ada supplier. Tambahkan dulu lewat halaman Barang, tombol "Kelola supplier". Supplier juga bisa diisi nanti di halaman detail PO.
              </p>
            )}
            {err('items')}

            <div className={`hidden gap-3 px-1 pb-2 text-xs font-semibold tracking-wider text-slate-400 sm:grid ${kolom}`}>
              <span>Barang</span><span>Supplier</span><span>Qty</span><span>Satuan</span><span></span>
            </div>

            <div className="space-y-3">
              {f.data.items.map((it, idx) => {
                const b = barangs.find((x) => String(x.id) === String(it.barang_id));
                const pesan = f.errors[`items.${idx}.barang_id`] ?? f.errors[`items.${idx}.supplier_id`] ?? f.errors[`items.${idx}.qty`];
                return (
                  <div key={idx} data-row={idx}>
                    <div className={`grid items-center gap-3 ${kolom}`}>
                      <select className={select} value={it.barang_id} onChange={(e) => setItem(idx, 'barang_id', e.target.value)}>
                        <option value="">Pilih barang</option>
                        {barangs.map((x) => (
                          <option key={x.id} value={x.id} disabled={dipilih.includes(String(x.id)) && String(x.id) !== String(it.barang_id)}>
                            {x.nama}
                          </option>
                        ))}
                      </select>
                      <select className={select} value={it.supplier_id} onChange={(e) => setItem(idx, 'supplier_id', e.target.value)}>
                        <option value="">Belum ditentukan</option>
                        {suppliers.map((s) => <option key={s.id} value={s.id}>{s.nama}</option>)}
                      </select>
                      <input
                        type="number" min="0" step="0.001" className={input} placeholder="Qty"
                        value={it.qty}
                        onChange={(e) => setItem(idx, 'qty', e.target.value)}
                        onKeyDown={(e) => {
                          // Enter di baris terakhir langsung menambah baris baru
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (idx === f.data.items.length - 1 && terisi(it)) tambahBaris();
                          }
                        }}
                      />
                      <span className="text-sm font-medium text-slate-500">{b?.satuan ?? '-'}</span>
                      <button
                        type="button"
                        className="rounded-lg px-2.5 py-1.5 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-transparent"
                        disabled={f.data.items.length === 1}
                        onClick={() => f.setData('items', f.data.items.filter((_, i) => i !== idx))}
                      >
                        Hapus
                      </button>
                    </div>
                    {pesan && <p className="mt-1 text-xs text-red-600">{pesan}</p>}
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex items-center gap-3">
              <button type="button" className={btnGhost} onClick={tambahBaris}>+ Tambah barang</button>
              <span className="text-xs text-slate-400">Tekan Enter di kolom qty untuk menambah baris.</span>
            </div>
          </div>
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className={`${card} border-l-4 border-l-[#CFAE6A]`}>
            <h2 className="mb-3 font-semibold text-[#0A1F4A]">Ringkasan</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs text-slate-400">SPPG</dt>
                <dd className="font-medium text-slate-800">{sppg?.nama ?? <span className="text-slate-400">Belum dipilih</span>}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Tanggal PO / datang</dt>
                <dd className="font-medium text-slate-800">
                  {f.data.tanggal_po ? tanggal(f.data.tanggal_po) : '-'} / {f.data.tanggal_datang ? tanggal(f.data.tanggal_datang) : <span className="text-slate-400">-</span>}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Barang</dt>
                <dd className="font-medium text-slate-800">
                  {baris.length === 0 ? <span className="text-slate-400">Belum ada</span> : `${baris.length} jenis`}
                </dd>
                {perSatuan.length > 0 && (
                  <dd className="mt-1 text-xs text-slate-500">{perSatuan.map(([s, n]) => `${angka(n)} ${s}`).join(' + ')}</dd>
                )}
              </div>
              <div>
                <dt className="text-xs text-slate-400">Supplier</dt>
                <dd className="font-medium text-slate-800">
                  {namaSupplier.length === 0 ? <span className="text-slate-400">Belum ditentukan</span> : namaSupplier.join(', ')}
                </dd>
                {tanpaSupplier > 0 && <dd className="mt-1 text-xs text-amber-600">{tanpaSupplier} barang belum ada supplier</dd>}
              </div>
            </dl>
            <button className={`${btn} mt-5 w-full`} disabled={f.processing}>{f.processing ? 'Menyimpan…' : 'Simpan PO'}</button>
            <p className="mt-2 text-xs text-slate-400">PO disimpan sebagai draft. Supplier harus lengkap sebelum PO bisa dikirim.</p>
          </div>
        </aside>
      </form>
    </MbgLayout>
  );
}