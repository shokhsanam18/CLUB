import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import api, { attachAuthHeader } from "../lib/api";

function extractError(e) {
    const data = e?.response?.data;
    if (!data) return e?.message || "Request failed";
    if (typeof data === "string") return data;
    if (Array.isArray(data)) return data.join(", ");
    if (typeof data === "object")
        return Object.entries(data)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
            .join(" | ");
    return "Request failed";
}

export const useAuthStore = create(
    persist(
        (set, get) => ({
            user: null,
            tokens: { access: null, refresh: null },
            loading: false,
            error: null,

            setTokens: (tokens) => set((s) => ({ tokens: { ...s.tokens, ...tokens } })),

            async login({ emailOrUsername, password }) {
                set({ loading: true, error: null });
                try {
                    const { data } = await api.post("/login/", {
                        username_or_email: emailOrUsername,
                        password,
                    });

                    const { user, tokens } = data || {};
                    set({ user, tokens, loading: false, error: null });
                    attachAuthHeader(tokens?.access);
                    return { ok: true, user, tokens };
                } catch (e1) {
                    try {
                        const { data } = await api.post("/auth/jwt/create/", {
                            username: emailOrUsername,
                            password,
                        });
                        const tokens = { access: data?.access, refresh: data?.refresh };
                        let user = null;
                        try {
                            const me = await api.get("/accounts/me/");
                            user = me?.data || null;
                        } catch {
                            /* optional */
                        }
                        set({ user, tokens, loading: false, error: null });
                        attachAuthHeader(tokens?.access);
                        return { ok: true, user, tokens };
                    } catch (e2) {
                        set({
                            loading: false,
                            error: extractError(e2) || extractError(e1) || "Invalid credentials",
                        });
                        return { ok: false, error: extractError(e2) || extractError(e1) };
                    }
                }
            },

            async getRegisterSchema() {
                try {
                    const { data } = await api.get("/register/");
                    return data;
                } catch {
                    return null;
                }
            },

            async register(payload) {
                set({ loading: true, error: null });
                try {
                    const clean = {
                        email: payload.email,
                        first_name: payload.first_name,
                        last_name: payload.last_name,
                        password: payload.password,
                        password_confirm: payload.password_confirm,
                    };
                    if (payload.university) clean.university = payload.university;
                    if (payload.bio) clean.bio = payload.bio;
                    if (payload.tg_id != null && String(payload.tg_id).trim() !== "") {
                        clean.tg_id = String(payload.tg_id).trim();
                    }

                    const { data } = await api.post("/register/", clean);
                    const { user, tokens } = data || {};
                    set({ user, tokens, loading: false, error: null });
                    attachAuthHeader(tokens?.access);
                    return { ok: true, user, tokens };
                } catch (e) {
                    const err = extractError(e);
                    set({ loading: false, error: err });
                    return { ok: false, error: err };
                }
            },

            async fetchMyProfile() {
                const id = get().user?.id;
                if (!id) return null;
                set({ loading: true, error: null });
                try {
                    const { data } = await api.get(`/accounts/${id}`);
                    set({ user: { ...get().user, ...data }, loading: false });
                    return data;
                } catch (e) {
                    set({ loading: false, error: extractError(e) || "Failed to load profile" });
                    return null;
                }
            },

            async updateMyProfile(patch) {
                const id = get().user?.id;
                if (!id) throw new Error("No user");
                set({ loading: true, error: null });
                try {
                    const { data } = await api.patch(`/accounts/${id}`, patch);
                    set({ user: { ...get().user, ...data }, loading: false });
                    return { ok: true, data };
                } catch (e) {
                    set({ loading: false, error: extractError(e) || "Failed to update profile" });
                    return { ok: false, error: e?.response?.data || e.message };
                }
            },

            logout() {
                set({
                    user: null,
                    tokens: { access: null, refresh: null },
                    error: null,
                    loading: false,
                });
                attachAuthHeader(null);
            },
        }),
        {
            name: "auth-store",
            storage: createJSONStorage(() => localStorage),
            partialize: (s) => ({ user: s.user, tokens: s.tokens }),
        },
    ),
);
