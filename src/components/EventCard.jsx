import React from "react";
import { Link } from "react-router-dom";

export default function EventCard({ event, onEdit, onDelete, showActions = false }) {
    const title = event.title || event.name || "Untitled event";
    const description = event.description || event.details || "";
    const cover = event.cover || event.image || "/placeholder-event.png";
    const when = event.start_time || event.start || event.date || null;
    const place = event.location || event.place || "";
    const id = event.id;

    return (
        <div className="bg-white rounded-lg shadow overflow-hidden flex flex-col">
            <Link to={`/Events/${id}`}>
                <img
                    src={cover}
                    alt={title}
                    className="w-full h-44 object-cover"
                    onError={(e) => {
                        e.currentTarget.src = "/placeholder-event.png";
                    }}
                />
            </Link>
            <div className="p-4 flex-1">
                <Link to={`/Events/${id}`} className="font-semibold text-gray-900 hover:underline">
                    {title}
                </Link>
                {when && <div className="text-xs text-gray-500 mt-1">{String(when)}</div>}
                {place && <div className="text-xs text-gray-500">{place}</div>}
                <p className="text-sm text-gray-700 mt-2 line-clamp-3">{description}</p>
            </div>
            {showActions && (onEdit || onDelete) && (
                <div className="px-4 pb-4 flex gap-2">
                    {onEdit && (
                        <button
                            className="px-3 py-1 text-xs bg-black text-white rounded"
                            onClick={onEdit}
                        >
                            Edit
                        </button>
                    )}
                    {onDelete && (
                        <button
                            className="px-3 py-1 text-xs bg-red-600 text-white rounded"
                            onClick={onDelete}
                        >
                            Delete
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
