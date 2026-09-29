<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Supplier extends Model
{
    protected $guarded = [];

    public function items() { return $this->hasMany(PurchaseOrderItem::class); }
    public function hargaHistories() { return $this->hasMany(HargaHistory::class); }
}