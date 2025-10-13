import React, { useEffect, useRef, useState } from "react";

export default function ReasonModal({
    open,
    title = "Reject join request",
    subtitle = "Optionally add a reason for rejecting this request (visible to the user).",
    maxLength = 500,
    initialValue = "",
    confirmLabel = "Reject",
    onClose,
    onConfirm,
    busy = false,
}) {
    const [value, setValue] = useState(initialValue || "");
    const overlayRef = useRef(null);
    const textRef = useRef(null);

    useEffect(() => {
        if (open) {
            setValue(initialValue || "");
            setTimeout(() => textRef.current?.focus(), 10);
            const onKey = (e) => e.key === "Escape" && onClose?.();
            document.addEventListener("keydown", onKey);
            return () => document.removeEventListener("keydown", onKey);
        }
    }, [open, initialValue, onClose]);

    if (!open) return null;

    const remaining = maxLength - value.length;

    return (
        <div
            className="fixed inset-0 z-[1000] flex items-center justify-center"
            role="dialog"
            aria-modal="true"
            aria-label={title}
        >
            <div
                ref={overlayRef}
                className="absolute inset-0 bg-black/60 backdrop-blur-[1px]"
                onClick={(e) => {
                    if (e.target === overlayRef.current) onClose?.();
                }}
            />
            <div className="relative w-[92vw] max-w-lg rounded-2xl bg-[#1f1f1f] text-white ring-1 ring-white/10 p-5">
                <h3 className="text-lg font-semibold">{title}</h3>
                {subtitle && <p className="mt-1 text-sm text-white/80">{subtitle}</p>}
                <div className="mt-4">
                    <textarea
                        ref={textRef}
                        className="w-full min-h-[120px] rounded-lg bg-black/30 text-white p-3 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-[#77C042]/70 placeholder:text-white/40"
                        placeholder="Reason (optional)"
                        maxLength={maxLength}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                    />
                    <div className="mt-1 text-xs text-white/50 text-right">
                        {remaining} characters left
                    </div>
                </div>

                <div className="mt-5 flex items-center justify-end gap-2">
                    <button
                        className="px-4 py-2 rounded-md bg-white/10 hover:bg-white/20 transition cursor-pointer"
                        onClick={() => onClose?.()}
                        disabled={busy}
                    >
                        Cancel
                    </button>
                    <button
                        className="px-4 py-2 rounded-md bg-red-500/90 hover:bg-red-500 text-white font-semibold cursor-pointer disabled:opacity-60"
                        onClick={() => onConfirm?.(value.trim())}
                        disabled={busy}
                    >
                        {busy ? "Rejecting…" : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
