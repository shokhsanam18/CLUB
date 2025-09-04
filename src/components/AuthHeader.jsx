import React from "react";
import { useNavigate } from "react-router-dom";

const AuthHeader = ({ logoSrc = "/logo.png", homeHref = "/" }) => {
    const navigate = useNavigate();

    return (
        <header className="fixed top-0 inset-x-0 z-50 bg-[#66cc33] h-16 md:h-20 overflow-hidden">
            <div className="container mx-auto px-4 sm:px-6 lg:px-10 2xl:px-12 h-full flex items-center">
                <button
                    type="button"
                    onClick={() => navigate(homeHref)}
                    className="flex items-center focus:outline-none"
                    aria-label="Go to homepage"
                >
                    <img
                        src={logoSrc}
                        alt="Logo"
                        className="h-10 md:h-14 w-auto block"
                        draggable={false}
                    />
                </button>
            </div>
        </header>
    );
};

export default AuthHeader;
