import React from "react";
import { Link } from "react-router-dom";

const links = [
    { title: "About us", to: "/About", external: false },
    { title: "Open Club", to: "/Clubs/new", external: false },
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
                        <div key={link.title}>
                            {link.external ? (
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
                            )}
                        </div>
                    ))}
                </nav>

                <div className="mt-10 h-px w-full bg-white/30" />

                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm/6 opacity-95">
                    <p>© 2025 Clubs</p>
                    <p className="text-white/90">Made with care by the IT community</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
