const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export const rupiah = (n) => 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID');

export const angka = (n) => Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: 3 });

// '2026-09-29' -> '29 Sep 2026'
export function tanggal(s) {
  if (!s) return '-';
  const [y, m, d] = String(s).slice(0, 10).split('-');
  return `${Number(d)} ${BULAN[Number(m) - 1]} ${y}`;
}