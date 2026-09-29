<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PurchaseOrder extends Model
{
    public const STATUSES = ['draft', 'dikirim', 'dikonfirmasi', 'diterima'];

    protected $guarded = [];
    protected $casts = ['tanggal_po' => 'date', 'tanggal_datang' => 'date'];
    protected $appends = ['total_modal'];

    public function sppg() { return $this->belongsTo(Sppg::class); }
    public function items() { return $this->hasMany(PurchaseOrderItem::class); }

    // total belanja ke supplier (pakai qty diterima kalau sudah ada)
    public function getTotalModalAttribute() { return $this->items->sum(fn ($i) => $i->total_modal); }

    // belanja dihitung di hari barang datang; kalau belum diisi pakai tanggal PO
    public function getTanggalBelanjaAttribute() { return $this->tanggal_datang ?? $this->tanggal_po; }
}