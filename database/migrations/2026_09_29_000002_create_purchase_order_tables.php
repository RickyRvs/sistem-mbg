<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('purchase_orders', function (Blueprint $t) {
            $t->id();
            $t->string('nomor')->unique();
            $t->foreignId('sppg_id')->constrained();
            $t->foreignId('supplier_id')->nullable()->constrained();
            $t->date('tanggal_po');
            $t->date('tanggal_kirim')->nullable();
            $t->unsignedInteger('jumlah_pm')->nullable();
            $t->string('keterangan')->nullable();
            $t->string('status')->default('draft'); // draft, dikirim, dikonfirmasi, diterima
            $t->timestamps();
        });

        Schema::create('purchase_order_items', function (Blueprint $t) {
            $t->id();
            $t->foreignId('purchase_order_id')->constrained()->cascadeOnDelete();
            $t->foreignId('barang_id')->constrained();
            $t->decimal('qty', 12, 3);
            $t->string('satuan');
            $t->decimal('qty_diterima', 12, 3)->nullable();
            // harga diisi belakangan (fluktuatif), disimpan per baris PO sebagai snapshot
            $t->decimal('harga_modal', 14, 2)->nullable();
            $t->decimal('harga_jual', 14, 2)->nullable();
            $t->timestamps();
        });

        Schema::create('harga_histories', function (Blueprint $t) {
            $t->id();
            $t->foreignId('barang_id')->constrained();
            $t->foreignId('supplier_id')->nullable()->constrained();
            $t->foreignId('purchase_order_item_id')->nullable()->unique()->constrained()->nullOnDelete();
            $t->date('tanggal');
            $t->decimal('harga_modal', 14, 2);
            $t->decimal('harga_jual', 14, 2)->nullable();
            $t->timestamps();
            $t->index(['barang_id', 'tanggal']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('harga_histories');
        Schema::dropIfExists('purchase_order_items');
        Schema::dropIfExists('purchase_orders');
    }
};
