<?php

namespace App\Http\Controllers;

use App\Models\{Barang, HargaHistory, PurchaseOrder, Sppg, StokMovement, Supplier};
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class PurchaseOrderController extends Controller
{
    public function index(Request $r)
    {
        $status = in_array($r->status, PurchaseOrder::STATUSES) ? $r->status : null;
        $q = trim((string) $r->q);

        $pos = PurchaseOrder::with(['sppg:id,nama', 'items.supplier:id,nama'])
            ->when($status, fn ($x) => $x->where('status', $status))
            ->when($q !== '', fn ($x) => $x->where(function ($w) use ($q) {
                $w->where('nomor', 'like', "%{$q}%")
                    ->orWhereHas('sppg', fn ($s) => $s->where('nama', 'like', "%{$q}%"))
                    ->orWhereHas('items.supplier', fn ($s) => $s->where('nama', 'like', "%{$q}%"));
            }))
            ->latest('tanggal_po')->latest('id')
            ->paginate(15)->withQueryString()
            ->through(function ($p) {
                $urutan = PurchaseOrder::STATUSES;
                $next = $urutan[array_search($p->status, $urutan) + 1] ?? null;

                return [
                    'id' => $p->id,
                    'nomor' => $p->nomor,
                    'status' => $p->status,
                    'sppg' => $p->sppg?->nama,
                    // supplier sekarang per barang, jadi di daftar ditampilkan gabungannya
                    'suppliers' => $p->items->pluck('supplier.nama')->filter()->unique()->values(),
                    'item_tanpa_supplier' => $p->items->whereNull('supplier_id')->count(),
                    'tanggal' => $p->tanggal_po->format('Y-m-d'),
                    'tanggal_datang' => $p->tanggal_datang?->format('Y-m-d'),
                    'total_modal' => $p->total_modal,
                    'item_total' => $p->items->count(),
                    'item_berharga' => $p->items->whereNotNull('harga_modal')->count(),
                    // alasan kenapa tombol "lanjut" di daftar belum bisa dipakai (null = boleh)
                    'hambatan' => $next ? $this->hambatMaju($p, $next) : null,
                ];
            });

        return Inertia::render('PurchaseOrder/Index', [
            'pos' => $pos,
            'filters' => ['q' => $q, 'status' => $status ?? ''],
            'counts' => PurchaseOrder::selectRaw('status, count(*) as n')->groupBy('status')->pluck('n', 'status'),
        ]);
    }

    public function create()
    {
        return Inertia::render('PurchaseOrder/Create', [
            'sppgs' => Sppg::orderBy('nama')->get(['id', 'nama']),
            'suppliers' => Supplier::orderBy('nama')->get(['id', 'nama']),
            'barangs' => Barang::orderBy('nama')->get(['id', 'nama', 'satuan']),
        ]);
    }

    public function store(Request $r)
    {
        $data = $r->validate([
            'sppg_id' => 'required|exists:sppgs,id',
            'tanggal_po' => 'required|date',
            'tanggal_datang' => 'nullable|date|after_or_equal:tanggal_po',
            'jumlah_pm' => 'nullable|integer|min:0',
            'keterangan' => 'nullable|string|max:255',
            'items' => 'required|array|min:1',
            'items.*.barang_id' => 'required|distinct|exists:barangs,id',
            'items.*.supplier_id' => 'nullable|exists:suppliers,id',
            'items.*.qty' => 'required|numeric|min:0.001',
        ], [
            'sppg_id.required' => 'SPPG wajib dipilih.',
            'tanggal_po.required' => 'Tanggal PO wajib diisi.',
            'tanggal_datang.after_or_equal' => 'Tanggal datang tidak boleh sebelum tanggal PO.',
            'items.required' => 'Tambahkan minimal satu barang.',
            'items.*.barang_id.required' => 'Pilih barang.',
            'items.*.barang_id.distinct' => 'Barang ini sudah ada di baris lain.',
            'items.*.qty.required' => 'Qty wajib diisi.',
            'items.*.qty.min' => 'Qty minimal 0,001.',
        ]);

        $po = DB::transaction(function () use ($data) {
            $po = PurchaseOrder::create(
                Arr::except($data, 'items') + ['nomor' => $this->nomor($data['tanggal_po']), 'status' => 'draft']
            );
            $barangs = Barang::whereIn('id', collect($data['items'])->pluck('barang_id'))->get()->keyBy('id');
            foreach ($data['items'] as $i) {
                $po->items()->create([
                    'barang_id' => $i['barang_id'],
                    'supplier_id' => $i['supplier_id'] ?? null,
                    'qty' => $i['qty'],
                    'satuan' => $barangs[$i['barang_id']]->satuan,
                ]);
            }
            return $po;
        });

        return redirect("/po/{$po->id}");
    }

    public function show(PurchaseOrder $purchaseOrder)
    {
        $purchaseOrder->load('items.barang:id,nama', 'sppg:id,nama');

        $itemIds = $purchaseOrder->items->pluck('id');
        $barangIds = $purchaseOrder->items->pluck('barang_id')->unique();

        // id item dari PO yang sudah dikonfirmasi/diterima saja yang boleh jadi acuan harga
        $valid = DB::table('purchase_order_items as i')
            ->join('purchase_orders as p', 'p.id', '=', 'i.purchase_order_id')
            ->whereIn('p.status', ['dikonfirmasi', 'diterima'])
            ->select('i.id');

        // harga terakhir per barang (dari PO lain), satu query saja
        $terakhir = HargaHistory::whereIn('barang_id', $barangIds)
            ->where(fn ($w) => $w->whereNull('purchase_order_item_id')
                ->orWhere(fn ($x) => $x->whereIn('purchase_order_item_id', $valid)
                    ->whereNotIn('purchase_order_item_id', $itemIds)))
            ->whereNotNull('harga_modal')
            ->orderByDesc('tanggal')->orderByDesc('id')
            ->get(['barang_id', 'harga_modal'])
            ->unique('barang_id')
            ->pluck('harga_modal', 'barang_id');

        return Inertia::render('PurchaseOrder/Show', [
            'po' => [
                'id' => $purchaseOrder->id,
                'nomor' => $purchaseOrder->nomor,
                'status' => $purchaseOrder->status,
                'sppg' => $purchaseOrder->sppg?->nama,
                'tanggal_po' => $purchaseOrder->tanggal_po->format('Y-m-d'),
                'tanggal_datang' => $purchaseOrder->tanggal_datang?->format('Y-m-d'),
                'jumlah_pm' => $purchaseOrder->jumlah_pm,
                'keterangan' => $purchaseOrder->keterangan,
                'items' => $purchaseOrder->items->sortBy('id')->values()->map(fn ($i) => [
                    'id' => $i->id,
                    'barang' => $i->barang?->nama,
                    'supplier_id' => $i->supplier_id,
                    'satuan' => $i->satuan,
                    'qty' => (float) $i->qty,
                    'qty_diterima' => $i->qty_diterima,
                    'harga_modal' => $i->harga_modal,
                    'harga_terakhir' => isset($terakhir[$i->barang_id]) ? (float) $terakhir[$i->barang_id] : null,
                ]),
            ],
            'suppliers' => Supplier::orderBy('nama')->get(['id', 'nama']),
        ]);
    }

    public function updateHarga(Request $r, PurchaseOrder $purchaseOrder)
    {
        if ($purchaseOrder->status === 'diterima') {
            throw ValidationException::withMessages([
                'status' => 'PO yang sudah diterima tidak bisa diubah. Mundurkan status dulu kalau perlu koreksi.',
            ]);
        }

        $data = $r->validate([
            'tanggal_datang' => 'nullable|date|after_or_equal:' . $purchaseOrder->tanggal_po->format('Y-m-d'),
            'items' => 'required|array|min:1',
            'items.*.id' => ['required', 'integer', Rule::in($purchaseOrder->items()->pluck('id')->all())],
            'items.*.supplier_id' => 'nullable|exists:suppliers,id',
            'items.*.qty_diterima' => 'nullable|numeric|min:0',
            'items.*.harga_modal' => 'nullable|numeric|min:0',
        ], [
            'tanggal_datang.after_or_equal' => 'Tanggal datang tidak boleh sebelum tanggal PO.',
            'items.*.qty_diterima.numeric' => 'Qty diterima harus berupa angka.',
            'items.*.harga_modal.numeric' => 'Harga harus berupa angka.',
        ]);

        DB::transaction(function () use ($data, $purchaseOrder) {
            $purchaseOrder->update([
                'tanggal_datang' => $data['tanggal_datang'] ?? null,
            ]);

            foreach ($data['items'] as $row) {
                $item = $purchaseOrder->items()->findOrFail($row['id']);
                $item->update([
                    'supplier_id' => $row['supplier_id'] ?? null,
                    'qty_diterima' => $row['qty_diterima'] ?? null,
                    'harga_modal' => $row['harga_modal'] ?? null,
                ]);

                if ($item->harga_modal !== null) {
                    HargaHistory::updateOrCreate(
                        ['purchase_order_item_id' => $item->id],
                        [
                            'barang_id' => $item->barang_id,
                            'supplier_id' => $item->supplier_id,
                            'tanggal' => $purchaseOrder->tanggal_datang ?? $purchaseOrder->tanggal_po,
                            'harga_modal' => $item->harga_modal,
                        ]
                    );
                } else {
                    // harga dikosongkan lagi, hapus dari riwayat supaya tidak jadi acuan
                    HargaHistory::where('purchase_order_item_id', $item->id)->delete();
                }
            }
        });

        return back();
    }

    public function updateStatus(Request $r, PurchaseOrder $purchaseOrder)
    {
        $urutan = PurchaseOrder::STATUSES;
        $data = $r->validate(['status' => ['required', Rule::in($urutan)]]);

        DB::transaction(function () use ($purchaseOrder, $data, $urutan) {
            // baca ulang di dalam transaksi supaya dua klik cepat / dua tab tidak saling menimpa
            $po = PurchaseOrder::with('items.barang:id,nama')->lockForUpdate()->findOrFail($purchaseOrder->id);

            $dari = array_search($po->status, $urutan);
            $ke = array_search($data['status'], $urutan);

            if (abs($ke - $dari) !== 1) {
                throw ValidationException::withMessages(['status' => 'Status hanya bisa maju atau mundur satu tahap.']);
            }

            if ($ke > $dari) {
                if ($msg = $this->hambatMaju($po, $data['status'])) {
                    throw ValidationException::withMessages(['status' => $msg]);
                }
            } elseif ($po->status === 'diterima') {
                $this->pastikanStokAman($po);
            }

            $po->update(['status' => $data['status']]);

            if ($data['status'] === 'diterima') {
                $this->masukkanStok($po);
            } elseif ($urutan[$dari] === 'diterima') {
                // dimundurkan dari diterima, tarik lagi stoknya
                StokMovement::whereIn('purchase_order_item_id', $po->items->pluck('id'))->delete();
            }
        });

        return back();
    }

    public function destroy(PurchaseOrder $purchaseOrder)
    {
        if ($purchaseOrder->status !== 'draft') {
            throw ValidationException::withMessages(['status' => 'Hanya PO berstatus draft yang bisa dihapus.']);
        }

        DB::transaction(function () use ($purchaseOrder) {
            HargaHistory::whereIn('purchase_order_item_id', $purchaseOrder->items()->pluck('id'))->delete();
            $purchaseOrder->items()->delete();
            $purchaseOrder->delete();
        });

        return redirect('/po');
    }

    // syarat untuk maju ke status tertentu; satu sumber aturan untuk daftar dan detail PO
    // (null = boleh maju, teks = alasan kenapa belum bisa)
    private function hambatMaju(PurchaseOrder $po, string $ke): ?string
    {
        if (in_array($ke, ['dikirim', 'dikonfirmasi', 'diterima']) && $po->items->contains(fn ($i) => $i->supplier_id === null)) {
            return 'Tentukan supplier tiap barang dulu';
        }

        if (in_array($ke, ['dikonfirmasi', 'diterima']) && $po->items->contains(fn ($i) => $i->harga_modal === null)) {
            return 'Harga belum lengkap';
        }

        return null;
    }

    // mundur dari diterima: stok yang ditarik tidak boleh membuat saldo minus (barangnya sudah keluar)
    private function pastikanStokAman(PurchaseOrder $po): void
    {
        foreach ($po->items as $i) {
            $masuk = StokMovement::where('purchase_order_item_id', $i->id)->first();
            if (! $masuk) {
                continue;
            }

            $saldo = (float) StokMovement::where('sppg_id', $masuk->sppg_id)
                ->where('barang_id', $masuk->barang_id)->sum('qty');

            if ($saldo - (float) $masuk->qty < -0.0005) {
                throw ValidationException::withMessages([
                    'status' => "Tidak bisa dimundurkan: stok {$i->barang?->nama} sudah terpakai, saldonya akan minus.",
                ]);
            }
        }
    }

    // barang masuk ke stok saat PO diterima, pakai qty diterima (kalau kosong ikut qty PO)
    private function masukkanStok(PurchaseOrder $po): void
    {
        foreach ($po->items as $i) {
            StokMovement::updateOrCreate(
                ['purchase_order_item_id' => $i->id],
                [
                    'sppg_id' => $po->sppg_id,
                    'barang_id' => $i->barang_id,
                    'tipe' => 'masuk',
                    'qty' => $i->qty_diterima ?? $i->qty,
                    'tanggal' => now()->toDateString(),
                    'keterangan' => "Penerimaan {$po->nomor}",
                ]
            );
        }
    }

    // nomor urut per tanggal, pakai nomor terakhir (bukan count) supaya aman kalau ada PO yang dihapus
    private function nomor(string $tanggal): string
    {
        $prefix = 'PO/' . date('Ymd', strtotime($tanggal)) . '/';
        $terakhir = PurchaseOrder::where('nomor', 'like', $prefix . '%')
            ->lockForUpdate()->orderByDesc('nomor')->value('nomor');
        $n = $terakhir ? ((int) substr($terakhir, -3)) + 1 : 1;

        return $prefix . str_pad($n, 3, '0', STR_PAD_LEFT);
    }
}