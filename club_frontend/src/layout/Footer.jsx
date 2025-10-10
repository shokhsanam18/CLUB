import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../store/auth";
import { CAN_MANAGE_CLUBS, hasAnyRole } from "../lib/roles";

const links = [
    { title: "About us", to: "/About", external: false },
    { title: "Open Club", to: "/Clubs/new", external: false, special: true },
    { title: "Clubs", to: "/Clubs", external: false },
    { title: "IT community", to: "https://itcom.uz", external: true },
];

function Seam() {
    return (
        <div className="relative">
            <div
                className="h-3 w-full"
                style={{
                    backgroundImage:
                        "repeating-linear-gradient(135deg,#77C042 0 14px,transparent 14px 28px)",
                }}
            />
            <div className="flex gap-3 px-6 py-2">
                {Array.from({ length: 20 }).map((_, i) => (
                    <span key={i} className="h-2 w-2 rounded-full bg-white/85 opacity-80" />
                ))}
            </div>
        </div>
    );
}

const Footer = () => {
    const scrollTop = (e) => {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const { user, tokens } = useAuthStore();
    const isLoggedIn = Boolean(tokens?.access);
    const canOpenClub = hasAnyRole(user, CAN_MANAGE_CLUBS);
    const [showDenied, setShowDenied] = useState(false);

    const renderLink = (link) => {
        if (link.special) {
            if (canOpenClub) {
                return (
                    <Link
                        to="/Clubs/new"
                        className="inline-block text-[15px] md:text-base tracking-tight hover:underline underline-offset-4 focus:outline-none focus:ring-2 focus:ring-white/60 rounded-sm"
                    >
                        Open Club
                    </Link>
                );
            }
            if (!isLoggedIn) {
                return (
                    <Link
                        to="/Login"
                        className="inline-block text-[15px] md:text-base tracking-tight hover:underline underline-offset-4 focus:outline-none focus:ring-2 focus:ring-white/60 rounded-sm"
                    >
                        Open Club
                    </Link>
                );
            }
            // logged-in but not allowed
            return (
                <button
                    type="button"
                    onClick={() => setShowDenied(true)}
                    className="inline-block text-[15px] md:text-base tracking-tight hover:underline underline-offset-4 focus:outline-none focus:ring-2 focus:ring-white/60 rounded-sm cursor-pointer"
                >
                    Open Club
                </button>
            );
        }

        return link.external ? (
            <a
                href={link.to}
                target="_blank"
                rel="noreferrer"
                className="inline-block text-[15px] md:text-base tracking-tight hover:underline underline-offset-4 focus:outline-none focus:ring-2 focus:ring-white/60 rounded-sm"
            >
                {link.title}
            </a>
        ) : (
            <Link
                to={link.to}
                className="inline-block text-[15px] md:text-base tracking-tight hover:underline underline-offset-4 focus:outline-none focus:ring-2 focus:ring-white/60 rounded-sm"
            >
                {link.title}
            </Link>
        );
    };

    return (
        <footer className="bg-[#77C042] text-white font-['Outfit']">
            <Seam />

            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
                    <div className="flex items-center gap-3">
                        <img
                            src="/logo.png"
                            alt="Clubs Union"
                            className="h-12 w-auto hidden sm:block"
                            onError={(e) => (e.currentTarget.style.display = "none")}
                            draggable={false}
                        />
                        <span className="text-xl sm:text-2xl font-semibold tracking-tight font-['Outfit']">
                            IT Community Clubs
                        </span>
                    </div>

                    <button
                        onClick={scrollTop}
                        className="inline-flex items-center gap-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors ring-1 ring-white/25 px-4 py-2 text-sm font-medium"
                        aria-label="Back to top"
                        type="button"
                    >
                        Back to top <span aria-hidden>↑</span>
                    </button>
                </div>

                <nav
                    className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 text-center md:text-left"
                    aria-label="Footer"
                >
                    {links.map((link) => (
                        <div key={link.title}>{renderLink(link)}</div>
                    ))}
                </nav>

                <div className="mt-10 h-px w-full bg-white/30" />

                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm/6 opacity-95">
                    <p>© 2025 Clubs</p>
                    <p className="text-white/90">Made with care by the IT community</p>
                </div>
            </div>

            {showDenied && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/60"
                        onClick={() => setShowDenied(false)}
                    />
                    <div className="relative z-10 w-[92%] max-w-md rounded-2xl bg-[#1e1e1e] ring-1 ring-white/10 p-6 text-white">
                        <h3 className="text-lg font-semibold">You can’t open a new club</h3>
                        <p className="mt-2 text-white/80">
                            Only <span className="font-semibold">Ambassadors</span> can create
                            clubs. Please contact your ambassador if you need access.
                        </p>
                        <div className="mt-4 flex gap-2">
                            <button
                                className="px-4 py-2 rounded-md bg-white/10 hover:bg-white/20 cursor-pointer"
                                onClick={() => setShowDenied(false)}
                            >
                                Close
                            </button>
                            <Link
                                to="/Account"
                                className="px-4 py-2 rounded-md bg-[#77C042] text-black font-semibold cursor-pointer"
                                onClick={() => setShowDenied(false)}
                            >
                                Update profile
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </footer>
    );
};

export default Footer;
