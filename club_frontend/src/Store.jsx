import { create } from "zustand";

export const useSidebarStore = create((set) => ({
    side: false,
    closeSidebar: () => set(() => ({ side: false })),
    openSidebar: () => set(() => ({ side: true })),
    toggleSidebar: () => set((state) => ({ side: !state.side })),
}));
