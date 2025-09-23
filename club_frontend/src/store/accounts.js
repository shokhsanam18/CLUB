import { create } from "zustand";
import api from "../lib/api";

export const useAccountsStore = create((set, get) => ({
    usersById: {},
    async getUserProfile(id, force = false) {
        const key = String(id);
        if (!force && get().usersById[key]) return get().usersById[key];
        const { data } = await api.get(`/accounts/${key}`);
        set((s) => ({ usersById: { ...s.usersById, [key]: data } }));
        return data;
    },
}));
