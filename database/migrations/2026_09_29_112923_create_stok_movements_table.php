<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('stok_movements', function (Blueprint $t) {
            $t->id();
            $t->foreignId('sppg_id')->constrained('sppgs');
            $t->foreignId('barang_id')->constrained('barangs');
            $t->string('tipe', 10); // masuk | keluar | koreksi
            $t->decimal('qty', 14, 3); // bertanda: masuk +, keluar -, koreksi +/-
            $t->date('tanggal');
            $t->foreignId('purchase_order_item_id')->nullable()
                ->constrained('purchase_order_items')->cascadeOnDelete();
            $t->string('keterangan')->nullable();
            $t->timestamps();
            $t->index(['sppg_id', 'barang_id']);
        });

        Schema::table('barangs', function (Blueprint $t) {
            $t->decimal('stok_minimum', 14, 3)->default(0)->after('satuan');
        });
    }

    public function down(): void
    {
        Schema::table('barangs', fn (Blueprint $t) => $t->dropColumn('stok_minimum'));
        Schema::dropIfExists('stok_movements');
    }
};