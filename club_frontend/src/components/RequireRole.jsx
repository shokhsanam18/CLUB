import React, { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "../store/auth";
import { hasAnyRole } from "../lib/roles";

export default function RequireRole({ roles = [], children, fallback = null }) {
    const { tokens, user, fetchMyProfile } = useAuthStore();
    const isAuthed = Boolean(tokens?.access);
    const [checking, setChecking] = useState(false);

    const allowed = useMemo(() => hasAnyRole(user, roles), [user, roles]);

    useEffect(() => {
        if (!isAuthed || roles.length === 0) return;
        let alive = true;
        setChecking(true);
        fetchMyProfile()
            .catch(() => {})
            .finally(() => {
                if (alive) setChecking(false);
            });
        return () => {
            alive = false;
        };
    }, [isAuthed, roles, fetchMyProfile]);

    if (roles.length === 0) return children;

    if (!isAuthed) return fallback ?? null;

    if (checking && !allowed) {
        return (
            <div className="min-h-[80px] grid place-items-center text-white/70 text-sm">
                Checking permissions…
            </div>
        );
    }

    return allowed ? children : (fallback ?? null);
}
