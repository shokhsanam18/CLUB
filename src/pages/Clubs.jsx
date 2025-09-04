import React, { useEffect } from "react";
import { useClubsStore } from "../store/clubs";
import ClubCard from "../components/ClubCard";

const Clubs = () => {
    const clubs = useClubsStore((s) => s.clubs);
    const listClubs = useClubsStore((s) => s.listClubs);
    const isLoading = useClubsStore((s) => s.loading.list);
    const loadError = useClubsStore((s) => s.error.list);

    useEffect(() => {
        listClubs();
    }, []);

    return (
        <div className="bg-[#282828] min-h-[60vh] py-10 px-4">
            <h1 className="text-white text-3xl font-bold mb-6 text-center">Clubs</h1>
            {isLoading && <p className="text-center text-white">Loading clubs…</p>}
            {loadError && <p className="text-center text-red-400">{loadError}</p>}
            <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {clubs.map((c) => (
                    <ClubCard key={c.id ?? c.pk ?? c.uuid} club={c} />
                ))}
            </div>
        </div>
    );
};
export default Clubs;
