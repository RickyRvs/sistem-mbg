<?php

namespace App\Http\Controllers;

use App\Models\{Barang, Kategori, Sppg, StokMovement};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class StokController extends Controller
{
    public function index(Request $r)
    {
        $sppgId = $r->integer('sppg_id') ?: null;
        $q = trim((string) $r->q);
        $kategori = $r->kategori ? Kategori::where('nama', $r->kategori)->value('nama') : null;
        $kurang = $r->boolean('kurang');

        $sub = fn () => StokMovement::query()
            ->whereColumn('barang_id', 'barangs.id')
            ->when($sppgId, fn ($x) => $x->where('sppg_id', $sppgId));

        // ringkasan seluruh master (bukan cuma halaman ini): jumlah, menipis, habis per kategori
        $semua = Barang::query()
            ->select('barangs.id', 'barangs.kategori', 'barangs.stok_minimum')
            ->selectSub($sub()->selectRaw('coalesce(sum(qty), 0)'), 'stok')
            ->selectSub($sub()->selectRaw('count(*)'), 'jml_mov')
            ->get()
            ->map(fn ($b) => [
                'kategori' => $b->kategori,
                'status' => $this->statusStok((float) $b->stok, (float) $b->stok_minimum, (int) $b->jml_mov),
            ]);

        $kartuKategori = Kategori::orderByRaw("nama = 'lainnya'")->orderBy('nama')->pluck('nama')
            ->map(function ($nama) use ($semua) {
                $g = $semua->where('kategori', $nama);

                return [
                    'nama' => $nama,
                    'jumlah' => $g->count(),
                    'menipis' => $g->where('status', 'menipis')->count(),
                    'habis' => $g->where('status', 'habis')->count(),
                ];
            })->filter(fn ($k) => $k['jumlah'] > 0)->values();

        $stok = Barang::query()
            ->select('barangs.*')
            ->selectSub($sub()->selectRaw('coalesce(sum(qty), 0)'), 'stok')
            ->selectSub($sub()->selectRaw('count(*)'), 'jml_mov')
            ->selectSub(
                $sub()->selectRaw('coalesce(-sum(qty), 0)')
                    ->where('tipe', 'keluar')
                    ->where('tanggal', '>=', now()->subDays(7)->toDateString()),
                'keluar_7hari'
            )
            ->when($q !== '', fn ($x) => $x->where('nama', 'like', "%{$q}%"))
            ->when($kategori, fn ($x) => $x->where('kategori', $kategori))
            // sama dengan aturan di BarangController: menipis atau habis, kecuali barang yang belum pernah dipakai dan tanpa minimum
            ->when($kurang, fn ($x) => $x->havingRaw('stok <= barangs.stok_minimum and (jml_mov > 0 or barangs.stok_minimum > 0)'))
            ->orderByRaw('(stok > barangs.stok_minimum) asc')
            ->orderBy('nama')
            ->paginate(24)
            ->withQueryString()
            ->through(function ($b) {
                $stok = (float) $b->stok;
                $pakai = (float) $b->keluar_7hari / 7;
                $min = (float) $b->stok_minimum;

                return [
                    'id' => $b->id,
                    'nama' => $b->nama,
                    'kategori' => $b->kategori,
                    'satuan' => $b->satuan,
                    'stok' => $stok,
                    'minimum' => $min,
                    'pakai_per_hari' => round($pakai, 2),
                    'sisa_hari' => $pakai > 0 ? (int) floor($stok / $pakai) : null,
                    'status' => $this->statusStok($stok, $min, (int) $b->jml_mov),
                ];
            });

        return Inertia::render('Stok/Index', [
            'stok' => $stok,
            'filters' => [
                'q' => $q,
                'kategori' => $kategori ?? '',
                'sppg_id' => $sppgId ? (string) $sppgId : '',
                'kurang' => $kurang,
            ],
            'ringkas' => [
                'total' => $semua->count(),
                'menipis' => $semua->where('status', 'menipis')->count(),
                'habis' => $semua->where('status', 'habis')->count(),
            ],
            'kartuKategori' => $kartuKategori,
            'sppgs' => Sppg::orderBy('nama')->get(['id', 'nama']),
            'kategoris' => Kategori::orderByRaw("nama = 'lainnya'")->orderBy('nama')->pluck('nama'),
        ]);
    }

    // catat pemakaian (keluar), tambah stok manual (masuk), atau koreksi stok
    public function store(Request $r)
    {
        $d = $r->validate([
            'sppg_id' => 'required|exists:sppgs,id',
            'barang_id' => 'required|exists:barangs,id',
            'tipe' => 'required|in:keluar,masuk,koreksi',
            'qty' => 'required|numeric|not_in:0',
            'tanggal' => 'required|date',
            'keterangan' => 'nullable|string|max:255',
        ], [
            'sppg_id.required' => 'Pilih SPPG.',
            'barang_id.required' => 'Pilih barang.',
            'qty.required' => 'Qty wajib diisi.',
            'qty.not_in' => 'Qty tidak boleh 0.',
        ]);

        $qty = match ($d['tipe']) {
            'keluar' => -abs((float) $d['qty']),
            'masuk' => abs((float) $d['qty']),
            default => (float) $d['qty'],
        };

        DB::transaction(function () use ($d, $qty) {
            // kunci baris mutasi barang ini supaya pengecekan sisa dan penyimpanan tidak balapan
            $sisa = (float) StokMovement::where('sppg_id', $d['sppg_id'])
                ->where('barang_id', $d['barang_id'])
                ->lockForUpdate()
                ->sum('qty');

            if (round($sisa + $qty, 3) < 0) {
                $tampil = rtrim(rtrim(number_format($sisa, 3, ',', '.'), '0'), ',');
                throw ValidationException::withMessages(['qty' => "Stok tidak cukup. Sisa saat ini {$tampil}."]);
            }

            StokMovement::create([
                'sppg_id' => $d['sppg_id'],
                'barang_id' => $d['barang_id'],
                'tipe' => $d['tipe'],
                'qty' => $qty,
                'tanggal' => $d['tanggal'],
                'keterangan' => $d['keterangan'] ?? null,
            ]);
        });

        return back();
    }

    // atur stok ke angka sebenarnya (stok awal / stok opname), selisihnya dicatat sebagai koreksi
    public function opname(Request $r)
    {
        $d = $r->validate([
            'sppg_id' => 'required|exists:sppgs,id',
            'barang_id' => 'required|exists:barangs,id',
            'stok_baru' => 'required|numeric|min:0',
            'keterangan' => 'nullable|string|max:255',
        ], [
            'sppg_id.required' => 'Pilih SPPG.',
            'stok_baru.required' => 'Isi stok sebenarnya.',
            'stok_baru.min' => 'Stok tidak boleh negatif.',
        ]);

        DB::transaction(function () use ($d) {
            $sekarang = (float) StokMovement::where('sppg_id', $d['sppg_id'])
                ->where('barang_id', $d['barang_id'])
                ->lockForUpdate()
                ->sum('qty');

            $selisih = round((float) $d['stok_baru'] - $sekarang, 3);

            if (abs($selisih) < 0.0005) {
                return; // sudah sama, tidak ada yang perlu dicatat
            }

            StokMovement::create([
                'sppg_id' => $d['sppg_id'],
                'barang_id' => $d['barang_id'],
                'tipe' => 'koreksi',
                'qty' => $selisih,
                'tanggal' => now()->toDateString(),
                'keterangan' => ($d['keterangan'] ?? null) ?: 'Stok opname',
            ]);
        });

        return back();
    }

    // harus sama dengan statusStok() di BarangController
    private function statusStok(float $stok, float $min, int $jmlMutasi): string
    {
        if ($jmlMutasi === 0 && $min == 0.0) {
            return 'belum';
        }
        if (round($stok, 3) <= 0) {
            return 'habis';
        }

        return round($stok, 3) <= $min ? 'menipis' : 'aman';
    }
}