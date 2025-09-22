import React from "react";
import { Link } from "react-router-dom";
import { Heart, User } from "react-feather";

function timeAgo(value) {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    const diff = Math.max(0, Date.now() - d.getTime());
    const s = Math.floor(diff / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} hours ago`;
    const dys = Math.floor(h / 24);
    if (dys < 7) return `${dys} days ago`;
    return d.toLocaleDateString();
}

function count(val) {
    const n = Number(val);
    return Number.isFinite(n) && n > 0 ? n : 0;
}

export default function EventCard({ event, onEdit, onDelete, showActions = false }) {
    const id = event.id;
    const title = event.title || event.name || "Untitled event";
    const description = event.description || event.details || "";
    const cover = event.cover || event.image || "/placeholder-event.png";

    const author = event.created_by_full_name || event.created_by || event.author || "";
    const attendees = count(event.registration_count || event.attendees_count);
    const likes = count(event.likes_count || event.favorites || event.reactions_count);

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

                <p className="mt-2 text-gray-700 leading-relaxed line-clamp-5">{description}</p>

                <div className="mt-4 text-sm text-gray-500 flex flex-wrap gap-x-3 gap-y-1 items-center">
                    {author ? <span className="text-gray-400">•</span> : null}
                    {author ? <span>by {author}</span> : null}
                </div>
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
                            className="px-3 py-1 text-xs bg-black text-white rounded-md"
                            onClick={onEdit}
                        >
                            Edit
                        </button>
                    ) : null}
                    {onDelete ? (
                        <button
                            className="px-3 py-1 text-xs bg-red-600 text-white rounded-md"
                            onClick={onDelete}
                        >
                            Delete
                        </button>
                    ) : null}
                </div>
            ) : null}
        </article>
    );
}
