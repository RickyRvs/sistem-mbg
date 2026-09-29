import { input } from '@/lib/ui';

// value disimpan sebagai string angka murni ("1250000"), tampilannya "1.250.000"
export default function RupiahInput({ value, onChange, className = '', ...props }) {
  const tampil = value === '' || value == null ? '' : Number(value).toLocaleString('id-ID');

  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-400">Rp</span>
      <input
        {...props}
        type="text"
        inputMode="numeric"
        className={`${input} pl-9 text-right ${className}`}
        value={tampil}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
      />
    </div>
  );
}