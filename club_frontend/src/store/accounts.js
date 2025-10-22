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

    async assignRole(userId, role) {
        const uid = Number(userId);
        if (!Number.isFinite(uid) || uid <= 0) throw new Error("Invalid user id");
        const payload = { user_id: uid, role: String(role) };

        const { data } = await api.post(`/accounts/${uid}/assign-role/`, payload);

        try {
            const fresh = await get().getUserProfile(uid, true);
            return fresh || data;
        } catch {
            return data;
        }
    },
}));
