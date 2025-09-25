import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useClubsStore } from "../../store/clubs";
import { useAuthStore } from "../../store/auth";
import { ROLES, hasAnyRole, canViewEventReports, canAddEventReport } from "../../lib/roles";
import {
    Heart,
    User,
    Calendar,
    CheckCircle,
    XCircle,
    Clock,
    BarChart2,
    FileText,
    Users,
} from "react-feather";
import { notify, formatError } from "../../store/notify";
import { useReportsStore } from "../../store/reports.js";

const fmtDT = (v) => {
    if (!v) return "";
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString();
};
const fmtD = (v) => {
    if (!v) return "";
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString();
};
const n = (v) => (Number.isFinite(+v) && +v > 0 ? +v : 0);

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

function StatusPill({ value }) {
    if (value === true) {
        return (
            <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium bg-green-500/15 text-green-400 ring-1 ring-green-500/20">
                <CheckCircle size={14} /> Attended
            </span>
        );
    }
    if (value === false) {
        return (
            <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium bg-red-500/15 text-red-400 ring-1 ring-red-500/20">
                <XCircle size={14} /> Absent
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium bg-yellow-500/15 text-yellow-300 ring-1 ring-yellow-500/20">
            <Clock size={14} /> Registered
        </span>
    );
}

function KpiCard({ icon: Icon, label, value, hint }) {
    return (
        <div className="rounded-xl bg-white/5 ring-1 ring-white/10 p-4">
            <div className="flex items-center gap-2 text-white/70 text-xs uppercase tracking-wide">
                {Icon ? <Icon size={16} className="text-white/60" /> : null}
                <span>{label}</span>
            </div>
            <div className="mt-1 text-2xl font-semibold text-white">{value}</div>
            {hint ? <div className="mt-1 text-xs text-white/60">{hint}</div> : null}
        </div>
    );
}

function BoolPill({ ok, trueText, falseText }) {
    if (ok) {
        return (
            <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium bg-green-500/15 text-green-400 ring-1 ring-green-500/20">
                <CheckCircle size={14} /> {trueText}
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium bg-yellow-500/15 text-yellow-300 ring-1 ring-yellow-500/20">
            <Clock size={14} /> {falseText}
        </span>
    );
}

function ProgressBar({ value = 0 }) {
    const v = Math.max(0, Math.min(100, Number(value) || 0));
    return (
        <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
            <div
                className="h-full bg-[#77C042]"
                style={{ width: `${v}%` }}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={v}
            />
        </div>
    );
}

export default function EventDetails() {
    const { id } = useParams();
    const eventId = Number(id);

    const { user } = useAuthStore();
    const isAmbassador = hasAnyRole(user, [ROLES.Ambassador, ROLES.Superadmin]);

    const getEvent = useClubsStore((s) => s.getEvent);
    const getEventRegistrations = useClubsStore((s) => s.getEventRegistrations);
    const getEventStatistics = useClubsStore((s) => s.getEventStatistics);
    const getMyRegistrationForEvent = useClubsStore((s) => s.getMyRegistrationForEvent);
    const registerForEvent = useClubsStore((s) => s.registerForEvent);
    const unregisterFromEvent = useClubsStore((s) => s.unregisterFromEvent);
    const updateAttendance = useClubsStore((s) => s.updateAttendance);

    const [evt, setEvt] = useState(null);
    const [regs, setRegs] = useState([]);
    const [stats, setStats] = useState(null);
    const [myReg, setMyReg] = useState(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState(null);
    const [selected, setSelected] = useState({});
    const [submitting, setSubmitting] = useState(false);

    const listReports = useReportsStore((s) => s.listReports);
    const createReport = useReportsStore((s) => s.createReport);
    const updateReport = useReportsStore((s) => s.updateReport);
    const getReportAttendanceData = useReportsStore((s) => s.getReportAttendanceData);
    const [report, setReport] = useState(null);
    const [reportLoading, setReportLoading] = useState(true);
    const [reportErr, setReportErr] = useState(null);
    const [summary, setSummary] = useState("");
    const [attendanceBlob, setAttendanceBlob] = useState(null);
    const [savingReport, setSavingReport] = useState(false);

    const regDisplayName = (r) =>
        r?.display_name ||
        (typeof r?.user_fullname === "string" && r.user_fullname.trim()) ||
        (typeof r?.user_full_name === "string" && r.user_full_name.trim()) ||
        r?.user_username ||
        r?.user_email ||
        (r?.user != null ? String(r.user) : "—");

    const isCreator =
        String(evt?.created_by) === String(user?.id) ||
        String(evt?.created_by_id) === String(user?.id);

    const canManageEvent = Boolean(isAmbassador || isCreator);

    const refreshAdmin = async () => {
        if (!canManageEvent) return;
        setRegs(await getEventRegistrations(eventId, true));
        setStats(await getEventStatistics(eventId));
    };

    const refreshMine = async () => {
        const r = await getMyRegistrationForEvent(eventId, true);
        setMyReg(r || null);
    };

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const e = await getEvent(eventId, true);
                setEvt(e);

                await refreshMine();

                const createdBy = e?.created_by ?? e?.created_by_id;
                const allowed = isAmbassador || String(createdBy) === String(user?.id);
                if (allowed) {
                    setRegs(await getEventRegistrations(eventId, true));
                    setStats(await getEventStatistics(eventId));
                }
            } catch (er) {
                setErr(String(er?.message || er));
            } finally {
                setLoading(false);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [eventId, isAmbassador, user?.id]);

    useEffect(() => {
        setReport(null);
        setSummary("");
        setAttendanceBlob(null);
    }, [eventId]);

    useEffect(() => {
        (async () => {
            setReportLoading(true);
            setReportErr(null);
            try {
                const items = await listReports({ event: eventId });

                const own = Array.isArray(items)
                    ? items.filter((it) => Number(it?.event) === eventId)
                    : [];
                const first = own.length ? own[0] : null;

                setReport(first);
                setSummary(first?.summary || "");
                setAttendanceBlob(null);
            } catch (e) {
                setReportErr(String(e?.message || e));
            } finally {
                setReportLoading(false);
            }
        })();
    }, [eventId, listReports]);

    const canSeeReportPanel = canViewEventReports(user);
    const canSubmitReport = canAddEventReport(user);
    const canEditThisReport =
        report == null
            ? canSubmitReport
            : isAmbassador || String(report?.submitted_by) === String(user?.id);

    const onSaveReport = async (e) => {
        e.preventDefault();
        if (!canEditThisReport) return;
        const clean = String(summary || "").trim();
        if (!clean) return notify.info("Please enter a short summary (required).");
        setSavingReport(true);
        try {
            let saved;
            if (!report) {
                saved = await createReport({ event: eventId, summary: clean });
            } else {
                saved = await updateReport(report.id, { event: eventId, summary: clean }, "put");
            }
            setReport(saved);
            notify.success("Report saved");
        } catch (e2) {
            notify.error(formatError(e2, "Failed to save report"));
        } finally {
            setSavingReport(false);
        }
    };

    const onFetchAttendance = async () => {
        if (!report) return;
        try {
            const blob = await getReportAttendanceData(report.id);
            setAttendanceBlob(blob);
            notify.success("Attendance data loaded");
        } catch (e) {
            notify.error(formatError(e, "Failed to load attendance data"));
        }
    };

    if (loading) return <div className="p-6 text-center">Loading…</div>;
    if (!evt) return <div className="p-6 text-center text-red-500">Event not found</div>;
    // eslint-disable-next-line no-constant-binary-expression
    const cover = evt.cover || evt.image || "/event-banner.png" || "/placeholder-event.png";
    const title = evt.title || "Event";
    const createdAt = evt.created_at || evt.published_at || evt.date?.[0];
    const author = evt.created_by_full_name || evt.created_by || evt.author || "—";
    const clubName = evt.club_name || evt.club_title || "";
    const attendees = n(evt.registration_count || evt.attendees_count);
    const likes = n(evt.likes_count || evt.favorites || evt.reactions_count);
    const firstDate = Array.isArray(evt.date) && evt.date.length ? evt.date[0] : evt.date || null;
    const extraDates = Array.isArray(evt.date) && evt.date.length > 1 ? evt.date.slice(1) : [];
    const liked = likes > 0;

    const onRegister = async () => {
        setSubmitting(true);
        try {
            await registerForEvent(eventId);
            await Promise.all([refreshMine(), refreshAdmin()]);
            notify.success("Registered");
        } catch (e) {
            notify.error(formatError(e, "Failed to register"));
        } finally {
            setSubmitting(false);
        }
    };
    const onUnregister = async () => {
        setSubmitting(true);
        try {
            await unregisterFromEvent(eventId);
            await Promise.all([refreshMine(), refreshAdmin()]);
            notify.success("Unregistered");
        } catch (e) {
            notify.error(formatError(e, "Failed to unregister"));
        } finally {
            setSubmitting(false);
        }
    };

    const allSelected =
        !!(Array.isArray(regs) && regs.length) && regs.every((r) => !!selected[r.id]);

    const toggleSelectAll = (checked) => {
        if (!regs?.length) return;
        const map = {};
        if (checked) for (const r of regs) map[r.id] = true;
        setSelected(map);
    };

    const mark = async (attended) => {
        const pick = Object.entries(selected)
            .filter(([, v]) => v)
            .map(([k]) => Number(k));
        if (!pick.length) return notify.info("Select at least one registration.");
        try {
            await updateAttendance(eventId, { registrations: pick, attended });
            setSelected({});
            await refreshAdmin();
            notify.success("Attendance updated");
        } catch (e) {
            notify.error(formatError(e, "Failed to update attendance"));
        }
    };

    const selectedCount = Object.values(selected).filter(Boolean).length;

    return (
        <div className="bg-[#121212] min-h-screen font-['Outfit']">
            <header className="relative">
                <div className="relative h-[380px] md:h-[520px]">
                    <img
                        src={cover}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover"
                        onError={(e) => (e.currentTarget.src = "/placeholder-event.png")}
                    />
                    <div className="absolute inset-0 bg-black/55 md:bg-black/60" />
                    <div className="relative z-10 max-w-6xl mx-auto px-6 h-full flex flex-col justify-center">
                        <h1 className="text-white text-4xl md:text-6xl font-extrabold leading-tight">
                            {title}
                        </h1>

                        {firstDate && (
                            <div className="mt-3 inline-flex items-center gap-2 text-white/90">
                                <Calendar size={18} />
                                <span className="text-sm md:text-base">
                                    {fmtDT(firstDate)}
                                    {extraDates.length ? (
                                        <span className="opacity-80">
                                            {" "}
                                            (+{extraDates.length} more)
                                        </span>
                                    ) : null}
                                </span>
                            </div>
                        )}

                        <div className="mt-6 flex flex-wrap items-center gap-6 text-white">
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-full bg-white/90 ring-2 ring-white/40" />
                                <div className="leading-tight">
                                    <div className="font-semibold">{author}</div>
                                    {clubName ? (
                                        <div className="text-white/80 text-sm">{clubName}</div>
                                    ) : null}
                                </div>
                            </div>

                            <div className="hidden sm:block h-8 w-px bg-white/30" />

                            <div>
                                <div className="uppercase text-xs text-white/75 tracking-wider">
                                    Published
                                </div>
                                <div className="text-sm font-medium">{fmtD(createdAt)}</div>
                            </div>

                            <div className="ml-auto flex items-center gap-6">
                                <div className="flex items-center gap-2">
                                    <Heart
                                        size={20}
                                        strokeWidth={1.8}
                                        className="text-white"
                                        fill={liked ? "currentColor" : "none"}
                                        aria-hidden
                                    />
                                    <span className="font-semibold">{likes}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <User
                                        size={20}
                                        strokeWidth={1.8}
                                        className="text-white"
                                        aria-hidden
                                    />
                                    <span className="font-semibold">{attendees}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <HeroSeam />
            </header>

            <main className="max-w-5xl mx-auto px-6 pb-16">
                {(firstDate || extraDates.length) && (
                    <div className="mt-6 grid sm:grid-cols-2 gap-4">
                        {firstDate && (
                            <div className="rounded-xl bg-white/5 ring-1 ring-white/10 px-4 py-3 text-white">
                                <div className="text-xs uppercase tracking-wide text-white/60">
                                    First session
                                </div>
                                <div className="mt-1 font-medium">{fmtDT(firstDate)}</div>
                            </div>
                        )}
                        {extraDates.length ? (
                            <div className="rounded-xl bg-white/5 ring-1 ring-white/10 px-4 py-3 text-white">
                                <div className="text-xs uppercase tracking-wide text-white/60">
                                    More times
                                </div>
                                <ul className="mt-1 space-y-1 list-disc pl-5">
                                    {extraDates.map((d, i) => (
                                        <li key={i}>{fmtDT(d)}</li>
                                    ))}
                                </ul>
                            </div>
                        ) : null}
                    </div>
                )}

                <article className="mt-6 text-white/90 leading-relaxed space-y-5">
                    {(evt.description || "")
                        .split(/\n{2,}/)
                        .filter(Boolean)
                        .map((p, i) => (
                            <p key={i}>{p}</p>
                        ))}
                </article>

                <div className="mt-10 flex items-center justify-center gap-3">
                    {myReg ? (
                        <button
                            onClick={onUnregister}
                            disabled={submitting}
                            className="px-10 py-3 rounded-full border border-white/25 text-white hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-60"
                        >
                            Unregister
                        </button>
                    ) : (
                        <button
                            onClick={onRegister}
                            disabled={submitting}
                            className="px-10 py-3 rounded-full bg-[#77C042] hover:bg-[#67b539] text-black font-semibold tracking-wide cursor-pointer transition-colors disabled:opacity-60"
                        >
                            REGISTER
                        </button>
                    )}
                </div>

                <div className="mt-10 text-center">
                    <Link
                        to={`/Clubs/${evt.club}`}
                        className="px-4 py-2 rounded-md bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                    >
                        Back to Club
                    </Link>
                    {"  "}
                    {canManageEvent && (
                        <Link
                            to={`/Events/${evt.id}/edit`}
                            className="px-4 py-2 rounded-md bg-white/10 hover:bg-white/20 text-[#eac75c] cursor-pointer"
                        >
                            Edit event
                        </Link>
                    )}
                </div>

                {canManageEvent && (
                    <div className="mt-12 space-y-8">
                        <section className="bg-white/5 rounded-2xl ring-1 ring-white/10 overflow-hidden">
                            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                                <h3 className="text-white text-lg font-semibold">Registrations</h3>
                                <div className="text-sm text-white/70">
                                    Selected: <span className="font-semibold">{selectedCount}</span>
                                </div>
                            </div>

                            <div className="px-6 py-4 text-white/90">
                                {!regs?.length ? (
                                    <div className="text-white/60">No registrations</div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full text-sm">
                                            <thead className="bg-white/5">
                                                <tr className="text-left">
                                                    <th className="px-3 py-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={allSelected}
                                                            onChange={(e) =>
                                                                toggleSelectAll(e.target.checked)
                                                            }
                                                            style={{ accentColor: "#77C042" }}
                                                        />
                                                    </th>
                                                    <th className="px-3 py-2">User</th>
                                                    <th className="px-3 py-2">Status</th>
                                                    <th className="px-3 py-2">Registered at</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/10">
                                                {regs.map((r) => (
                                                    <tr key={r.id || `${r.user}-${r.created_at}`}>
                                                        <td className="px-3 py-2">
                                                            <input
                                                                type="checkbox"
                                                                checked={!!selected[r.id]}
                                                                onChange={(e) =>
                                                                    setSelected((s) => ({
                                                                        ...s,
                                                                        [r.id]: e.target.checked,
                                                                    }))
                                                                }
                                                                style={{ accentColor: "#77C042" }}
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            {regDisplayName(r)}
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <StatusPill value={r.attended} />
                                                        </td>
                                                        <td className="px-3 py-2 text-white/70">
                                                            {r.created_at
                                                                ? fmtDT(r.created_at)
                                                                : "—"}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                <div className="mt-4 flex flex-wrap gap-2">
                                    <button
                                        onClick={() => mark(true)}
                                        className="px-4 py-2 bg-[#77C042] text-black rounded-md cursor-pointer disabled:opacity-60"
                                        disabled={!selectedCount}
                                    >
                                        Mark attended
                                    </button>
                                    <button
                                        onClick={() => mark(false)}
                                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-md cursor-pointer disabled:opacity-60"
                                        disabled={!selectedCount}
                                    >
                                        Mark absent
                                    </button>
                                    <button
                                        onClick={() => setSelected({})}
                                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-md cursor-pointer disabled:opacity-60"
                                        disabled={!selectedCount}
                                    >
                                        Clear selection
                                    </button>
                                </div>
                            </div>
                        </section>

                        <section className="bg-white/5 rounded-2xl ring-1 ring-white/10 overflow-hidden">
                            <div className="px-6 py-4 border-b border-white/10">
                                <h3 className="text-white text-lg font-semibold">Statistics</h3>
                            </div>
                            <div className="px-6 py-5 text-white/90">
                                {!stats ? (
                                    <div className="text-white/60 text-sm">No statistics yet.</div>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                            <KpiCard
                                                icon={Users}
                                                label="Total registrations"
                                                value={Number(stats.total_registrations ?? 0)}
                                            />
                                            <KpiCard
                                                icon={CheckCircle}
                                                label="Attended count"
                                                value={Number(stats.attended_count ?? 0)}
                                            />
                                            <div className="rounded-xl bg-white/5 ring-1 ring-white/10 p-4">
                                                <div className="flex items-center gap-2 text-white/70 text-xs uppercase tracking-wide">
                                                    <BarChart2
                                                        size={16}
                                                        className="text-white/60"
                                                    />
                                                    Attendance rate
                                                </div>
                                                <div className="mt-2">
                                                    <ProgressBar
                                                        value={stats.attendance_rate ?? 0}
                                                    />
                                                </div>
                                                <div className="mt-1 text-sm text-white/80 font-medium">
                                                    {Number(stats.attendance_rate ?? 0).toFixed(0)}%
                                                </div>
                                            </div>
                                            <div className="rounded-xl bg-white/5 ring-1 ring-white/10 p-4">
                                                <div className="flex items-center gap-2 text-white/70 text-xs uppercase tracking-wide">
                                                    <FileText size={16} className="text-white/60" />
                                                    Status
                                                </div>
                                                <div className="mt-2 flex flex-col gap-2">
                                                    <BoolPill
                                                        ok={Boolean(stats.has_ended)}
                                                        trueText="Ended"
                                                        falseText="Ongoing"
                                                    />
                                                    <BoolPill
                                                        ok={Boolean(stats.can_submit_report)}
                                                        trueText="Report allowed"
                                                        falseText="Report locked"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </section>
                    </div>
                )}

                {canSeeReportPanel && (
                    <section className="mt-12 bg-white/5 rounded-2xl ring-1 ring-white/10 overflow-hidden">
                        <div className="px-6 py-4 border-b border-white/10">
                            <h3 className="text-white text-lg font-semibold">Event report</h3>
                        </div>
                        <div className="px-6 py-5 text-white/90 space-y-4">
                            {reportLoading ? (
                                <div className="text-white/70">Loading…</div>
                            ) : (
                                <>
                                    <div className="text-sm text-white/70">
                                        {report ? (
                                            <>
                                                <div>
                                                    <span className="opacity-80">
                                                        Submitted by:
                                                    </span>{" "}
                                                    {report.submitted_by_username ||
                                                        report.submitted_by ||
                                                        "—"}
                                                </div>
                                                <div>
                                                    <span className="opacity-80">
                                                        Submitted at:
                                                    </span>{" "}
                                                    {report.submitted_at
                                                        ? new Date(
                                                              report.submitted_at,
                                                          ).toLocaleString()
                                                        : "—"}
                                                </div>
                                                <div>
                                                    <span className="opacity-80">
                                                        Participants attended:
                                                    </span>{" "}
                                                    {report.participants_attended ?? "—"}
                                                </div>
                                                {report.actual_attendance ? (
                                                    <div className="opacity-90">
                                                        <span className="opacity-80">
                                                            Actual attendance:
                                                        </span>{" "}
                                                        {report.actual_attendance}
                                                    </div>
                                                ) : null}
                                            </>
                                        ) : (
                                            <span className="opacity-80">
                                                No report yet for this event.
                                            </span>
                                        )}
                                    </div>

                                    <form onSubmit={onSaveReport} className="space-y-3">
                                        <label className="block text-sm text-white/80">
                                            Summary{" "}
                                            {canEditThisReport ? "(required)" : "(read only)"}
                                        </label>
                                        <textarea
                                            value={summary}
                                            onChange={(e) => setSummary(e.target.value)}
                                            maxLength={512}
                                            rows={5}
                                            disabled={!canEditThisReport}
                                            className="w-full bg-transparent border border-white/20 rounded-md px-3 py-2 outline-none text-white placeholder-white/40"
                                            placeholder="Key outcomes, highlights, challenges, next steps…"
                                        />
                                        {canEditThisReport && (
                                            <button
                                                type="submit"
                                                disabled={savingReport}
                                                className="px-5 py-2 rounded-md bg-[#77C042] text-black font-semibold cursor-pointer disabled:opacity-60"
                                            >
                                                {savingReport
                                                    ? "Saving…"
                                                    : report
                                                      ? "Update report"
                                                      : "Submit report"}
                                            </button>
                                        )}
                                    </form>

                                    {isAmbassador && report && (
                                        <div className="pt-3 border-t border-white/10">
                                            <button
                                                onClick={onFetchAttendance}
                                                className="px-4 py-2 bg-black text-white rounded-md cursor-pointer"
                                            >
                                                Get attendance data
                                            </button>

                                            {attendanceBlob && (
                                                <>
                                                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                        <div className="rounded-lg bg-white/10 px-3 py-2">
                                                            <div className="text-xs text-white/60">
                                                                Event title
                                                            </div>
                                                            <div className="text-sm font-medium truncate">
                                                                {attendanceBlob.event_title || "—"}
                                                            </div>
                                                        </div>
                                                        <div className="rounded-lg bg-white/10 px-3 py-2">
                                                            <div className="text-xs text-white/60">
                                                                Event date
                                                            </div>
                                                            <div className="text-sm font-medium">
                                                                {attendanceBlob.event_date
                                                                    ? fmtDT(
                                                                          attendanceBlob.event_date,
                                                                      )
                                                                    : "—"}
                                                            </div>
                                                        </div>
                                                        <div className="rounded-lg bg-white/10 px-3 py-2">
                                                            <div className="text-xs text-white/60">
                                                                Total regs
                                                            </div>
                                                            <div className="text-sm font-medium">
                                                                {attendanceBlob.total_registrations ??
                                                                    "—"}
                                                            </div>
                                                        </div>
                                                        <div className="rounded-lg bg-white/10 px-3 py-2">
                                                            <div className="text-xs text-white/60">
                                                                Total attended
                                                            </div>
                                                            <div className="text-sm font-medium">
                                                                {attendanceBlob.total_attended ??
                                                                    "—"}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {reportErr && <div className="text-red-400">{reportErr}</div>}
                                </>
                            )}
                        </div>
                    </section>
                )}

                {err && <p className="text-red-400 mt-4">{err}</p>}
            </main>
        </div>
    );
}
