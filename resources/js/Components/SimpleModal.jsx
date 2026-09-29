import { useEffect } from 'react';
import { card } from '@/lib/ui';

// modal sederhana: klik latar atau tekan Esc untuk menutup
export default function SimpleModal({ title, onClose, wide = false, children }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`${card} max-h-[90vh] w-full overflow-auto ${wide ? 'max-w-lg' : 'max-w-md'}`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-[#0A1F4A]">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Tutup" className="rounded p-1 text-slate-400 hover:text-slate-600">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}