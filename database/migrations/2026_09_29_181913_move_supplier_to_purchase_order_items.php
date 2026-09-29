<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 0. tanggal_kirim -> tanggal_datang (lewati kalau sudah)
        if (Schema::hasColumn('purchase_orders', 'tanggal_kirim')
            && ! Schema::hasColumn('purchase_orders', 'tanggal_datang')) {
            Schema::table('purchase_orders', function (Blueprint $t) {
                $t->renameColumn('tanggal_kirim', 'tanggal_datang');
            });
        }

        // 1. tambah supplier_id ke item (lewati kalau sudah ada)
        if (! Schema::hasColumn('purchase_order_items', 'supplier_id')) {
            Schema::table('purchase_order_items', function (Blueprint $t) {
                $t->foreignId('supplier_id')->nullable()->constrained('suppliers')->nullOnDelete();
            });
        }

        // 2-3. salin supplier lama ke item, lalu buang dari PO
        if (Schema::hasColumn('purchase_orders', 'supplier_id')) {
            DB::statement('
                UPDATE purchase_order_items
                SET supplier_id = (
                    SELECT supplier_id FROM purchase_orders
                    WHERE purchase_orders.id = purchase_order_items.purchase_order_id
                )
                WHERE supplier_id IS NULL
            ');

            Schema::table('purchase_orders', function (Blueprint $t) {
                $t->dropForeign(['supplier_id']);
            });
            Schema::table('purchase_orders', function (Blueprint $t) {
                $t->dropColumn('supplier_id');
            });
        }
    }

    public function down(): void
    {
        Schema::table('purchase_orders', function (Blueprint $t) {
            $t->renameColumn('tanggal_datang', 'tanggal_kirim');
        });

        Schema::table('purchase_orders', function (Blueprint $t) {
            $t->foreignId('supplier_id')->nullable()->constrained('suppliers');
        });

        Schema::table('purchase_order_items', function (Blueprint $t) {
            $t->dropConstrainedForeignId('supplier_id');
        });
    }
};