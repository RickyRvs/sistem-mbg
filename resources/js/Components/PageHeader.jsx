export default function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#0A1F4A]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        <div className="mt-3 h-1 w-12 rounded-full bg-[#CFAE6A]" />
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </div>
  );
}