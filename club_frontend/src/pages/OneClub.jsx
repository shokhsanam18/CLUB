import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useClubsStore } from "../store/clubs";
import { useAuthStore } from "../store/auth";
import { ROLES, hasAnyRole, canManageClubs } from "../lib/roles";
import RequireRole from "../components/RequireRole";
import EventCard from "../components/EventCard";
import JoinLeaveClubButton from "../components/JoinLeaveClubButton";
import ClubJoinRequestsPanel from "../components/ClubJoinRequestsPanel.jsx";
import { useUiStore } from "../store/ui.js";

const formBtnBase =
    "inline-flex items-center justify-center px-5 py-2 rounded-none font-['Silkscreen'] tracking-wide bg-no-repeat bg-cover shadow-sm";
const formBgStyle = { backgroundImage: "url('/form.png')", backgroundSize: "cover" };
const formBtnGreen = `${formBtnBase} text-[#77C042]`;
const formBtnYellow = `${formBtnBase} text-[#eac75c]`;
const formBtnRed = `${formBtnBase} text-red-500`;

const PLACEHOLDER = "/placeholder-club.png";
const FALLBACK_DATA_URL =
    "data:image/svg+xml;charset=utf-8," +
    encodeURIComponent(
        `<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256'>
       <rect width='100%' height='100%' fill='#2c2c2c'/>
       <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'
             fill='#9ca3af' font-family='Arial, Helvetica, sans-serif' font-size='20'>No Logo</text>
     </svg>`,
    );

function HeroContent({
    formBtnGreen,
    formBtnYellow,
    formBtnRed,
    formBgStyle,
    logoSrc,
    setLogoSrc,
    name,
    description,
    score,
    id,
    isMember,
    canManageClub,
    deleteClub,
    navigate,
    desktop = false,
}) {
    return (
        <div
            className={
                desktop
                    ? "text-center max-w-2xl w-full"
                    : "text-center max-w-2xl w-full px-4 pt-24 sm:pt-28 pb-10"
            }
        >
            <div
                className={
                    "relative mx-auto rounded-full overflow-hidden bg-black/20 " +
                    (desktop
                        ? "ring-4 ring-white/30 w-56 h-56"
                        : "ring-2 ring-white/30 w-32 h-32 sm:w-40 sm:h-40 max-[359px]:w-28 max-[359px]:h-28")
                }
            >
                <img
                    src={logoSrc || PLACEHOLDER}
                    alt={name}
                    className="w-full h-full object-cover"
                    onError={() =>
                        setLogoSrc((prev) =>
                            prev === PLACEHOLDER ? FALLBACK_DATA_URL : PLACEHOLDER,
                        )
                    }
                    draggable={false}
                />
            </div>

            <div
                className={`${formBtnGreen} mt-4 mx-auto w-max ${desktop ? "" : "text-sm max-[359px]:text-[11px] px-4"}`}
                style={formBgStyle}
                aria-label="Club score"
            >
                {Number(score).toLocaleString()} score
            </div>

            <h1
                className={`text-white ${desktop ? "text-4xl" : "text-2xl sm:text-3xl"} font-bold mt-5`}
            >
                {name}
            </h1>
            {description && (
                <p
                    className={`text-white/90 mt-3 leading-relaxed font-['Outfit'] font-medium ${desktop ? "text-base" : "text-sm sm:text-base"}`}
                >
                    {description}
                </p>
            )}

            <div
                className={`mt-6 flex flex-wrap justify-center gap-3 ${desktop ? "" : "max-[359px]:gap-2"}`}
            >
                <JoinLeaveClubButton
                    clubId={id}
                    isMember={isMember}
                    className={`${formBtnGreen} ${desktop ? "" : "max-[359px]:text-[11px] px-4"}`}
                    style={formBgStyle}
                />

                <RequireRole roles={[ROLES.Ambassador, ROLES.Volunteer, ROLES.Superadmin]}>
                    <Link
                        to={`/Clubs/${id}/events/new`}
                        className={`${formBtnGreen} ${desktop ? "" : "max-[359px]:text-[11px] px-4"}`}
                        style={formBgStyle}
                    >
                        Create Event
                    </Link>
                </RequireRole>

                {canManageClub && (
                    <>
                        <Link
                            to={`/Clubs/${id}/edit`}
                            className={`${formBtnYellow} ${desktop ? "" : "max-[359px]:text-[11px] px-4"}`}
                            style={formBgStyle}
                        >
                            Edit Club
                        </Link>

                        <button
                            className={`${formBtnRed} ${desktop ? "" : "max-[359px]:text-[11px] px-4"}`}
                            style={formBgStyle}
                            onClick={async () => {
                                if (!confirm("Delete this club?")) return;
                                await deleteClub(id);
                                navigate("/Clubs");
                            }}
                        >
                            Delete Club
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

const ONEClub = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const { user } = useAuthStore();
    const access = useAuthStore((s) => s.tokens?.access);

    const clubsById = useClubsStore((s) => s.clubsById);
    const eventsByClub = useClubsStore((s) => s.eventsByClubId);
    const deleteEvent = useClubsStore((s) => s.deleteEvent);
    const loadingMap = useClubsStore((s) => s.loading.events);
    const errorMap = useClubsStore((s) => s.error.events);
    const startRouteLoading = useUiStore((s) => s.startRouteLoading);

    const club = clubsById[id];
    const events = eventsByClub[id] || [];
    const [stats, setStats] = useState(null);

    const canManage = hasAnyRole(user, [ROLES.Ambassador, ROLES.Volunteer, ROLES.Superadmin]);
    const canManageClub = canManageClubs(user);
    const deleteClub = useClubsStore((s) => s.deleteClub);

    const initialLogo = club?.logo && String(club.logo).trim() ? club.logo : PLACEHOLDER;
    const [logoSrc, setLogoSrc] = useState(initialLogo);
    useEffect(() => {
        const next = club?.logo && String(club.logo).trim() ? club.logo : PLACEHOLDER;
        setLogoSrc(next);
    }, [club?.logo]);

    useEffect(() => {
        if (!access) return;

        const { getClub, getClubEvents, getClubStats } = useClubsStore.getState();

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
    }, [id, access]);

    const name = club?.name || club?.title || "Club Name";
    const description = club?.description || club?.about || "";
    const isMember = Boolean(
        club?.is_member ??
            (Array.isArray(club?.members) &&
                club.members.some(
                    (m) =>
                        String(m?.id) === String(user?.id) ||
                        (m?.username && m.username === user?.username),
                )),
    );
    const score = club?.club_points ?? club?.points ?? 0;

    return (
        <div className="bg-[#222222] min-h-screen">
            <section className="relative">
                <div className="hidden md:block relative">
                    <img
                        src="/bgclub.png"
                        alt="Club hero"
                        className="w-full select-none"
                        draggable={false}
                    />
                    <div className="absolute inset-0 flex items-center justify-center px-4">
                        <HeroContent
                            formBtnGreen={formBtnGreen}
                            formBtnYellow={formBtnYellow}
                            formBtnRed={formBtnRed}
                            formBgStyle={formBgStyle}
                            logoSrc={logoSrc}
                            setLogoSrc={setLogoSrc}
                            name={name}
                            description={description}
                            score={score}
                            id={id}
                            isMember={isMember}
                            canManageClub={canManageClub}
                            deleteClub={deleteClub}
                            navigate={navigate}
                            desktop
                        />
                    </div>
                </div>

                <div className="md:hidden relative">
                    <div className="absolute inset-0 bg-[url('/bgclub.png')] bg-cover bg-center" />
                    <div className="absolute inset-0 bg-black/55" />
                    <div className="relative">
                        <HeroContent
                            formBtnGreen={formBtnGreen}
                            formBtnYellow={formBtnYellow}
                            formBtnRed={formBtnRed}
                            formBgStyle={formBgStyle}
                            logoSrc={logoSrc}
                            setLogoSrc={setLogoSrc}
                            name={name}
                            description={description}
                            score={score}
                            id={id}
                            isMember={isMember}
                            canManageClub={canManageClub}
                            deleteClub={deleteClub}
                            navigate={navigate}
                        />
                    </div>
                </div>
            </section>

            <section className="py-8 sm:py-10 md:py-12 bg-[#282828] font-['Outfit']">
                <div className="max-w-6xl mx-auto px-4 text-white">
                    <h3 className="text-lg sm:text-xl font-semibold mb-6 font-['Outfit']">
                        Members
                    </h3>
                    {Array.isArray(club?.members) && club.members.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
                            {club.members.map((m) => {
                                const initials =
                                    (m?.first_name?.[0] || "") + (m?.last_name?.[0] || "");
                                const fullName =
                                    [m?.first_name, m?.last_name].filter(Boolean).join(" ") ||
                                    m?.username ||
                                    "Member";
                                const role = m?.role || "Member";

                                const avatarCircle = (
                                    <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 mx-auto rounded-full bg-white/20 flex items-center justify-center text-xl sm:text-2xl font-semibold">
                                        {initials || "👤"}
                                    </div>
                                );

                                const nameEl = Number.isFinite(+m?.id) ? (
                                    <Link
                                        to={`/Accounts/${m.id}`}
                                        className="mt-3 font-semibold hover:underline block"
                                        onClick={startRouteLoading}
                                    >
                                        {fullName}
                                    </Link>
                                ) : (
                                    <div className="mt-3 font-semibold">{fullName}</div>
                                );

                                return (
                                    <div key={m?.id || fullName} className="text-center">
                                        {Number.isFinite(+m?.id) ? (
                                            <Link
                                                to={`/Accounts/${m.id}`}
                                                className="block"
                                                onClick={startRouteLoading}
                                            >
                                                {avatarCircle}
                                            </Link>
                                        ) : (
                                            avatarCircle
                                        )}
                                        {nameEl}
                                        <div className="text-white/80">{role}</div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
                            {[0, 1, 2].map((i) => (
                                <div key={i} className="text-center opacity-80">
                                    <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 mx-auto rounded-full bg-white/10" />
                                    <div className="mt-3 font-semibold">—</div>
                                    <div className="text-white/60">No members listed</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {canManage && (
                <RequireRole roles={[ROLES.Ambassador, ROLES.Superadmin]}>
                    <ClubJoinRequestsPanel clubId={id} />
                </RequireRole>
            )}

            <section className="w-full p-4 sm:p-6 font-['Outfit']">
                <div className="max-w-6xl mx-auto p-4 my-6">
                    <div className="flex items-center gap-4 justify-center sm:justify-start">
                        <h3 className="text-[#73C344] font-['Silkscreen'] tracking-wider">
                            VIEW OUR EVENTS
                        </h3>
                    </div>
                    <img
                        src="/decoration1.png"
                        alt=""
                        className="mt-2 w-48 sm:w-80 pointer-events-none select-none mx-auto sm:mx-0"
                        draggable={false}
                    />
                </div>

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
                {loadingMap?.[id] && <p className="text-center text-white mt-6">Loading events…</p>}
                {errorMap?.[id] && <p className="text-center text-red-400 mt-6">{errorMap[id]}</p>}
            </section>
        </div>
    );
};

export default ONEClub;
