import React from "react";
import { Link } from "react-router-dom";

export default function ClubCard({ club }) {
    const id = club.id ?? club.pk ?? club.uuid;
    const name = club.name || club.title || "Untitled club";
    const description = club.description || club.about || "";
    const logo = club.logo || club.image || "/placeholder-club.jpg";
    const score = club.score ?? club.points ?? club.rating ?? 0;

    return (
        <Link
            to={`/Clubs/${id}`}
            className="block bg-white rounded-xl shadow hover:shadow-lg transition p-4"
        >
            <div className="flex items-center gap-4">
                <img
                    src={logo}
                    alt={name}
                    className="w-16 h-16 rounded-full object-cover border"
                    onError={(e) => {
                        e.currentTarget.src = "/placeholder-club.png";
                    }}
                />
                <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{name}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2">{description}</p>
                </div>
            </div>
            <div className="mt-3 text-xs text-gray-500">
                Score: {Number(score).toLocaleString()}
            </div>
        </Link>
    );
}
