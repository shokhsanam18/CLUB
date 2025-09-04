import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useClubsStore } from "../../store/clubs";
import { useAuthStore } from "../../store/auth";
import { ROLES, hasAnyRole } from "../../lib/roles";

export default function EventDetails() {
    const { id } = useParams();
    const { user } = useAuthStore();
    const getEvent = useClubsStore((s) => s.getEvent);
    const registerForEvent = useClubsStore((s) => s.registerForEvent);
    const unregisterFromEvent = useClubsStore((s) => s.unregisterFromEvent);
    const getEventRegistrations = useClubsStore((s) => s.getEventRegistrations);
    const getEventStatistics = useClubsStore((s) => s.getEventStatistics);
    const updateAttendance = useClubsStore((s) => s.updateAttendance);

    const [evt, setEvt] = useState(null);
    const [regs, setRegs] = useState(null);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState(null);
    const canManage = hasAnyRole(user, [ROLES.Ambassador, ROLES.Volunteer, ROLES.Superadmin]);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const e = await getEvent(id);
                setEvt(e);
                if (canManage) {
                    setRegs(await getEventRegistrations(id));
                    setStats(await getEventStatistics(id));
                }
            } catch (er) {
                setErr(String(er?.message || er));
            } finally {
                setLoading(false);
            }
        })();
    }, [id, getEvent, getEventRegistrations, getEventStatistics, canManage]);

    if (loading) return <div className="p-6 text-center">Loading…</div>;
    if (!evt) return <div className="p-6 text-center text-red-500">Event not found</div>;

    const onRegister = async () => {
        try {
            await registerForEvent(id);
            alert("Registered");
        } catch {
            alert("Failed");
        }
    };
    const onUnregister = async () => {
        try {
            await unregisterFromEvent(id);
            alert("Unregistered");
        } catch {
            alert("Failed");
        }
    };

    const onMarkAttendance = async () => {
        const body = { present: true };
        try {
            await updateAttendance(id, body);
            alert("Attendance marked");
        } catch {
            alert("Failed to update attendance");
        }
    };

    return (
        <div className="max-w-3xl mx-auto p-6">
            <Link className="text-blue-600 underline" to={`/Clubs/${evt.club}`}>
                Back to Club
            </Link>
            <h1 className="text-2xl font-bold mt-3">{evt.title || "Event"}</h1>
            <div className="text-gray-600 mt-1">{evt.start_time}</div>
            <div className="text-gray-600">{evt.location}</div>
            <img
                src={evt.cover || "/placeholder-event.png"}
                alt=""
                className="w-full h-64 object-cover rounded mt-4"
                onError={(e) => {
                    e.currentTarget.src = "/placeholder-event.png";
                }}
            />
            <p className="mt-4">{evt.description}</p>

            <div className="mt-6 flex gap-2">
                <button
                    onClick={onRegister}
                    className="px-4 py-2 bg-[#66cc33] text-white rounded cursor-pointer"
                >
                    Register
                </button>
                <button
                    onClick={onUnregister}
                    className="px-4 py-2 bg-red-600 text-white rounded cursor-pointer"
                >
                    Unregister
                </button>

                {canManage && (
                    <button
                        onClick={onMarkAttendance}
                        className="px-4 py-2 bg-black text-white rounded cursor-pointer"
                    >
                        Mark attendance
                    </button>
                )}
            </div>

            {canManage && (
                <>
                    <section className="mt-8">
                        <h3 className="font-semibold mb-2">Registrations</h3>
                        {!regs?.length ? (
                            <div className="text-gray-500">No registrations</div>
                        ) : (
                            <ul className="list-disc pl-6">
                                {regs.map((r) => (
                                    <li key={r.id || `${r.user}-${r.created_at}`}>
                                        {r.user_email || r.user || "User"} —{" "}
                                        {r.status || "registered"}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    <section className="mt-6">
                        <h3 className="font-semibold mb-2">Statistics</h3>
                        <pre className="bg-gray-100 p-3 rounded overflow-auto">
                            {JSON.stringify(stats, null, 2)}
                        </pre>
                    </section>
                </>
            )}

            {err && <p className="text-red-500 mt-4">{err}</p>}
        </div>
    );
}
