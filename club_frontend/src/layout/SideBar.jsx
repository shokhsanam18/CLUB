import React, { useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSidebarStore } from "../Store";
import { useAuthStore } from "../store/auth";

import {
    XMarkIcon,
    ChevronRightIcon,
    HomeIcon,
    InformationCircleIcon,
    CalendarDaysIcon,
    Squares2X2Icon,
    StarIcon,
    ArrowRightEndOnRectangleIcon,
    UserCircleIcon,
    BellIcon,
} from "@heroicons/react/24/outline";

const baseLinks = [
    { to: "/", label: "Home", Icon: HomeIcon },
    { to: "/About", label: "About us", Icon: InformationCircleIcon },
    { to: "/News", label: "Events", Icon: CalendarDaysIcon },
    { to: "/Clubs", label: "Clubs", Icon: Squares2X2Icon },
    { to: "/Ranking", label: "Rating", Icon: StarIcon },
];

const SideBar = () => {
    const { side, closeSidebar } = useSidebarStore();
    const { user, tokens, logout } = useAuthStore();
    const isAuthed = Boolean(tokens?.access);
    const location = useLocation();
    const navigate = useNavigate();
    const closeBtnRef = useRef(null);

    useEffect(() => {
        closeSidebar();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname]);

    useEffect(() => {
        const onKey = (e) => e.key === "Escape" && closeSidebar();
        if (side) {
            document.addEventListener("keydown", onKey);
            document.body.style.overflow = "hidden";
            setTimeout(() => closeBtnRef.current?.focus(), 0);
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = "";
        };
    }, [side, closeSidebar]);

    const goAndClose = (to) => {
        navigate(to);
        closeSidebar();
    };

    const links = isAuthed
        ? [
              ...baseLinks,
              { to: "/Notifications", label: "Notifications", Icon: BellIcon },
              { to: "/Account", label: "My Account", Icon: UserCircleIcon },
          ]
        : baseLinks;

    return (
        <>
            <div
                aria-hidden={!side}
                onClick={closeSidebar}
                className={`fixed inset-0 z-[998] bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ${
                    side ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                } lg:hidden`}
            />

            <aside
                role="dialog"
                aria-modal="true"
                aria-label="Main menu"
                className={`fixed top-0 right-0 font-['Outfit'] h-dvh w-[82vw] max-w-sm z-[999] bg-[#77C042] text-white shadow-2xl ring-1 ring-black/20
                transform transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
                ${side ? "translate-x-0" : "translate-x-full"} lg:hidden`}
                style={{ willChange: "transform" }}
            >
                <div className="relative">
                    <div
                        className="h-2 w-full"
                        style={{
                            backgroundImage:
                                "repeating-linear-gradient(135deg,#fff 0 14px,transparent 14px 28px)",
                            opacity: 0.9,
                        }}
                    />
                    <div className="px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <img
                                src="/logo.png"
                                alt=""
                                className="h-12 w-auto hidden sm:block"
                                onError={(e) => (e.currentTarget.style.display = "none")}
                            />
                            <span className="text-lg font-bold tracking-wide">Menu</span>
                        </div>

                        <button
                            ref={closeBtnRef}
                            onClick={closeSidebar}
                            aria-label="Close menu"
                            className="cursor-pointer p-2 rounded-full ring-1 ring-white/25 hover:ring-white/50 transition
                          hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/70"
                        >
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                <nav className="px-4 pt-2 pb-6" aria-label="Sidebar navigation">
                    <ul className="space-y-1">
                        {links.map(({ to, label, Icon }, i) => (
                            <li
                                key={to}
                                style={{ transitionDelay: `${i * 50}ms` }}
                                data-animate="sidebar-item"
                            >
                                <Link
                                    to={to}
                                    onClick={closeSidebar}
                                    className="group flex items-center justify-between rounded-xl px-4 py-3
                                    bg-white/0 hover:bg-white/10 active:bg-white/15
                                    transition-all duration-300 outline-none ring-0 focus:ring-2 focus:ring-white/70"
                                >
                                    <span className="flex items-center gap-3">
                                        <span
                                            className="grid place-items-center h-9 w-9 rounded-lg bg-white/15 ring-1 ring-white/20
                                            transition-transform duration-300 group-hover:scale-[1.05]"
                                        >
                                            <Icon className="h-5 w-5" aria-hidden />
                                        </span>
                                        <span className="text-[17px] font-semibold tracking-tight">
                                            {label}
                                        </span>
                                    </span>

                                    <span className="flex items-center">
                                        <ChevronRightIcon
                                            className="h-5 w-5 translate-x-0 opacity-70 transition-all duration-300
                                            group-hover:translate-x-1 group-hover:opacity-100"
                                            aria-hidden
                                        />
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>

                <div className="mt-auto px-6 pb-6">
                    <div className="h-px w-full bg-white/25" />

                    {!isAuthed ? (
                        <div className="mt-4 grid grid-cols-2 gap-3">
                            <button
                                onClick={() => goAndClose("/Register")}
                                className="w-full h-11 rounded-xl bg-white text-[#77C042] font-semibold cursor-pointer hover:opacity-95"
                            >
                                Register
                            </button>
                            <button
                                onClick={() => goAndClose("/Login")}
                                className="w-full h-11 rounded-xl bg-black/15 ring-1 ring-white/25 text-white font-semibold cursor-pointer hover:bg-black/25"
                            >
                                Sign in
                            </button>
                        </div>
                    ) : (
                        <div className="mt-4">
                            <div className="mb-2 text-sm/6 opacity-90">
                                Hi,{" "}
                                <span className="font-semibold">
                                    {user?.first_name || user?.email}
                                </span>
                            </div>
                            <button
                                onClick={() => {
                                    logout();
                                    closeSidebar();
                                    navigate("/");
                                }}
                                className="w-full h-11 rounded-xl bg-white text-[#77C042] font-semibold cursor-pointer hover:opacity-95 inline-flex items-center justify-center gap-2"
                            >
                                <ArrowRightEndOnRectangleIcon className="h-5 w-5" />
                                Logout
                            </button>
                        </div>
                    )}

                    <div className="mt-4 flex items-center gap-2 text-sm/6 opacity-90">
                        <span>Made with care by the IT community</span>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default SideBar;
