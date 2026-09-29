<?php

namespace App\Http\Controllers;

use App\Models\{Barang, HargaHistory, Kategori, Sppg, StokMovement, Supplier};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class BarangController extends Controller
{
    public function index(Request $r)
    {
        $q = trim((string) $r->q);
        $daftarKategori = Kategori::orderByRaw("nama = 'lainnya'")->orderBy('nama')->get(['id', 'nama']);
        $kategori = $daftarKategori->contains('nama', $r->kategori) ? $r->kategori : null;
        $status = in_array($r->status, ['menipis', 'habis']) ? $r->status : null;
        // hanya terima sppg_id yang benar-benar ada
        $sppgId = $r->integer('sppg_id') ? Sppg::whereKey($r->integer('sppg_id'))->value('id') : null;

        $barangs = $this->dasar($sppgId)
            ->when($q !== '', fn ($x) => $x->where('nama', 'like', "%{$q}%"))
            ->when($kategori, fn ($x) => $x->where('kategori', $kategori))
            // aturan status di SQL ini harus sama dengan statusStok() di bawah
            ->when($status === 'habis', fn ($x) => $x->whereRaw('stok <= 0 and (jml_mov > 0 or stok_minimum > 0)'))
            ->when($status === 'menipis', fn ($x) => $x->whereRaw('stok > 0 and stok <= stok_minimum'))
            ->orderBy('nama')
            ->paginate(15)
            ->withQueryString();

        $ids = $barangs->pluck('id');

        // stok per barang per SPPG, hanya untuk barang yang tampil di halaman ini
        $mov = StokMovement::whereIn('barang_id', $ids)
            ->selectRaw('barang_id, sppg_id, sum(qty) as s')
            ->groupBy('barang_id', 'sppg_id')
            ->get()
            ->groupBy('barang_id');

        $poCount = DB::table('purchase_order_items')->whereIn('barang_id', $ids)
            ->selectRaw('barang_id, count(*) as n')->groupBy('barang_id')->pluck('n', 'barang_id');

        $barangs->through(function ($b) use ($mov, $poCount) {
            $min = (float) $b->stok_minimum;
            $stok = (float) $b->stok;
            $po = (int) ($poCount[$b->id] ?? 0);
            $jml = (int) $b->jml_mov;         // mutasi sesuai SPPG yang dipilih (untuk status)
            $jmlSemua = (int) $b->jml_mov_all; // mutasi semua SPPG (untuk kunci satuan & hapus)

            $alasan = collect([
                $po > 0 ? "{$po} item PO" : null,
                $jmlSemua > 0 ? "{$jmlSemua} mutasi stok" : null,
            ])->filter()->implode(' dan ');

            return [
                'id' => $b->id,
                'nama' => $b->nama,
                'kategori' => $b->kategori,
                'satuan' => $b->satuan,
                'stok_minimum' => $min,
                'stok' => $stok,
                'stok_sppg' => ($mov->get($b->id, collect()))->mapWithKeys(fn ($x) => [(string) $x->sppg_id => (float) $x->s]),
                'status' => $this->statusStok($stok, $min, $jml),
                // barang yang sudah dipakai: satuan dikunci dan tidak bisa dihapus
                'dipakai' => $po + $jmlSemua > 0,
                'alasan_dipakai' => $alasan ? "Sudah dipakai di {$alasan}" : null,
            ];
        });

        $hitung = Barang::selectRaw('kategori, count(*) as n')->groupBy('kategori')->pluck('n', 'kategori');

        // pemakaian supplier: item PO dan riwayat harga (dua-duanya menahan penghapusan)
        $itemSupplier = DB::table('purchase_order_items')->whereNotNull('supplier_id')
            ->selectRaw('supplier_id, count(*) as n')->groupBy('supplier_id')->pluck('n', 'supplier_id');
        $hargaSupplier = DB::table('harga_histories')->whereNotNull('supplier_id')
            ->selectRaw('supplier_id, count(*) as n')->groupBy('supplier_id')->pluck('n', 'supplier_id');

        return Inertia::render('Barang/Index', [
            'barangs' => $barangs,
            'filters' => [
                'q' => $q,
                'kategori' => $kategori ?? '',
                'status' => $status ?? '',
                'sppg_id' => $sppgId ? (string) $sppgId : '',
            ],
            'total' => Barang::count(),
            'ringkas' => $this->ringkas($sppgId),
            'kategoris' => $daftarKategori->map(fn ($k) => [
                'id' => $k->id,
                'nama' => $k->nama,
                'jumlah' => (int) ($hitung[$k->nama] ?? 0),
            ])->values(),
            'sppgs' => Sppg::orderBy('nama')->get(['id', 'nama']),
            'suppliers' => Supplier::orderBy('nama')->get(['id', 'nama'])->map(fn ($s) => [
                'id' => $s->id,
                'nama' => $s->nama,
                'item' => (int) ($itemSupplier[$s->id] ?? 0),
                'dipakai' => ((int) ($itemSupplier[$s->id] ?? 0) + (int) ($hargaSupplier[$s->id] ?? 0)) > 0,
            ])->values(),
        ]);
    }

    public function store(Request $r)
    {
        $this->bersihkan($r);
        $data = $r->validate($this->aturan(), $this->pesan());
        $data['stok_minimum'] = $data['stok_minimum'] ?? 0;

        DB::transaction(function () use ($data) {
            Kategori::firstOrCreate(['nama' => $data['kategori']]); // kategori baru otomatis dibuat
            Barang::create($data);
        });

        return back();
    }

    public function update(Request $r, Barang $barang)
    {
        $this->bersihkan($r);
        $data = $r->validate($this->aturan($barang->id), $this->pesan());
        $data['stok_minimum'] = $data['stok_minimum'] ?? 0;

        // satuan dikunci kalau sudah dipakai, supaya angka stok lama tidak berubah arti
        if ($data['satuan'] !== $barang->satuan && $this->pemakaian($barang)['total'] > 0) {
            throw ValidationException::withMessages([
                'satuan' => 'Satuan tidak bisa diubah karena barang sudah dipakai di PO atau stok.',
            ]);
        }

        DB::transaction(function () use ($barang, $data) {
            Kategori::firstOrCreate(['nama' => $data['kategori']]);
            $barang->update($data);
        });

        return back();
    }

    public function destroy(Barang $barang)
    {
        $p = $this->pemakaian($barang);

        if ($p['total'] > 0) {
            $rincian = collect([
                $p['po'] > 0 ? "{$p['po']} item PO" : null,
                $p['stok'] > 0 ? "{$p['stok']} mutasi stok" : null,
            ])->filter()->implode(' dan ');

            return back()->withErrors(['hapus' => "{$barang->nama} tidak bisa dihapus karena sudah dipakai di {$rincian}."]);
        }

        try {
            DB::transaction(function () use ($barang) {
                // riwayat harga tanpa PO (mis. dari seeder) ikut dibersihkan, kalau tidak FK akan menolak
                HargaHistory::where('barang_id', $barang->id)->delete();
                $barang->delete();
            });
        } catch (\Throwable) {
            return back()->withErrors(['hapus' => "{$barang->nama} masih dipakai data lain, tidak bisa dihapus."]);
        }

        return back();
    }

    // barang + total stok + jumlah mutasi dalam satu query, dibungkus supaya bisa difilter dengan where biasa
    // stok & jml_mov mengikuti SPPG yang dipilih (null = semua SPPG), jml_mov_all selalu semua SPPG
    private function dasar(?int $sppgId = null)
    {
        $mov = fn () => DB::table('stok_movements')
            ->whereColumn('barang_id', 'barangs.id')
            ->when($sppgId, fn ($x) => $x->where('sppg_id', $sppgId));

        $base = DB::table('barangs')
            ->select('barangs.*')
            ->selectSub($mov()->selectRaw('coalesce(sum(qty), 0)'), 'stok')
            ->selectSub($mov()->selectRaw('count(*)'), 'jml_mov')
            ->selectSub(
                DB::table('stok_movements')->whereColumn('barang_id', 'barangs.id')->selectRaw('count(*)'),
                'jml_mov_all'
            );

        return Barang::query()->fromSub($base, 'barangs');
    }

    // satu-satunya definisi status stok di sisi PHP
    private function statusStok(float $stok, float $min, int $jmlMutasi): string
    {
        if ($jmlMutasi === 0 && $min == 0.0) {
            return 'belum'; // belum pernah ada stok dan tidak ada minimum, jangan dianggap habis
        }
        if (round($stok, 3) <= 0) {
            return 'habis';
        }

        return round($stok, 3) <= $min ? 'menipis' : 'aman';
    }

    // hitung barang menipis dan habis dari seluruh master (bukan cuma halaman ini), sesuai SPPG yang dipilih
    private function ringkas(?int $sppgId = null): array
    {
        $hasil = ['menipis' => 0, 'habis' => 0];

        foreach ($this->dasar($sppgId)->get(['id', 'stok_minimum', 'stok', 'jml_mov']) as $b) {
            $s = $this->statusStok((float) $b->stok, (float) $b->stok_minimum, (int) $b->jml_mov);
            if (isset($hasil[$s])) {
                $hasil[$s]++;
            }
        }

        return $hasil;
    }

    private function aturan(?int $ignoreId = null): array
    {
        return [
            'nama' => [
                'required', 'string', 'max:100',
                // cek tanpa peduli huruf besar/kecil: "Beras" dan "beras" dianggap sama
                function ($attr, $val, $fail) use ($ignoreId) {
                    $ada = Barang::whereRaw('lower(nama) = ?', [mb_strtolower((string) $val)])
                        ->when($ignoreId, fn ($x) => $x->where('id', '!=', $ignoreId))
                        ->exists();
                    if ($ada) {
                        $fail('Nama barang ini sudah ada.');
                    }
                },
            ],
            'kategori' => 'required|string|max:30', // kategori yang belum ada dibuat otomatis di store/update
            'satuan' => 'required|string|max:20',
            'stok_minimum' => 'nullable|numeric|min:0|max:99999999',
        ];
    }

    private function pesan(): array
    {
        return [
            'nama.required' => 'Nama barang wajib diisi.',
            'kategori.required' => 'Kategori wajib diisi.',
            'kategori.max' => 'Nama kategori maksimal 30 huruf.',
            'satuan.required' => 'Satuan wajib diisi.',
            'stok_minimum.numeric' => 'Stok minimum harus berupa angka.',
            'stok_minimum.min' => 'Stok minimum tidak boleh negatif.',
        ];
    }

    // rapikan input: spasi ganda dibuang, satuan dan kategori huruf kecil
    private function bersihkan(Request $r): void
    {
        $r->merge([
            'nama' => preg_replace('/\s+/', ' ', trim((string) $r->nama)),
            'kategori' => mb_strtolower(preg_replace('/\s+/', ' ', trim((string) $r->kategori))),
            'satuan' => strtolower(trim((string) $r->satuan)),
        ]);
    }

    private function pemakaian(Barang $b): array
    {
        $po = DB::table('purchase_order_items')->where('barang_id', $b->id)->count();
        $stok = StokMovement::where('barang_id', $b->id)->count();

        return ['po' => $po, 'stok' => $stok, 'total' => $po + $stok];
    }
}