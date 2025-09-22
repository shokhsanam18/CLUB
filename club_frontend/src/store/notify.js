import { create } from "zustand";

let counter = 0;

const TYPES = {
    success: "success",
    info: "info",
    error: "error",
};

function now() {
    return Date.now();
}

export const useNotifyStore = create((set, get) => ({
    toasts: [],
    push(toast) {
        const id = toast.id ?? `t_${++counter}`;
        const createdAt = now();

        const recent = get().toasts.some(
            (t) =>
                t.type === toast.type &&
                String(t.message || "").trim() === String(toast.message || "").trim() &&
                createdAt - t.createdAt < 2000,
        );
        if (recent) return id;

        const duration =
            typeof toast.duration === "number"
                ? toast.duration
                : toast.type === "error"
                  ? 5000
                  : toast.type === "info"
                    ? 3500
                    : 2500;

        set((s) => ({
            toasts: [
                ...s.toasts.slice(-4),
                {
                    id,
                    type: toast.type || "info",
                    title: toast.title || null,
                    message: toast.message || "",
                    createdAt,
                    duration,
                    action: toast.action || null,
                },
            ],
        }));
        return id;
    },
    remove(id) {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    },
    clear() {
        set({ toasts: [] });
    },

    success(message, opts = {}) {
        return get().push({ type: TYPES.success, message, ...opts });
    },
    info(message, opts = {}) {
        return get().push({ type: TYPES.info, message, ...opts });
    },
    error(message, opts = {}) {
        return get().push({ type: TYPES.error, message, ...opts });
    },
}));

export const notify = {
    success: (m, o) => useNotifyStore.getState().success(m, o),
    info: (m, o) => useNotifyStore.getState().info(m, o),
    error: (m, o) => useNotifyStore.getState().error(m, o),
    push: (o) => useNotifyStore.getState().push(o),
    remove: (id) => useNotifyStore.getState().remove(id),
    clear: () => useNotifyStore.getState().clear(),
};

export function formatError(ex, fallback = "Request failed") {
    const d = ex?.response?.data;
    if (!d) return ex?.message || fallback;
    if (typeof d === "string") return d;
    if (Array.isArray(d)) return d.join(", ");
    if (typeof d === "object")
        return Object.entries(d)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
            .join(" | ");
    return fallback;
}
