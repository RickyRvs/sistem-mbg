<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['purchase_order_items', 'harga_histories'] as $tabel) {
            if (Schema::hasColumn($tabel, 'harga_jual')) {
                Schema::table($tabel, fn (Blueprint $t) => $t->dropColumn('harga_jual'));
            }
        }
    }

    public function down(): void
    {
        foreach (['purchase_order_items', 'harga_histories'] as $tabel) {
            Schema::table($tabel, fn (Blueprint $t) => $t->decimal('harga_jual', 15, 2)->nullable());
        }
    }
};