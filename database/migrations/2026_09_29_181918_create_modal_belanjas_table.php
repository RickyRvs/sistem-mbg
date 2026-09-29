<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('modal_belanjas', function (Blueprint $t) {
            $t->id();
            $t->foreignId('sppg_id')->constrained('sppgs')->cascadeOnDelete();
            $t->date('tanggal_mulai');
            $t->date('tanggal_selesai');
            $t->decimal('jumlah', 15, 2);
            $t->string('keterangan')->nullable();
            $t->timestamps();

            $t->index(['sppg_id', 'tanggal_mulai', 'tanggal_selesai']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('modal_belanjas');
    }
};