import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAccountsStore } from "../../store/accounts";
import { notify } from "../../store/notify";
import { useNavigate } from "react-router-dom";
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
import { useAuthStore } from "../../store/auth";
import { ROLES, isAmbassador } from "../../lib/roles";

const BRAND = "#77C042";

function BrandDivider({ compact = false }) {
    return (
        <div
            className={compact ? "h-2" : "h-3"}
            style={{
                backgroundImage:
                    "repeating-linear-gradient(135deg, #77C042 0 14px, transparent 14px 28px)",
                opacity: 0.9,
            }}
        />
    );
}

export default function ViewAccount() {
    const { userId } = useParams();
    const getUserProfile = useAccountsStore((s) => s.getUserProfile);
    const [profile, setProfile] = useState(null);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState(null);
    const me = useAuthStore((s) => s.user);

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
            <div className="relative min-h-[60vh] bg-[#0D0F10] flex items-center justify-center">
                <Loader label="Loading profile…" />
            </div>
        );
    }

    if (err) {
        return (
            <div className="bg-[#0D0F10] min-h-[60vh] flex items-center justify-center px-6">
                <div className="text-center text-white/80 max-w-md">
                    <div className="text-red-400 font-semibold mb-3">{err}</div>
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 ring-1 ring-white/15 hover:bg-white/15 transition"
                    >
                        <ArrowLeft size={16} /> Go back
                    </button>
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

    const joinedAt = profile.joined_club_at ? new Date(profile.joined_club_at) : null;
    const createdAt = profile.date_joined ? new Date(profile.date_joined) : null;

    const canAssign = Boolean(isAmbassador(me)) && String(me?.id) !== String(profile?.id);
    const ASSIGNABLE_ROLES = [ROLES.Volunteer, ROLES.ViceAmbassador];

    return (
        <div className="bg-[#0B0D0E] min-h-screen text-white font-['Outfit']">
            <header className="relative">
                <div className="relative h-[240px] md:h-[300px]">
                    <img
                        src="/bgclub.png"
                        alt="Club ambient"
                        className="absolute inset-0 h-full w-full object-cover"
                        onError={(e) => (e.currentTarget.src = "/event-banner.png")}
                    />
                    <div
                        className="absolute inset-0"
                        style={{
                            background:
                                "radial-gradient(1200px 300px at 30% 0%, rgba(119,192,66,0.25), transparent 60%), linear-gradient(180deg, rgba(0,0,0,0.55), rgba(0,0,0,0.65))",
                        }}
                    />

                    <div className="relative z-10 max-w-[72rem] mx-auto px-6 h-full flex items-end pb-8">
                        <div className="flex items-end justify-between w-full gap-6">
                            <div className="min-w-0">
                                <button
                                    type="button"
                                    onClick={() => navigate(-1)}
                                    className="inline-flex items-center gap-2 rounded-full bg-white/10 ring-1 ring-white/15 px-3 py-1 text-xs hover:bg-white/15 transition"
                                >
                                    <ArrowLeft size={14} /> Back
                                </button>

                                <h1 className="text-3xl md:text-5xl font-extrabold leading-tight mt-3 drop-shadow-sm truncate">
                                    {fullName}
                                </h1>

                                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                                    <Badge icon={<Shield size={14} />} text={profile.role || "—"} />
                                </div>
                            </div>

                            <div className="relative shrink-0 translate-y-6 md:translate-y-8">
                                {avatar ? (
                                    <img
                                        src={avatar}
                                        alt={`${fullName} avatar`}
                                        className="h-24 w-24 md:h-28 md:w-28 rounded-full object-cover ring-2 ring-white/25 shadow-xl shadow-black/40"
                                        onError={(e) => (e.currentTarget.src = "/avatar.png")}
                                    />
                                ) : (
                                    <div className="h-24 w-24 md:h-28 md:w-28 rounded-full bg-white text-black flex items-center justify-center font-bold text-2xl select-none ring-2 ring-white/20">
                                        {initials || <UserIcon className="opacity-70" />}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                <BrandDivider />
            </header>

            <main className="max-w-[72rem] mx-auto px-6 pb-16 pt-10">
                <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6 min-w-0">
                        <Card>
                            <SectionHeader title="Contact & Basics" />
                            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Info
                                    label="Email"
                                    value={profile.email || "—"}
                                    icon={<Mail size={16} />}
                                />
                                <Info
                                    label="Telegram Nickname"
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
                                    value={joinedAt ? joinedAt.toLocaleString() : "—"}
                                    icon={<Calendar size={16} />}
                                />
                                <Info
                                    label="Account created"
                                    value={createdAt ? createdAt.toLocaleString() : "—"}
                                    icon={<Calendar size={16} />}
                                />
                            </div>
                        </Card>

                        <Card>
                            <SectionHeader title="Bio" />
                            <div className="mt-3">
                                {profile.bio ? (
                                    <p className="leading-relaxed text-white/90 whitespace-pre-line">
                                        {profile.bio}
                                    </p>
                                ) : (
                                    <p className="text-white/60">—</p>
                                )}
                            </div>
                        </Card>
                    </div>

                    <aside className="space-y-6 lg:sticky lg:top-6 h-fit">
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
                                    label: "Telegram Nickname",
                                    value: profile.tg_id || "—",
                                    icon: <Send size={16} />,
                                },
                            ]}
                        />

                        <Card>
                            <div className="flex items-center gap-3">
                                <StatusDot on={Boolean(profile.is_profile_public)} />
                                <div>
                                    <div className="text-sm text-white/70">Profile visibility</div>
                                    <div
                                        className="font-semibold"
                                        style={{
                                            color: profile.is_profile_public ? BRAND : "#D1D5DB",
                                        }}
                                    >
                                        {profile.is_profile_public ? "Public" : "Private"}
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {canAssign && (
                            <Card>
                                <div
                                    className="rounded-xl p-4 ring-1 bg-white/[0.06]"
                                    style={{ borderColor: "rgba(119,192,66,0.35)" }}
                                >
                                    <AssignRoleBlock
                                        userId={profile.id}
                                        currentRole={profile.role}
                                        options={ASSIGNABLE_ROLES}
                                        onDone={async () => {
                                            try {
                                                const fresh = await getUserProfile(userId, true);
                                                setProfile(fresh);
                                            } catch {
                                                /* no-op */
                                            }
                                        }}
                                    />
                                </div>
                            </Card>
                        )}
                    </aside>
                </section>

                <div className="mt-12">
                    <BrandDivider compact />
                </div>

                <div className="mt-8">
                    <BrandButton to={-1} ariaLabel="Back to previous page">
                        <ArrowLeft size={16} />
                        <span>Back</span>
                    </BrandButton>
                </div>
            </main>
        </div>
    );
}

function Card({ children }) {
    return (
        <section className="relative overflow-hidden rounded-2xl bg-white/[0.045] ring-1 ring-white/10 backdrop-blur-[2px] p-6 shadow-[0_10px_30px_-10px_rgb(0_0_0_/_0.5)]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            {children}
        </section>
    );
}

function SectionHeader({ title }) {
    return (
        <div className="flex items-center gap-3">
            <span
                className="inline-flex h-7 w-7 items-center justify-center rounded-md ring-1 ring-white/15"
                style={{
                    backgroundColor: "rgba(255,255,255,0.08)",
                    boxShadow: "0 0 0 3px rgba(119,192,66,0.08) inset",
                }}
            />
            <h3 className="text-base font-semibold tracking-tight">{title}</h3>
        </div>
    );
}

function Badge({ icon, text }) {
    return (
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] ring-1 ring-white/15 bg-white/10 hover:bg-white/15 transition select-none">
            <span className="opacity-80">{icon}</span>
            <span className="truncate max-w-[14rem]">{text}</span>
        </span>
    );
}

function Info({ label, value, icon }) {
    return (
        <div className="group rounded-xl bg-white/[0.04] ring-1 ring-white/10 p-4 hover:bg-white/[0.06] transition">
            <div className="text-[11px] uppercase tracking-wide text-white/60 flex items-center gap-1">
                {icon ? <span className="opacity-80">{icon}</span> : null}
                <span className="truncate">{label}</span>
            </div>
            <div className="mt-1 text-white/90 break-words">{String(value ?? "—")}</div>
        </div>
    );
}

function SummaryCard({ title, items = [] }) {
    return (
        <Card>
            <div className="flex items-center gap-3 mb-3">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/10 ring-1 ring-white/15" />
                <h4 className="font-semibold tracking-tight">{title}</h4>
            </div>
            <ul className="space-y-3">
                {items.map((it, i) => (
                    <li key={i} className="flex items-start gap-3">
                        <span className="mt-0.5 text-white/60 shrink-0">{it.icon}</span>
                        <div className="min-w-0">
                            <div className="text-[11px] uppercase tracking-wide text-white/60">
                                {it.label}
                            </div>
                            <div className="text-white/90 break-words">{it.value}</div>
                        </div>
                    </li>
                ))}
            </ul>
        </Card>
    );
}

function StatusDot({ on }) {
    const dotStyle = {
        ["--brand"]: "#77C042",
        boxShadow: on ? "0 0 18px rgba(119,192,66,0.55)" : undefined,
    };

    return (
        <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${on ? "bg-[--brand]" : "bg-white/40"}`}
            style={dotStyle}
            aria-hidden
        />
    );
}

function BrandButton({ to, ariaLabel, children }) {
    return (
        <Link
            to={to}
            aria-label={ariaLabel}
            className="inline-flex items-center gap-2 h-11 px-5 rounded-full font-semibold text-black shadow-[0_8px_24px_-6px_rgba(119,192,66,0.6)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-[--brand]"
            style={{ background: BRAND }}
        >
            {children}
        </Link>
    );
}

function AssignRoleBlock({ userId, currentRole, options = [], onDone }) {
    const [open, setOpen] = useState(false);
    const [role, setRole] = useState(
        options.includes(currentRole) ? currentRole : options[0] || ROLES.Volunteer,
    );
    const [busy, setBusy] = useState(false);
    const assignRole = useAccountsStore((s) => s.assignRole);

    return (
        <>
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="text-sm text-white/70">Role management</div>
                    <div className="font-semibold">Assign role to this user</div>
                    <div className="text-xs text-white/50 mt-1">
                        Available: {options.join(", ")}
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className="inline-flex items-center gap-2 h-10 px-4 rounded-full font-semibold text-black disabled:opacity-60"
                    style={{ background: BRAND, boxShadow: "0 8px 24px -6px rgba(119,192,66,0.6)" }}
                    disabled={!options.length}
                >
                    Assign role
                </button>
            </div>

            {open && (
                <ConfirmAssignModal
                    role={role}
                    setRole={setRole}
                    options={options}
                    busy={busy}
                    onCancel={() => setOpen(false)}
                    onConfirm={async () => {
                        try {
                            setBusy(true);
                            await assignRole(userId, role);
                            notify.success(`Role assigned: ${role}`);
                            setOpen(false);
                            setBusy(false);
                            onDone?.();
                        } catch (e) {
                            setBusy(false);
                            const msg = e?.response?.data
                                ? typeof e.response.data === "string"
                                    ? e.response.data
                                    : JSON.stringify(e.response.data)
                                : e?.message || "Failed to assign role";
                            notify.error(msg);
                        }
                    }}
                />
            )}
        </>
    );
}

function ConfirmAssignModal({ role, setRole, options, busy, onCancel, onConfirm }) {
    return (
        <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
            <div className="absolute inset-0 flex items-center justify-center p-4">
                <div className="w-full max-w-md rounded-2xl bg-[#121416] ring-1 ring-white/10 p-6 text-white">
                    <h4 className="text-lg font-semibold">Assign role</h4>
                    <p className="mt-1 text-white/70 text-sm">
                        Choose a role to assign to this user. This action may affect their club
                        permissions.
                    </p>

                    <div className="mt-4">
                        <label className="text-sm text-white/80">Select role</label>

                        <div className="relative mt-2">
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className="w-full appearance-none rounded-xl bg-[#0f1314] text-white ring-1 ring-white/15 px-3 py-2 outline-none focus:ring-2"
                                style={{ colorScheme: "dark" }}
                            >
                                {options.map((opt) => (
                                    <option
                                        key={opt}
                                        value={opt}
                                        style={{ backgroundColor: "#0f1314", color: "#e5e7eb" }}
                                    >
                                        {opt}
                                    </option>
                                ))}
                            </select>

                            <svg
                                viewBox="0 0 20 20"
                                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-70"
                                fill="currentColor"
                            >
                                <path d="M5.23 7.21a.75.75 0 011.06.02L10 10.17l3.71-2.94a.75.75 0 11.94 1.17l-4.24 3.36a.75.75 0 01-.94 0L5.21 8.4a.75.75 0 01.02-1.19z" />
                            </svg>
                        </div>

                        <p className="mt-2 text-xs text-white/50">
                            Current: <span className="text-white/80">{role}</span>
                        </p>
                    </div>

                    <div className="mt-6 flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-4 py-2 rounded-full bg-white/10 ring-1 ring-white/15 hover:bg-white/15 transition"
                            disabled={busy}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={onConfirm}
                            disabled={busy}
                            className="px-5 py-2 rounded-full font-semibold text-black disabled:opacity-60"
                            style={{
                                background: BRAND,
                                boxShadow: "0 8px 24px -6px rgba(119,192,66,0.6)",
                            }}
                        >
                            {busy ? "Assigning..." : "Confirm"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
