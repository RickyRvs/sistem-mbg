<?php

namespace App\Http\Controllers;

use App\Models\{Barang, Kategori};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class KategoriController extends Controller
{
    private const TETAP = 'lainnya'; // kategori cadangan, tidak boleh diubah atau dihapus

    public function store(Request $r)
    {
        $this->bersihkan($r);
        $r->validate(['nama' => ['required', 'string', 'max:30', Rule::unique('kategoris', 'nama')]], $this->pesan());

        Kategori::create(['nama' => $r->nama]);

        return back();
    }

    public function update(Request $r, Kategori $kategori)
    {
        if ($kategori->nama === self::TETAP) {
            throw ValidationException::withMessages(['nama' => 'Kategori "lainnya" tidak bisa diubah.']);
        }

        $this->bersihkan($r);
        $r->validate(['nama' => ['required', 'string', 'max:30', Rule::unique('kategoris', 'nama')->ignore($kategori->id)]], $this->pesan());

        DB::transaction(function () use ($r, $kategori) {
            // barang yang memakai nama lama ikut dipindah ke nama baru
            Barang::where('kategori', $kategori->nama)->update(['kategori' => $r->nama]);
            $kategori->update(['nama' => $r->nama]);
        });

        return back();
    }

    public function destroy(Kategori $kategori)
    {
        if ($kategori->nama === self::TETAP) {
            return back()->withErrors(['kategori' => 'Kategori "lainnya" tidak bisa dihapus.']);
        }

        $n = Barang::where('kategori', $kategori->nama)->count();
        if ($n > 0) {
            return back()->withErrors(['kategori' => "{$kategori->nama} masih dipakai {$n} barang. Pindahkan barangnya dulu."]);
        }

        $kategori->delete();

        return back();
    }

    private function bersihkan(Request $r): void
    {
        $r->merge(['nama' => mb_strtolower(preg_replace('/\s+/', ' ', trim((string) $r->nama)))]);
    }

    private function pesan(): array
    {
        return [
            'nama.required' => 'Nama kategori wajib diisi.',
            'nama.unique' => 'Kategori ini sudah ada.',
            'nama.max' => 'Nama kategori maksimal 30 huruf.',
        ];
    }
}