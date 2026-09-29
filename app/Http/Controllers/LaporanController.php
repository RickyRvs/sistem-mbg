<?php

namespace App\Http\Controllers;

use App\Models\{ModalBelanja, PurchaseOrder, Sppg};
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class LaporanController extends Controller
{
    // hanya PO yang sudah dikonfirmasi supplier / diterima yang dihitung sebagai belanja
    private const STATUS_BELANJA = ['dikonfirmasi', 'diterima'];

    public function index(Request $r)
    {
        $v = $r->validate([
            'dari' => 'nullable|date',
            'sampai' => 'nullable|date',
            'sppg_id' => 'nullable|integer',
        ], [
            'dari.date' => 'Tanggal "dari" tidak valid.',
            'sampai.date' => 'Tanggal "sampai" tidak valid.',
        ]);

        $dari = Carbon::parse($v['dari'] ?? now()->startOfMonth())->toDateString();
        $sampai = Carbon::parse($v['sampai'] ?? now())->toDateString();

        if ($sampai < $dari) {
            throw ValidationException::withMessages(['sampai' => 'Tanggal "sampai" tidak boleh sebelum "dari".']);
        }

        // hanya terima sppg_id yang benar-benar ada
        $sppgId = ! empty($v['sppg_id']) ? Sppg::whereKey($v['sppg_id'])->value('id') : null;
        $sppgId = $sppgId ? (int) $sppgId : null;

        $semua = $this->ambil($dari, $sampai, $sppgId);
        $belanja = $semua->whereIn('status', self::STATUS_BELANJA)->values();
        $baris = $this->baris($belanja);

        $total = (float) $baris->sum('total');
        $porsi = $this->porsi($belanja);
        $perPorsi = $porsi > 0 ? round($total / $porsi) : null;

        // periode pembanding: rentang hari yang sama persis, tepat sebelum periode ini
        $hari = (int) abs(Carbon::parse($dari)->diffInDays(Carbon::parse($sampai))) + 1;
        $laluSampai = Carbon::parse($dari)->subDay();
        $laluDari = $laluSampai->copy()->subDays($hari - 1);
        $laluBelanja = $this->ambil($laluDari->toDateString(), $laluSampai->toDateString(), $sppgId)
            ->whereIn('status', self::STATUS_BELANJA)->values();
        $laluTotal = (float) $this->baris($laluBelanja)->sum('total');
        $laluPorsi = $this->porsi($laluBelanja);
        $laluPerPorsi = $laluPorsi > 0 ? round($laluTotal / $laluPorsi) : null;

        // belanja per hari (isi hari kosong dengan 0 kalau rentangnya tidak terlalu panjang)
        $perHari = $baris->groupBy('tanggal')->map(fn ($g) => (float) $g->sum('total'));
        $harian = $hari <= 62
            ? collect(CarbonPeriod::create($dari, $sampai))->map(fn ($d) => [
                'tanggal' => $d->format('Y-m-d'),
                'total' => $perHari[$d->format('Y-m-d')] ?? 0,
            ])->values()
            : $perHari->map(fn ($t, $tgl) => ['tanggal' => $tgl, 'total' => $t])->sortKeys()->values();

        $perBarang = $baris->groupBy('barang_id')->map(function ($g) {
            $qty = $g->sum('qty');
            $sum = $g->sum('total');
            $min = $g->min('harga');
            $max = $g->max('harga');

            return [
                'barang_id' => $g->first()['barang_id'],
                'barang' => $g->first()['barang'],
                'kategori' => $g->first()['kategori'],
                'satuan' => $g->first()['satuan'],
                'qty' => $qty,
                'total' => $sum,
                'rata' => $qty > 0 ? $sum / $qty : 0,
                'min' => $min,
                'max' => $max,
                'fluktuasi' => $min > 0 ? round(($max - $min) / $min * 100, 1) : 0,
            ];
        })->sortByDesc('total')->values();

        $perKategori = $baris->groupBy('kategori')->map(fn ($g, $k) => [
            'kategori' => $k, 'total' => $g->sum('total'),
        ])->sortByDesc('total')->values();

        // supplier sekarang diambil dari tiap item, jadi satu PO bisa masuk ke beberapa supplier
        $perSupplier = $baris->groupBy('supplier')->map(fn ($g, $s) => [
            'supplier' => $s,
            'jumlah_po' => $g->pluck('po_id')->unique()->count(),
            'total' => $g->sum('total'),
        ])->sortByDesc('total')->values();

        // ringkasan per SPPG, hanya berguna kalau tidak sedang difilter ke satu SPPG
        $perSppg = $sppgId ? collect() : $belanja->groupBy('sppg_id')->map(function ($g) use ($baris) {
            $t = (float) $baris->where('sppg_id', $g->first()->sppg_id)->sum('total');
            $p = $this->porsi($g);

            return [
                'sppg' => $g->first()->sppg?->nama ?? '-',
                'jumlah_po' => $g->count(),
                'total' => $t,
                'porsi' => $p,
                'per_porsi' => $p > 0 ? round($t / $p) : null,
            ];
        })->sortByDesc('total')->values();

        $totalPerPo = $baris->groupBy('po_id')->map(fn ($g) => $g->sum('total'));

        return Inertia::render('Laporan/Index', [
            'filter' => ['dari' => $dari, 'sampai' => $sampai, 'sppg_id' => $sppgId ? (string) $sppgId : ''],
            'sppgs' => Sppg::orderBy('nama')->get(['id', 'nama']),
            'ringkasan' => [
                'total' => $total,
                'total_diterima' => (float) $baris->where('status', 'diterima')->sum('total'),
                'total_menunggu' => (float) $baris->where('status', 'dikonfirmasi')->sum('total'),
                'jumlah_po' => $belanja->count(),
                'porsi' => $porsi,
                'per_porsi' => $perPorsi,
                'dikecualikan' => $semua->count() - $belanja->count(),
                'delta_total' => $this->delta($total, $laluTotal),
                'delta_per_porsi' => $perPorsi && $laluPerPorsi ? $this->delta($perPorsi, $laluPerPorsi) : null,
                'lalu_dari' => $laluDari->toDateString(),
                'lalu_sampai' => $laluSampai->toDateString(),
            ],
            'modal' => $this->modal($dari, $sampai, $sppgId),
            'harian' => $harian,
            'perKategori' => $perKategori,
            'perBarang' => $perBarang,
            'perSupplier' => $perSupplier,
            'perSppg' => $perSppg,
            'pos' => $belanja->map(function ($p) use ($totalPerPo) {
                $t = (float) ($totalPerPo[$p->id] ?? 0);
                $suppliers = $p->items->pluck('supplier.nama')->filter()->unique()->implode(', ');

                return [
                    'id' => $p->id,
                    'nomor' => $p->nomor,
                    'sppg' => $p->sppg?->nama,
                    'supplier' => $suppliers !== '' ? $suppliers : null,
                    'tanggal' => $p->tanggal_belanja->format('Y-m-d'),
                    'status' => $p->status,
                    'jumlah_pm' => $p->jumlah_pm,
                    'total' => $t,
                    'per_pm' => $p->jumlah_pm ? round($t / $p->jumlah_pm) : null,
                ];
            })->values(),
        ]);
    }

    // modal belanja yang periodenya beririsan dengan rentang laporan.
    // jatah harian = modal / jumlah hari periode. Tiap hari: selisih = jatah - belanja hari itu,
    // lalu dijumlahkan berjalan (kumulatif), jadi hari minus otomatis ditutup dari sisa hari sebelumnya.
    // Setelah periode selesai, sisa kumulatif itulah margin.
    private function modal(string $dari, string $sampai, ?int $sppgId): Collection
    {
        $hariIni = now()->toDateString();

        return ModalBelanja::with('sppg:id,nama')
            ->whereDate('tanggal_mulai', '<=', $sampai)
            ->whereDate('tanggal_selesai', '>=', $dari)
            ->when($sppgId, fn ($x) => $x->where('sppg_id', $sppgId))
            ->orderByDesc('tanggal_mulai')->orderByDesc('id')
            ->get()
            ->map(function ($m) use ($hariIni) {
                $mulai = $m->tanggal_mulai->toDateString();
                $selesai = $m->tanggal_selesai->toDateString();
                $hari = (int) abs($m->tanggal_mulai->diffInDays($m->tanggal_selesai)) + 1;
                $jatah = $m->jumlah / $hari;

                // belanja dihitung utuh di seluruh periode modal, bukan cuma di rentang filter laporan
                $baris = $this->baris(
                    $this->ambil($mulai, $selesai, $m->sppg_id)
                        ->whereIn('status', self::STATUS_BELANJA)->values()
                );
                $perHari = $baris->groupBy('tanggal')->map(fn ($g) => (float) $g->sum('total'));

                $kum = 0.0;
                $harian = collect(CarbonPeriod::create($mulai, $selesai))
                    ->map(function ($d) use ($perHari, $jatah, $hariIni, &$kum) {
                        $tgl = $d->format('Y-m-d');
                        $belanja = (float) ($perHari[$tgl] ?? 0);
                        $berjalan = $tgl <= $hariIni; // hari yang belum lewat tidak ikut menambah sisa

                        if ($berjalan) {
                            $kum += $jatah - $belanja;
                        }

                        return [
                            'tanggal' => $tgl,
                            'jatah' => round($jatah, 2),
                            'belanja' => $belanja,
                            'selisih' => $berjalan ? round($jatah - $belanja, 2) : null,
                            'kumulatif' => $berjalan ? round($kum, 2) : null,
                            'berjalan' => $berjalan,
                        ];
                    })->values();

                $hariBerjalan = $harian->where('berjalan', true)->count();
                $terpakai = (float) $baris->sum('total');

                return [
                    'id' => $m->id,
                    'sppg_id' => $m->sppg_id,
                    'sppg' => $m->sppg?->nama ?? '-',
                    'mulai' => $mulai,
                    'selesai' => $selesai,
                    'jumlah' => $m->jumlah,
                    'keterangan' => $m->keterangan,
                    'hari' => $hari,
                    'hari_berjalan' => $hariBerjalan,
                    'jatah' => round($jatah, 2),
                    'terpakai' => $terpakai,
                    'sisa' => round($m->jumlah - $terpakai, 2),
                    'sisa_berjalan' => $hariBerjalan > 0 ? round($kum, 2) : null,
                    'periode_selesai' => $hariIni > $selesai,
                    'harian' => $harian,
                ];
            })->values();
    }

    // PO dihitung di tanggal datang barang; kalau tanggal datang kosong, pakai tanggal PO
    private function ambil(string $dari, string $sampai, ?int $sppgId): Collection
    {
        return PurchaseOrder::with(['sppg:id,nama', 'items.supplier:id,nama', 'items.barang:id,nama,kategori'])
            ->whereRaw('date(coalesce(tanggal_datang, tanggal_po)) >= ?', [$dari])
            ->whereRaw('date(coalesce(tanggal_datang, tanggal_po)) <= ?', [$sampai])
            ->when($sppgId, fn ($x) => $x->where('sppg_id', $sppgId))
            ->orderByRaw('coalesce(tanggal_datang, tanggal_po)')->orderBy('id')
            ->get();
    }

    // satu baris per item PO yang sudah ada harganya
    private function baris(Collection $belanja): Collection
    {
        return $belanja->flatMap(fn ($p) => $p->items->map(fn ($i) => [
            'po_id' => $p->id,
            'sppg_id' => $p->sppg_id,
            'tanggal' => $p->tanggal_belanja->format('Y-m-d'),
            'status' => $p->status,
            'barang_id' => $i->barang_id,
            'barang' => $i->barang?->nama ?? '-',
            'kategori' => $i->barang?->kategori ?? 'lainnya',
            'supplier' => $i->supplier?->nama ?? 'Tanpa supplier',
            'satuan' => $i->satuan,
            'qty' => (float) ($i->qty_diterima ?? $i->qty),
            'harga' => $i->harga_modal === null ? null : (float) $i->harga_modal,
        ]))->filter(fn ($b) => $b['harga'] !== null)
            ->map(fn ($b) => $b + ['total' => $b['qty'] * $b['harga']])
            ->values();
    }

    // perkiraan total porsi: per SPPG per hari ambil jumlah PM terbesar,
    // supaya PO bahan kering dan sayur di hari yang sama tidak dihitung dua kali
    private function porsi(Collection $belanja): int
    {
        return (int) $belanja
            ->groupBy(fn ($p) => $p->sppg_id . '|' . $p->tanggal_belanja->format('Y-m-d'))
            ->sum(fn ($g) => (int) $g->max('jumlah_pm'));
    }

    // persen perubahan dibanding periode lalu (null kalau periode lalu kosong)
    private function delta(float $skrg, float $lalu): ?float
    {
        return $lalu > 0 ? round(($skrg - $lalu) / $lalu * 100, 1) : null;
    }
}