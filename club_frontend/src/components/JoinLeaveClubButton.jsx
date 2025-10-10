import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/auth";
import { useClubsStore } from "../store/clubs";
import { notify, formatError } from "../store/notify";

export default function JoinLeaveClubButton({ clubId, isMember, className = "", style }) {
    const { user } = useAuthStore();
    const location = useLocation();
    const joinClub = useClubsStore((s) => s.joinClub);
    const leaveClub = useClubsStore((s) => s.leaveClub);
    const getClub = useClubsStore((s) => s.getClub);
    const club = useClubsStore((s) => (clubId ? s.clubsById[clubId] : null));

    const [loading, setLoading] = useState(false);
    const [pending, setPending] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (clubId && !club) getClub(clubId).catch(() => {});
        setPending(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clubId]);
    useEffect(() => {
        if (isMember) setPending(false);
    }, [isMember]);

    const userRole = String(user?.role || "").toLowerCase();
    const clubRole = String(club?.my_role ?? club?.role_for_me ?? club?.role ?? "").toLowerCase();
    const isAmbassador = userRole === "ambassador" || clubRole === "ambassador";

    const onJoin = async () => {
        if (!user) return navigate("/Login", { replace: true, state: { from: location } });

        setPending(true);
        setLoading(true);
        try {
            const res = await joinClub(clubId, {});
            const status = (res?.status || res?.data?.status || "").toString().toLowerCase();

            await getClub(clubId, true);

            if (status && status !== "pending" && status !== "approved") {
                setPending(false);
            }

            if (!status || status === "pending") {
                notify.info(
                    "Join request submitted. You’ll get access once an ambassador approves it.",
                );
            } else if (res?.message) {
                notify.success(res.message);
            }
        } catch (e) {
            const msg = e?.response?.data?.error || e?.message || "Failed to join";
            const st = (e?.response?.data?.status || "").toString().toLowerCase();
            if (st === "pending") {
                notify.info("You already have a pending join request. Please wait for approval.");
            } else {
                setPending(false);
                notify.error(formatError(e, msg));
            }
        } finally {
            setLoading(false);
        }
    };

    const onLeave = async () => {
        setLoading(true);
        try {
            const res = await leaveClub(clubId, { action: "leave", club_id: Number(clubId) });
            await getClub(clubId, true);
            setPending(false);
            if (res?.message) notify.success(res.message);
        } catch (e) {
            notify.error(formatError(e, "Failed to leave"));
        } finally {
            setLoading(false);
        }
    };
    if (isMember) {
        if (isAmbassador) return null;
        return (
            <button
                onClick={onLeave}
                disabled={loading}
                className={`${className} disabled:opacity-50 cursor-pointer`}
                style={style}
            >
                {loading ? "Leaving..." : "Leave club"}
            </button>
        );
    }
    return (
        <button
            onClick={pending ? undefined : onJoin}
            disabled={loading || pending}
            className={`${className} disabled:opacity-60 cursor-pointer`}
            style={style}
            title={pending ? "Waiting for ambassador approval" : undefined}
        >
            {loading ? "Joining..." : pending ? "Waiting for approval" : "Join club"}
        </button>
    );
}
