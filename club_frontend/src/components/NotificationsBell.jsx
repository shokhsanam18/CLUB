import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useNotificationsStore } from "../store/notifications";
import { Bell } from "react-feather";

function formatDate(s) {
    try {
        return new Date(s).toLocaleString();
    } catch {
        return "";
    }
}

export default function NotificationsBell() {
    const recent = useNotificationsStore((s) => s.recent);
    const unreadCount = useNotificationsStore((s) => s.unreadCount);

    const [open, setOpen] = useState(false);
    const wrapRef = useRef(null);

    useEffect(() => {
        const store = useNotificationsStore.getState();
        store.fetchUnreadCount();
        const id = setInterval(store.fetchUnreadCount, 60_000);
        return () => clearInterval(id);
    }, []);

    useEffect(() => {
        const onClick = (e) => {
            if (!wrapRef.current) return;
            if (!wrapRef.current.contains(e.target)) setOpen(false);
        };
        const onEsc = (e) => e.key === "Escape" && setOpen(false);

        document.addEventListener("mousedown", onClick);
        document.addEventListener("keydown", onEsc);
        return () => {
            document.removeEventListener("mousedown", onClick);
            document.removeEventListener("keydown", onEsc);
        };
    }, []);

    const openAndFetch = () => {
        const next = !open;
        setOpen(next);
        if (next) useNotificationsStore.getState().fetchRecent();
    };

    const markAll = () => useNotificationsStore.getState().markAllAsRead();
    const markOne = (id) => useNotificationsStore.getState().markAsRead(id);

    return (
        <div ref={wrapRef} className="relative">
            <button
                onClick={openAndFetch}
                className="relative h-10 w-10 grid place-items-center rounded-full bg-white/15 ring-1 ring-white/25 hover:bg-white/25 transition cursor-pointer"
                aria-label="Notifications"
                title="Notifications"
            >
                <Bell size={20} className="text-current" aria-hidden />

                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[11px] font-bold grid place-items-center">
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-[360px] max-w-[92vw] rounded-xl bg-[#1f1f1f] text-white shadow-xl ring-1 ring-white/10 p-2">
                    <div className="flex items-center justify-between px-2 py-1">
                        <div className="font-semibold">Notifications</div>
                        <div className="flex items-center gap-2">
                            <Link
                                to="/Notifications"
                                className="text-xs px-2 py-1 rounded-md bg-white/10 hover:bg-white/20"
                                onClick={() => setOpen(false)}
                            >
                                View all
                            </Link>
                            <button
                                className="text-xs px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 cursor-pointer"
                                onClick={markAll}
                            >
                                Mark all as read
                            </button>
                        </div>
                    </div>

                    <div className="max-h-[60vh] overflow-auto divide-y divide-white/10">
                        {(recent || []).length ? (
                            recent.map((n) => (
                                <button
                                    key={n.id}
                                    className={`w-full text-left px-3 py-3 hover:bg-white/5 transition cursor-pointer ${
                                        n.is_read ? "opacity-80" : ""
                                    }`}
                                    onClick={() => markOne(n.id)}
                                    title={n.title}
                                >
                                    <div className="text-sm font-semibold">{n.title}</div>
                                    {n.reason && (
                                        <div className="mt-0.5 text-xs text-white/80">
                                            {n.reason}
                                        </div>
                                    )}
                                    <div className="mt-0.5 text-[11px] text-white/50">
                                        {formatDate(n.created_at)}
                                    </div>
                                </button>
                            ))
                        ) : (
                            <div className="px-3 py-4 text-white/70">No notifications.</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
