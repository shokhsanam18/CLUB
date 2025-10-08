import React, { useEffect, useState } from "react";
import { useClubsStore } from "../store/clubs";
import ClubCard from "../components/ClubCard";
import { CAN_MANAGE_CLUBS, hasAnyRole } from "../lib/roles.js";
import { useAuthStore } from "../store/auth.js";
import { Link } from "react-router-dom";

export default function Clubs() {
    const clubs = useClubsStore((s) => s.clubs);
    const listClubs = useClubsStore((s) => s.listClubs);
    const isLoading = useClubsStore((s) => s.loading.list);
    const loadError = useClubsStore((s) => s.error.list);
    const { user, tokens } = useAuthStore();
    const isLoggedIn = Boolean(tokens?.access);
    const canOpenClub = hasAnyRole(user, CAN_MANAGE_CLUBS);
    const [showDenied, setShowDenied] = useState(false);

    useEffect(() => {
        listClubs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="bg-[#262626]">
            <section className="relative">
                <img
                    src="/clubs-background.png"
                    alt="Clubs hero"
                    className="hidden md:block w-full select-none"
                    draggable={false}
                />

                <div className="md:hidden relative h-[360px]">
                    <div className="absolute inset-0 bg-[url('/clubs-background.png')] bg-cover bg-center" />
                    <div className="absolute inset-0 bg-black/55" />
                </div>

                <div className="absolute inset-0 flex items-center">
                    <div className="font-['Outfit'] w-full max-w-[1100px] mx-auto px-4 md:px-6 text-center md:text-left flex flex-col items-center md:items-start">
                        <h1
                            className="text-white font-extrabold tracking-tight
                            text-[26px] leading-8 sm:text-4xl md:text-[64px] md:leading-[1.05]
                            drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)]
                            mx-auto md:mx-0"
                        >
                            Where Interests Become Communities
                        </h1>

                        <p
                            className="font-light text-white/95
                            text-sm sm:text-base md:text-2xl
                            max-w-[36rem] md:max-w-[980px]
                            mt-3 md:mt-6 leading-relaxed
                            drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)]
                            mx-auto md:mx-0"
                        >
                            This is your go-to hub for all active student clubs and organizations on
                            campus. Whether you&apos;re into arts, tech, leadership, culture, or
                            volunteering — there&apos;s a community waiting for you. Explore club
                            profiles, upcoming events, and how to get involved. Find your passion.
                            Build your network. Make your mark.
                        </p>
                    </div>
                </div>

                <img
                    src="/dots.png"
                    alt=""
                    className="pointer-events-none select-none absolute right-4 md:right-10 bottom-5 md:bottom-8 w-32 sm:w-40 md:w-56"
                    draggable={false}
                />
            </section>

            <section className="max-w-6xl mx-auto px-4 md:px-6 py-10 md:py-14">
                <h2 className="sr-only">Clubs list</h2>

                {isLoading && <p className="text-center text-white">Loading clubs…</p>}
                {loadError && <p className="text-center text-red-400">{loadError}</p>}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {clubs.map((c) => (
                        <ClubCard key={c.id ?? c.pk ?? c.uuid} club={c} />
                    ))}
                </div>
            </section>

            <section className="relative bg-[#77C042]">
                <div className="max-w-6xl mx-auto px-4 py-14 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                    <div className="text-center lg:text-left">
                        <h2 className="text-white text-2xl sm:text-3xl md:text-4xl font-extrabold font-['Outfit']">
                            Didn’t Find What You’re Looking For?
                            <br />
                            Create Your Own Club!
                        </h2>

                        <p className="text-white/90 mt-4 sm:mt-5 max-w-xl leading-relaxed mx-auto lg:mx-0 font-['Outfit']">
                            We’ve got a growing list of student clubs — but maybe none of them match
                            your interests or belong to your university. That’s okay! Every great
                            club starts with one person who saw something missing and decided to
                            create it. Start your own club and bring like-minded people together.
                        </p>

                        <div className="mt-6 sm:mt-8">
                            {canOpenClub ? (
                                <Link
                                    to="/Clubs/new"
                                    className="inline-block px-6 py-2 text-[#77C042] font-['Silkscreen'] mx-auto lg:mx-0"
                                    style={{
                                        backgroundImage: "url('/form.png')",
                                        backgroundSize: "cover",
                                    }}
                                >
                                    CREATE CLUB
                                </Link>
                            ) : !isLoggedIn ? (
                                <Link
                                    to="/Login"
                                    className="inline-block px-6 py-2 text-[#77C042] font-['Silkscreen'] mx-auto lg:mx-0"
                                    style={{
                                        backgroundImage: "url('/form.png')",
                                        backgroundSize: "cover",
                                    }}
                                >
                                    CREATE CLUB
                                </Link>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setShowDenied(true)}
                                    className="inline-block px-6 py-2 text-[#77C042] font-['Silkscreen'] mx-auto lg:mx-0 cursor-pointer"
                                    style={{
                                        backgroundImage: "url('/form.png')",
                                        backgroundSize: "cover",
                                    }}
                                >
                                    CREATE CLUB
                                </button>
                            )}
                        </div>

                        {showDenied && isLoggedIn && !canOpenClub && (
                            <div className="mt-4 rounded-2xl bg-[#1e1e1e] ring-1 ring-white/10 text-white p-4">
                                <div className="font-semibold">
                                    You don’t have permission to create a club
                                </div>
                                <p className="text-white/80 mt-1 text-sm">
                                    Only <span className="font-semibold">Ambassadors</span> can create clubs. 
                                    If you’d like to start one, contact your university ambassador.
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="relative h-[360px] md:h-[420px] hidden md:block">
                        <img
                            src="/clubs-start.png"
                            alt=""
                            className="absolute right-0 top-0 h-full w-auto"
                            style={{
                                clipPath:
                                    "polygon(0 0, 100% 0, 100% calc(100% - 44px), calc(100% - 44px) 100%, 0 100%, 0 0)",
                            }}
                        />
                    </div>
                </div>
            </section>
        </div>
    );
}
