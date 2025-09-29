import { create } from "zustand";

export const useUiStore = create((set, get) => ({
    routeLoading: false,
    _timer: null,

    startRouteLoading: () => {
        const t = get()._timer;
        if (t) clearTimeout(t);
        const timer = setTimeout(() => set({ routeLoading: false, _timer: null }), 12000);
        set({ routeLoading: true, _timer: timer });
    },

    stopRouteLoading: () => {
        const t = get()._timer;
        if (t) clearTimeout(t);
        set({ routeLoading: false, _timer: null });
    },
}));
