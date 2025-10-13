import React, { useEffect } from "react";
import { shallow } from "zustand/shallow";
import { useNotificationsStore } from "../store/notifications";

export default function NotificationsPage() {
    const { list, loading, listAll, markAllAsRead, markAsRead } = useNotificationsStore(
        (s) => ({
            list: s.list,
            loading: s.loading.list,
            listAll: s.listAll,
            markAllAsRead: s.markAllAsRead,
            markAsRead: s.markAsRead,
        }),
        shallow,
    );

    useEffect(() => {
        listAll({ ordering: "-created_at" });
    }, [listAll]);

    return (
        <div className="min-h-screen bg-[#222] text-white px-4 py-8 font-['Outfit']">
            <div className="max-w-3xl mx-auto">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-semibold">Notifications</h1>
                    <button
                        className="px-3 py-1 rounded-md bg-white/10 hover:bg-white/20 cursor-pointer"
                        onClick={() => markAllAsRead()}
                    >
                        Mark all as read
                    </button>
                </div>

                <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 overflow-hidden divide-y divide-white/10">
                    {loading && <div className="px-4 py-4 text-white/70">Loading…</div>}
                    {!loading && (!list || !list.length) && (
                        <div className="px-4 py-6 text-white/70">No notifications.</div>
                    )}
                    {(list || []).map((n) => (
                        <div key={n.id} className="px-4 py-4">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <div className="font-semibold">{n.title}</div>
                                    {n.reason && (
                                        <div className="text-white/80 mt-1">{n.reason}</div>
                                    )}
                                    <div className="text-xs text-white/50 mt-1">
                                        {new Date(n.created_at).toLocaleString()}
                                    </div>
                                </div>
                                {!n.is_read && (
                                    <button
                                        className="px-2 py-1 text-xs rounded-md bg-white/10 hover:bg-white/20 cursor-pointer"
                                        onClick={() => markAsRead(n.id)}
                                    >
                                        Mark as read
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
