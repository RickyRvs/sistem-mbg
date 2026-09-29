<?php

namespace App\Http\Controllers;

use App\Models\ModalBelanja;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class ModalBelanjaController extends Controller
{
    public function store(Request $r)
    {
        $d = $this->validasi($r);
        $this->cekTabrakan($d);

        ModalBelanja::create($d);

        return back();
    }

    public function update(Request $r, ModalBelanja $modalBelanja)
    {
        $d = $this->validasi($r);
        $this->cekTabrakan($d, $modalBelanja->id);

        $modalBelanja->update($d);

        return back();
    }

    public function destroy(ModalBelanja $modalBelanja)
    {
        $modalBelanja->delete();

        return back();
    }

    private function validasi(Request $r): array
    {
        $d = $r->validate([
            'sppg_id' => 'required|exists:sppgs,id',
            'tanggal_mulai' => 'required|date',
            'tanggal_selesai' => 'required|date|after_or_equal:tanggal_mulai',
            'jumlah' => 'required|numeric|min:1|max:99999999999',
            'keterangan' => 'nullable|string|max:255',
        ], [
            'sppg_id.required' => 'SPPG wajib dipilih.',
            'tanggal_mulai.required' => 'Tanggal mulai wajib diisi.',
            'tanggal_selesai.required' => 'Tanggal selesai wajib diisi.',
            'tanggal_selesai.after_or_equal' => 'Tanggal selesai tidak boleh sebelum tanggal mulai.',
            'jumlah.required' => 'Jumlah modal wajib diisi.',
            'jumlah.min' => 'Jumlah modal harus lebih dari 0.',
        ]);

        $d['keterangan'] = $d['keterangan'] ?? null;

        return $d;
    }

    // dua periode di SPPG yang sama tidak boleh beririsan, kalau tidak jatah harian terhitung dobel
    private function cekTabrakan(array $d, ?int $ignoreId = null): void
    {
        $lain = ModalBelanja::where('sppg_id', $d['sppg_id'])
            ->when($ignoreId, fn ($x) => $x->where('id', '!=', $ignoreId))
            ->whereDate('tanggal_mulai', '<=', $d['tanggal_selesai'])
            ->whereDate('tanggal_selesai', '>=', $d['tanggal_mulai'])
            ->first();

        if ($lain) {
            throw ValidationException::withMessages([
                'tanggal_mulai' => 'Bertabrakan dengan modal lain di SPPG ini ('
                    . $lain->tanggal_mulai->format('d/m/Y') . ' sampai ' . $lain->tanggal_selesai->format('d/m/Y') . ').',
            ]);
        }
    }
}