export default function Checkbox({ className = '', ...props }) {
    return (
        <input
            {...props}
            type="checkbox"
            className={
                'rounded border-slate-300 text-[#0A1F4A] shadow-sm focus:ring-[#CFAE6A] ' +
                className
            }
        />
    );
}