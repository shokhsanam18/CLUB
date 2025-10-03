import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAccountsStore } from "../../store/accounts";
import { notify } from "../../store/notify";
import Loader from "../../components/Loader.jsx";
import {
    ArrowLeft,
    Mail,
    BookOpen,
    Shield,
    Users,
    Calendar,
    Send,
    User as UserIcon,
} from "react-feather";

const BRAND = "#77C042";

function HeroSeam() {
    return (
        <div className="relative">
            <div
                className="h-3 w-full"
                style={{
                    backgroundImage:
                        "repeating-linear-gradient(135deg,#77C042 0 14px,transparent 14px 28px)",
                }}
            />
            <div className="flex gap-3 px-6 py-2">
                {Array.from({ length: 20 }).map((_, i) => (
                    <span key={i} className="h-2 w-2 rounded-full bg-[#77C042] opacity-90" />
                ))}
            </div>
        </div>
    );
}

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
    if (err) {
        return (
            <div className="bg-[#121212] min-h-[60vh] flex items-center justify-center">
                <div className="text-center text-white/80">
                    <div className="text-red-400 font-semibold mb-2">{err}</div>
                    <Link
                        to={-1}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 ring-1 ring-white/15 hover:bg-white/15"
                    >
                        <ArrowLeft size={16} /> Go back
                    </Link>
                </div>
            </div>
        );
    }
    if (!profile) return <div className="p-6 text-center text-white">User not found</div>;

    const fullName =
        [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.email;
    const avatar = profile.avatar || "/avatar.png";
    const initials = [profile.first_name?.[0], profile.last_name?.[0]]
        .filter(Boolean)
        .join("")
        .toUpperCase();

    return (
        <div className="bg-[#121212] min-h-screen text-white font-['Outfit']">
            <header className="relative">
                <div className="relative h-[220px] md:h-[260px]">
                    <img
                        src="/bgclub.png"
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                        onError={(e) => (e.currentTarget.src = "/event-banner.png")}
                    />
                    <div className="absolute inset-0 bg-black/60" />
                    <div className="relative z-10 max-w-5xl mx-auto px-6 h-full flex items-end pb-7">
                        <div className="flex items-end justify-between w-full">
                            <div>
                                <Link
                                    to={-1}
                                    className="inline-flex items-center gap-2 rounded-full bg-white/10 ring-1 ring-white/15 px-3 py-1 text-xs hover:bg-white/15"
                                >
                                    <ArrowLeft size={14} />
                                    Back
                                </Link>
                                <h1 className="text-3xl md:text-5xl font-extrabold leading-tight mt-3">
                                    {fullName}
                                </h1>
                                <div className="mt-2 text-white/80 flex flex-wrap gap-2">
                                    <Badge icon={<Shield size={14} />} text={profile.role || "—"} />
                                    {Array.isArray(profile.all_roles) && profile.all_roles.length ? (
                                        <Badge
                                            icon={<Users size={14} />}
                                            text={profile.all_roles.join(", ")}
                                        />
                                    ) : null}
                                </div>
                            </div>
                            <div className="relative">
                                {avatar ? (
                                    <img
                                        src={avatar}
                                        alt=""
                                        className="h-20 w-20 md:h-24 md:w-24 rounded-full ring-2 ring-white/20 object-cover"
                                        onError={(e) => (e.currentTarget.src = "/avatar.png")}
                                    />
                                ) : (
                                    <div className="h-20 w-20 md:h-24 md:w-24 rounded-full bg-white/90 text-black flex items-center justify-center font-bold text-2xl select-none">
                                        {initials || <UserIcon className="opacity-70" />}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                <HeroSeam />
            </header>

            <main className="max-w-5xl mx-auto px-6 py-10">
                <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardHeader title="Contact & Basics" />
                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Info
                                    label="Email"
                                    value={profile.email || "—"}
                                    icon={<Mail size={16} />}
                                />
                                <Info
                                    label="Telegram ID"
                                    value={profile.tg_id || "—"}
                                    icon={<Send size={16} />}
                                />
                                <Info
                                    label="University"
                                    value={profile.university || "—"}
                                    icon={<BookOpen size={16} />}
                                />
                                <Info
                                    label="Club"
                                    value={
                                        profile.club_name ||
                                        (profile.club ? `#${profile.club}` : "—")
                                    }
                                    icon={<Users size={16} />}
                                />
                                <Info
                                    label="Joined club at"
                                    value={
                                        profile.joined_club_at
                                            ? new Date(profile.joined_club_at).toLocaleString()
                                            : "—"
                                    }
                                    icon={<Calendar size={16} />}
                                />
                                <Info
                                    label="Account created"
                                    value={
                                        profile.date_joined
                                            ? new Date(profile.date_joined).toLocaleString()
                                            : "—"
                                    }
                                    icon={<Calendar size={16} />}
                                />
                            </div>
                        </Card>

                        <Card>
                            <CardHeader title="Bio" />
                            <div className="mt-3">
                                {profile.bio ? (
                                    <p className="leading-relaxed text-white/90">{profile.bio}</p>
                                ) : (
                                    <p className="text-white/60">—</p>
                                )}
                            </div>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        <SummaryCard
                            title="At a Glance"
                            items={[
                                {
                                    label: "Primary role",
                                    value: profile.role || "—",
                                    icon: <Shield size={16} />,
                                },
                                {
                                    label: "All roles",
                                    value:
                                        Array.isArray(profile.all_roles) &&
                                        profile.all_roles.length > 0
                                            ? profile.all_roles.join(", ")
                                            : "—",
                                    icon: <Users size={16} />,
                                },
                                {
                                    label: "University",
                                    value: profile.university || "—",
                                    icon: <BookOpen size={16} />,
                                },
                                {
                                    label: "Telegram ID",
                                    value: profile.tg_id || "—",
                                    icon: <Send size={16} />,
                                },
                            ]}
                        />
                        <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4">
                            <div className="text-sm text-white/70">
                                Is profile public?{" "}
                                <span
                                    className={`font-semibold ${
                                        profile.is_profile_public ? "text-emerald-400" : "text-white"
                                    }`}
                                >
                                    {profile.is_profile_public ? "Yes" : "No"}
                                </span>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="mt-12">
                    <HeroSeam />
                </div>

                <div className="mt-6">
                    <Link
                        to={-1}
                        className="inline-flex items-center gap-2 px-5 h-11 rounded-full bg-[--brand] text-black font-semibold"
                        style={{ ["--brand"]: BRAND }}
                    >
                        <ArrowLeft size={16} />
                        Back
                    </Link>
                </div>
            </main>
        </div>
    );
}

function Card({ children }) {
    return (
        <section className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-6">{children}</section>
    );
}

function CardHeader({ title }) {
    return (
        <div className="flex items-center gap-2">
            <span
                className="inline-flex h-7 w-7 items-center justify-center rounded-md ring-1 ring-white/15"
                style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
            />
            <h3 className="text-white text-base font-semibold">{title}</h3>
        </div>
    );
}

function Badge({ icon, text }) {
    return (
        <span className="inline-flex items-center gap-1 rounded-md bg-white/10 ring-1 ring-white/15 px-2 py-0.5 text-xs">
            {icon}
            {text}
        </span>
    );
}

function Info({ label, value, icon }) {
    return (
        <div className="rounded-xl bg-white/5 ring-1 ring-white/10 p-4">
            <div className="text-xs uppercase tracking-wide text-white/60 flex items-center gap-1">
                {icon ? <span className="opacity-80">{icon}</span> : null}
                {label}
            </div>
            <div className="mt-1 text-white/90 break-words">{String(value ?? "—")}</div>
        </div>
    );
}

function SummaryCard({ title, items = [] }) {
    return (
        <Card>
            <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/10 ring-1 ring-white/15" />
                <h4 className="font-semibold">{title}</h4>
            </div>
            <ul className="space-y-3">
                {items.map((it, i) => (
                    <li key={i} className="flex items-start gap-3">
                        <span className="mt-0.5 text-white/60">{it.icon}</span>
                        <div>
                            <div className="text-xs uppercase tracking-wide text-white/60">
                                {it.label}
                            </div>
                            <div className="text-white/90">{it.value}</div>
                        </div>
                    </li>
                ))}
            </ul>
        </Card>
    );
}
