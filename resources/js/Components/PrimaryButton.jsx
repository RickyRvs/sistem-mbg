export default function PrimaryButton({ className = '', disabled, children, ...props }) {
    return (
        <button
            {...props}
            disabled={disabled}
            className={
                'inline-flex items-center justify-center rounded-xl bg-[#0A1F4A] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#132a5e] focus:outline-none focus:ring-2 focus:ring-[#CFAE6A] focus:ring-offset-2 active:bg-[#071636] ' +
                (disabled ? 'opacity-50 ' : '') +
                className
            }
        >
            {children}
        </button>
    );
}