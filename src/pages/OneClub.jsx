import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useClubsStore } from "../store/clubs";
import { useAuthStore } from "../store/auth";
import { ROLES, hasAnyRole } from "../lib/roles";
import RequireRole from "../components/RequireRole";
import EventCard from "../components/EventCard";
import JoinLeaveClubButton from "../components/JoinLeaveClubButton";

const ONEClub = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const { user } = useAuthStore();
    const access = useAuthStore((s) => s.tokens?.access);

    const clubsById = useClubsStore((s) => s.clubsById);
    const getClub = useClubsStore((s) => s.getClub);
    const getClubStats = useClubsStore((s) => s.getClubStats);
    const eventsByClub = useClubsStore((s) => s.eventsByClubId);
    const getClubEvents = useClubsStore((s) => s.getClubEvents);
    const deleteEvent = useClubsStore((s) => s.deleteEvent);
    const loadingMap = useClubsStore((s) => s.loading.events);
    const errorMap = useClubsStore((s) => s.error.events);

    const club = clubsById[id];
    const events = eventsByClub[id] || [];
    const [stats, setStats] = useState(null);

    const canManage = hasAnyRole(user, [ROLES.Ambassador, ROLES.Volunteer, ROLES.Superadmin]);

    useEffect(() => {
        if (!access) return;

        getClub(id, true);
        getClubEvents(id, {}, true);

        (async () => {
            try {
                const s = await getClubStats(id);
                if (s) setStats(s);
            } catch {
                setStats(null);
            }
        })();
    }, [id, access, getClub, getClubEvents, getClubStats]);

    const cover = club?.cover || club?.image || club?.logo || "/placeholder-club-wide.png";
    const name = club?.name || club?.title || "Club";
    const description = club?.description || club?.about || "";
    const isMember = !!club?.is_member;

    return (
        <div className="bg-[#222222] min-h-screen">
            <div
                className="flex items-center justify-center p-6 md:p-10 w-full min-h-[50vh]"
                style={{
                    backgroundImage: `url(${cover})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                }}
            >
                <div className="backdrop-blur-sm bg-black/40 rounded-xl p-6 md:p-8 max-w-3xl w-full text-center">
                    <h1 className="text-white text-3xl md:text-4xl font-bold">{name}</h1>
                    <p className="text-gray-200 mt-3">{description}</p>
                    <div className="mt-5 flex gap-3 justify-center">
                        <JoinLeaveClubButton clubId={id} isMember={isMember} />
                        <RequireRole roles={[ROLES.Ambassador, ROLES.Volunteer, ROLES.Superadmin]}>
                            <Link
                                to={`/Clubs/${id}/events/new`}
                                className="text-[#77C042] rounded-none px-4 py-2 font-['Silkscreen']"
                                style={{
                                    backgroundImage: "url('/form.png')",
                                    backgroundSize: "cover",
                                }}
                            >
                                Create Event
                            </Link>
                        </RequireRole>
                    </div>
                </div>
            </div>

            {stats && (
                <div className="max-w-4xl mx-auto p-6 text-white">
                    <h3 className="text-xl font-semibold mb-3">Club statistics</h3>
                    <pre className="bg-black/30 p-4 rounded-lg overflow-auto">
                        {JSON.stringify(stats, null, 2)}
                    </pre>
                </div>
            )}

            <div className="w-full p-6">
                <h2 className="text-white text-2xl font-bold mb-4 text-center">Events</h2>
                {loadingMap?.[id] && <p className="text-center text-white">Loading events…</p>}
                {errorMap?.[id] && <p className="text-center text-red-400">{errorMap[id]}</p>}

                <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {events.map((ev) => (
                        <EventCard
                            key={ev.id}
                            event={ev}
                            showActions={canManage}
                            onEdit={canManage ? () => navigate(`/Events/${ev.id}`) : undefined}
                            onDelete={
                                canManage
                                    ? async () => {
                                          if (confirm("Delete this event?"))
                                              await deleteEvent(ev.id);
                                      }
                                    : undefined
                            }
                        />
                    ))}
                </div>

                {!events.length && !loadingMap?.[id] && (
                    <p className="text-center text-gray-300 mt-6">No events yet.</p>
                )}
            </div>
        </div>
    );
};

export default ONEClub;
