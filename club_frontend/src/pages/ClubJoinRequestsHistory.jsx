import React, { useEffect, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { useClubsStore } from "../store/clubs";
import Loader from "../components/Loader.jsx";

const FILTERS = [
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
    { key: "all", label: "All" },
];

const EMPTY = Object.freeze([]);

export default function ClubJoinRequestsHistory() {
    const { id } = useParams(); // club id
    const listJoinRequests = useClubsStore((s) => s.listJoinRequests);
    const selectItems = useCallback((s) => s.joinRequestsByClubId[id], [id]);
    const selectLoading = useCallback((s) => Boolean(s.loading.joinRequests[id]), [id]);
    const selectError = useCallback((s) => s.error.joinRequests[id], [id]);
    const items = useClubsStore(selectItems) ?? EMPTY;
    const loading = useClubsStore(selectLoading);
    const error = useClubsStore(selectError);

    const [filter, setFilter] = useState("approved");

    useEffect(() => {
        if (!id) return;
        const params =
            filter === "all"
                ? { ordering: "created_at" }
                : { status: filter, ordering: "created_at" };
        listJoinRequests(id, params);
    }, [id, filter, listJoinRequests]);

    const nameOf = (r) =>
        r.user_full_name ||
        r.user_name ||
        r.user_username ||
        r.username ||
        r.user_email ||
        (r.user && (r.user.full_name || r.user.username || r.user.email)) ||
        "—";

    return (
        <div className="bg-[#222222] min-h-screen font-['Outfit']">
            <main className="max-w-5xl mx-auto px-6 py-10 text-white">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold">Join requests — History</h1>
                    <Link
                        to={`/Clubs/${id}`}
                        className="px-3 py-1 rounded-md bg-white/10 hover:bg-white/20"
                    >
                        Back to Club
                    </Link>
                </div>

                <div className="flex gap-2 mb-4">
                    {FILTERS.map((f) => (
                        <button
                            key={f.key}
                            onClick={() => setFilter(f.key)}
                            className={`px-3 py-1 rounded-md ${
                                filter === f.key
                                    ? "bg-[#77C042] text-black"
                                    : "bg-white/10 hover:bg-white/20"
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-white/10">
                            <thead className="bg-white/5">
                                <tr>
                                    <th className="px-4 py-3 text-left text-sm font-semibold">
                                        User
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold">
                                        Status
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold">
                                        Created
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold">
                                        Processed by
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold">
                                        Processed at
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {!items.length && !loading && (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-6 text-white/70">
                                            No requests.
                                        </td>
                                    </tr>
                                )}
                                {items.map((r) => (
                                    <tr key={r.id}>
                                        <td className="px-4 py-3">{nameOf(r)}</td>
                                        <td className="px-4 py-3 capitalize">{r.status || "—"}</td>
                                        <td className="px-4 py-3">
                                            {r.created_at
                                                ? new Date(r.created_at).toLocaleString()
                                                : "—"}
                                        </td>
                                        <td className="px-4 py-3">
                                            {r.processed_by_username || r.processed_by || "—"}
                                        </td>
                                        <td className="px-4 py-3">
                                            {r.processed_at
                                                ? new Date(r.processed_at).toLocaleString()
                                                : "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {loading && (
                        <div className="relative min-h-[40vh]">
                            <Loader />
                        </div>
                    )}
                    {error && <div className="px-4 py-4 text-red-400">{error}</div>}
                </div>
            </main>
        </div>
    );
}
