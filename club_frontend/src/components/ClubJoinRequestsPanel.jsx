import React, { useEffect, useMemo, useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { useClubsStore } from "../store/clubs";
import { useAuthStore } from "../store/auth";
import ReasonModal from "./ReasonModal.jsx";

function cx(...cls) {
    return cls.filter(Boolean).join(" ");
}

const EMPTY = Object.freeze([]);

export default function ClubJoinRequestsPanel({ clubId, onlyPending = true }) {
    const listJoinRequests = useClubsStore((s) => s.listJoinRequests);
    const approveJoinRequest = useClubsStore((s) => s.approveJoinRequest);
    const rejectJoinRequest = useClubsStore((s) => s.rejectJoinRequest);
    const [rejecting, setRejecting] = useState(null);
    const [busy, setBusy] = useState(false);

    const selectItems = useCallback((s) => s.joinRequestsByClubId[clubId], [clubId]);
    const selectLoading = useCallback((s) => Boolean(s.loading.joinRequests[clubId]), [clubId]);
    const selectError = useCallback((s) => s.error.joinRequests[clubId], [clubId]);

    const items = useClubsStore(selectItems) ?? EMPTY;
    const loading = useClubsStore(selectLoading);
    const error = useClubsStore(selectError);

    const { user } = useAuthStore();

    useEffect(() => {
        if (!clubId) return;
        const params = onlyPending
            ? { status: "pending", ordering: "created_at" }
            : { ordering: "created_at" };
        listJoinRequests(clubId, params);
    }, [clubId, onlyPending, listJoinRequests]);

    const rows = useMemo(() => {
        if (!items.length) return EMPTY;
        return onlyPending
            ? items.filter((r) => String(r.status || "").toLowerCase() === "pending")
            : items;
    }, [items, onlyPending]);

    const nameOf = (r) =>
        r.user_full_name ||
        r.user_name ||
        r.user_username ||
        r.username ||
        r.user_email ||
        (r.user && (r.user.full_name || r.user.username || r.user.email)) ||
        "—";

    const friendlyError = useMemo(() => {
        if (!error) return null;
        const raw = String(error);
        const s = raw.toLowerCase();
        const userMissingUniversity = !String(user?.university || "").trim();

        const looksLikePerm =
            s.includes("permission denied") || s.includes("club_permission_denied");
        const mentionsUniversity = s.includes("university");

        if (looksLikePerm && (mentionsUniversity || userMissingUniversity)) {
            return (
                <div className="px-4 py-4 text-white/90">
                    <span className="block mb-1 text-yellow-300">
                        Please go to your profile settings and add your university.
                    </span>
                    <Link
                        to="/Account"
                        className="inline-block underline decoration-[#77C042] underline-offset-4 text-[#77C042] hover:opacity-90"
                    >
                        Open profile settings
                    </Link>
                </div>
            );
        }
        return <div className="px-4 py-4 text-red-400">{raw}</div>;
    }, [error, user?.university]);

    return (
        <section className="max-w-6xl mx-auto px-4 py-8 text-white">
            <ReasonModal
                open={Boolean(rejecting)}
                title={`Reject ${rejecting?.name ? rejecting.name : "join request"}`}
                onClose={() => setRejecting(null)}
                busy={busy}
                onConfirm={async (reason) => {
                    try {
                        setBusy(true);
                        await rejectJoinRequest(clubId, rejecting.id, reason);
                    } finally {
                        setBusy(false);
                        setRejecting(null);
                    }
                }}
            />

            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white">Join requests</h3>
                <Link
                    to={`/Clubs/${clubId}/join-requests`}
                    className="px-3 py-1 rounded-md bg-white/10 text-white hover:bg-white/20 transition"
                >
                    History
                </Link>
            </div>

            <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-white/10">
                        <thead className="bg-white/5">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-semibold">User</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">
                                    Status
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">
                                    Created
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {!rows.length && !loading && (
                                <tr>
                                    <td colSpan={4} className="px-4 py-6 text-white/70">
                                        {onlyPending ? "No pending requests." : "No requests."}
                                    </td>
                                </tr>
                            )}

                            {rows.map((r) => {
                                const status = String(r.status || "").toLowerCase();
                                const isPending = status === "pending";
                                const statusChip =
                                    status === "approved"
                                        ? "Approved"
                                        : status === "rejected"
                                          ? "Rejected"
                                          : "Pending";

                                return (
                                    <tr key={r.id}>
                                        <td className="px-4 py-3">{nameOf(r)}</td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={cx(
                                                    "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
                                                    status === "approved" &&
                                                        "bg-green-500/15 text-green-400 ring-1 ring-green-500/20",
                                                    status === "rejected" &&
                                                        "bg-red-500/15 text-red-400 ring-1 ring-red-500/20",
                                                    status === "pending" &&
                                                        "bg-yellow-500/15 text-yellow-300 ring-1 ring-yellow-500/20",
                                                )}
                                            >
                                                {statusChip}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {r.created_at
                                                ? new Date(r.created_at).toLocaleString()
                                                : "—"}
                                        </td>
                                        <td className="px-4 py-3">
                                            {isPending ? (
                                                <div className="flex gap-2">
                                                    <button
                                                        className="px-3 py-1 rounded-md bg-[#77C042] text-black font-semibold cursor-pointer"
                                                        onClick={() =>
                                                            approveJoinRequest(clubId, r.id)
                                                        }
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        className="px-3 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                                                        onClick={() =>
                                                            setRejecting({
                                                                id: r.id,
                                                                name: nameOf(r),
                                                            })
                                                        }
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs text-white/60 bg-white/10">
                                                    {statusChip}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {loading && <div className="px-4 py-4 text-white/70">Loading…</div>}
                {error && friendlyError}
            </div>
        </section>
    );
}
