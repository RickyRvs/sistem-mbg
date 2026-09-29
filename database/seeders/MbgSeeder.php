<?php

namespace Database\Seeders;

use App\Models\{Barang, Sppg, Supplier};
use Illuminate\Database\Seeder;

class MbgSeeder extends Seeder
{
    public function run(): void
    {
        Sppg::firstOrCreate(['nama' => 'SPPG Pelalawan Langgam Segati'], ['alamat' => 'Jalan M. Yamin, Segati Kec. Langgam']);
        Sppg::firstOrCreate(['nama' => 'SPPG Pelalawan Tambak'], ['alamat' => 'Jalan Lapangan Bola']);
        Supplier::firstOrCreate(['nama' => 'Supplier Contoh']);

        // dari contoh Excel PO; bahan gram dijadikan kg (input 0,2 untuk 200 gram)
        $barang = [
            ['Beras', 'kering', 'karung'], ['Minyak Goreng', 'kering', 'liter'], ['Gula Pasir', 'kering', 'kg'],
            ['Garam', 'kering', 'kg'], ['Knor', 'kering', 'kg'], ['Totole', 'kering', 'kg'],
            ['Susu Evaporasi', 'kering', 'liter'], ['Asam Jawa', 'kering', 'kg'], ['Ketumbar', 'kering', 'kg'],
            ['Kemiri', 'kering', 'kg'], ['Cabai Merah Panjang', 'sayur', 'kg'], ['Cabai Rawit', 'sayur', 'kg'],
            ['Bawang Merah', 'sayur', 'kg'], ['Bawang Putih', 'sayur', 'kg'], ['Tomat Hijau', 'sayur', 'kg'],
            ['Jeruk Nipis', 'sayur', 'kg'], ['Jahe', 'sayur', 'kg'], ['Kunyit', 'sayur', 'kg'],
            ['Kencur', 'sayur', 'kg'], ['Lengkuas', 'sayur', 'kg'], ['Daun Salam', 'sayur', 'ikat'],
        ];
        foreach ($barang as [$nama, $kategori, $satuan]) {
            Barang::firstOrCreate(['nama' => $nama], ['kategori' => $kategori, 'satuan' => $satuan]);
        }
    }
}
