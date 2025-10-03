import { create } from "zustand";
import api from "../lib/api";

function extractError(e) {
    const d = e?.response?.data;
    if (!d) return e?.message || "Request failed";
    if (typeof d === "string") return d;
    if (Array.isArray(d)) return d.join(", ");
    if (typeof d === "object")
        return Object.entries(d)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
            .join(" | ");
    return "Request failed";
}

export const useReportsStore = create((set, get) => ({
    reportsById: {},
    reportsByEventId: {},
    loading: { list: {}, byId: {}, create: {}, update: {}, attendance: {} },
    error: { list: {}, byId: {}, create: {}, update: {}, attendance: {} },

    _toItems(data) {
        if (Array.isArray(data?.results)) return data.results;
        if (Array.isArray(data)) return data;
        return data?.items || [];
    },

    async listReports(params = {}) {
        const key = JSON.stringify(params || {});
        set((s) => ({
            loading: { ...s.loading, list: { ...s.loading.list, [key]: true } },
            error: { ...s.error, list: { ...s.error.list, [key]: null } },
        }));
        try {
            const { data } = await api.get("/reports/", { params });
            const raw = get()._toItems(data);

            let items = raw;
            if (Object.prototype.hasOwnProperty.call(params, "event")) {
                const ev = Number(params.event);
                items = raw.filter((r) => Number(r?.event) === ev);
            }

            const byId = items.reduce((a, r) => {
                a[r.id] = r;
                return a;
            }, {});

            set((s) => {
                const next = {
                    reportsById: { ...s.reportsById, ...byId },
                    reportsByEventId: { ...s.reportsByEventId },
                    loading: { ...s.loading, list: { ...s.loading.list, [key]: false } },
                };
                if (Object.prototype.hasOwnProperty.call(params, "event")) {
                    const ev = Number(params.event);
                    next.reportsByEventId[ev] = items;
                } else {
                    for (const it of items) {
                        if (it?.event == null) continue;
                        const ev = Number(it.event);
                        if (!next.reportsByEventId[ev]) next.reportsByEventId[ev] = [];
                        next.reportsByEventId[ev] = [
                            ...next.reportsByEventId[ev].filter((x) => x.id !== it.id),
                            it,
                        ];
                    }
                }
                return next;
            });

            return items;
        } catch (e) {
            set((s) => ({
                loading: { ...s.loading, list: { ...s.loading.list, [key]: false } },
                error: { ...s.error, list: { ...s.error.list, [key]: extractError(e) } },
            }));
            return [];
        }
    },

    async getReport(id, force = false) {
        const cached = get().reportsById[id];
        if (cached && !force) return cached;
        set((s) => ({
            loading: { ...s.loading, byId: { ...s.loading.byId, [id]: true } },
            error: { ...s.error, byId: { ...s.error.byId, [id]: null } },
        }));
        try {
            const { data } = await api.get(`/reports/${id}/`);
            set((s) => ({
                reportsById: { ...s.reportsById, [id]: data },
                loading: { ...s.loading, byId: { ...s.loading.byId, [id]: false } },
            }));
            return data;
        } catch (e) {
            set((s) => ({
                loading: { ...s.loading, byId: { ...s.loading.byId, [id]: false } },
                error: { ...s.error, byId: { ...s.error.byId, [id]: extractError(e) } },
            }));
            return null;
        }
    },

    async createReport({ event, summary }) {
        const payload = { event: Number(event), summary: String(summary || "").slice(0, 512) };
        const k = `create:${payload.event}`;
        set((s) => ({
            loading: { ...s.loading, create: { ...s.loading.create, [k]: true } },
            error: { ...s.error, create: { ...s.error.create, [k]: null } },
        }));
        try {
            const { data } = await api.post("/reports/", payload);
            set((s) => ({
                reportsById: { ...s.reportsById, [data.id]: data },
                reportsByEventId: {
                    ...s.reportsByEventId,
                    [data.event]: [data],
                },
                loading: { ...s.loading, create: { ...s.loading.create, [k]: false } },
            }));
            return data;
        } catch (e) {
            set((s) => ({
                loading: { ...s.loading, create: { ...s.loading.create, [k]: false } },
                error: { ...s.error, create: { ...s.error.create, [k]: extractError(e) } },
            }));
            throw e;
        }
    },

    async updateReport(id, { event, summary }, method = "put") {
        const body =
            method === "put"
                ? { event: Number(event), summary: String(summary || "").slice(0, 512) }
                : {
                      event: event != null ? Number(event) : undefined,
                      summary: summary != null ? String(summary).slice(0, 512) : undefined,
                  };
        set((s) => ({
            loading: { ...s.loading, update: { ...s.loading.update, [id]: true } },
            error: { ...s.error, update: { ...s.error.update, [id]: null } },
        }));
        try {
            const fn = method === "put" ? api.put : api.patch;
            const { data } = await fn(`/reports/${id}/`, body);
            set((s) => ({
                reportsById: { ...s.reportsById, [id]: data },
                reportsByEventId: { ...s.reportsByEventId, [data.event]: [data] },
                loading: { ...s.loading, update: { ...s.loading.update, [id]: false } },
            }));
            return data;
        } catch (e) {
            set((s) => ({
                loading: { ...s.loading, update: { ...s.loading.update, [id]: false } },
                error: { ...s.error, update: { ...s.error.update, [id]: extractError(e) } },
            }));
            throw e;
        }
    },

    async getReportAttendanceData(id) {
        set((s) => ({
            loading: { ...s.loading, attendance: { ...s.loading.attendance, [id]: true } },
            error: { ...s.error, attendance: { ...s.error.attendance, [id]: null } },
        }));
        try {
            const { data } = await api.get(`/reports/${id}/attendance-data/`);
            set((s) => ({
                loading: { ...s.loading, attendance: { ...s.loading.attendance, [id]: false } },
            }));
            return data;
        } catch (e) {
            set((s) => ({
                loading: { ...s.loading, attendance: { ...s.loading.attendance, [id]: false } },
                error: { ...s.error, attendance: { ...s.error.attendance, [id]: extractError(e) } },
            }));
            throw e;
        }
    },
}));
