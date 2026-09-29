import { useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import SimpleModal from '@/Components/SimpleModal';
import { btn, btnGhost, input, label } from '@/lib/ui';

// tambah, ubah nama, dan hapus supplier. Supplier yang sudah dipakai tidak bisa dihapus.
export default function SupplierModal({ suppliers, onClose }) {
  const f = useForm({ nama: '' });
  const [edit, setEdit] = useState(null); // { id, nama }
  const [galat, setGalat] = useState('');

  const tambah = (e) => {
    e.preventDefault();
    setGalat('');
    f.post('/supplier', { preserveScroll: true, onSuccess: () => f.reset() });
  };

  const simpan = () => {
    router.patch(`/supplier/${edit.id}`, { nama: edit.nama }, {
      preserveScroll: true,
      onSuccess: () => { setEdit(null); setGalat(''); },
      onError: (e) => setGalat(e.nama || 'Gagal menyimpan.'),
    });
  };

  const hapus = (s) => {
    if (!confirm(`Hapus supplier ${s.nama}?`)) return;
    setGalat('');
    router.delete(`/supplier/${s.id}`, {
      preserveScroll: true,
      onError: (e) => setGalat(e.supplier || 'Gagal menghapus.'),
    });
  };

  return (
    <SimpleModal title="Kelola supplier" onClose={onClose}>
      <form onSubmit={tambah} className="mb-4">
        <label className={label}>Supplier baru</label>
        <div className="flex gap-2">
          <input className={input} maxLength={100} placeholder="cth: CV Tani Makmur" value={f.data.nama} onChange={(e) => f.setData('nama', e.target.value)} />
          <button className={btn} disabled={f.processing || !f.data.nama.trim()}>Tambah</button>
        </div>
        {f.errors.nama && <p className="mt-1 text-xs text-red-600">{f.errors.nama}</p>}
      </form>

      {galat && <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{galat}</p>}

      <ul className="max-h-72 divide-y divide-slate-100 overflow-auto rounded-xl ring-1 ring-slate-200">
        {suppliers.length === 0 && <li className="px-3 py-6 text-center text-sm text-slate-400">Belum ada supplier.</li>}
        {suppliers.map((s) => {
          const sedangEdit = edit?.id === s.id;
          return (
            <li key={s.id} className="flex items-center gap-2 px-3 py-2">
              {sedangEdit ? (
                <>
                  <input
                    autoFocus
                    className={`${input} h-9`}
                    maxLength={100}
                    value={edit.nama}
                    onChange={(e) => setEdit({ ...edit, nama: e.target.value })}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); simpan(); } }}
                  />
                  <button type="button" className="text-sm font-medium text-[#0A1F4A]" onClick={simpan}>Simpan</button>
                  <button type="button" className="text-sm text-slate-400" onClick={() => { setEdit(null); setGalat(''); }}>Batal</button>
                </>
              ) : (
                <>
                  <span className="text-sm font-medium text-slate-800">{s.nama}</span>
                  <span className="text-xs text-slate-400">{s.item} item PO</span>
                  <span className="ml-auto flex gap-1">
                    <button type="button" className="rounded-lg px-2.5 py-1 text-sm text-slate-600 transition hover:bg-slate-100" onClick={() => { setGalat(''); setEdit({ id: s.id, nama: s.nama }); }}>
                      Ubah
                    </button>
                    <button
                      type="button"
                      disabled={s.dipakai}
                      title={s.dipakai ? 'Sudah dipakai, tidak bisa dihapus' : 'Hapus supplier'}
                      className="rounded-lg px-2.5 py-1 text-sm text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                      onClick={() => hapus(s)}
                    >
                      Hapus
                    </button>
                  </span>
                </>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-slate-400">Supplier hanya bisa dihapus kalau belum pernah dipilih di PO. Mengubah nama otomatis berlaku di semua PO lama.</p>
      <div className="mt-4 flex justify-end">
        <button type="button" className={btnGhost} onClick={onClose}>Tutup</button>
      </div>
    </SimpleModal>
  );
}