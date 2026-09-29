import { Head, Link, usePage } from '@inertiajs/react';
import { useState } from 'react';

const menu = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'PO', href: '/po' },
  { label: 'Stok', href: '/stok' },
  { label: 'Barang', href: '/barang' },
  { label: 'Laporan', href: '/laporan' },
];

export default function MbgLayout({ title, children }) {
  const { url, props } = usePage();
  const user = props.auth?.user;
  const [open, setOpen] = useState(false);

  const aktif = (href) => url === href || url.startsWith(href + '/') || url.startsWith(href + '?');

  const linkCls = (href) =>
    `rounded-lg px-4 py-2 text-sm font-medium transition ${
      aktif(href)
        ? 'bg-[#CFAE6A] text-[#0A1F4A] shadow-sm'
        : 'text-white/75 hover:bg-white/10 hover:text-white'
    }`;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-800">
      <Head title={title ? `${title} · Rio Grup` : 'Rio Grup'} />

      <nav className="sticky top-0 z-40 border-b-2 border-[#CFAE6A] bg-[#0A1F4A] shadow-lg">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-3">
              <img src="/logo-bgn.png" alt="BGN" className="h-10 w-auto" />
              <div className="hidden leading-tight sm:block">
                <p className="font-bold text-[#CFAE6A]">Rio Grup</p>
                <p className="text-[11px] tracking-wide text-white/60">Manajemen Belanja & Stok</p>
              </div>
            </Link>

            <div className="hidden items-center gap-1 md:flex">
              {menu.map((m) => (
                <Link key={m.href} href={m.href} className={linkCls(m.href)}>{m.label}</Link>
              ))}
            </div>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            {user && (
              <Link
                href="/profile"
                className={`flex items-center gap-2.5 rounded-lg px-2 py-1 transition hover:bg-white/10 ${
                  aktif('/profile') ? 'bg-white/10' : ''
                }`}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#CFAE6A] text-sm font-bold text-[#0A1F4A]">
                  {user.name?.charAt(0).toUpperCase()}
                </span>
                <span className="text-sm text-white/85">{user.name}</span>
              </Link>
            )}
            <Link
              href="/logout"
              method="post"
              as="button"
              className="rounded-lg border border-white/25 px-3.5 py-1.5 text-sm text-white/80 transition hover:border-[#CFAE6A] hover:bg-[#CFAE6A] hover:text-[#0A1F4A]"
            >
              Keluar
            </Link>
          </div>

          <button onClick={() => setOpen(!open)} className="rounded-lg p-2 text-white md:hidden" aria-label="Menu">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>

        {open && (
          <div className="space-y-1 border-t border-white/10 px-4 pb-4 pt-3 md:hidden">
            {menu.map((m) => (
              <Link key={m.href} href={m.href} className={`block ${linkCls(m.href)}`}>{m.label}</Link>
            ))}
            <Link href="/profile" className={`block ${linkCls('/profile')}`}>
              Profil{user ? ` (${user.name})` : ''}
            </Link>
            <Link href="/logout" method="post" as="button" className="block w-full rounded-lg px-4 py-2 text-left text-sm text-[#CFAE6A]">
              Keluar
            </Link>
          </div>
        )}
      </nav>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</main>

      <footer className="border-t border-slate-200 py-5 text-center text-xs text-slate-400">
        Rio Grup
      </footer>
    </div>
  );
}