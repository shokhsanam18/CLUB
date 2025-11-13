import React, { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useClubsStore } from "../store/clubs";
import { useAuthStore } from "../store/auth";
import {
    canManageClubs,
    canManageEventsInClub,
    canManageClubUI,
    canSeeJoinRequestsForClub,
} from "../lib/roles";
import EventCard from "../components/EventCard";
import JoinLeaveClubButton from "../components/JoinLeaveClubButton";
import ClubJoinRequestsPanel from "../components/ClubJoinRequestsPanel.jsx";
import { notify } from "../store/notify";

const formBtnBase =
    "inline-flex items-center justify-center px-5 py-2 rounded-none font-['Silkscreen'] tracking-wide bg-no-repeat bg-cover shadow-sm";
const formBgStyle = { backgroundImage: "url('/form.png')", backgroundSize: "cover" };
const formBtnGreen = `${formBtnBase} text-[#77C042]`;
const formBtnYellow = `${formBtnBase} text-[#eac75c]`;
const formBtnRed = `${formBtnBase} text-red-500`;

const FALLBACK_DATA_URL =
    "data:image/svg+xml;charset=utf-8," +
    encodeURIComponent(
        `<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256'>
       <rect width='100%' height='100%' fill='#2c2c2c'/>
       <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'
             fill='#9ca3af' font-family='Arial, Helvetica, sans-serif' font-size='20'>No Logo</text>
     </svg>`,
    );

const ONEClub = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const { user } = useAuthStore();
    // const access = useAuthStore((s) => s.tokens?.access);

    const clubsById = useClubsStore((s) => s.clubsById);
    const eventsByClub = useClubsStore((s) => s.eventsByClubId);
    const deleteEvent = useClubsStore((s) => s.deleteEvent);
    const loadingMap = useClubsStore((s) => s.loading.events);
    const errorMap = useClubsStore((s) => s.error.events);

    const club = clubsById[id];
    const events = eventsByClub[id] || [];
    const [, setStats] = useState(null);

    const canManageClub = canManageClubs(user);
    const deleteClub = useClubsStore((s) => s.deleteClub);

    const updateClub = useClubsStore((s) => s.updateClub);

    const initialLogo = club?.logo && String(club.logo).trim() ? club.logo : "/uni_logo.png";
    const [logoSrc, setLogoSrc] = useState(initialLogo);
    const [logoUploading, setLogoUploading] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        const next = club?.logo && String(club.logo).trim() ? club.logo : "/uni_logo.png";
        setLogoSrc(next);
    }, [club?.logo]);

    const handleLogoButtonClick = () => {
        if (!canManageClubHere) return;
        fileInputRef.current?.click();
    };

    const handleLogoFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setLogoUploading(true);
        try {
            const updated = await updateClub(id, { logo: file }, "patch");
            if (updated?.logo) {
                setLogoSrc(updated.logo);
            }
            notify.success("Logo updated");
        } catch (err) {
            console.error(err);
            notify.error("Failed to update logo");
        } finally {
            setLogoUploading(false);
            if (e.target) e.target.value = "";
        }
    };

    useEffect(() => {
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
    }, [id]);

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
    const canCreateOrManageEventsHere = canManageEventsInClub(user, club);
    const canManageClubHere = canManageClubUI(user, club);
    const canSeeJoinRequests = canSeeJoinRequestsForClub(user, club);

    const score = club?.club_points ?? club?.points ?? 0;

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
        deleteClub,
        navigate,
        desktop = false,
    }) {
        const sizeClasses = desktop
            ? "w-56 h-56"
            : "w-32 h-32 sm:w-40 sm:h-40 max-[359px]:w-28 max-[359px]:h-28";

        return (
            <div
                className={
                    desktop
                        ? "text-center max-w-2xl w-full"
                        : "text-center max-w-2xl w-full px-4 pt-24 sm:pt-28 pb-10"
                }
            >
                <div
                    className={`relative mx-auto ${sizeClasses}`}
                >
                    <div
                        className={`rounded-full overflow-hidden bg-black/20 ${
                            desktop ? "ring-4" : "ring-2"
                        } ring-white/30 w-full h-full`}
                    >
                        <img
                            src={logoSrc || "/uni_logo.png"}
                            alt={name}
                            className="w-full h-full object-cover"
                            onError={() =>
                                setLogoSrc((prev) =>
                                    prev === "/uni_logo.png" ? FALLBACK_DATA_URL : "/uni_logo.png",
                                )
                            }
                            draggable={false}
                        />
                    </div>

                    {canManageClubHere && (
                        <button
                            type="button"
                            onClick={handleLogoButtonClick}
                            disabled={logoUploading}
                            className="absolute z-10 -bottom-2 -right-2 rounded-full bg-black/70 hover:bg-black/90 text-white p-2 text-xs flex items-center justify-center shadow-lg"
                            title={logoUploading ? "Uploading logo…" : "Change logo"}
                        >
                            <span className="sr-only">Change logo</span>
                            {logoUploading ? (
                                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                        fill="none"
                                    />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8v4l3-3-3-3v4a10 10 0 00-10 10h2z"
                                    />
                                </svg>
                            ) : (
                                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M10 3l-4 4h3v4h2V7h3l-4-4z" />
                                    <path d="M4 14h12v2H4z" />
                                </svg>
                            )}
                        </button>
                    )}
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

                    {canCreateOrManageEventsHere && (
                        <Link
                            to={`/Clubs/${id}/events/new`}
                            className={`${formBtnGreen} ${desktop ? "" : "max-[359px]:text-[11px] px-4"}`}
                            style={formBgStyle}
                        >
                            Create Event
                        </Link>
                    )}

                    {canManageClubHere && (
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

    return (
        <div className="bg-[#222222] min-h-screen">
            <input
                type="file"
                ref={fileInputRef}
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleLogoFileChange}
            />
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
                                        // onClick={startRouteLoading}
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
                                                // onClick={startRouteLoading}
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

            {canSeeJoinRequests && <ClubJoinRequestsPanel clubId={id} />}

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
                            showActions={canCreateOrManageEventsHere}
                            onEdit={
                                canCreateOrManageEventsHere
                                    ? () => navigate(`/Events/${ev.id}`)
                                    : undefined
                            }
                            onDelete={
                                canCreateOrManageEventsHere
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
