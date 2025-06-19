import { create } from "zustand";
import axios from "axios";
import { toast } from "sonner";
import { createJSONStorage, persist } from "zustand/middleware";

export const useSidebarStore = create((set) => ({
  side: false,
  closeSidebar: () => set(() => ({ side: false })),
  openSidebar: () => set(() => ({ side: true })),
}));