import { Link } from '@inertiajs/react';

export default function GuestLayout({ children }) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-[#071636] via-[#0A1F4A] to-[#132a5e] px-4 py-10">
            <Link href="/" className="mb-6 flex flex-col items-center">
                <img src="/logo-bgn.png" alt="BGN" className="h-20 w-auto drop-shadow-lg" />
                <p className="mt-3 text-xl font-bold text-[#CFAE6A]">Sistem MBG</p>
                <p className="text-sm text-white/60">Manajemen Dapur Makan Bergizi Gratis</p>
            </Link>

            <div className="w-full overflow-hidden rounded-2xl border-t-4 border-[#CFAE6A] bg-white px-7 py-7 shadow-2xl sm:max-w-md">
                {children}
            </div>
        </div>
    );
}