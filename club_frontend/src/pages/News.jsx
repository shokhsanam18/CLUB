import React, { useEffect, useState } from "react";
import EventCard from "../components/EventCard";
import api from "../lib/api";

function CardSkeleton() {
    return (
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 overflow-hidden animate-pulse">
            <div className="w-full h-48 bg-gray-200" />
            <div className="p-5 space-y-3">
                <div className="h-5 bg-gray-200 rounded w-2/3" />
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-5/6" />
            </div>
            <div className="px-5 pb-5">
                <div className="h-4 bg-gray-200 rounded w-24" />
            </div>
        </div>
    );
}

const gridCls = "max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6";

const formBtnBase =
    "inline-flex items-center justify-center px-5 py-2 rounded-none font-['Silkscreen'] tracking-wide bg-no-repeat bg-cover shadow-sm";
const formBgStyle = { backgroundImage: "url('/form.png')", backgroundSize: "cover" };
const formBtnGreen = `${formBtnBase} text-[#77C042]`;

function toItems(data) {
    if (Array.isArray(data?.results)) return data.results;
    if (Array.isArray(data)) return data;
    return data?.items || [];
}

async function enrichEventsPage(items) {
    const toFetch = items.filter((it) => !it?.description && Number.isFinite(+it?.id)).slice(0, 12);

    if (!toFetch.length) return items;

    const details = await Promise.all(
        toFetch.map((it) =>
            api
                .get(`/events/${it.id}/`)
                .then((r) => r.data)
                .catch(() => null),
        ),
    );

    const byId = Object.fromEntries(details.filter(Boolean).map((d) => [d.id, d]));
    return items.map((it) => (byId[it.id] ? { ...it, ...byId[it.id] } : it));
}

export default function News() {
    const [items, setItems] = useState([]);
    const [page, setPage] = useState(1);
    const [hasNext, setHasNext] = useState(true);
    const [loading, setLoading] = useState(false);
    const [firstLoad, setFirstLoad] = useState(true);
    const [err, setErr] = useState("");

    const loadPage = async (p = 1) => {
        if (loading) return;
        setLoading(true);
        setErr("");
        try {
            const { data } = await api.get("/events/", {
                params: { page: p, ordering: "-date" },
            });
            const pageItems = await enrichEventsPage(toItems(data));

            setItems((prev) => {
                const map = new Map(prev.map((e) => [e.id, e]));
                for (const it of pageItems) {
                    const old = map.get(it.id);
                    map.set(it.id, old ? { ...old, ...it } : it);
                }
                return Array.from(map.values());
            });

            setHasNext(Boolean(data?.next));
            setPage(p);
        } catch (e) {
            const msg =
                e?.response?.status === 401 || e?.response?.status === 403
                    ? "You don't have permission to view these events."
                    : e?.message || "Failed to load events.";
            setErr(msg);
        } finally {
            setLoading(false);
            setFirstLoad(false);
        }
    };

    useEffect(() => {
        loadPage(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const showSkeletons = firstLoad && items.length === 0;

    return (
        <section className="w-full min-h-screen bg-[#222222] text-white">
            <div className="w-full h-full">
                <div
                    className=" w-full bg-[#282828] bg-no-repeat text-center h-screen bg-center flex items-center justify-center flex-col text-white z-0 bg-cover relative"
                    style={{ backgroundImage: "url('/Vector 2.png')" }}
                >
                    <h1
                        className="font-bold  text-5xl md:text-7xl  mb-4"
                        data-aos="fade-up"
                        data-aos-duration="2000"
                    >
                        Find About New <br />
                        Events in our clubs
                    </h1>
                    <h2
                        className="lg:text-[40px] font-semibold sm:text-[30px] text-[20px]"
                        data-aos="fade-up"
                        data-aos-duration="3000"
                    ></h2>
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
            </div>

            <div className="max-w-6xl mx-auto p-4 md:py-10 py-6">
                <div className="flex items-center gap-4 justify-center sm:justify-start">
                    <h3 className="text-[#73C344] font-['Silkscreen'] tracking-wider">
                        VIEW OUR EVENTS
                    </h3>
                </div>
                <div className="flex justify-end">
                    <img
                        src="/decoration1.png"
                        alt=""
                        className="mt-2 w-48 sm:w-80 pointer-events-none select-none mx-auto sm:mx-0"
                        draggable={false}
                    />
                </div>
            </div>

            <div className="px-4 pb-10">
                <div className={gridCls}>
                    {showSkeletons &&
                        Array.from({ length: 9 }).map((_, i) => <CardSkeleton key={i} />)}

                    {!showSkeletons && items.map((ev) => <EventCard key={ev.id} event={ev} />)}
                </div>

                {!loading && !err && !items.length && (
                    <div className="max-w-6xl mx-auto mt-8 text-center text-white/80">
                        No events yet.
                    </div>
                )}

                {err && (
                    <div className="max-w-6xl mx-auto mt-8 text-center text-red-400">{err}</div>
                )}

                {(hasNext || loading) && (
                    <div className="mt-10 flex items-center justify-center">
                        <button
                            disabled={loading}
                            onClick={() => loadPage(page + 1)}
                            className={`${formBtnGreen} cursor-pointer disabled:opacity-60`}
                            style={formBgStyle}
                        >
                            {loading ? "Loading…" : "VIEW MORE"}
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
}
