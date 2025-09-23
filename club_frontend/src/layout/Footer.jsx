import React from "react";

const footerLinks = [
    { title: "About us", href: "#about-us" },
    { title: "About Platform", href: "#about-platform" },
    { title: "Open Club", href: "#open-club" },
    { title: "Clubs", href: "#clubs" },
    { title: "FAQ", href: "#faq" },
    { title: "IT community", href: "#it-community" },
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
    const cols = [footerLinks.slice(0, 2), footerLinks.slice(2, 4), footerLinks.slice(4)];

    return (
        <footer className="bg-[#77C042] text-white font-['Outfit']">
            <Seam />

            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
                    <div className="flex items-center gap-3">
                        <img
                            src="/logo.png"
                            alt="Clubs Union"
                            className="h-8 w-auto hidden sm:block"
                            onError={(e) => (e.currentTarget.style.display = "none")}
                            draggable={false}
                        />
                        <span className="text-xl sm:text-2xl font-semibold tracking-tight font-['Outfit']">
                            Clubs Union
                        </span>
                    </div>

                    <a
                        href="#top"
                        className="inline-flex items-center gap-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors ring-1 ring-white/25 px-4 py-2 text-sm font-medium"
                        aria-label="Back to top"
                    >
                        Back to top <span aria-hidden>↑</span>
                    </a>
                </div>

                <nav
                    className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-6 text-center md:text-left"
                    aria-label="Footer"
                >
                    {cols.map((col, i) => (
                        <ul key={i} className="space-y-2">
                            {col.map((link) => (
                                <li key={link.title}>
                                    <a
                                        href={link.href}
                                        className="inline-block text-[15px] md:text-base font-regular tracking-tight hover:underline underline-offset-4 focus:outline-none focus:ring-2 focus:ring-white/60 rounded-sm"
                                    >
                                        {link.title}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    ))}
                </nav>

                <div className="mt-10 h-px w-full bg-white/30" />

                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm/6 opacity-95">
                    <p>© 2025 Clubs Union</p>
                    <p className="text-white/90">Made with care by the IT community</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;

