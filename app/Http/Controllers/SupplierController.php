<?php

namespace App\Http\Controllers;

use App\Models\{PurchaseOrder, Supplier};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class SupplierController extends Controller
{
    // riwayat PO per supplier: tiap PO hanya menampilkan barang yang dibeli dari supplier ini
    public function show(Request $r, Supplier $supplier)
    {
        $q = trim((string) $r->q);
        $punya = fn ($x) => $x->where('supplier_id', $supplier->id);

        $pos = PurchaseOrder::with([
                'sppg:id,nama',
                'items' => fn ($x) => $punya($x)->with('barang:id,nama')->orderBy('id'),
            ])
            ->whereHas('items', fn ($x) => $punya($x)
                ->when($q !== '', fn ($y) => $y->whereHas('barang', fn ($b) => $b->where('nama', 'like', "%{$q}%"))))
            ->latest('tanggal_po')->latest('id')
            ->paginate(10)->withQueryString()
            ->through(function ($p) {
                $items = $p->items->map(function ($i) {
                    $qty = (float) ($i->qty_diterima ?? $i->qty);
                    $harga = $i->harga_modal === null ? null : (float) $i->harga_modal;

                    return [
                        'id' => $i->id,
                        'barang' => $i->barang?->nama ?? '-',
                        'qty' => $qty,
                        'satuan' => $i->satuan,
                        'harga' => $harga,
                        'subtotal' => $harga === null ? null : $qty * $harga,
                    ];
                })->values();

                return [
                    'id' => $p->id,
                    'nomor' => $p->nomor,
                    'sppg' => $p->sppg?->nama,
                    'status' => $p->status,
                    'tanggal' => $p->tanggal_po->format('Y-m-d'),
                    'tanggal_datang' => $p->tanggal_datang?->format('Y-m-d'),
                    'items' => $items,
                    'total' => (float) $items->sum(fn ($i) => $i['subtotal'] ?? 0),
                ];
            });

        $belanja = DB::table('purchase_order_items as i')
            ->join('purchase_orders as p', 'p.id', '=', 'i.purchase_order_id')
            ->where('i.supplier_id', $supplier->id)
            ->whereIn('p.status', ['dikonfirmasi', 'diterima'])
            ->whereNotNull('i.harga_modal');

        return Inertia::render('Supplier/Show', [
            'supplier' => ['id' => $supplier->id, 'nama' => $supplier->nama],
            'pos' => $pos,
            'filters' => ['q' => $q],
            'ringkasan' => [
                'jumlah_po' => PurchaseOrder::whereHas('items', $punya)->count(),
                'total' => (float) (clone $belanja)->sum(DB::raw('coalesce(i.qty_diterima, i.qty) * i.harga_modal')),
            ],
        ]);
    }

    public function store(Request $r)
    {
        $this->bersihkan($r);
        $r->validate($this->aturan(), $this->pesan());

        Supplier::create(['nama' => $r->nama]);

        return back();
    }

    public function update(Request $r, Supplier $supplier)
    {
        $this->bersihkan($r);
        $r->validate($this->aturan($supplier->id), $this->pesan());

        $supplier->update(['nama' => $r->nama]);

        return back();
    }

    public function destroy(Supplier $supplier)
    {
        $item = DB::table('purchase_order_items')->where('supplier_id', $supplier->id)->count();
        $harga = DB::table('harga_histories')->where('supplier_id', $supplier->id)->count();

        if ($item + $harga > 0) {
            $rincian = $item > 0 ? "{$item} item PO" : "{$harga} riwayat harga";

            return back()->withErrors(['supplier' => "{$supplier->nama} sudah dipakai di {$rincian}, jadi tidak bisa dihapus."]);
        }

        $supplier->delete();

        return back();
    }

    private function aturan(?int $ignoreId = null): array
    {
        return [
            'nama' => [
                'required', 'string', 'max:100',
                // "CV Tani" dan "cv tani" dianggap sama
                function ($attr, $val, $fail) use ($ignoreId) {
                    $ada = Supplier::whereRaw('lower(nama) = ?', [mb_strtolower((string) $val)])
                        ->when($ignoreId, fn ($x) => $x->where('id', '!=', $ignoreId))
                        ->exists();
                    if ($ada) {
                        $fail('Supplier ini sudah ada.');
                    }
                },
            ],
        ];
    }

    private function pesan(): array
    {
        return [
            'nama.required' => 'Nama supplier wajib diisi.',
            'nama.max' => 'Nama supplier maksimal 100 huruf.',
        ];
    }

    private function bersihkan(Request $r): void
    {
        $r->merge(['nama' => preg_replace('/\s+/', ' ', trim((string) $r->nama))]);
    }
}