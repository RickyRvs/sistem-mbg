<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('kategoris', function (Blueprint $t) {
            $t->id();
            $t->string('nama', 30)->unique();
            $t->timestamps();
        });

        // isi awal: 4 kategori bawaan + kategori apa pun yang sudah dipakai barang
        $awal = collect(['kering', 'sayur', 'livestock', 'lainnya'])
            ->merge(DB::table('barangs')->distinct()->pluck('kategori'))
            ->filter()
            ->map(fn ($k) => mb_strtolower(trim($k)))
            ->unique();

        foreach ($awal as $nama) {
            DB::table('kategoris')->insert(['nama' => $nama, 'created_at' => now(), 'updated_at' => now()]);
        }

        // kalau kolom barangs.kategori dulunya enum, ubah jadi string supaya bisa menerima kategori baru
        // (Laravel 10 ke bawah butuh: composer require doctrine/dbal)
        Schema::table('barangs', function (Blueprint $t) {
            $t->string('kategori', 30)->change();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kategoris');
    }
};