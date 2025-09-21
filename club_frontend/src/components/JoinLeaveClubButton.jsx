import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth";
import { useClubsStore } from "../store/clubs";

export default function JoinLeaveClubButton({ clubId, isMember }) {
    const { user } = useAuthStore();
    const joinClub = useClubsStore((s) => s.joinClub);
    const leaveClub = useClubsStore((s) => s.leaveClub);
    const getClub = useClubsStore((s) => s.getClub);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const onJoin = async () => {
        if (!user) return navigate("/Login", { replace: true });
        setLoading(true);
        try {
            await joinClub(clubId);
            await getClub(clubId, true);
        } finally {
            setLoading(false);
        }
    };

    const onLeave = async () => {
        setLoading(true);
        try {
            await leaveClub(clubId);
            await getClub(clubId, true);
        } finally {
            setLoading(false);
        }
    };

    return isMember ? (
        <button
            onClick={onLeave}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded disabled:opacity-50 cursor-pointer"
        >
            {loading ? "Leaving..." : "Leave club"}
        </button>
    ) : (
        <button
            onClick={onJoin}
            disabled={loading}
            className="px-4 py-2 bg-[#66cc33] text-white rounded disabled:opacity-50 cursor-pointer"
        >
            {loading ? "Joining..." : "Join club"}
        </button>
    );
}
