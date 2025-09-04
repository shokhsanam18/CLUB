import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "../lib/api";

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

export const useClubsStore = create(
    persist(
        (set, get) => ({
            clubs: [],
            clubsById: {},
            events: [],
            eventsById: {},
            eventsByClubId: {},
            loading: { list: false, club: false, events: {}, globalEvents: false },
            error: { list: null, club: null, events: {}, globalEvents: null },

            async listClubs(params = {}) {
                set((s) => ({
                    loading: { ...s.loading, list: true },
                    error: { ...s.error, list: null },
                }));
                try {
                    const { data } = await api.get("/clubs/", { params });
                    const items = Array.isArray(data?.results)
                        ? data.results
                        : Array.isArray(data)
                          ? data
                          : data?.items || [];
                    set((s) => ({ clubs: items, loading: { ...s.loading, list: false } }));
                    return items;
                } catch (e) {
                    set((s) => ({
                        loading: { ...s.loading, list: false },
                        error: { ...s.error, list: extractError(e) },
                    }));
                    return [];
                }
            },

            async getClub(id, force = false) {
                const cached = get().clubsById[id];
                if (cached && !force) return cached;
                set((s) => ({
                    loading: { ...s.loading, club: true },
                    error: { ...s.error, club: null },
                }));
                try {
                    const { data } = await api.get(`/clubs/${id}/`);
                    set((s) => ({
                        clubsById: { ...s.clubsById, [id]: data },
                        loading: { ...s.loading, club: false },
                    }));
                    return data;
                } catch (e) {
                    set((s) => ({
                        loading: { ...s.loading, club: false },
                        error: { ...s.error, club: extractError(e) },
                    }));
                    return null;
                }
            },

            async createClub(payload) {
                const { data } = await api.post("/clubs/", payload);
                set((s) => ({
                    clubs: [data, ...s.clubs],
                    clubsById: { ...s.clubsById, [data.id]: data },
                }));
                return data;
            },

            async updateClub(id, patch, method = "patch") {
                const fn = method === "put" ? api.put : api.patch;
                const { data } = await fn(`/clubs/${id}/`, patch);
                set((s) => ({
                    clubsById: { ...s.clubsById, [id]: data },
                    clubs: s.clubs.map((c) => (c.id === id ? data : c)),
                }));
                return data;
            },

            async deleteClub(id) {
                await api.delete(`/clubs/${id}/`);
                set((s) => ({
                    clubs: s.clubs.filter((c) => c.id !== id),
                    clubsById: Object.fromEntries(
                        Object.entries(s.clubsById).filter(([k]) => String(k) !== String(id)),
                    ),
                }));
            },

            async joinClub(id) {
                const { data } = await api.post(`/clubs/${id}/join/`);
                return data;
            },

            async leaveClub(id) {
                const { data } = await api.post(`/clubs/${id}/leave/`);
                return data;
            },

            async getClubStats(id) {
                const { data } = await api.get(`/clubs/${id}/stats/`);
                return data;
            },

            async bulkClubsAction(payload) {
                const { data } = await api.post(`/clubs/bulk-action/`, payload);
                return data;
            },

            async listEvents(params = {}) {
                set((s) => ({
                    loading: { ...s.loading, globalEvents: true },
                    error: { ...s.error, globalEvents: null },
                }));
                try {
                    const { data } = await api.get("/events/", { params });
                    const items = Array.isArray(data?.results)
                        ? data.results
                        : Array.isArray(data)
                          ? data
                          : data?.items || [];
                    set((s) => ({
                        events: items,
                        eventsById: items.reduce((acc, it) => ((acc[it.id] = it), acc), {}),
                        loading: { ...s.loading, globalEvents: false },
                    }));
                    return items;
                } catch (e) {
                    set((s) => ({
                        loading: { ...s.loading, globalEvents: false },
                        error: { ...s.error, globalEvents: extractError(e) },
                    }));
                    return [];
                }
            },

            async getEvent(id, force = false) {
                const cached = get().eventsById[id];
                if (cached && !force) return cached;
                const { data } = await api.get(`/events/${id}/`);
                set((s) => ({ eventsById: { ...s.eventsById, [id]: data } }));
                return data;
            },

            async getClubEvents(clubId, params = {}, force = false) {
                const cached = get().eventsByClubId[clubId];
                if (cached && !force) return cached;
                set((s) => ({
                    loading: { ...s.loading, events: { ...s.loading.events, [clubId]: true } },
                    error: { ...s.error, events: { ...s.error.events, [clubId]: null } },
                }));
                try {
                    const { data } = await api.get("/events/", {
                        params: { club: clubId, ...params },
                    });
                    const items = Array.isArray(data?.results)
                        ? data.results
                        : Array.isArray(data)
                          ? data
                          : data?.items || [];
                    set((s) => ({
                        eventsByClubId: { ...s.eventsByClubId, [clubId]: items },
                        eventsById: {
                            ...s.eventsById,
                            ...items.reduce((a, it) => ((a[it.id] = it), a), {}),
                        },
                        loading: { ...s.loading, events: { ...s.loading.events, [clubId]: false } },
                    }));
                    return items;
                } catch (e) {
                    set((s) => ({
                        loading: { ...s.loading, events: { ...s.loading.events, [clubId]: false } },
                        error: {
                            ...s.error,
                            events: { ...s.error.events, [clubId]: extractError(e) },
                        },
                    }));
                    return [];
                }
            },

            async createEvent(payload) {
                const { data } = await api.post("/events/", payload);
                const cid = data.club ?? payload.club ?? payload.club_id;
                set((s) => ({
                    events: [data, ...s.events],
                    eventsById: { ...s.eventsById, [data.id]: data },
                    eventsByClubId: cid
                        ? { ...s.eventsByClubId, [cid]: [data, ...(s.eventsByClubId[cid] || [])] }
                        : s.eventsByClubId,
                }));
                return data;
            },

            async updateEvent(id, patch, method = "patch") {
                const fn = method === "put" ? api.put : api.patch;
                const { data } = await fn(`/events/${id}/`, patch);
                const cid = data.club;
                set((s) => {
                    const nextClub = cid
                        ? {
                              ...s.eventsByClubId,
                              [cid]: (s.eventsByClubId[cid] || []).map((e) =>
                                  e.id === id ? data : e,
                              ),
                          }
                        : s.eventsByClubId;
                    return {
                        events: s.events.map((e) => (e.id === id ? data : e)),
                        eventsById: { ...s.eventsById, [id]: data },
                        eventsByClubId: nextClub,
                    };
                });
                return data;
            },

            async deleteEvent(id) {
                await api.delete(`/events/${id}/`);
                set((s) => {
                    const nextByClub = Object.fromEntries(
                        Object.entries(s.eventsByClubId).map(([cid, arr]) => [
                            cid,
                            arr.filter((e) => e.id !== id),
                        ]),
                    );
                    return {
                        events: s.events.filter((e) => e.id !== id),
                        eventsById: Object.fromEntries(
                            Object.entries(s.eventsById).filter(([k]) => String(k) !== String(id)),
                        ),
                        eventsByClubId: nextByClub,
                    };
                });
            },

            async registerForEvent(id) {
                const { data } = await api.post(`/events/${id}/register/`);
                return data;
            },
            async unregisterFromEvent(id) {
                const { data } = await api.delete(`/events/${id}/unregister/`);
                return data;
            },
            async updateAttendance(id, payload) {
                const { data } = await api.post(`/events/${id}/attendance/`, payload);
                return data;
            },
            async getEventRegistrations(id) {
                const { data } = await api.get(`/events/${id}/registrations/`);
                return Array.isArray(data?.results)
                    ? data.results
                    : Array.isArray(data)
                      ? data
                      : data?.items || [];
            },
            async getEventStatistics(id) {
                const { data } = await api.get(`/events/${id}/statistics/`);
                return data;
            },
        }),
        {
            name: "clubs-store",
            partialize: (s) => ({
                clubs: s.clubs,
                clubsById: s.clubsById,
                events: s.events,
                eventsById: s.eventsById,
                eventsByClubId: s.eventsByClubId,
            }),
        },
    ),
);
