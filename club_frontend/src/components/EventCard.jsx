import React, { useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Book } from "react-feather";
import { useClubsStore } from "../store/clubs";

function count(v) {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : 0;
}

export default function EventCard({ event, onEdit, onDelete, showActions = false }) {
    const id = event?.id;
    const enriched = useClubsStore((s) => (id ? s.eventsById[id] : null));
    const clubsById = useClubsStore((s) => s.clubsById);
    const navigate = useNavigate();

    useEffect(() => {
        if (!id) return;
        if (!(event?.description || enriched?.description)) {
            useClubsStore
                .getState()
                .getEvent(id)
                .catch(() => {});
        }
    }, [id, event?.description, enriched?.description]);

    useEffect(() => {
        const cid = event?.club ?? enriched?.club;
        const hasName =
            event?.club_name ||
            event?.club_title ||
            enriched?.club_name ||
            enriched?.club_title ||
            (cid && clubsById[cid]?.name);
        if (cid && !hasName) {
            useClubsStore
                .getState()
                .getClub(cid)
                .catch(() => {});
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [event?.club, enriched?.club]);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const data = enriched || event || {};
    const { title, description, cover, attendees, clubId, clubName } = useMemo(() => {
        const title = data.title || data.name || "Untitled event";
        const description = (data.description || data.details || "").trim();
        const cover = data.poster || data.cover || data.image;
        const attendees = count(data.registration_count || data.attendees_count);
        // const likes = count(data.likes_count || data.favorites || data.reactions_count);
        const clubId = data.club ?? data.club_id ?? null;
        const clubNameFromEvent = data.club_name || data.club_title || "";
        const clubNameFromStore =
            clubId && clubsById[clubId]
                ? clubsById[clubId].name || clubsById[clubId].title || ""
                : "";
        const clubName = clubNameFromEvent || clubNameFromStore;

        return { title, description, cover, attendees, clubId, clubName };
    }, [data, clubsById]);

    // const liked = likes > 0;

    return (
        <article className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 overflow-hidden flex flex-col">
            <div className="relative">
                {clubId && (
                    <Link
                        to={`/Clubs/${clubId}`}
                        className="absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                       text-white text-[11px] font-semibold tracking-wide bg-black/45 backdrop-blur-sm
                       outline outline-[#77C042]/60 hover:bg-black/55 transition"
                        title={clubName || `Club #${clubId}`}
                    >
                        <Book size={14} className="opacity-90" aria-hidden />
                        <span className="font-['Outfit']">{clubName || `Club #${clubId}`}</span>
                    </Link>
                )}

                <Link to={`/Events/${id}`} className="block">
                    <img
                        src={cover}
                        alt={title}
                        className="w-full h-48 object-cover transition-transform duration-300 hover:scale-[1.02]"
                        onError={(e) => (e.currentTarget.src = "/event-card.png")}
                    />
                </Link>
            </div>

            <div className="p-5 flex-1">
                <Link
                    to={`/Events/${id}`}
                    className="block text-xl font-semibold text-gray-900 hover:underline"
                    title={title}
                >
                    {title}
                </Link>

                {description && (
                    <p className="mt-2 text-gray-700 leading-relaxed line-clamp-3">{description}</p>
                )}
            </div>

            <div className="px-5 pb-4 flex items-center justify-between">
                {/*<div className="flex items-center gap-2 text-gray-700">*/}
                {/*    <Heart*/}
                {/*        size={18}*/}
                {/*        strokeWidth={1.8}*/}
                {/*        className={liked ? "text-rose-500" : "text-gray-400"}*/}
                {/*        fill={liked ? "currentColor" : "none"}*/}
                {/*        aria-hidden*/}
                {/*    />*/}
                {/*    <span className="text-sm">{likes}</span>*/}
                {/*</div>*/}
                <div className="flex items-center gap-3 text-gray-700">
                    <div className="flex items-center gap-2">
                        <User size={18} strokeWidth={1.8} className="text-gray-400" aria-hidden />
                        <span className="text-sm">{attendees}</span>
                    </div>
                </div>
            </div>

            {showActions && (onEdit || onDelete) && (
                <div className="px-5 pb-5 flex gap-2">
                    {onEdit && showActions && (
                        <button
                            type="button"
                            className="px-3 py-1 text-xs bg-black text-white rounded-md cursor-pointer"
                            onClick={() => navigate(`/Events/${id}/edit`)}
                        >
                            Edit
                        </button>
                    )}
                    {onDelete && (
                        <button
                            type="button"
                            className="px-3 py-1 text-xs bg-red-600 text-white rounded-md cursor-pointer"
                            onClick={onDelete}
                        >
                            Delete
                        </button>
                    )}
                </div>
            )}
        </article>
    );
}
