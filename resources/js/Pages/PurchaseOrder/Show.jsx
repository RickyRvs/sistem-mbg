import { useEffect } from 'react';
import { Link, router, useForm, usePage } from '@inertiajs/react';
import MbgLayout from '@/Layouts/MbgLayout';
import PageHeader from '@/Components/PageHeader';
import RupiahInput from '@/Components/RupiahInput';
import { btn, btnGhost, card, input, select, statusBadge, statusColor, tableWrap, td, th, tr } from '@/lib/ui';
import { angka, rupiah, tanggal } from '@/lib/format';

const statuses = ['draft', 'dikirim', 'dikonfirmasi', 'diterima'];
const naikTajam = (s) => s != null && s >= 10;
const num = (v) => parseFloat(v) || 0;

// tanggal lokal (bukan UTC) supaya di WIB dini hari tidak mundur sehari
const fmt = (d) => d.toLocaleDateString('sv-SE');
const tambahHari = (base, n) => {
  const d = new Date(`${base}T00:00:00`);
  d.setDate(d.getDate() + n);
  return fmt(d);
};

const dataAwal = (po) => ({
  tanggal_datang: po.tanggal_datang ?? '',
  items: po.items.map((i) => ({
    id: i.id,
    supplier_id: i.supplier_id ? String(i.supplier_id) : '',
    qty_diterima: i.qty_diterima != null ? String(i.qty_diterima) : '',
    harga_modal: i.harga_modal != null ? String(Math.round(i.harga_modal)) : '',
  })),
});

// garis tahap: selesai (centang), sedang berjalan (emas), belum
function Tahap({ status }) {
  const idx = statuses.indexOf(status);
  return (
    <ol className="flex items-center" aria-label="Tahap PO">
      {statuses.map((s, i) => (
        <li key={s} className="flex flex-1 items-center last:flex-none">
          <div className="flex items-center gap-2">
            <span
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                i < idx ? 'bg-emerald-500 text-white' : i === idx ? 'bg-[#CFAE6A] text-[#0A1F4A]' : 'bg-slate-100 text-slate-400'
              }`}
            >
              {i < idx ? '✓' : i + 1}
            </span>
            <span className={`hidden text-sm capitalize sm:block ${i === idx ? 'font-semibold text-[#0A1F4A]' : 'text-slate-500'}`}>{s}</span>
          </div>
          {i < statuses.length - 1 && <span className={`mx-3 h-0.5 flex-1 rounded ${i < idx ? 'bg-emerald-400' : 'bg-slate-200'}`} />}
        </li>
      ))}
    </ol>
  );
}

export default function Show({ po, suppliers }) {
  const { errors: pageErrors } = usePage().props;
  const f = useForm(dataAwal(po));
  const awal = dataAwal(po);
  const dirty = JSON.stringify(f.data) !== JSON.stringify(awal);

  const stepIdx = statuses.indexOf(po.status);
  const terkunci = po.status === 'diterima';
  const next = statuses[stepIdx + 1];
  const prev = statuses[stepIdx - 1];

  const setItem = (idx, key, val) =>
    f.setData('items', f.data.items.map((r, i) => (i === idx ? { ...r, [key]: val } : r)));

  const rows = po.items.map((it, idx) => {
    const r = f.data.items[idx];
    const qtyFinal = r.qty_diterima !== '' ? num(r.qty_diterima) : it.qty;
    const harga = r.harga_modal !== '' ? num(r.harga_modal) : null;
    const selisih = harga != null && it.harga_terakhir ? ((harga - it.harga_terakhir) / it.harga_terakhir) * 100 : null;
    const bedaQty = r.qty_diterima !== '' ? num(r.qty_diterima) - it.qty : 0;
    return { it, r, idx, harga, selisih, bedaQty, subtotal: harga != null ? qtyFinal * harga : 0 };
  });

  const totalBelanja = rows.reduce((s, x) => s + x.subtotal, 0);
  const terisi = rows.filter((x) => x.harga != null).length;
  const perPm = po.jumlah_pm ? totalBelanja / po.jumlah_pm : null;
  const jumlahTajam = rows.filter((x) => naikTajam(x.selisih)).length;
  const bisaIsiHarga = rows.filter((x) => x.harga == null && x.it.harga_terakhir).length;
  const bisaSamakanQty = rows.filter((x) => x.r.qty_diterima !== String(x.it.qty)).length;

  // supplier dibaca dari isian yang belum disimpan, supaya syarat langsung berubah saat dipilih
  const punyaSupplier = f.data.items.filter((i) => i.supplier_id).length;
  const namaSupplier = [...new Set(
    f.data.items.map((i) => suppliers.find((s) => String(s.id) === String(i.supplier_id))?.nama).filter(Boolean)
  )];

  // syarat maju: sama dengan aturan di server (PurchaseOrderController::hambatMaju), tapi dibaca dari isian yang belum disimpan
  const syarat = [];
  if (next && ['dikirim', 'dikonfirmasi', 'diterima'].includes(next)) {
    syarat.push({ label: `Semua barang sudah ada supplier (${punyaSupplier}/${po.items.length})`, ok: punyaSupplier === po.items.length });
  }
  if (next && ['dikonfirmasi', 'diterima'].includes(next)) {
    syarat.push({ label: `Semua harga terisi (${terisi}/${po.items.length})`, ok: terisi === po.items.length });
  }
  const siap = syarat.every((s) => s.ok);

  // jangan biarkan perubahan hilang saat pindah halaman
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', beforeUnload);
    const off = router.on('before', (e) => {
      if (e.detail.visit.method !== 'get') return;
      if (!window.confirm('Perubahan belum disimpan. Tinggalkan halaman ini?')) return false;
    });
    return () => { window.removeEventListener('beforeunload', beforeUnload); off(); };
  }, [dirty]);

  const kirimStatus = (s) => router.patch(`/po/${po.id}/status`, { status: s }, { preserveScroll: true });

  const simpan = (setelah) =>
    f.patch(`/po/${po.id}/harga`, {
      preserveScroll: true,
      onSuccess: (page) => {
        f.setData(dataAwal(page.props.po));
        if (typeof setelah === 'function') setelah();
      },
    });

  const lanjut = () => {
    if (!next || !siap) return;
    if (next === 'diterima' && !window.confirm('Terima PO ini? Barang akan masuk ke stok, lalu qty dan harga dikunci.')) return;
    dirty ? simpan(() => kirimStatus(next)) : kirimStatus(next);
  };

  const mundur = () => {
    if (!prev || dirty) return;
    const tarik = terkunci ? ' Stok yang sudah masuk dari PO ini akan ditarik lagi.' : '';
    if (window.confirm(`Kembalikan status PO ke "${prev}"?${tarik}`)) kirimStatus(prev);
  };

  const hapusPo = () => {
    if (window.confirm(`Hapus ${po.nomor}? PO yang dihapus tidak bisa dikembalikan.`)) router.delete(`/po/${po.id}`);
  };

  // isian cepat
  const samakanQty = () =>
    f.setData('items', f.data.items.map((r, i) => ({ ...r, qty_diterima: String(po.items[i].qty) })));
  const isiHargaTerakhir = () =>
    f.setData('items', f.data.items.map((r, i) => (
      r.harga_modal === '' && po.items[i].harga_terakhir ? { ...r, harga_modal: String(Math.round(po.items[i].harga_terakhir)) } : r
    )));
  // hanya mengisi baris yang supplier-nya masih kosong, supaya pilihan yang sudah ada tidak tertimpa
  const isiSupplierKosong = (id) => {
    if (!id) return;
    f.setData('items', f.data.items.map((r) => (r.supplier_id ? r : { ...r, supplier_id: id })));
  };
  const supplierKosong = f.data.items.length - punyaSupplier;

  const info = [
    ['SPPG', po.sppg ?? '-'],
    ['Tanggal PO', tanggal(po.tanggal_po)],
    ['Penerima manfaat', po.jumlah_pm ? `${angka(po.jumlah_pm)} PM` : '-'],
    ['Supplier', namaSupplier.length ? namaSupplier.join(', ') : '-'],
    ['Keterangan', po.keterangan || '-'],
  ];

  const ringkasan = [
    ['Total belanja', rupiah(totalBelanja), 'text-[#0A1F4A]'],
    ['Harga terisi', `${terisi} dari ${po.items.length} barang`, terisi === po.items.length ? 'text-emerald-600' : 'text-amber-600'],
    ['Biaya per penerima', perPm != null && totalBelanja > 0 ? rupiah(perPm) : '-', 'text-[#0A1F4A]'],
  ];

  const galat = pageErrors?.status ?? f.errors.status;
  const chip = 'rounded-full px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-300 transition hover:bg-slate-50';

  return (
    <MbgLayout title={po.nomor}>
      <PageHeader title={po.nomor} subtitle="Detail purchase order">
        <div className="flex gap-2">
          {po.status === 'draft' && (
            <button type="button" onClick={hapusPo} className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50">Hapus PO</button>
          )}
          <Link href="/po" className={btnGhost}>← Kembali</Link>
        </div>
      </PageHeader>

      {galat && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{galat}</div>}

      {terkunci && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          PO ini sudah diterima dan barangnya sudah masuk stok, jadi supplier, qty, dan harga dikunci. Kalau perlu koreksi, mundurkan status ke "dikonfirmasi" dulu.
        </div>
      )}

      {!terkunci && jumlahTajam > 0 && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Ada {jumlahTajam} barang yang harganya naik 10% atau lebih dari pembelian terakhir. Cek ulang ke supplier sebelum konfirmasi.
        </div>
      )}

      {/* tahap dan aksi status */}
      <div className={`${card} mb-6`}>
        <Tahap status={po.status} />
        <div className="mt-5 flex flex-wrap items-start justify-between gap-4 border-t border-slate-100 pt-4">
          <div>
            <span className={`${statusBadge} ${statusColor[po.status]}`}>{po.status}</span>
            {next && (
              <ul className="mt-3 space-y-1">
                <li className="text-xs text-slate-400">Syarat lanjut ke "{next}":</li>
                {syarat.length === 0 && <li className="text-sm text-slate-600">Tidak ada syarat khusus.</li>}
                {syarat.map((s) => (
                  <li key={s.label} className={`flex items-center gap-2 text-sm ${s.ok ? 'text-emerald-700' : 'text-amber-700'}`}>
                    <span aria-hidden="true">{s.ok ? '✓' : '○'}</span>{s.label}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {prev && (
              <button type="button" onClick={mundur} disabled={dirty} title={dirty ? 'Simpan atau batalkan perubahan dulu' : undefined} className={`${btnGhost} disabled:opacity-40`}>
                ← Kembali ke {prev}
              </button>
            )}
            {next && (
              <button type="button" onClick={lanjut} disabled={!siap || f.processing} className={`${btn} disabled:opacity-40`}>
                {dirty ? `Simpan & lanjut ke ${next}` : `Lanjut ke ${next}`}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className={`${card} mb-6`}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {info.map(([l, v]) => (
            <div key={l}>
              <p className="text-xs font-semibold text-slate-400">{l}</p>
              <p className="mt-0.5 text-sm font-medium text-slate-800">{v}</p>
            </div>
          ))}
          <div>
            <p className="mb-1 text-xs font-semibold text-slate-400">Tanggal datang</p>
            <input type="date" min={po.tanggal_po} disabled={terkunci} className={input} value={f.data.tanggal_datang} onChange={(e) => f.setData('tanggal_datang', e.target.value)} />
            {!terkunci && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[['Hari ini', 0], ['Besok', 1], ['+2 hari', 2]].map(([nama, n]) => (
                  <button key={nama} type="button" className={chip} onClick={() => f.setData('tanggal_datang', tambahHari(po.tanggal_po, n))}>{nama}</button>
                ))}
              </div>
            )}
            {f.errors.tanggal_datang && <p className="mt-1 text-xs text-red-600">{f.errors.tanggal_datang}</p>}
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {ringkasan.map(([l, v, c]) => (
          <div key={l} className={`${card} border-l-4 border-l-[#CFAE6A]`}>
            <p className="text-sm text-slate-500">{l}</p>
            <p className={`mt-1 text-2xl font-bold ${c}`}>{v}</p>
          </div>
        ))}
      </div>

      {!terkunci && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-sm text-slate-500">Isi cepat:</span>
          <button type="button" onClick={samakanQty} disabled={bisaSamakanQty === 0} className="rounded-full px-3 py-1 text-sm font-medium text-slate-600 ring-1 ring-slate-300 transition hover:bg-slate-50 disabled:opacity-40">
            Qty diterima sama dengan qty PO
          </button>
          <button type="button" onClick={isiHargaTerakhir} disabled={bisaIsiHarga === 0} className="rounded-full px-3 py-1 text-sm font-medium text-slate-600 ring-1 ring-slate-300 transition hover:bg-slate-50 disabled:opacity-40">
            Pakai harga terakhir{bisaIsiHarga > 0 ? ` (${bisaIsiHarga} barang)` : ''}
          </button>
          <select
            className={`${select} h-8 w-auto rounded-full py-0 text-sm`}
            value=""
            disabled={supplierKosong === 0 || suppliers.length === 0}
            onChange={(e) => isiSupplierKosong(e.target.value)}
            aria-label="Isi supplier untuk barang yang masih kosong"
          >
            <option value="">{supplierKosong > 0 ? `Isi ${supplierKosong} supplier kosong dengan…` : 'Semua supplier terisi'}</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.nama}</option>)}
          </select>
        </div>
      )}

      {suppliers.length === 0 && !terkunci && (
        <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Belum ada supplier. Tambahkan lewat halaman Barang, tombol "Kelola supplier".
        </p>
      )}

      <div className={tableWrap}>
        <table className="w-full">
          <thead className="bg-[#0A1F4A]">
            <tr>{['Barang', 'Supplier', 'Qty PO', 'Qty diterima', 'Harga satuan', 'Harga terakhir', 'Subtotal'].map((h) => <th key={h} className={th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map(({ it, r, idx, harga, selisih, bedaQty, subtotal }) => (
              <tr key={it.id} className={`${tr} align-top`}>
                <td className={`${td} font-medium text-slate-900`}>{it.barang}</td>
                <td className={td}>
                  <select
                    className={`${select} min-w-[10rem]`}
                    disabled={terkunci}
                    value={r.supplier_id}
                    onChange={(e) => setItem(idx, 'supplier_id', e.target.value)}
                  >
                    <option value="">Belum ditentukan</option>
                    {suppliers.map((s) => <option key={s.id} value={s.id}>{s.nama}</option>)}
                  </select>
                  {f.errors[`items.${idx}.supplier_id`] && <p className="mt-1 text-xs text-red-600">{f.errors[`items.${idx}.supplier_id`]}</p>}
                </td>
                <td className={`${td} whitespace-nowrap`}>{angka(it.qty)} {it.satuan}</td>
                <td className={td}>
                  <input
                    type="number" min="0" step="0.001"
                    disabled={terkunci}
                    className={`${input} w-28`}
                    placeholder={String(it.qty)}
                    value={r.qty_diterima}
                    onChange={(e) => setItem(idx, 'qty_diterima', e.target.value)}
                  />
                  {bedaQty !== 0 && (
                    <p className={`mt-1 text-xs font-medium ${bedaQty < 0 ? 'text-amber-600' : 'text-sky-600'}`}>
                      {bedaQty < 0 ? 'kurang' : 'lebih'} {angka(Math.abs(bedaQty))} {it.satuan}
                    </p>
                  )}
                  {f.errors[`items.${idx}.qty_diterima`] && <p className="mt-1 text-xs text-red-600">{f.errors[`items.${idx}.qty_diterima`]}</p>}
                </td>
                <td className={td}>
                  {terkunci ? (
                    <span className="whitespace-nowrap font-medium">{harga != null ? rupiah(harga) : '-'}</span>
                  ) : (
                    <>
                      <RupiahInput className="w-40" placeholder="0" value={r.harga_modal} onChange={(v) => setItem(idx, 'harga_modal', v)} />
                      {harga == null && it.harga_terakhir && (
                        <button type="button" className="mt-1 text-xs text-[#0A1F4A] underline decoration-[#CFAE6A] underline-offset-2" onClick={() => setItem(idx, 'harga_modal', String(Math.round(it.harga_terakhir)))}>
                          pakai {rupiah(it.harga_terakhir)}
                        </button>
                      )}
                      {selisih != null && Math.abs(selisih) >= 0.5 && (
                        <p className={`mt-1 text-xs font-medium ${selisih > 0 ? (naikTajam(selisih) ? 'font-bold text-red-700' : 'text-red-600') : 'text-emerald-600'}`}>
                          {selisih > 0 ? '▲ naik' : '▼ turun'} {Math.abs(selisih).toFixed(1).replace('.', ',')}%
                          {naikTajam(selisih) && ' (cek ulang ke supplier)'}
                        </p>
                      )}
                    </>
                  )}
                  {f.errors[`items.${idx}.harga_modal`] && <p className="mt-1 text-xs text-red-600">{f.errors[`items.${idx}.harga_modal`]}</p>}
                </td>
                <td className={`${td} whitespace-nowrap text-slate-400`}>{it.harga_terakhir ? rupiah(it.harga_terakhir) : '-'}</td>
                <td className={`${td} whitespace-nowrap`}>{harga != null ? rupiah(subtotal) : <span className="text-slate-400">-</span>}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[#0A1F4A] bg-slate-50 font-semibold">
              <td className={td} colSpan={6}>Total belanja</td>
              <td className={`${td} whitespace-nowrap`}>{rupiah(totalBelanja)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="mt-4 text-sm text-slate-500">
        {terkunci
          ? 'PO sudah diterima, data dikunci.'
          : f.recentlySuccessful
            ? 'Perubahan tersimpan.'
            : 'Supplier dipilih per barang. Harga masuk riwayat harga barang. Qty diterima yang kosong dihitung sesuai qty PO.'}
      </p>

      {/* bar simpan muncul hanya kalau ada perubahan */}
      {dirty && !terkunci && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-4px_16px_rgba(10,31,74,0.08)] backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-amber-700">Ada perubahan yang belum disimpan.</p>
            <div className="flex gap-2">
              <button type="button" className={btnGhost} onClick={() => { f.setData(awal); f.clearErrors(); }}>Batalkan</button>
              <button type="button" className={btn} disabled={f.processing} onClick={() => simpan()}>{f.processing ? 'Menyimpan…' : 'Simpan perubahan'}</button>
            </div>
          </div>
        </div>
      )}
      {dirty && !terkunci && <div className="h-16" />}
    </MbgLayout>
  );
}