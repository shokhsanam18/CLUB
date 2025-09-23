
import React, { useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { Heart, User } from "react-feather";
import { useClubsStore } from "../store/clubs";

function count(v) {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : 0;
}

export default function EventCard({ event, onEdit, onDelete, showActions = false }) {
    const id = event?.id;
    const enriched = useClubsStore((s) => (id ? s.eventsById[id] : null));

    useEffect(() => {
        if (!id) return;
        if (!(event?.description || enriched?.description)) {
            useClubsStore
                .getState()
                .getEvent(id)
                .catch(() => {});
        }
    }, [id, event?.description, enriched?.description]);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const data = enriched || event || {};
    const { title, description, cover, attendees, likes } = useMemo(() => {
        const title = data.title || data.name || "Untitled event";
        const description = (data.description || data.details || "").trim();
        const cover = data.cover || data.image || "/placeholder-event.png";
        const author = data.created_by_full_name || data.created_by || data.author || "";
        const attendees = count(data.registration_count || data.attendees_count);
        const likes = count(data.likes_count || data.favorites || data.reactions_count);
        return { title, description, cover, author, attendees, likes };
    }, [data]);

    const liked = likes > 0;

    return (
        <article className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 overflow-hidden flex flex-col">
            <Link to={`/Events/${id}`} className="block relative">
                <img
                    src={cover}
                    alt={title}
                    className="w-full h-48 object-cover transition-transform duration-300 hover:scale-[1.02]"
                    onError={(e) => (e.currentTarget.src = "/event-card.png")}
                />
            </Link>

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
                <div className="flex items-center gap-2 text-gray-700">
                    <Heart
                        size={18}
                        strokeWidth={1.8}
                        className={liked ? "text-rose-500" : "text-gray-400"}
                        fill={liked ? "currentColor" : "none"}
                        aria-hidden
                    />
                    <span className="text-sm">{likes}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-700">
                    <div className="flex items-center gap-2">
                        <User size={18} strokeWidth={1.8} className="text-gray-400" aria-hidden />
                        <span className="text-sm">{attendees}</span>
                    </div>
                </div>
            </div>

            {showActions && (onEdit || onDelete) ? (
                <div className="px-5 pb-5 flex gap-2">
                    {onEdit ? (
                        <button
                            className="px-3 py-1 text-xs bg-black text-white rounded-md cursor-pointer"
                            onClick={onEdit}
                        >
                            Edit
                        </button>
                    )}
                    {onDelete && (
                        <button
                            className="px-3 py-1 text-xs bg-red-600 text-white rounded"
                    ) : null}
                    {onDelete ? (
                        <button
                            className="px-3 py-1 text-xs bg-red-600 text-white rounded-md cursor-pointer"
                            onClick={onDelete}
                        >
                            Delete
                        </button>
                    )}
                </div>
            )}
        </div>
                    ) : null}
                </div>
            ) : null}
        </article>
    );
}
