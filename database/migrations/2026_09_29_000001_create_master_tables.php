<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('sppgs', function (Blueprint $t) {
            $t->id();
            $t->string('nama');
            $t->string('alamat')->nullable();
            $t->timestamps();
        });
        Schema::create('suppliers', function (Blueprint $t) {
            $t->id();
            $t->string('nama');
            $t->string('alamat')->nullable();
            $t->string('telepon')->nullable();
            $t->timestamps();
        });
        Schema::create('barangs', function (Blueprint $t) {
            $t->id();
            $t->string('nama')->unique();
            $t->string('kategori')->default('kering'); // kering, sayur, livestock, lainnya
            $t->string('satuan');                      // satuan baku (kg, liter, karung, ikat)
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('barangs');
        Schema::dropIfExists('suppliers');
        Schema::dropIfExists('sppgs');
    }
};
