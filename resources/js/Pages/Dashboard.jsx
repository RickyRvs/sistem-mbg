import { Link, usePage } from '@inertiajs/react';
import MbgLayout from '@/Layouts/MbgLayout';
import PageHeader from '@/Components/PageHeader';
import { btn, card, rupiah, statusBadge, statusColor, tableWrap, td, th, tr } from '@/lib/ui';

const angka = (n) => Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 });
const tglPendek = (s) => new Date(`${s}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
const tglPanjang = (s) => new Date(`${s}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

const alur = [
  ['draft', 'Draft', 'bg-slate-400'],
  ['dikirim', 'Dikirim', 'bg-sky-500'],
  ['dikonfirmasi', 'Dikonfirmasi', 'bg-amber-500'],
  ['diterima', 'Diterima', 'bg-emerald-500'],
];

function Delta({ v }) {
  if (v == null) return null;
  const warna = v > 0 ? 'text-amber-600' : v < 0 ? 'text-emerald-600' : 'text-slate-400';
  return <span className={`font-medium ${warna}`}>{v > 0 ? '▲' : v < 0 ? '▼' : '•'} {Math.abs(v)}%</span>;
}

const Judul = ({ children, aksi }) => (
  <div className="mb-3 flex items-center justify-between gap-3">
    <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">{children}</h2>
    {aksi}
  </div>
);

const TautanKecil = ({ href, children }) => (
  <Link href={href} className="text-sm font-medium text-[#0A1F4A] underline decoration-[#CFAE6A] underline-offset-4">{children}</Link>
);

function Kpi({ nama, nilai, catatan, warna = 'text-[#0A1F4A]' }) {
  return (
    <div className={`${card} border-l-4 border-l-[#CFAE6A]`}>
      <p className="text-sm text-slate-500">{nama}</p>
      <p className={`mt-1 text-2xl font-bold ${warna}`}>{nilai}</p>
      {catatan && <p className="mt-1 flex items-center gap-2 text-xs text-slate-400">{catatan}</p>}
    </div>
  );
}

function Tindakan({ href, jumlah, teks, warna }) {
  if (!jumlah) return null;
  return (
    <Link href={href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-slate-50">
      <span className={`grid h-8 min-w-8 place-items-center rounded-lg px-2 text-sm font-bold ${warna}`}>{jumlah}</span>
      <span className="flex-1 text-sm text-slate-700">{teks}</span>
      <span className="text-slate-300">→</span>
    </Link>
  );
}

function GrafikHarian({ data }) {
  const maks = Math.max(...data.map((d) => d.total), 0);
  const total = data.reduce((a, d) => a + d.total, 0);
  return (
    <section className={`${card} h-full`}>
      <Judul>Belanja 14 hari terakhir</Judul>
      {maks === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">Belum ada belanja terkonfirmasi.</p>
      ) : (
        <>
          <p className="mb-4 text-2xl font-bold text-[#0A1F4A]">{rupiah(total)}</p>
          <div className="flex h-36 items-end gap-1">
            {data.map((d) => (
              <div key={d.tanggal} className="group flex h-full flex-1 items-end" title={`${tglPanjang(d.tanggal)}: ${rupiah(d.total)}`}>
                <div
                  className={`w-full rounded-t-md transition ${d.total > 0 ? 'bg-[#CFAE6A] group-hover:bg-[#0A1F4A]' : 'bg-slate-100'}`}
                  style={{ height: `${d.total > 0 ? Math.max(6, (d.total / maks) * 100) : 3}%` }}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-xs text-slate-400">
            <span>{tglPendek(data[0].tanggal)}</span>
            <span>Tertinggi {rupiah(maks)}</span>
            <span>{tglPendek(data[data.length - 1].tanggal)}</span>
          </div>
        </>
      )}
    </section>
  );
}

export default function Dashboard({ ringkasan, status, perlu, harian, kritis, menungguBarang, terbaru }) {
  const user = usePage().props.auth?.user;
  const namaDepan = user?.name?.split(' ')[0];
  const hariIni = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const totalPo = alur.reduce((a, [k]) => a + (status[k] ?? 0), 0);
  const adaTindakan = perlu.draft_tanpa_supplier + perlu.menunggu_barang + perlu.stok_habis + perlu.stok_menipis > 0;

  return (
    <MbgLayout title="Dashboard">
      <PageHeader title={namaDepan ? `Halo, ${namaDepan}` : 'Dashboard'} subtitle={hariIni}>
        <Link href="/po/create" className={btn}>+ Buat PO</Link>
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          nama="Belanja bulan ini"
          nilai={rupiah(ringkasan.belanja)}
          catatan={<><Delta v={ringkasan.delta_belanja} /><span>{ringkasan.delta_belanja != null ? 'vs bulan lalu' : 'belum ada pembanding'}</span></>}
        />
        <Kpi nama="Biaya per porsi" nilai={ringkasan.per_porsi ? rupiah(ringkasan.per_porsi) : '-'} catatan={`${angka(ringkasan.porsi)} porsi bulan ini`} />
        <Kpi nama="PO bulan ini" nilai={ringkasan.po_bulan_ini} catatan={`${totalPo} PO seluruhnya`} />
        <Kpi
          nama="Stok perlu perhatian"
          nilai={perlu.stok_habis + perlu.stok_menipis}
          warna={perlu.stok_habis > 0 ? 'text-red-600' : perlu.stok_menipis > 0 ? 'text-amber-600' : 'text-emerald-600'}
          catatan={perlu.stok_habis + perlu.stok_menipis === 0 ? 'Semua stok aman' : `${perlu.stok_habis} habis · ${perlu.stok_menipis} menipis`}
        />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2"><GrafikHarian data={harian} /></div>

        <section className={card}>
          <Judul>Perlu ditindak</Judul>
          {adaTindakan ? (
            <div className="-mx-1 space-y-1">
              <Tindakan href="/po?status=draft" jumlah={perlu.draft_tanpa_supplier} teks="PO draft belum ada supplier" warna="bg-slate-100 text-slate-600" />
              <Tindakan href="/po?status=dikonfirmasi" jumlah={perlu.menunggu_barang} teks="PO menunggu barang datang" warna="bg-amber-50 text-amber-700" />
              <Tindakan href="/barang?status=habis" jumlah={perlu.stok_habis} teks="Barang stok habis" warna="bg-red-50 text-red-700" />
              <Tindakan href="/barang?status=menipis" jumlah={perlu.stok_menipis} teks="Barang stok menipis" warna="bg-amber-50 text-amber-700" />
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-2xl">✅</p>
              <p className="mt-2 text-sm text-slate-500">Tidak ada yang perlu ditindak.</p>
            </div>
          )}
        </section>
      </div>

      <section className={`${card} mb-6`}>
        <Judul aksi={<TautanKecil href="/po">Semua PO</TautanKecil>}>Alur Purchase Order</Judul>
        {totalPo > 0 && (
          <div className="mb-4 flex h-2.5 overflow-hidden rounded-full bg-slate-100">
            {alur.map(([k, , warna]) => (
              <div key={k} className={warna} style={{ width: `${((status[k] ?? 0) / totalPo) * 100}%` }} />
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {alur.map(([k, nama, warna]) => (
            <Link key={k} href={`/po?status=${k}`} className="rounded-xl px-3 py-2 ring-1 ring-slate-200 transition hover:bg-slate-50 hover:ring-[#CFAE6A]">
              <p className="flex items-center gap-2 text-xs text-slate-500">
                <span className={`h-2 w-2 rounded-full ${warna}`} />{nama}
              </p>
              <p className="mt-1 text-xl font-bold text-[#0A1F4A]">{status[k] ?? 0}</p>
            </Link>
          ))}
        </div>
      </section>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <section className={card}>
          <Judul aksi={<TautanKecil href="/barang">Master barang</TautanKecil>}>Stok kritis</Judul>
          {kritis.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Semua stok aman.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {kritis.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{b.nama}</p>
                    <p className="text-xs text-slate-400">Minimum {angka(b.minimum)} {b.satuan}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-slate-700">{angka(b.stok)} {b.satuan}</span>
                    <span className={`${statusBadge} ${b.status === 'habis' ? 'bg-red-50 text-red-700 ring-red-200' : 'bg-amber-50 text-amber-700 ring-amber-200'}`}>
                      {b.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={card}>
          <Judul aksi={<TautanKecil href="/po?status=dikonfirmasi">Lihat semua</TautanKecil>}>Menunggu barang datang</Judul>
          {menungguBarang.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Tidak ada PO yang menunggu.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {menungguBarang.map((p) => (
                <li key={p.id}>
                  <Link href={`/po/${p.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:opacity-80">
                    <div>
                      <p className="text-sm font-medium text-[#0A1F4A]">{p.nomor}</p>
                      <p className="text-xs text-slate-400">{p.supplier ?? 'Tanpa supplier'} · {p.sppg}</p>
                    </div>
                    <span className={`text-xs font-medium ${p.telat ? 'text-red-600' : 'text-slate-500'}`}>
                      {p.tanggal_kirim ? `${p.telat ? 'Telat · ' : 'Kirim '}${tglPendek(p.tanggal_kirim)}` : 'Tanggal kirim belum diisi'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section>
        <Judul aksi={<TautanKecil href="/laporan">Buka laporan</TautanKecil>}>PO terbaru</Judul>
        <div className={tableWrap}>
          <table className="w-full">
            <thead className="bg-[#0A1F4A]">
              <tr>{['Nomor', 'SPPG', 'Supplier', 'Tanggal', 'Status', 'Total'].map((h) => <th key={h} className={th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {terbaru.length === 0 && (
                <tr><td className={`${td} py-10 text-center text-slate-400`} colSpan={6}>Belum ada PO. Klik "Buat PO" untuk mulai.</td></tr>
              )}
              {terbaru.map((p) => (
                <tr key={p.id} className={tr}>
                  <td className={td}><Link href={`/po/${p.id}`} className="font-medium text-[#0A1F4A] underline decoration-[#CFAE6A] underline-offset-4">{p.nomor}</Link></td>
                  <td className={td}>{p.sppg}</td>
                  <td className={td}>{p.supplier ?? <span className="text-slate-400">-</span>}</td>
                  <td className={`${td} whitespace-nowrap`}>{p.tanggal}</td>
                  <td className={td}><span className={`${statusBadge} ${statusColor[p.status]}`}>{p.status}</span></td>
                  <td className={`${td} font-medium`}>{p.total > 0 ? rupiah(p.total) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </MbgLayout>
  );
}