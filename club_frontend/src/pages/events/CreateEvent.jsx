import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useClubsStore } from "../../store/clubs";
import { useAuthStore } from "../../store/auth";
import { ROLES, hasAnyRole } from "../../lib/roles";

function toApiDateTime(value) {
    if (!value) return "";

    const raw = String(value).trim();

    const m1 = raw.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (m1) {
        const [, Y, M, D, h, m, s = "00"] = m1;
        const local = new Date(
            Number(Y),
            Number(M) - 1,
            Number(D),
            Number(h),
            Number(m),
            Number(s),
        );
        if (Number.isNaN(local.getTime())) return "";
        const offMin = -local.getTimezoneOffset();
        const sign = offMin >= 0 ? "+" : "-";
        const pad2 = (n) => String(Math.abs(n)).padStart(2, "0");
        const offH = pad2(Math.trunc(Math.abs(offMin) / 60));
        const offM = pad2(Math.abs(offMin) % 60);
        return `${Y}-${M}-${D}T${h}:${m}:${s}${sign}${offH}:${offM}`;
    }

    const m2 = raw.match(/^(\d{2})\.(\d{2})\.(\d{4})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (m2) {
        const [, d, m, y, hh, mm, ss = "00"] = m2;
        const local = new Date(
            Number(y),
            Number(m) - 1,
            Number(d),
            Number(hh),
            Number(mm),
            Number(ss),
        );
        if (Number.isNaN(local.getTime())) return "";
        const offMin = -local.getTimezoneOffset();
        const sign = offMin >= 0 ? "+" : "-";
        const pad2 = (n) => String(Math.abs(n)).padStart(2, "0");
        const offH = pad2(Math.trunc(Math.abs(offMin) / 60));
        const offM = pad2(Math.abs(offMin) % 60);
        return `${y}-${m}-${d}T${hh}:${mm}:${ss}${sign}${offH}:${offM}`;
    }

    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) {
        return d.toISOString().replace(/\.\d{3}Z$/, "Z");
    }

    return "";
}

export default function CreateEvent() {
    const { id: clubIdParam } = useParams();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const canManageGlobally = hasAnyRole(user, [
        ROLES.Ambassador,
        ROLES.Volunteer,
        ROLES.Superadmin,
    ]);

    const clubId = Number(clubIdParam);
    const [form, setForm] = useState({
        title: "",
        description: "",
        tag: "",
        date: [""],
    });
    const [submitting, setSubmitting] = useState(false);
    const [err, setErr] = useState(null);
    const [permErr, setPermErr] = useState("");

    if (!canManageGlobally) {
        return (
            <div className="max-w-xl mx-auto p-6">
                <p className="text-red-600">You don’t have permission to create events.</p>
                <Link to={`/Clubs/${clubIdParam}`} className="text-blue-600 underline">
                    Back
                </Link>
            </div>
        );
    }

    const onField = (e) => {
        const { name, value } = e.target;
        setForm((s) => ({ ...s, [name]: value }));
    };

    const onDateChange = (idx, val) => {
        setForm((s) => {
            const next = [...s.date];
            next[idx] = val;
            return { ...s, date: next };
        });
    };

    const addDate = () => {
        setForm((s) => (s.date.length >= 6 ? s : { ...s, date: [...s.date, ""] }));
    };
    const removeDate = (idx) => {
        setForm((s) => ({ ...s, date: s.date.filter((_, i) => i !== idx) }));
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setErr(null);
        setPermErr("");

        try {
            if (!Number.isFinite(clubId) || clubId <= 0) {
                throw new Error("Invalid club id.");
            }

            const normalized = form.date
                .map((d) => toApiDateTime(d))
                .filter(Boolean)
                .slice(0, 6);

            const dateField =
                normalized.length === 0
                    ? undefined
                    : normalized.length === 1
                      ? normalized[0]
                      : normalized;

            const payload = {
                club: clubId,
                title: form.title,
                description: form.description,
                tag: form.tag || undefined,
                date: dateField,
            };

            const { createEvent } = useClubsStore.getState();
            const created = await createEvent(payload);
            navigate(`/Events/${created.id}`);
        } catch (e2) {
            const data = e2?.response?.data;
            if (data?.club) setPermErr(String(data.club));
            setErr(data ? JSON.stringify(data) : String(e2.message));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#1F1F1F] font-['Outfit']">
            <div className="mx-auto max-w-4xl px-6 py-10">
                <h1 className="sr-only">Create Event</h1>

                <form
                    onSubmit={onSubmit}
                    className="bg-[#262626] rounded-xl ring-1 ring-white/10 overflow-hidden"
                >
                    <div className="border-b border-white/10">
                        <input
                            name="title"
                            value={form.title}
                            onChange={onField}
                            placeholder="Name of the event …"
                            className="w-full bg-transparent text-white placeholder-gray-400 px-5 py-5 text-lg outline-none"
                            required
                            maxLength={100}
                        />
                    </div>

                    <div className="border-b border-white/10">
                        <textarea
                            name="description"
                            value={form.description}
                            onChange={onField}
                            placeholder="Text…"
                            rows={10}
                            className="w-full bg-transparent text-white placeholder-gray-400 px-5 py-5 outline-none resize-y"
                            maxLength={500}
                        />
                    </div>

                    <div className="px-6 py-5 grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="block text-sm text-gray-300 mb-2">Tag</label>
                            <input
                                name="tag"
                                list="event-tag-options"
                                value={form.tag}
                                onChange={onField}
                                className="w-full bg-transparent border border-white/20 rounded-md px-3 py-2 text-white placeholder-gray-400"
                                placeholder="e.g. discussion"
                            />
                            <datalist id="event-tag-options">
                                <option value="discussion" />
                                <option value="workshop" />
                                <option value="hackathon" />
                                <option value="movie_screening" />
                                <option value="quiz" />
                                <option value="presentation" />
                            </datalist>
                        </div>
                    </div>

                    <div className="px-6 pb-6">
                        <label className="block text-sm text-gray-300 mb-2">
                            Date & time (up to 6)
                        </label>
                        <div className="space-y-3">
                            {form.date.map((d, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <input
                                        type="datetime-local"
                                        value={d}
                                        onChange={(e) => onDateChange(i, e.target.value)}
                                        className="bg-transparent border border-white/20 rounded-md px-3 py-2 text-white"
                                        step="1"
                                        placeholder="YYYY-MM-DDTHH:mm"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeDate(i)}
                                        className="px-3 py-2 bg-red-600 text-white rounded cursor-pointer"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                            {form.date.length < 6 && (
                                <button
                                    type="button"
                                    onClick={addDate}
                                    className="px-4 py-2 bg-black text-white rounded cursor-pointer"
                                >
                                    + Add another time
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="px-6 pb-8 text-center">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-8 py-2 bg-[#77C042] text-white font-semibold rounded-md hover:bg-[#67b539] disabled:opacity-50 cursor-pointer"
                        >
                            {submitting ? "Posting…" : "Post"}
                        </button>
                        {err && <p className="mt-3 text-red-400 text-sm">{err}</p>}
                        {permErr && (
                            <p className="mt-1 text-red-500 text-sm">
                                You don’t have permission to create events for this club. Make sure
                                you’re a manager/volunteer of this club, or ask a club admin to
                                grant you permissions.
                            </p>
                        )}
                    </div>
                </form>

                <div className="mt-6 text-center">
                    <Link to={`/Clubs/${clubIdParam}`} className="text-white/80 hover:underline">
                        Back to club
                    </Link>
                </div>
            </div>
        </div>
    );
}
