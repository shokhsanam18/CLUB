import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "../lib/api";

const toItems = (data) =>
    Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : data?.items || [];

export const useNotificationsStore = create(
    persist(
        (set, get) => ({
            list: [],
            recent: [],
            unreadCount: 0,
            loading: { list: false, recent: false, unread: false, mark: {} },
            error: { list: null, recent: null, unread: null },

            async fetchUnreadCount() {
                set((s) => ({
                    loading: { ...s.loading, unread: true },
                    error: { ...s.error, unread: null },
                }));
                try {
                    const { data } = await api.get("/notifications/unread_count/");
                    set((s) => ({
                        unreadCount: Number(data?.unread_count || 0),
                        loading: { ...s.loading, unread: false },
                    }));
                    return data;
                } catch (e) {
                    set((s) => ({
                        loading: { ...s.loading, unread: false },
                        error: { ...s.error, unread: e?.message || "Failed" },
                    }));
                    return null;
                }
            },

            async fetchRecent() {
                set((s) => ({
                    loading: { ...s.loading, recent: true },
                    error: { ...s.error, recent: null },
                }));
                try {
                    const { data } = await api.get("/notifications/recent/");
                    const items = Array.isArray(data?.notifications) ? data.notifications : [];
                    set((s) => ({
                        recent: items,
                        unreadCount: Number(data?.unread_count ?? s.unreadCount ?? 0),
                        loading: { ...s.loading, recent: false },
                    }));
                    return items;
                } catch (e) {
                    set((s) => ({
                        loading: { ...s.loading, recent: false },
                        error: { ...s.error, recent: e?.message || "Failed" },
                    }));
                    return [];
                }
            },

            async listAll(params = {}) {
                set((s) => ({
                    loading: { ...s.loading, list: true },
                    error: { ...s.error, list: null },
                }));
                try {
                    const { data } = await api.get("/notifications/", { params });
                    const items = toItems(data);
                    set((s) => ({ list: items, loading: { ...s.loading, list: false } }));
                    return items;
                } catch (e) {
                    set((s) => ({
                        loading: { ...s.loading, list: false },
                        error: { ...s.error, list: e?.message || "Failed" },
                    }));
                    return [];
                }
            },

            async markAsRead(id) {
                if (id == null) return null;
                set((s) => ({
                    loading: { ...s.loading, mark: { ...s.loading.mark, [id]: true } },
                }));
                try {
                    await api.post(`/notifications/${id}/mark_as_read/`, { is_read: true });
                    set((s) => {
                        const mapRead = (arr) =>
                            arr.map((n) =>
                                String(n.id) === String(id) ? { ...n, is_read: true } : n,
                            );
                        const nextUnread = Math.max(0, (s.unreadCount || 0) - 1);
                        return {
                            recent: mapRead(s.recent),
                            list: mapRead(s.list),
                            unreadCount: nextUnread,
                            loading: { ...s.loading, mark: { ...s.loading.mark, [id]: false } },
                        };
                    });
                    return { ok: true };
                } catch {
                    set((s) => ({
                        loading: { ...s.loading, mark: { ...s.loading.mark, [id]: false } },
                    }));
                    return null;
                }
            },

            async markAllAsRead() {
                try {
                    await api.post(`/notifications/mark_all_as_read/`, { is_read: true });
                    set((s) => ({
                        unreadCount: 0,
                        recent: (s.recent || []).map((n) => ({ ...n, is_read: true })),
                        list: (s.list || []).map((n) => ({ ...n, is_read: true })),
                    }));
                    return { ok: true };
                } catch {
                    return null;
                }
            },

            async refresh() {
                await Promise.all([get().fetchRecent(), get().fetchUnreadCount()]);
            },
        }),
        {
            name: "notifications-store",
            partialize: (s) => ({ recent: s.recent, unreadCount: s.unreadCount }),
        },
    ),
);
