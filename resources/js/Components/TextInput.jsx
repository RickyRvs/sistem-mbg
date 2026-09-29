import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

export default forwardRef(function TextInput(
    { type = 'text', className = '', isFocused = false, ...props },
    ref,
) {
    const localRef = useRef(null);

    useImperativeHandle(ref, () => ({
        focus: () => localRef.current?.focus(),
    }));

    useEffect(() => {
        if (isFocused) {
            localRef.current?.focus();
        }
    }, [isFocused]);

    return (
        <input
            {...props}
            type={type}
            className={
                'rounded-xl border-slate-300 px-3.5 py-2.5 text-sm shadow-sm placeholder:text-slate-400 focus:border-[#0A1F4A] focus:ring-2 focus:ring-[#0A1F4A]/15 ' +
                className
            }
            ref={localRef}
        />
    );
});