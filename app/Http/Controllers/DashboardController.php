<?php

namespace App\Http\Controllers;

use App\Models\{Barang, PurchaseOrder, StokMovement};
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class DashboardController extends Controller
{
    private const STATUS_BELANJA = ['dikonfirmasi', 'diterima'];

    public function index()
    {
        $hariIni = now();
        $awalBulan = $hariIni->copy()->startOfMonth();

        // periode pembanding: bulan lalu, dari tanggal 1 sampai tanggal yang sama
        $awalLalu = $hariIni->copy()->subMonthNoOverflow()->startOfMonth();
        $sampaiLalu = $awalLalu->copy()->addDays($hariIni->day - 1)->min($awalLalu->copy()->endOfMonth());

        $belanjaBulan = $this->belanja($awalBulan, $hariIni);
        $belanjaLalu = $this->belanja($awalLalu, $sampaiLalu);

        // perkiraan porsi bulan ini: per SPPG per hari ambil PM terbesar (sama seperti laporan)
        $porsi = PurchaseOrder::whereIn('status', self::STATUS_BELANJA)
            ->whereDate('tanggal_po', '>=', $awalBulan->toDateString())
            ->whereDate('tanggal_po', '<=', $hariIni->toDateString())
            ->get(['sppg_id', 'tanggal_po', 'jumlah_pm'])
            ->groupBy(fn ($p) => $p->sppg_id . '|' . $p->tanggal_po->format('Y-m-d'))
            ->sum(fn ($g) => (int) $g->max('jumlah_pm'));

        // belanja 14 hari terakhir
        $dari14 = $hariIni->copy()->subDays(13)->startOfDay();
        $perHari = $this->queryBelanja($dari14, $hariIni)
            ->selectRaw('date(p.tanggal_po) as tgl, sum(coalesce(i.qty_diterima, i.qty) * i.harga_modal) as total')
            ->groupBy('tgl')
            ->pluck('total', 'tgl');

        $harian = collect(range(0, 13))->map(function ($n) use ($dari14, $perHari) {
            $d = $dari14->copy()->addDays($n)->format('Y-m-d');

            return ['tanggal' => $d, 'total' => (float) ($perHari[$d] ?? 0)];
        })->values();

        $status = PurchaseOrder::selectRaw('status, count(*) as n')->groupBy('status')->pluck('n', 'status');

        // stok kritis: total stok semua SPPG vs stok minimum
        $stokPerBarang = StokMovement::selectRaw('barang_id, sum(qty) as s, count(*) as n')
            ->groupBy('barang_id')->get()->keyBy('barang_id');

        $kritis = Barang::orderBy('nama')->get(['id', 'nama', 'satuan', 'stok_minimum'])
            ->map(function ($b) use ($stokPerBarang) {
                $m = $stokPerBarang->get($b->id);
                $stok = round((float) ($m->s ?? 0), 3);
                $min = (float) $b->stok_minimum;
                $adaMutasi = ($m->n ?? 0) > 0;

                if (! $adaMutasi && $min == 0.0) {
                    return null;
                }
                $st = $stok <= 0 ? 'habis' : ($stok <= $min ? 'menipis' : null);

                return $st ? [
                    'id' => $b->id, 'nama' => $b->nama, 'satuan' => $b->satuan,
                    'stok' => $stok, 'minimum' => $min, 'status' => $st,
                ] : null;
            })->filter()->values();

        $menungguBarang = PurchaseOrder::with(['sppg:id,nama', 'items.supplier:id,nama'])
            ->where('status', 'dikonfirmasi')
            ->orderBy('tanggal_datang')->orderBy('tanggal_po')
            ->limit(5)->get()
            ->map(fn ($p) => [
                'id' => $p->id,
                'nomor' => $p->nomor,
                'sppg' => $p->sppg?->nama,
                'supplier' => $p->items->pluck('supplier.nama')->filter()->unique()->implode(', ') ?: null,
                // nama key 'tanggal_kirim' sengaja dipertahankan supaya Dashboard.jsx tidak perlu diubah
                'tanggal_kirim' => $p->tanggal_datang?->format('Y-m-d'),
                'telat' => $p->tanggal_datang ? $p->tanggal_datang->lt(today()) : false,
            ]);

        $terbaru = PurchaseOrder::with(['sppg:id,nama', 'items.supplier:id,nama'])
            ->latest('tanggal_po')->latest('id')->limit(6)->get()
            ->map(fn ($p) => [
                'id' => $p->id,
                'nomor' => $p->nomor,
                'sppg' => $p->sppg?->nama,
                'supplier' => $p->items->pluck('supplier.nama')->filter()->unique()->implode(', ') ?: null,
                'tanggal' => $p->tanggal_po->format('Y-m-d'),
                'status' => $p->status,
                'total' => (float) $p->total_modal,
            ]);

        return Inertia::render('Dashboard', [
            'ringkasan' => [
                'belanja' => $belanjaBulan,
                'delta_belanja' => $belanjaLalu > 0 ? round(($belanjaBulan - $belanjaLalu) / $belanjaLalu * 100, 1) : null,
                'porsi' => (int) $porsi,
                'per_porsi' => $porsi > 0 ? round($belanjaBulan / $porsi) : null,
                'po_bulan_ini' => PurchaseOrder::whereDate('tanggal_po', '>=', $awalBulan->toDateString())->count(),
                'jenis_barang' => Barang::count(),
            ],
            'status' => $status,
            'perlu' => [
                'draft_tanpa_supplier' => PurchaseOrder::where('status', 'draft')->whereHas('items', fn ($q) => $q->whereNull('supplier_id'))->count(),
                'menunggu_barang' => $status['dikonfirmasi'] ?? 0,
                'stok_habis' => $kritis->where('status', 'habis')->count(),
                'stok_menipis' => $kritis->where('status', 'menipis')->count(),
            ],
            'harian' => $harian,
            'kritis' => $kritis->sortBy([['status', 'asc'], ['nama', 'asc']])->take(6)->values(),
            'menungguBarang' => $menungguBarang,
            'terbaru' => $terbaru,
        ]);
    }

    private function queryBelanja(Carbon $dari, Carbon $sampai)
    {
        return DB::table('purchase_order_items as i')
            ->join('purchase_orders as p', 'p.id', '=', 'i.purchase_order_id')
            ->whereIn('p.status', self::STATUS_BELANJA)
            ->whereNotNull('i.harga_modal')
            ->whereDate('p.tanggal_po', '>=', $dari->toDateString())
            ->whereDate('p.tanggal_po', '<=', $sampai->toDateString());
    }

    private function belanja(Carbon $dari, Carbon $sampai): float
    {
        return (float) $this->queryBelanja($dari, $sampai)
            ->sum(DB::raw('coalesce(i.qty_diterima, i.qty) * i.harga_modal'));
    }
}