import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAccountsStore } from "../../store/accounts";
import { notify } from "../../store/notify";
import Loader from "../../components/Loader.jsx";

export default function ViewAccount() {
    const { userId } = useParams();
    const getUserProfile = useAccountsStore((s) => s.getUserProfile);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState(null);

    useEffect(() => {
        (async () => {
            setLoading(true);
            setErr(null);
            try {
                const p = await getUserProfile(userId, true);
                setProfile(p);
            } catch (e) {
                const status = e?.response?.status;
                const msg =
                    status === 404 ? "Profile is private or not found." : "Failed to load profile";
                setErr(msg);
                notify.error(msg);
            } finally {
                setLoading(false);
            }
        })();
    }, [userId, getUserProfile]);

    if (loading) {
        return (
            <div className="relative min-h-[50vh] bg-[#121212]">
                <Loader label="Loading..." />
            </div>
        );
    }
    if (err) return <div className="p-6 text-center text-red-400">{err}</div>;
    if (!profile) return <div className="p-6 text-center text-white">User not found</div>;

    const fullName =
        [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.email;
    const avatar = profile.avatar || "/avatar.png";

    return (
        <div className="bg-[#121212] min-h-screen font-['Outfit']">
            <div className="max-w-4xl mx-auto px-6 py-8 text-white">
                <Link to={-1} className="text-white/80 hover:underline">
                    ← Back
                </Link>

                <div className="mt-6 flex items-center gap-5">
                    <img
                        src={avatar}
                        alt=""
                        className="h-20 w-20 rounded-full ring-2 ring-white/20 object-cover"
                        onError={(e) => {
                            e.currentTarget.src = "/avatar.png";
                        }}
                    />
                    <div>
                        <h1 className="text-2xl font-bold">{fullName}</h1>
                        <div className="text-white/70">{profile.email}</div>
                    </div>
                </div>

                <div className="mt-8 grid md:grid-cols-2 gap-4">
                    <Info label="University" value={profile.university} />
                    <Info
                        label="Club"
                        value={profile.club_name || (profile.club ? `#${profile.club}` : "—")}
                    />
                    <Info label="Role" value={profile.role || "—"} />
                    <Info
                        label="All roles"
                        value={
                            Array.isArray(profile.all_roles) ? profile.all_roles.join(", ") : "—"
                        }
                    />
                    <Info
                        label="Joined club at"
                        value={
                            profile.joined_club_at
                                ? new Date(profile.joined_club_at).toLocaleString()
                                : "—"
                        }
                    />
                    <Info
                        label="Account created"
                        value={
                            profile.date_joined
                                ? new Date(profile.date_joined).toLocaleString()
                                : "—"
                        }
                    />
                    <Info label="Bio" value={profile.bio || "—"} className="md:col-span-2" />
                </div>
            </div>
        </div>
    );
}

function Info({ label, value, className = "" }) {
    return (
        <div className={`rounded-xl bg-white/5 ring-1 ring-white/10 p-4 ${className}`}>
            <div className="text-xs uppercase tracking-wide text-white/60">{label}</div>
            <div className="mt-1">{String(value ?? "—")}</div>
        </div>
    );
}
