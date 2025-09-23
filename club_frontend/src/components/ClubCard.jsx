import React from "react";
import { Link } from "react-router-dom";

export default function ClubCard({ club }) {
    const id = club.id ?? club.pk ?? club.uuid;
    const name = club.name || club.title || "Club name";
    const members = club.member_count ?? club.members_count ?? 100;
    const university = club.university || club.uni_name || "Uni name";
    const logo = club.logo || club.image || "/bg-club-image.png";

    return (
        <Link
            to={`/Clubs/${id}`}
            className="relative block w-full max-w-[360px] mx-auto"
            aria-label={name}
        >
            <img
                src="/bg-club-card.png"
                alt=""
                className="pointer-events-none select-none w-full h-auto"
            />

            <div className="absolute inset-0 px-8 pt-8 pb-6 flex flex-col">
                <div className="relative w-full aspect-[3/4]">
                    <img
                        src={logo}
                        alt={name}
                        onError={(e) => {
                            e.currentTarget.src = "/bg-club-image.png";
                        }}
                        className="absolute inset-0 w-full h-full object-cover shadow-md"
                        style={{
                            clipPath:
                                "polygon(0 0, calc(100% - 28px) 0, 100% 28px, 100% 100%, 28px 100%, 0 calc(100% - 28px))",
                        }}
                    />
                </div>

                <div className="mt-3">
                    <div className="text-white text-[18px] font-semibold leading-none">{name}</div>
                    <div className="mt-1 flex items-center gap-3 text-[10px] text-white/90">
                        <div className="flex items-center gap-1">
                            <span className="inline-block w-3 h-3 rounded-full bg-white/90" />
                            <span>{members} members</span>
                        </div>
                        <span className="opacity-80 ">{university}</span>
                    </div>
                </div>
            </div>
        </Link>
    );
}
