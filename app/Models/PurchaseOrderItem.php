<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PurchaseOrderItem extends Model
{
    protected $guarded = [];
    protected $casts = ['qty' => 'float', 'qty_diterima' => 'float', 'harga_modal' => 'float'];
    protected $appends = ['qty_final', 'total_modal'];

    public function purchaseOrder() { return $this->belongsTo(PurchaseOrder::class); }
    public function barang() { return $this->belongsTo(Barang::class); }
    public function supplier() { return $this->belongsTo(Supplier::class); }

    // qty yang dihitung = qty aktual diterima, kalau belum ada pakai qty PO
    public function getQtyFinalAttribute() { return (float) ($this->qty_diterima ?? $this->qty); }
    public function getTotalModalAttribute() { return round($this->qty_final * (float) $this->harga_modal, 2); }
}