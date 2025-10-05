import React, { useEffect, useState } from "react";
import { useAuthStore } from "../store/auth";
import { notify } from "../store/notify";
import { CheckCircle, Mail, User as UserIcon, BookOpen, Shield, Send } from "react-feather";
// import { useUiStore } from "../store/ui.js";

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

const roleLabel = (r) => {
    if (!r) return "";
    const key = String(r).toLowerCase();
    const map = {
        superadmin: "Superadmin",
        ambassador: "Ambassador",
        volunteer: "Volunteer",
        student: "Student",
        member: "Member",
    };
    return map[key] ?? r;
};

const Account = () => {
    const { user, fetchMyProfile, updateMyProfile, loading } = useAuthStore();
    const [form, setForm] = useState({
        email: "",
        first_name: "",
        last_name: "",
        university: "",
        bio: "",
        tg_id: "",
        is_profile_public: true,
        role: "",
    });
    const [saved, setSaved] = useState(false);
    // const stopRouteLoading = useUiStore((s) => s.stopRouteLoading);

    useEffect(() => {
        (async () => {
            const p = await fetchMyProfile();
            const src = p || user || {};
            setForm({
                email: src.email || "",
                first_name: src.first_name || "",
                last_name: src.last_name || "",
                university: src.university || "",
                bio: src.bio || "",
                tg_id: src.tg_id || "",
                is_profile_public: !!src.is_profile_public,
                role: src.role || "",
            });
            // stopRouteLoading();
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const onChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm((s) => ({ ...s, [name]: type === "checkbox" ? checked : value }));
        setSaved(false);
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        const { role, ...patch } = form;
        if (!String(patch.tg_id ?? "").trim()) delete patch.tg_id;
        const { ok } = await updateMyProfile(patch);
        setSaved(ok);
        if (ok) notify.success("Profile saved");
        else notify.error("Failed to save profile");
    };

    const initials = [(form.first_name || "").trim()[0], (form.last_name || "").trim()[0]]
        .filter(Boolean)
        .join("")
        .toUpperCase();

    return (
        <div className="bg-[#121212] min-h-screen text-white font-['Outfit']">
            <header className="relative">
                <div className="relative h-[220px] md:h-[260px]">
                    <img
                        src="/club-hero.jpg"
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                        onError={(e) => (e.currentTarget.src = "/event-banner.png")}
                    />
                    <div className="absolute inset-0 bg-black/60" />
                    <div className="relative z-10 max-w-6xl mx-auto px-6 h-full flex items-end pb-8">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 ring-1 ring-white/15 px-3 py-1 mb-3 text-xs">
                                <Shield size={14} />
                                Account
                            </div>
                            <h1 className="text-3xl md:text-5xl font-extrabold leading-tight">
                                My Profile
                            </h1>
                            <p className="text-white/80 mt-2">
                                Keep your information up to date and control what others see.
                            </p>
                        </div>
                    </div>
                </div>
                <HeroSeam />
            </header>

            <main className="max-w-5xl mx-auto px-6 py-10">
                <form onSubmit={onSubmit} className="space-y-8">
                    <section className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-6">
                        <div className="flex items-center gap-4">
                            <div className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-white/90 text-black flex items-center justify-center font-bold text-2xl select-none">
                                {initials || <UserIcon className="opacity-70" />}
                            </div>
                            <div className="flex-1">
                                <div className="text-sm uppercase tracking-wider text-white/60">
                                    Welcome back
                                </div>
                                <div className="text-lg font-semibold">
                                    {form.first_name || form.last_name
                                        ? `${form.first_name} ${form.last_name}`.trim()
                                        : "Your name"}
                                </div>
                                <div className="text-white/70 text-sm flex items-center gap-2">
                                    <Mail size={16} />
                                    {form.email || "—"}
                                </div>

                                <div className="mt-1 text-sm">
                                    <span className="inline-flex items-center rounded-md bg-white/10 ring-1 ring-white/15 px-2 py-0.5">
                                        <Shield size={14} className="mr-1 opacity-80" />
                                        {roleLabel(form.role) || "—"}
                                    </span>
                                </div>
                            </div>

                            {saved ? (
                                <div className="hidden sm:flex items-center gap-2 text-emerald-400">
                                    <CheckCircle size={18} />
                                    <span className="text-sm">Saved</span>
                                </div>
                            ) : null}
                        </div>
                    </section>

                    <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader icon={<UserIcon size={16} />} title="Basic information" />
                            <div className="mt-4 space-y-4">
                                <Field
                                    label="Email"
                                    name="email"
                                    value={form.email}
                                    onChange={onChange}
                                    icon={<Mail size={16} />}
                                    placeholder="you@example.com"
                                />
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Field
                                        label="First name"
                                        name="first_name"
                                        value={form.first_name}
                                        onChange={onChange}
                                        placeholder="Dmitriy"
                                    />
                                    <Field
                                        label="Last name"
                                        name="last_name"
                                        value={form.last_name}
                                        onChange={onChange}
                                        placeholder="Kim"
                                    />
                                </div>
                                <Field
                                    label="University"
                                    name="university"
                                    value={form.university}
                                    onChange={onChange}
                                    icon={<BookOpen size={16} />}
                                    placeholder="IT Park University"
                                />
                                <Field
                                    label="Telegram Nickname"
                                    name="tg_id"
                                    value={form.tg_id}
                                    onChange={onChange}
                                    icon={<Send size={16} />}
                                    placeholder="e.g., 123456789"
                                />
                                <Field
                                    label="Role"
                                    name="role"
                                    value={roleLabel(form.role)}
                                    onChange={() => {}}
                                    disabled
                                    readOnly
                                    placeholder="—"
                                />
                            </div>
                        </Card>

                        <Card>
                            <CardHeader icon={<BookOpen size={16} />} title="About you" />
                            <div className="mt-4 space-y-4">
                                <Textarea
                                    label="Bio"
                                    name="bio"
                                    value={form.bio}
                                    onChange={onChange}
                                    rows={8}
                                    placeholder="Tell others a bit about your interests, clubs, and achievements…"
                                />
                                <Toggle
                                    label="Profile is public"
                                    name="is_profile_public"
                                    checked={form.is_profile_public}
                                    onChange={onChange}
                                    hint="If enabled, your name and university appear on rankings and club pages."
                                />
                            </div>
                        </Card>
                    </section>

                    <div className="flex items-center justify-end gap-3">
                        {saved ? (
                            <span className="inline-flex items-center gap-2 text-emerald-400">
                                <CheckCircle size={18} />
                                Saved
                            </span>
                        ) : null}
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 h-12 rounded-full bg-[#77C042] hover:bg-[#67b539] text-black font-semibold tracking-wide cursor-pointer transition-colors disabled:opacity-60"
                        >
                            {loading ? "Saving…" : "Save changes"}
                        </button>
                    </div>
                </form>

                <div className="mt-12">
                    <HeroSeam />
                </div>
            </main>
        </div>
    );
};

function Card({ children }) {
    return (
        <section className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-6">{children}</section>
    );
}
function CardHeader({ icon, title }) {
    return (
        <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/10 ring-1 ring-white/15">
                {icon}
            </span>
            <h3 className="text-white text-base font-semibold">{title}</h3>
        </div>
    );
}

function Field({ label, name, value, onChange, type = "text", icon = null, placeholder = "" }) {
    return (
        <label className="block">
            <span className="block text-sm text-white/80 mb-1.5">{label}</span>
            <div className="relative">
                {icon ? (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">
                        {icon}
                    </span>
                ) : null}
                <input
                    name={name}
                    type={type}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    className={`w-full h-12 rounded-lg bg-transparent border border-white/20 text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-[${BRAND}] focus:border-[${BRAND}] ${
                        icon ? "pl-10 pr-3" : "px-3"
                    }`}
                />
            </div>
        </label>
    );
}

function Textarea({ label, name, value, onChange, rows = 6, placeholder = "" }) {
    return (
        <label className="block">
            <span className="block text-sm text-white/80 mb-1.5">{label}</span>
            <textarea
                name={name}
                value={value}
                onChange={onChange}
                rows={rows}
                placeholder={placeholder}
                className={`w-full rounded-lg bg-transparent border border-white/20 text-white placeholder-white/40 outline-none px-3 py-2 focus:ring-2 focus:ring-[${BRAND}] focus:border-[${BRAND}]`}
            />
        </label>
    );
}

function Toggle({ label, name, checked, onChange, hint }) {
    return (
        <div className="flex items-start gap-3">
            <input
                id={name}
                name={name}
                type="checkbox"
                checked={checked}
                onChange={onChange}
                className="mt-1.5 h-5 w-5 rounded border-white/30 bg-transparent"
                style={{ accentColor: BRAND }}
            />
            <label htmlFor={name} className="cursor-pointer">
                <div className="font-medium">{label}</div>
                {hint ? <div className="text-sm text-white/60">{hint}</div> : null}
            </label>
        </div>
    );
}

export default Account;
