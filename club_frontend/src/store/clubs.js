import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "../lib/api";
import { useAuthStore } from "./auth.js";

function extractError(e) {
    const data = e?.response?.data;
    const flat = (v) =>
        Array.isArray(v)
            ? v.join(", ")
            : v && typeof v === "object"
              ? Object.values(v).flat().join(", ")
              : String(v ?? "");
    if (!data) return e?.message || "Request failed";
    if (typeof data === "string") return data;
    if (Array.isArray(data)) return data.map(flat).join(" | ");
    if (typeof data === "object") {
        return Object.entries(data)
            .map(([k, v]) => {
                if (Array.isArray(v)) return `${k}: ${v.join(", ")}`;
                if (v && typeof v === "object") return `${k}: ${JSON.stringify(v)}`;
                return `${k}: ${String(v)}`;
            })
            .join(" | ");
    }
    return "Request failed";
}

const normalizeRegistration = (r = {}) => {
    const full =
        (typeof r.user_fullname === "string" && r.user_fullname.trim()) ||
        (typeof r.user_full_name === "string" && r.user_full_name.trim()) ||
        null;

    const username =
        typeof r.user_username === "string" && r.user_username.trim()
            ? r.user_username.trim()
            : null;

    const email =
        typeof r.user_email === "string" && r.user_email.trim() ? r.user_email.trim() : null;

    const idStr = r.user !== undefined && r.user !== null ? String(r.user) : null;

    const display = full || username || email || idStr || "—";

    return {
        ...r,
        user_fullname: full,
        user_full_name: full,
        display_name: display,
    };
};
export const useClubsStore = create(
    persist(
        (set, get) => ({
            clubs: [],
            clubsById: {},
            events: [],
            eventsById: {},
            eventsByClubId: {},
            registrationsById: {},
            registrationsByEventId: {},
            myRegistrationsByEventId: {},
            joinRequestsByClubId: {},
            loading: {
                list: false,
                club: false,
                events: {},
                globalEvents: false,

                regsForEvent: {},
                myRegs: false,
                joinRequests: {},
            },
            error: {
                list: null,
                club: null,
                events: {},
                globalEvents: null,

                regsForEvent: {},
                myRegs: null,
                joinRequests: {},
            },

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
                const name = String(payload.name || "")
                    .trim()
                    .slice(0, 100);
                if (!name) throw new Error("Name is required");

                const user = useAuthStore.getState().user;
                const userUni =
                    typeof user?.university === "string"
                        ? user.university
                        : user?.university?.name || user?.university || "";

                const university = String(payload.university ?? userUni ?? "")
                    .trim()
                    .slice(0, 200);

                const description = String(payload.description || "")
                    .trim()
                    .slice(0, 200);

                if (!university) {
                    throw new Error("University is required");
                }

                const clean = { name, university, description };

                const { data } = await api.post("/clubs/", clean);
                set((s) => ({
                    clubs: [data, ...s.clubs],
                    clubsById: { ...s.clubsById, [data.id]: data },
                }));
                return data;
            },

            async updateClub(id, patch, method = "patch") {
                const fn = method === "put" ? api.put : api.patch;
                const clean =
                    method === "put"
                        ? {
                              name: String(patch.name || "").slice(0, 100),
                              university: patch.university
                                  ? String(patch.university).slice(0, 200)
                                  : "",
                              description: patch.description
                                  ? String(patch.description).slice(0, 200)
                                  : "",
                          }
                        : patch;
                const { data } = await fn(`/clubs/${id}/`, clean);
                set((s) => ({
                    clubsById: { ...s.clubsById, [id]: data },
                    clubs: s.clubs.map((c) => (String(c.id) === String(id) ? data : c)),
                }));
                return data;
            },

            async deleteClub(id) {
                await api.delete(`/clubs/${id}/`);
                set((s) => {
                    const nextClubsById = { ...s.clubsById };
                    delete nextClubsById[id];
                    const { [id]: _removed, ...nextEventsByClubId } = s.eventsByClubId;
                    return {
                        clubs: s.clubs.filter((c) => String(c.id) !== String(id)),
                        clubsById: nextClubsById,
                        eventsByClubId: nextEventsByClubId,
                    };
                });
            },

            async joinClub(id, body = {}) {
                const { data } = await api.post(`/clubs/${id}/join/`, body);
                return data;
            },

            async leaveClub(id, body = null) {
                const payload =
                    body && typeof body === "object"
                        ? body
                        : { action: "leave", club_id: Number(id) };
                const { data } = await api.post(`/clubs/${id}/leave/`, payload);
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
            async listEvents(params = {}, opts = {}) {
                const { enrich = true, enrichLimit = 12 } = opts;
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

                    let merged = items;

                    if (enrich) {
                        const toFetch = items
                            .filter((it) => !it?.description && Number.isFinite(+it?.id))
                            .slice(0, enrichLimit);

                        if (toFetch.length) {
                            const details = await Promise.all(
                                toFetch.map((it) =>
                                    api
                                        .get(`/events/${it.id}/`)
                                        .then((r) => r.data)
                                        .catch(() => null),
                                ),
                            );

                            const detailsById = Object.fromEntries(
                                details.filter(Boolean).map((d) => [d.id, d]),
                            );

                            merged = items.map((it) =>
                                detailsById[it.id] ? { ...it, ...detailsById[it.id] } : it,
                            );

                            set((s) => ({
                                eventsById: {
                                    ...s.eventsById,
                                    ...Object.fromEntries(
                                        merged.map((e) => [
                                            e.id,
                                            { ...(s.eventsById[e.id] || {}), ...e },
                                        ]),
                                    ),
                                },
                            }));
                        }
                    }

                    set((s) => ({
                        events: merged,
                        eventsById: {
                            ...s.eventsById,
                            ...Object.fromEntries(merged.map((e) => [e.id, e])),
                        },
                        loading: { ...s.loading, globalEvents: false },
                    }));

                    return merged;
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

                set((s) => {
                    const nextEvents = s.events?.length
                        ? s.events.map((e) => (e.id === data.id ? { ...e, ...data } : e))
                        : s.events;

                    let nextByClub = s.eventsByClubId;
                    const cid = data.club ?? cached?.club;
                    if (cid != null) {
                        nextByClub = {
                            ...s.eventsByClubId,
                            [cid]: (s.eventsByClubId[cid] || []).map((e) =>
                                e.id === data.id ? { ...e, ...data } : e,
                            ),
                        };
                    }

                    return {
                        eventsById: { ...s.eventsById, [id]: data },
                        events: nextEvents,
                        eventsByClubId: nextByClub,
                    };
                });

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

                    const toFetch = items
                        .filter((it) => !it?.description && Number.isFinite(+it?.id))
                        .slice(0, 12);

                    let merged = items;
                    if (toFetch.length) {
                        const details = await Promise.all(
                            toFetch.map((it) =>
                                api
                                    .get(`/events/${it.id}/`)
                                    .then((r) => r.data)
                                    .catch(() => null),
                            ),
                        );
                        const byId = Object.fromEntries(
                            details.filter(Boolean).map((d) => [d.id, d]),
                        );
                        merged = items.map((it) => (byId[it.id] ? { ...it, ...byId[it.id] } : it));
                    }

                    set((s) => {
                        const nextEventsById = {
                            ...s.eventsById,
                            ...Object.fromEntries(
                                merged.map((e) => [e.id, { ...(s.eventsById[e.id] || {}), ...e }]),
                            ),
                        };

                        const nextGlobal =
                            s.events && s.events.length
                                ? s.events.map((e) =>
                                      nextEventsById[e.id] ? { ...e, ...nextEventsById[e.id] } : e,
                                  )
                                : s.events;

                        return {
                            eventsByClubId: { ...s.eventsByClubId, [clubId]: merged },
                            eventsById: nextEventsById,
                            events: nextGlobal,
                            loading: {
                                ...s.loading,
                                events: { ...s.loading.events, [clubId]: false },
                            },
                        };
                    });

                    return merged;
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
                const club = Number(payload.club);
                if (!Number.isFinite(club) || club <= 0) {
                    throw new Error("Invalid club id.");
                }

                const list = Array.isArray(payload.date)
                    ? payload.date.filter(Boolean).slice(0, 6)
                    : payload.date
                      ? [String(payload.date)]
                      : [];

                const normalized = list.map((s) =>
                    String(s).replace(/\.\d{1,6}(?=Z|[+-]\d{2}:\d{2}$)/, ""),
                );

                const dateField =
                    normalized.length === 0
                        ? undefined
                        : normalized.length === 1
                          ? normalized[0]
                          : normalized;

                const clean = {
                    title: String(payload.title || "").slice(0, 100),
                    description: payload.description
                        ? String(payload.description).slice(0, 500)
                        : "",
                    club,
                    tag: payload.tag || undefined,
                    date: dateField,
                };

                const { data } = await api.post("/events/", clean);

                const cid = data.club ?? club;
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

                const coerceDate = (d) => {
                    if (d == null) return undefined;
                    const arr = Array.isArray(d) ? d : [d];
                    const list = arr
                        .filter(Boolean)
                        .slice(0, 6)
                        .map((s) => String(s).replace(/\.\d{1,6}(?=Z|[+-]\d{2}:\d{2}$)/, ""));
                    if (list.length === 0) return method === "put" ? [] : undefined;
                    return list.length === 1 ? list[0] : list;
                };

                const shape = (b) => ({
                    title: typeof b.title === "string" ? b.title.slice(0, 100) : undefined,
                    description:
                        typeof b.description === "string" ? b.description.slice(0, 500) : undefined,
                    club: typeof b.club === "number" ? b.club : undefined,
                    tag: b.tag ?? undefined,
                    date: coerceDate(b.date),
                });

                const body =
                    method === "put"
                        ? {
                              title: String(patch.title || "").slice(0, 100),
                              description: String(patch.description || "").slice(0, 500),
                              club: Number(patch.club || 0),
                              tag: patch.tag || "",
                              date: coerceDate(patch.date) ?? [],
                          }
                        : shape(patch);

                const { data } = await fn(`/events/${id}/`, body);
                const cid = data.club;

                set((s) => {
                    const nextByClub = cid
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
                        eventsByClubId: nextByClub,
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

            _toItems(data) {
                if (Array.isArray(data?.results)) return data.results;
                if (Array.isArray(data)) return data;
                return data?.items || [];
            },

            async listRegistrations(params = {}) {
                const { data } = await api.get("/events/registrations/", { params });
                const items = get()._toItems(data).map(normalizeRegistration);
                set((s) => ({
                    registrationsById: {
                        ...s.registrationsById,
                        ...items.reduce((a, r) => ((a[r.id] = r), a), {}),
                    },
                }));
                return items;
            },

            async getEventRegistrations(eventId, force = false) {
                const cached = get().registrationsByEventId[eventId];
                if (cached && !force) return cached;

                set((s) => ({
                    loading: {
                        ...s.loading,
                        regsForEvent: { ...s.loading.regsForEvent, [eventId]: true },
                    },
                    error: {
                        ...s.error,
                        regsForEvent: { ...s.error.regsForEvent, [eventId]: null },
                    },
                }));

                try {
                    const items = await get().listRegistrations({ event: eventId });
                    set((s) => ({
                        registrationsByEventId: { ...s.registrationsByEventId, [eventId]: items },
                        loading: {
                            ...s.loading,
                            regsForEvent: { ...s.loading.regsForEvent, [eventId]: false },
                        },
                    }));
                    return items;
                } catch (e) {
                    set((s) => ({
                        loading: {
                            ...s.loading,
                            regsForEvent: { ...s.loading.regsForEvent, [eventId]: false },
                        },
                        error: {
                            ...s.error,
                            regsForEvent: { ...s.error.regsForEvent, [eventId]: extractError(e) },
                        },
                    }));
                    return [];
                }
            },

            async getRegistration(id) {
                const cached = get().registrationsById[id];
                if (cached) return cached;
                const { data } = await api.get(`/events/registrations/${id}/`);
                const reg = normalizeRegistration(data);
                set((s) => ({ registrationsById: { ...s.registrationsById, [id]: reg } }));
                return reg;
            },

            async getMyRegistrations(force = false) {
                if (!force && Object.keys(get().myRegistrationsByEventId).length) {
                    return Object.values(get().myRegistrationsByEventId).filter(Boolean);
                }
                set((s) => ({
                    loading: { ...s.loading, myRegs: true },
                    error: { ...s.error, myRegs: null },
                }));
                try {
                    const { data } = await api.get("/events/registrations/my-registrations/");
                    const items = get()._toItems(data).map(normalizeRegistration);
                    const byEvent = {};
                    for (const r of items) byEvent[r.event] = r;
                    set((s) => ({
                        myRegistrationsByEventId: byEvent,
                        registrationsById: {
                            ...s.registrationsById,
                            ...items.reduce((a, r) => ((a[r.id] = r), a), {}),
                        },
                        loading: { ...s.loading, myRegs: false },
                    }));
                    return items;
                } catch (e) {
                    set((s) => ({
                        loading: { ...s.loading, myRegs: false },
                        error: { ...s.error, myRegs: extractError(e) },
                    }));
                    return [];
                }
            },

            async getMyRegistrationForEvent(eventId, force = false) {
                const cached = get().myRegistrationsByEventId[eventId];
                if (cached && !force) return cached || null;
                await get().getMyRegistrations(true);
                return get().myRegistrationsByEventId[eventId] || null;
            },

            async createRegistration(eventId, body = {}) {
                const { data } = await api.post(
                    `/events/${Number(eventId)}/register/`,
                    body && typeof body === "object" ? body : {},
                );
                const reg = normalizeRegistration(data);

                set((s) => ({
                    registrationsById: { ...s.registrationsById, [reg.id]: reg },
                    registrationsByEventId: {
                        ...s.registrationsByEventId,
                        [reg.event]: [reg, ...(s.registrationsByEventId[reg.event] || [])],
                    },
                    myRegistrationsByEventId: { ...s.myRegistrationsByEventId, [reg.event]: reg },
                }));

                return reg;
            },

            async updateRegistration(id, patch) {
                const { data } = await api.patch(`/events/registrations/${id}/`, patch || {});
                const upd = normalizeRegistration(data);
                set((s) => {
                    const current = s.registrationsById[id];
                    const eventId = current?.event ?? upd.event;
                    const nextByEvent = {
                        ...s.registrationsByEventId,
                        [eventId]: (s.registrationsByEventId[eventId] || []).map((r) =>
                            r.id === id ? upd : r,
                        ),
                    };
                    const nextMy =
                        s.myRegistrationsByEventId[eventId]?.id === id
                            ? { ...s.myRegistrationsByEventId, [eventId]: upd }
                            : s.myRegistrationsByEventId;

                    return {
                        registrationsById: { ...s.registrationsById, [id]: upd },
                        registrationsByEventId: nextByEvent,
                        myRegistrationsByEventId: nextMy,
                    };
                });
                return upd;
            },

            async deleteRegistration(id) {
                const reg = get().registrationsById[id] || (await get().getRegistration(id));
                await api.delete(`/events/registrations/${id}/`);
                set((s) => {
                    const eventId = reg?.event;
                    const nextByEvent =
                        eventId != null
                            ? {
                                  ...s.registrationsByEventId,
                                  [eventId]: (s.registrationsByEventId[eventId] || []).filter(
                                      (r) => r.id !== id,
                                  ),
                              }
                            : s.registrationsByEventId;

                    const nextMy =
                        eventId != null && s.myRegistrationsByEventId[eventId]?.id === id
                            ? { ...s.myRegistrationsByEventId, [eventId]: null }
                            : s.myRegistrationsByEventId;

                    const { [id]: _removed, ...rest } = s.registrationsById;
                    return {
                        registrationsById: rest,
                        registrationsByEventId: nextByEvent,
                        myRegistrationsByEventId: nextMy,
                    };
                });
            },

            async registerForEvent(eventId) {
                return await get().createRegistration(eventId, {});
            },

            async unregisterFromEvent(eventId) {
                const mine = (await get().getMyRegistrationForEvent(eventId, true)) || null;
                if (!mine) throw new Error("You are not registered for this event.");
                await get().deleteRegistration(mine.id);
                return { ok: true };
            },

            async updateAttendance(_eventId, payload) {
                const ids = (Array.isArray(payload?.registrations) ? payload.registrations : [])
                    .map((x) => Number(x))
                    .filter((x) => Number.isFinite(x) && x > 0);
                if (!ids.length) return [];
                const attended = Boolean(payload?.attended);
                const updates = ids.map((id) => get().updateRegistration(id, { attended }));
                return await Promise.all(updates);
            },

            async getEventStatistics(id) {
                const { data } = await api.get(`/events/${id}/statistics/`);
                return data;
            },

            async listJoinRequests(clubId, params = {}) {
                set((s) => ({
                    loading: {
                        ...s.loading,
                        joinRequests: { ...s.loading.joinRequests, [clubId]: true },
                    },
                    error: {
                        ...s.error,
                        joinRequests: { ...s.error.joinRequests, [clubId]: null },
                    },
                }));
                try {
                    const { data } = await api.get(`/clubs/${clubId}/join-requests/`, { params });
                    const items = Array.isArray(data?.results)
                        ? data.results
                        : Array.isArray(data)
                          ? data
                          : data?.items || [];
                    set((s) => ({
                        joinRequestsByClubId: { ...s.joinRequestsByClubId, [clubId]: items },
                        loading: {
                            ...s.loading,
                            joinRequests: { ...s.loading.joinRequests, [clubId]: false },
                        },
                    }));
                    return items;
                } catch (e) {
                    set((s) => ({
                        loading: {
                            ...s.loading,
                            joinRequests: { ...s.loading.joinRequests, [clubId]: false },
                        },
                        error: {
                            ...s.error,
                            joinRequests: { ...s.error.joinRequests, [clubId]: extractError(e) },
                        },
                    }));
                    return [];
                }
            },

            async approveJoinRequest(
                clubId,
                requestId,
                message = "",
                refreshParams = { status: "pending", ordering: "created_at" },
            ) {
                const { data } = await api.post(
                    `/clubs/${clubId}/join-requests/${requestId}/approve/`,
                    message ? { message } : {},
                );
                set((s) => {
                    const list = s.joinRequestsByClubId[clubId] || [];
                    const i = list.findIndex((r) => r.id === requestId);
                    if (i === -1) return {};
                    const next = list.slice();
                    next[i] = {
                        ...next[i],
                        status: data?.status || "approved",
                        processed_by: data?.processed_by ?? next[i]?.processed_by,
                        processed_at: data?.processed_at ?? new Date().toISOString(),
                    };
                    return { joinRequestsByClubId: { ...s.joinRequestsByClubId, [clubId]: next } };
                });
                await get().listJoinRequests(clubId, refreshParams);
                await get().getClub(clubId, true);
                return data;
            },

            async rejectJoinRequest(
                clubId,
                requestId,
                message = "",
                refreshParams = { status: "pending", ordering: "created_at" },
            ) {
                const { data } = await api.post(
                    `/clubs/${clubId}/join-requests/${requestId}/reject/`,
                    message ? { message } : {},
                );
                set((s) => {
                    const list = s.joinRequestsByClubId[clubId] || [];
                    const i = list.findIndex((r) => r.id === requestId);
                    if (i === -1) return {};
                    const next = list.slice();
                    next[i] = {
                        ...next[i],
                        status: data?.status || "rejected",
                        processed_by: data?.processed_by ?? next[i]?.processed_by,
                        processed_at: data?.processed_at ?? new Date().toISOString(),
                    };
                    return { joinRequestsByClubId: { ...s.joinRequestsByClubId, [clubId]: next } };
                });
                await get().listJoinRequests(clubId, refreshParams);
                await get().getClub(clubId, true);
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
                registrationsById: s.registrationsById,
                myRegistrationsByEventId: s.myRegistrationsByEventId,
                registrationsByEventId: s.registrationsByEventId,
            }),
        },
    ),
);
