import React from "react";
import { Navbar, Typography, Button } from "@material-tailwind/react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useSidebarStore } from "../Store";
import { useAuthStore } from "../store/auth";
// import NotificationsBell from "../components/NotificationsBell";

export default function NavBar() {
    const { side, openSidebar } = useSidebarStore();
    const { user, tokens, logout } = useAuthStore();
    const navigate = useNavigate();
    const isAuthed = Boolean(tokens?.access);

    const { pathname } = useLocation();
    const isActive = (to) => {
        const p = pathname.toLowerCase();
        const t = String(to || "/").toLowerCase();
        if (t === "/") return p === "/";
        return p.startsWith(t);
    };
    const activeCls = (to) => (isActive(to) ? "underline underline-offset-8 decoration-2" : "");

    const navList = (
        <ul className="mb-2 mt-1 font-semibold flex text-2xl gap-2 lg:mb-0 lg:mt-0 flex-row items-center lg:gap-9">
            <Typography
                as="li"
                variant="small"
                color="blue-gray"
                className="p-1 hover:underline font-normal"
            >
                <Link to={"/"} className={`flex items-center ${activeCls("/")}`}>
                    Home
                </Link>
            </Typography>
            <Typography
                as="li"
                variant="small"
                color="blue-gray"
                className="p-1 hover:underline font-normal"
            >
                <Link to={"/About"} className={`flex items-center ${activeCls("/About")}`}>
                    About us
                </Link>
            </Typography>
            <Typography
                as="li"
                variant="small"
                color="blue-gray"
                className="p-1 font-normal hover:underline"
            >
                <Link to={"/News"} className={`flex items-center ${activeCls("/News")}`}>
                    EVENTS
                </Link>
            </Typography>
            <Typography
                as="li"
                variant="small"
                color="blue-gray"
                className="p-1 font-normal hover:underline"
            >
                <Link to={"/Clubs"} className={`flex items-center ${activeCls("/Clubs")}`}>
                    Clubs
                </Link>
            </Typography>
            <Typography
                as="li"
                variant="small"
                color="blue-gray"
                className="p-1 font-normal hover:underline"
            >
                <Link to={"/Ranking"} className={`flex items-center ${activeCls("/Ranking")}`}>
                    Rating
                </Link>
            </Typography>
            {isAuthed && (
                <Typography
                    as="li"
                    variant="small"
                    color="blue-gray"
                    className="p-1 font-normal hover:underline"
                >
                    <Link to={"/Account"} className={`flex items-center ${activeCls("/Account")}`}>
                        My Account
                    </Link>
                </Typography>
            )}
        </ul>
    );

    return (
        <Navbar className="sticky top-0 z-50 font-['Silkscreen'] uppercase text-white border-none bg-[#77C042] rounded-none px-4 py-1 lg:px-8 lg:py-2">
            <div className="flex items-center justify-between text-blue-gray-900">
                <Link to={"/"} className="mr-4 cursor-pointer py-1.5 font-medium">
                    <img src="/logo.png" alt="" className="h-15 w-auto" />
                </Link>

                <div className="mr-4 hidden lg:block">{navList}</div>

                <div className="lg:flex items-center hidden gap-5">
                    {!isAuthed ? (
                        <>
                            <Link to="/Register" title="Register">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                    className="size-8"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </Link>
                            <Link to={"/Login"}>
                                <Button
                                    variant="gradient"
                                    size="sm"
                                    className="bg-cover cursor-pointer uppercase flex items-center rounded-none hover:scale-90 hover:ease-in-out hover:transition-colors hover:duration-300 justify-center p-2 text-[#77C042] font-light bg-bottom"
                                    style={{ backgroundImage: "url('/form.png')" }}
                                >
                                    Sign in
                                </Button>
                            </Link>
                        </>
                    ) : (
                        <>
                            <NotificationsBell />
                            <span className="text-white text-sm">
                                Hi, {user?.first_name || user?.email}
                            </span>
                            <Button
                                variant="gradient"
                                size="sm"
                                onClick={() => {
                                    logout();
                                    navigate("/");
                                }}
                                className="bg-cover cursor-pointer uppercase flex items-center rounded-none hover:scale-90 hover:ease-in-out hover:transition-colors hover:duration-300 justify-center p-2 text-[#77C042] font-light bg-bottom"
                                style={{ backgroundImage: "url('/form.png')" }}
                            >
                                Logout
                            </Button>
                        </>
                    )}
                </div>

                {side ? (
                    <XMarkIcon
                        className="h-6 w-6 cursor-pointer lg:hidden  text-white"
                        onClick={openSidebar}
                        strokeWidth={2}
                    />
                ) : (
                    <Bars3Icon
                        className="h-6 w-6 cursor-pointer lg:hidden  text-white"
                        onClick={openSidebar}
                        strokeWidth={2}
                    />
                )}
            </div>
        </Navbar>
    );
}
