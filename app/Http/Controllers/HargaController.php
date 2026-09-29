<?php
// app/Http/Controllers/HargaController.php

namespace App\Http\Controllers;

use App\Models\{Barang, HargaHistory, Kategori};
use Illuminate\Http\Request;
use Inertia\Inertia;

class HargaController extends Controller
{
    public function index(Request $r)
    {
        $q = trim((string) $r->q);
        $kategori = $r->kategori ? Kategori::where('nama', $r->kategori)->value('nama') : null;
        $batas = now()->subDays(30)->toDateString();

        $barangs = Barang::query()
            ->when($q !== '', fn ($x) => $x->where('nama', 'like', "%{$q}%"))
            ->when($kategori, fn ($x) => $x->where('kategori', $kategori))
            ->whereIn('id', HargaHistory::select('barang_id')->whereNotNull('harga_modal'))
            ->orderBy('nama')
            ->paginate(15)
            ->withQueryString();

        $hist = HargaHistory::whereIn('barang_id', $barangs->pluck('id'))
            ->whereNotNull('harga_modal')
            ->orderByDesc('tanggal')->orderByDesc('id')
            ->get(['barang_id', 'tanggal', 'harga_modal'])
            ->groupBy('barang_id');

        $barangs->through(function ($b) use ($hist, $batas) {
            $h = $hist->get($b->id, collect());
            $skrg = $h->first();
            $lalu = $h->skip(1)->first();
            $bulan = $h->filter(fn ($x) => substr((string) $x->tanggal, 0, 10) >= $batas);
            $harga = fn ($x) => $x ? (float) $x->harga_modal : null;

            $terakhir = $harga($skrg);
            $sebelumnya = $harga($lalu);

            return [
                'id' => $b->id,
                'nama' => $b->nama,
                'kategori' => $b->kategori,
                'satuan' => $b->satuan,
                'terakhir' => $terakhir,
                'sebelumnya' => $sebelumnya,
                'perubahan' => $terakhir && $sebelumnya ? round(($terakhir - $sebelumnya) / $sebelumnya * 100, 1) : null,
                'rata30' => $bulan->isNotEmpty() ? round($bulan->avg('harga_modal')) : null,
                'min30' => $bulan->isNotEmpty() ? (float) $bulan->min('harga_modal') : null,
                'max30' => $bulan->isNotEmpty() ? (float) $bulan->max('harga_modal') : null,
                'tren' => $h->take(8)->reverse()->map(fn ($x) => (float) $x->harga_modal)->values(),
            ];
        });

        return Inertia::render('Harga/Index', [
            'barangs' => $barangs,
            'filters' => ['q' => $q, 'kategori' => $kategori ?? ''],
            'kategoris' => Kategori::orderByRaw("nama = 'lainnya'")->orderBy('nama')->pluck('nama'),
        ]);
    }
}