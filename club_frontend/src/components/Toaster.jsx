import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNotifyStore } from "../store/notify";

const PALETTE = {
    success: {
        dot: "bg-[#77C042]",
        ring: "ring-[#77C042]/20",
        bar: "bg-[#77C042]",
        btn: "text-[#77C042] hover:text-[#67b539]",
        close: "text-[#77C042] hover:bg-[#77C042]/10 hover:text-[#67b539]",
    },
    error: {
        dot: "bg-rose-500",
        ring: "ring-rose-500/20",
        bar: "bg-rose-500",
        btn: "text-rose-600 hover:text-rose-700",
        close: "text-rose-600 hover:bg-rose-50 hover:text-rose-700",
    },
    info: {
        dot: "bg-blue-500",
        ring: "ring-blue-500/20",
        bar: "bg-blue-500",
        btn: "text-blue-600 hover:text-blue-700",
        close: "text-blue-600 hover:bg-blue-50 hover:text-blue-700",
    },
};

function TypeIcon({ type }) {
    const fill = "white";
    return (
        <div
            className={`shrink-0 grid place-items-center w-8 h-8 rounded-full ${PALETTE[type].dot}`}
        >
            {type === "success" && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                        d="M5 13l4 4L19 7"
                        stroke={fill}
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            )}
            {type === "error" && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                        d="M12 8v6m0 4h.01"
                        stroke={fill}
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            )}
            {type === "info" && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                        d="M12 10h.01M11 12h2v6h-2"
                        stroke={fill}
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            )}
        </div>
    );
}

function CloseIcon({ className }) {
    return (
        <svg
            className={className}
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
        >
            <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
            />
        </svg>
    );
}

function ToastCard({ t, onClose }) {
    const [hover, setHover] = useState(false);
    const [leaving, setLeaving] = useState(false);
    const timeoutRef = useRef(null);

    const [remaining, setRemaining] = useState(t.duration);
    const startedAt = useRef(Date.now());

    useEffect(() => {
        if (hover) {
            setRemaining((r) => r - (Date.now() - startedAt.current));
            clearTimeout(timeoutRef.current);
            return;
        }
        startedAt.current = Date.now();
        timeoutRef.current = setTimeout(() => onClose(), remaining);
        return () => clearTimeout(timeoutRef.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hover, remaining]);

    const handleClose = () => {
        setLeaving(true);
        setTimeout(onClose, 180);
    };

    const progressStyle = {
        animation: `toastProgress ${remaining}ms linear forwards`,
        animationPlayState: hover ? "paused" : "running",
    };

    const colors = PALETTE[t.type] || PALETTE.info;

    return (
        <div
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            role={t.type === "error" ? "alert" : "status"}
            aria-live={t.type === "error" ? "assertive" : "polite"}
            className={[
                "pointer-events-auto w-[min(92vw,420px)]",
                "rounded-2xl bg-white",
                "ring-1 shadow-[0_10px_28px_rgba(0,0,0,0.14)]",
                colors.ring,
                "text-gray-900 px-3 py-2.5",
                "transition-all duration-200",
                leaving ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0",
            ].join(" ")}
        >
            <div className="flex items-center gap-3">
                <TypeIcon type={t.type} />

                <div className="flex-1 min-w-0">
                    {t.title ? (
                        <>
                            <div className="text-sm font-semibold leading-5">{t.title}</div>
                            <div className="text-sm leading-5 text-gray-800">{t.message}</div>
                        </>
                    ) : (
                        <div className="text-sm leading-5 text-gray-900">{t.message}</div>
                    )}
                </div>

                {t.action?.label ? (
                    <button
                        onClick={() => {
                            try {
                                t.action.onClick?.();
                            } finally {
                                handleClose();
                            }
                        }}
                        className={[
                            "uppercase text-xs font-extrabold tracking-wide whitespace-nowrap",
                            "cursor-pointer select-none",
                            colors.btn,
                        ].join(" ")}
                    >
                        {t.action.label}
                    </button>
                ) : null}

                <button
                    onClick={handleClose}
                    className={[
                        "ml-1 p-1 rounded-md cursor-pointer",
                        "transition-colors duration-150",
                        colors.close,
                    ].join(" ")}
                    aria-label="Close notification"
                >
                    <CloseIcon />
                </button>
            </div>

            <div className="mt-2 h-0.5 w-full overflow-hidden rounded bg-gray-200/70">
                <div className={`h-full origin-left ${colors.bar}`} style={progressStyle} />
            </div>
        </div>
    );
}

export default function Toaster() {
    const toasts = useNotifyStore((s) => s.toasts);
    const remove = useNotifyStore((s) => s.remove);

    const portalEl = useMemo(() => {
        const el = document.createElement("div");
        el.setAttribute("id", "toast-portal");
        return el;
    }, []);

    useEffect(() => {
        document.body.appendChild(portalEl);
        return () => {
            try {
                document.body.removeChild(portalEl);
            } catch {
                /* no-op */
            }
        };
    }, [portalEl]);

    return createPortal(
        <>
            <style>{`
                @keyframes toastProgress { from { transform: scaleX(1)} to { transform: scaleX(0)} }
                @media (prefers-reduced-motion: reduce) {
                  #toast-portal .toast-reduce { animation: none !important; }
                }
            `}</style>

            <div className="pointer-events-none font-['Outfit'] fixed z-[9999] inset-x-0 bottom-4 flex flex-col items-center gap-3 md:inset-auto md:top-16 md:right-4 md:items-end">
                {toasts.map((t) => (
                    <ToastCard key={t.id} t={t} onClose={() => remove(t.id)} />
                ))}
            </div>
        </>,
        portalEl,
    );
}
