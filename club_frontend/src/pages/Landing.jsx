
import React, { useEffect, useMemo } from "react";
import { Button, Typography } from "@material-tailwind/react";
import { Link } from "react-router-dom";

import decoration1 from "../../public/decoration1.png";

import { useClubsStore } from "../store/clubs";
import ClubCard from "../components/ClubCard";
import EventCard from "../components/EventCard";

export default function MainPage() {
    const clubs = useClubsStore((s) => s.clubs);
    const events = useClubsStore((s) => s.events);
    const listClubs = useClubsStore((s) => s.listClubs);
    const listEvents = useClubsStore((s) => s.listEvents);
    const eventsLoading = useClubsStore((s) => s.loading.globalEvents);

    useEffect(() => {
        listClubs({});
        listEvents({});
    }, [listClubs, listEvents]);

    const getUniName = (c = {}) =>
        c.university?.name ||
        c.university?.title ||
        c.university_name ||
        c.university ||
        c.uni_name ||
        c.uni ||
        "";

    const firstEventDate = (ev = {}) => {
        const pick = (v) => (v ? new Date(v).getTime() : 0);
        if (Array.isArray(ev.date) && ev.date.length) return pick(ev.date[0]);
        if (typeof ev.date === "string") return pick(ev.date);
        return pick(ev.created_at) || pick(ev.published_at) || pick(ev.updated_at) || 0;
    };

    const uniShowcase = useMemo(() => {
        const map = new Map();
        for (const c of clubs) {
            const uni = String(getUniName(c)).trim();
            if (!uni) continue;
            if (!map.has(uni)) map.set(uni, c);
            if (map.size >= 9) break;
        }
        return Array.from(map.values()).slice(0, 9);
    }, [clubs]);

    const freshEvents = useMemo(() => {
        const copy = Array.isArray(events) ? [...events] : [];
        copy.sort((a, b) => firstEventDate(b) - firstEventDate(a));
        return copy.slice(0, 8);
    }, [events]);

    return (
        <div className="w-full min-h-screen">
            <section className="w-full h-full">
                <div
                    className=" w-full bg-[#282828] bg-no-repeat text-center h-screen bg-center flex items-center justify-center flex-col text-white z-0 bg-cover relative"
                    style={{ backgroundImage: "url('/showcase.png')" }}
                >
                    <h1
                        className="font-bold  text-5xl md:text-7xl  mb-2"
                        data-aos="fade-up"
                        data-aos-duration="2000"
                    >
                        Rediscover Yourself:
                    </h1>
                    <h2
                        className="lg:text-[40px] font-semibold sm:text-[30px] text-[20px] mb-2"
                        data-aos="fade-up"
                        data-aos-duration="3000"
                    >
                        Find Your Club, Find Your People!
                    </h2>
                    <Link to={"/Clubs"}>
                        <Button
                            variant="gradient"
                            size="sm"
                            data-aos="fade-up"
                            data-aos-duration="3000"
                            className="bg-cover hover:scale-90 hover:ease-in-out hover:transition-colors hover:duration-300  font-['Silkscreen'] px-6 py-4 cursor-pointer uppercase font-light text-xl text-[#77C042] bg-bottom rounded-none"
                            style={{ backgroundImage: "url('/form.png')" }}
                        >
                            Explore clubs
                        </Button>
                    </Link>
                </div>

                <img
                    src="/line.png"
                    className="absolute -bottom-18 left-[3%] md:w-[50vw] sm:w-[70vw] w-11/12"
                    alt=""
                />
                <img
                    src="/dots.png"
                    className="absolute -bottom-4 lg:right-[1%] lg:flex hidden  w-[10vw]"
                    alt=""
                />
                <img
                    src="/dots.png"
                    className="absolute -bottom-10 lg:right-[15%] md:right-[7%] md:flex hidden w-[11vw]"
                    alt=""
                />
            </section>
            <section className="  bg-[#282828] py-10 px-4">
                <Typography
                    variant="h6"
                    color="white"
                    className="text-center tracking-widest mb-6 font-['Silkscreen']"
                >
                    LIST OF UNIVERSITIES
                </Typography>

                <div className="flex flex-wrap justify-center gap-8 font-['Outfit']">
                    {uniShowcase.map((club) => (
                        <ClubCard key={club.id ?? club.pk ?? club.uuid} club={club} />
                    ))}
                </div>
            </section>
            <div
                className="bg-[#282828] bg-cover bg-no-repeat bg-center md:h-screen w-full flex xl:gap-20 gap-16 items-center justify-center py-10 relative z-0"
                style={{ backgroundImage: "url('/background2.png')" }}
            >
                <div className="md:w-[50%] w-10/12 flex flex-col gap-5">
                    <h2 className="text-[45px] font-semibold text-white font-['Outfit']">
                        Join the competition
                    </h2>
                    <p className="xl:text-xl md:text-[16px] text-lg md:w-auto text-white font-['Outfit'] font-extralight">
                        This platform was developed by Uzbekistan’s IT community to bring together
                        all university clubs across the city into one space. Whether you're into
                        technology, art, entrepreneurship, science, or volunteering — you'll find a
                        club that fits your passion. By participating in events, workshops, and
                        competitions organized through the platform, you can earn points, climb the
                        leaderboard, win exciting prizes, and bring recognition to your university.
                        The more active you are, the more you contribute to your campus ranking.
                        It’s more than just joining a club — it’s about discovering your potential,
                        building connections, and becoming part of something bigger. Explore.
                        Compete. Grow. Represent your university with pride!
                    </p>
                    <button
                        className="font-[Silkscreen] px-2 text-lime-500 py-3 text-lg bg-center bg-cover sm:w-6/12 xl:w-1/3 h-full relative"
                        style={{ backgroundImage: "url('/btn.png')" }}
                    >
                        <Link to="/Clubs">Explore clubs</Link>
                        <img
                            src="/dots3.png"
                            alt=""
                            className="absolute w-6 h-auto right-2 bottom-1"
                        />
                    </button>
                </div>
                <div className="xl:w-[20%] w-[35%] h-auto items-center justify-center md:flex hidden">
                    <img src="/img2.png" alt="Img2" className="lg:h-[450px] w-sm" />
                </div>
                <div className="absolute inset-0 pointer-events-none">
                    <img
                        src="/dots2.png"
                        alt="Dots_section2"
                        className="xl:w-[12vw] lg:w-[9vw] hidden lg:flex absolute xl:left-4 left-2 top-11 z-[9999]"
                    />
                    <img
                        src="/dots2.png"
                        alt="Dots_section2"
                        className="xl:w-[12vw] lg:w-[9vw] lg:flex hidden absolute xl:right-5 right-3 bottom-8 z-[9999]"
                    />
                </div>
            </div>
            <div className="px-6 py-10 bg-[#282828]">
                <Typography className="text-[#77C042] text-2xl font-bold mb-4 font-[Silkscreen] text-left">
                    View Our Events
                </Typography>
                <div className="flex justify-end mb-6">
                    <img src={decoration1} alt="Decoration" />
                </div>
                {eventsLoading ? (
                    <div className="text-center text-white">Loading events...</div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {freshEvents.map((ev) => (
                            <EventCard key={ev.id} event={ev} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
