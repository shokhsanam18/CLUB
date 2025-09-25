import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useClubsStore } from "../../store/clubs";
import { useAuthStore } from "../../store/auth";
import { ROLES, hasAnyRole } from "../../lib/roles";
import { notify, formatError } from "../../store/notify";
import { Calendar, ChevronLeft, Plus, Trash2 } from "react-feather";

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const toLocalInput = (isoLike) => {
    if (!isoLike) return "";
    const d = new Date(isoLike);
    if (Number.isNaN(+d)) return "";
    const pad = (x) => String(x).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
        d.getHours(),
    )}:${pad(d.getMinutes())}`;
};

const fromLocalInputs = (arr) =>
    (arr || [])
        .map((s) => String(s || "").trim())
        .filter(Boolean)
        .map((s) => new Date(s).toISOString());

export default function EventEdit() {
    const { id } = useParams();
    const eventId = Number(id);
    const navigate = useNavigate();

    const { user } = useAuthStore();
    const isAmbassador = hasAnyRole(user, [ROLES.Ambassador, ROLES.Superadmin]);

    const getEvent = useClubsStore((s) => s.getEvent);
    const updateEvent = useClubsStore((s) => s.updateEvent);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState(null);

    const [evt, setEvt] = useState(null);

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [tag, setTag] = useState("");
    const [sessions, setSessions] = useState([""]);

    const canEdit = useMemo(() => {
        if (!evt) return false;
        const createdBy = evt?.created_by ?? evt?.created_by_id;
        return isAmbassador || String(createdBy) === String(user?.id);
    }, [evt, isAmbassador, user?.id]);

    useEffect(() => {
        (async () => {
            setLoading(true);
            setErr(null);
            try {
                const data = await getEvent(eventId, true);
                setEvt(data);

                setTitle(data?.title || "");
                setDescription(data?.description || "");
                setTag(data?.tag || "");

                const list = Array.isArray(data?.date) ? data.date : data?.date ? [data.date] : [];
                const initial = list.length ? list.map(toLocalInput) : [""];
                setSessions(initial.slice(0, 6));
            } catch (e) {
                setErr(String(e?.message || e));
            } finally {
                setLoading(false);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [eventId]);

    const onAddSession = () => {
        setSessions((s) => (s.length >= 6 ? s : [...s, ""]));
    };
    const onRemoveSession = (i) => {
        setSessions((s) => (s.length <= 1 ? [""] : s.filter((_, idx) => idx !== i)));
    };
    const onChangeSession = (i, v) => {
        setSessions((s) => {
            const next = s.slice();
            next[i] = v;
            return next;
        });
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        if (!canEdit) return notify.info("You don't have permission to edit this event.");

        const cleanTitle = String(title || "").trim();
        if (!cleanTitle) return notify.info("Title is required.");

        const clean = {
            title: cleanTitle.slice(0, 100),
            description: String(description || "").slice(0, 500),
            tag: String(tag || ""),
            date: fromLocalInputs(sessions).slice(0, 6),
        };

        setSaving(true);
        try {
            await updateEvent(eventId, clean, "patch");
            notify.success("Event updated");
            navigate(`/Events/${eventId}`);
        } catch (e2) {
            notify.error(formatError(e2, "Failed to update event"));
            setSaving(false);
        }
    };

    if (loading) return <div className="p-6 text-center">Loading…</div>;
    if (err) return <div className="p-6 text-center text-red-500">{err}</div>;
    if (!evt) return <div className="p-6 text-center text-red-500">Event not found</div>;
    if (!canEdit)
        return (
            <div className="p-6 max-w-3xl mx-auto">
                <div className="rounded-xl bg-red-50 text-red-700 border border-red-200 p-4">
                    You don’t have permission to edit this event.
                </div>
                <div className="mt-6">
                    <Link
                        to={`/Events/${eventId}`}
                        className="inline-flex items-center gap-2 text-gray-700 hover:underline"
                    >
                        <ChevronLeft size={18} /> Back to event
                    </Link>
                </div>
            </div>
        );

    return (
        <div className="bg-[#121212] min-h-screen font-['Outfit']">
            <header className="max-w-4xl mx-auto px-6 py-6">
                <Link
                    to={`/Events/${eventId}`}
                    className="inline-flex items-center gap-2 text-white/80 hover:underline"
                >
                    <ChevronLeft size={18} /> Back to event
                </Link>
                <h1 className="mt-3 text-2xl md:text-3xl font-extrabold text-white">
                    Edit “{evt?.title || "Untitled"}”
                </h1>
            </header>

            <main className="max-w-4xl mx-auto px-6 pb-16">
                <form
                    onSubmit={onSubmit}
                    className="bg-white/5 rounded-2xl ring-1 ring-white/10 p-6 text-white"
                >
                    <div className="grid gap-5">
                        <div>
                            <label className="block text-sm text-white/80 mb-1">Title *</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                maxLength={100}
                                className="w-full bg-transparent border border-white/20 rounded-md px-3 py-2 outline-none font-light"
                                placeholder="Event title"
                                required
                            />
                            <div className="mt-1 text-xs text-white/50">
                                {clamp(title.length, 0, 100)}/100
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm text-white/80 mb-1">Description</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={6}
                                maxLength={500}
                                className="w-full bg-transparent border border-white/20 rounded-md px-3 py-2 outline-none font-light"
                                placeholder="What’s this event about?"
                            />
                            <div className="mt-1 text-xs text-white/50">
                                {clamp(description.length, 0, 500)}/500
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm text-white/80 mb-1">Tag</label>
                            <input
                                type="text"
                                value={tag}
                                onChange={(e) => setTag(e.target.value)}
                                className="w-full bg-transparent border border-white/20 rounded-md px-3 py-2 outline-none font-light"
                                placeholder="e.g. workshop, talk, meetup"
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between">
                                <label className="block text-sm text-white/80">
                                    Sessions (date & time)
                                </label>
                                <button
                                    type="button"
                                    onClick={onAddSession}
                                    disabled={sessions.length >= 6}
                                    className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#77C042] text-black text-sm cursor-pointer disabled:opacity-60"
                                >
                                    <Plus size={16} /> Add session
                                </button>
                            </div>

                            <div className="mt-3 space-y-2">
                                {sessions.map((s, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center gap-3 bg-white/5 ring-1 ring-white/10 rounded-md px-3 py-2"
                                    >
                                        <Calendar size={16} className="text-white/60" />
                                        <input
                                            type="datetime-local"
                                            value={s}
                                            onChange={(e) => onChangeSession(i, e.target.value)}
                                            className="flex-1 bg-transparent outline-none font-light"
                                        />
                                        <button
                                            type="button"
                                            aria-label="Remove session"
                                            className="p-2 rounded-md hover:bg-white/10 cursor-pointer"
                                            onClick={() => onRemoveSession(i)}
                                            disabled={sessions.length <= 1}
                                            title="Remove"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-2 text-xs text-white/50">
                                You can add up to 6 sessions. Times are saved in UTC.
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex flex-wrap gap-3">
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-5 py-2 rounded-md bg-[#77C042] text-black font-semibold cursor-pointer disabled:opacity-60"
                        >
                            {saving ? "Saving…" : "Save changes"}
                        </button>
                        <Link
                            to={`/Events/${eventId}`}
                            className="px-5 py-2 rounded-md border border-white/20 text-white hover:bg-white/5"
                        >
                            Cancel
                        </Link>
                    </div>
                </form>
            </main>
        </div>
    );
}
