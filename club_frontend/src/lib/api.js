import axios from "axios";
import { useAuthStore } from "../store/auth";

export const BASE_URL = (
    import.meta?.env?.VITE_API_BASE_URL || "https://itcomclubs.uz/api"
).replace(/\/+$/, "");

const AUTH_PREFIX = (import.meta?.env?.VITE_AUTH_HEADER_PREFIX || "Bearer").trim();

const api = axios.create({
    baseURL: BASE_URL,
    withCredentials: false,
    headers: { Accept: "application/json" },
});

export function getAccess() {
    try {
        const s = useAuthStore.getState();
        return s?.tokens?.access || null;
    } catch {
        const persisted = JSON.parse(localStorage.getItem("auth-store") || "{}");
        return persisted?.state?.tokens?.access || null;
    }
}

function stripKnownPrefix(token) {
    if (!token) return token;
    return String(token)
        .replace(/^(Bearer|JWT|Token)\s+/i, "")
        .trim();
}

export function buildAuthHeader(access) {
    if (!access) return null;
    const raw = stripKnownPrefix(access);
    if (AUTH_PREFIX.toLowerCase() === "none") return raw;
    return `${AUTH_PREFIX} ${raw}`;
}

export function attachAuthHeader(access) {
    const h = buildAuthHeader(access);
    if (h) {
        api.defaults.headers.common.Authorization = h;
    } else {
        delete api.defaults.headers.common.Authorization;
    }
}

attachAuthHeader(getAccess());

try {
    useAuthStore.subscribe(
        (s) => s.tokens?.access,
        (access) => attachAuthHeader(access),
    );
} catch {
    // no-on
}

api.interceptors.request.use((config) => {
    const access = getAccess();
    if (access) config.headers.Authorization = buildAuthHeader(access);
    return config;
});

let refreshing = null;

async function refreshAccessToken() {
    const { tokens, setTokens, logout } = useAuthStore.getState();
    const refresh = tokens?.refresh;
    if (!refresh) {
        logout();
        throw new Error("No refresh token");
    }
    const { data } = await api.post("/auth/jwt/refresh/", { refresh });
    const next = { access: data.access, refresh: data.refresh || refresh };
    setTokens(next);
    attachAuthHeader(next.access);
    return next.access;
}

api.interceptors.response.use(
    (r) => r,
    async (error) => {
        const status = error?.response?.status;
        const original = error.config;

        if (
            status === 401 &&
            !original?._retry &&
            !original?.url?.includes("/login/") &&
            !original?.url?.includes("/auth/jwt/create/")
        ) {
            original._retry = true;
            try {
                refreshing = refreshing || refreshAccessToken();
                const newAccess = await refreshing;
                refreshing = null;
                original.headers.Authorization = buildAuthHeader(newAccess);
                return api(original);
            } catch {
                refreshing = null;
                useAuthStore.getState().logout();
            }
        }

        if (status === 401 && !original?._altAuthTried) {
            original._altAuthTried = true;
            const access = getAccess();
            if (access) {
                const raw = stripKnownPrefix(access);
                const attempts = [`${AUTH_PREFIX} ${raw}`, `JWT ${raw}`, `Token ${raw}`, raw];

                for (const headerVal of attempts) {
                    try {
                        original.headers.Authorization = headerVal;
                        return await api(original);
                    } catch {
                        // no-on
                    }
                }
            }
        }

        return Promise.reject(error);
    },
);

export default api;
