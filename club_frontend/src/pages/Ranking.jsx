import React, { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useClubsStore } from "../store/clubs";

const PLACEHOLDER =
    "data:image/svg+xml;charset=utf-8," +
    encodeURIComponent(
        `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96'>
       <rect width='100%' height='100%' rx='999' fill='#77C042'/>
     </svg>`
    );

function ScoreRow({ rank, club }) {
    const name =
        club?.name || club?.title || club?.display_name || "Club Name";
    const id = club?.id ?? club?.pk ?? club?.uuid ?? null;
    const logo = (club?.logo && String(club.logo).trim()) || null;

    const points =
        Number(
            club?.club_points ??
            club?.points ??
            club?.score ??
            0
        ) || 0;

    return (
        <Link
            to={id ? `/Clubs/${id}` : "#"}
            className="group flex items-center w-full gap-4 py-4 px-4 sm:px-6 border-b border-white/10 hover:bg-white/[0.03] transition-colors"
        >
            <div className="w-8 text-white/80 font-semibold">{rank}</div>

            <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="h-10 w-10 rounded-full overflow-hidden ring-2 ring-white/10 shrink-0 bg-[#77C042]">
                    {logo ? (
                        <img
                            src={logo}
                            alt={name}
                            className="h-full w-full object-cover"
                            onError={(e) => (e.currentTarget.src = PLACEHOLDER)}
                        />
                    ) : (
                        <img src={PLACEHOLDER} alt="" className="h-full w-full" />
                    )}
                </div>
                <div className="truncate text-white text-base sm:text-lg">
                    {name}
                </div>
            </div>

            <div className="ml-auto text-[#77C042] font-['Silkscreen'] tracking-wide">
                {points.toLocaleString()}
            </div>
        </Link>
    );
}

export default function Ranking() {
    const clubs = useClubsStore((s) => s.clubs);
    const listClubs = useClubsStore((s) => s.listClubs);
    const loading = useClubsStore((s) => s.loading.list);
    const error = useClubsStore((s) => s.error.list);

    useEffect(() => {
        listClubs({ ordering: "-club_points" });
    }, [listClubs]);

    const ranked = useMemo(() => {
        const items = Array.isArray(clubs) ? [...clubs] : [];
        const score = (c) =>
            Number(c?.club_points ?? c?.points ?? c?.score ?? 0) || 0;
        items.sort((a, b) => score(b) - score(a));
        return items.map((c, i) => ({ ...c, _rank: i + 1 }));
    }, [clubs]);

    return (
        <div className="w-full min-h-screen bg-[#282828] font-['Outfit']">
            <section className="w-full h-full">
                <div
                    className=" w-full bg-[#282828] bg-no-repeat text-center h-screen bg-center flex items-center justify-center flex-col text-white z-0 bg-cover relative"
                    style={{ backgroundImage: "url('/showcase.png')" }}
                >
                    <h1 className="font-bold text-4xl md:text-6xl mb-1" data-aos="fade-up" data-aos-duration="1500">
                        Discover which club is
                    </h1>
                    <h2 className="font-bold text-5xl md:text-7xl" data-aos="fade-up" data-aos-duration="2200">
                        The Best!
                    </h2>
                </div>

                <img
                    src="/line.png"
                    className="absolute -bottom-18 left-[3%] md:w-[50vw] sm:w-[70vw] w-11/12"
                    alt=""
                    draggable={false}
                />
                <img
                    src="/dots.png"
                    className="absolute -bottom-1 lg:right-[1.5%] lg:flex hidden  w-[10vw]"
                    alt=""
                    draggable={false}
                />
                <img
                    src="/dots.png"
                    className="absolute -bottom-10 lg:right-[17%] md:right-[1%] md:flex hidden w-[11vw]"
                    alt=""
                    draggable={false}
                />
            </section>

            <div className="max-w-5xl mx-auto px-4">
                <div className="pt-10">
                    <h3 className="text-[#73C344] font-['Silkscreen'] tracking-[0.35em]">
                        RANKING
                    </h3>
                    <div
                        className="mt-3 h-2 w-full rounded-sm"
                        style={{
                            backgroundImage:
                                "repeating-linear-gradient(135deg,#77C042 0 14px,transparent 14px 28px)",
                        }}
                    />
                </div>
            </div>

            <section className="mt-6 pb-16">
                <div className="max-w-5xl mx-auto bg-[#1f1f1f] rounded-2xl ring-1 ring-white/10 overflow-hidden">
                    <div className="hidden sm:flex items-center px-6 py-3 bg-white/5 text-white/70 text-sm border-b border-white/10">
                        <div className="w-8">#</div>
                        <div className="flex-1">Club</div>
                        <div className="w-24 text-right">Score</div>
                    </div>

                    {loading && (
                        <div className="px-6 py-6 text-white/80">Loading ranking…</div>
                    )}

                    {error && !loading && (
                        <div className="px-6 py-6 text-red-400">{error}</div>
                    )}

                    {!loading && !error && ranked.length === 0 && (
                        <div className="px-6 py-6 text-white/70">No clubs yet.</div>
                    )}

                    {!loading &&
                        !error &&
                        ranked.map((c) => (
                            <ScoreRow key={c.id ?? c._rank} rank={c._rank} club={c} />
                        ))}
                </div>
            </section>
        </div>
    );
}
