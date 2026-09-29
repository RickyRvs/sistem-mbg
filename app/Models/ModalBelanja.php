<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ModalBelanja extends Model
{
    protected $guarded = [];
    protected $casts = [
        'tanggal_mulai' => 'date',
        'tanggal_selesai' => 'date',
        'jumlah' => 'float',
    ];

    public function sppg() { return $this->belongsTo(Sppg::class); }
}