import React from "react";
import NavBar from "./NavBar";
import SideBar from "./SideBar";
import { Outlet } from "react-router-dom";
import Footer from "./Footer";
import { useUiStore } from "../store/ui.js";
import Loader from "../components/Loader.jsx";

const Layout = () => {
    const routeLoading = useUiStore((s) => s.routeLoading);

    return (
        <div id="top" style={{ display: "flex", flexDirection: "column" }}>
            <NavBar />
            <SideBar />
            <Outlet />
            <Footer />

            {routeLoading && (
                <div className="fixed inset-0 z-[1000] bg-black/40 backdrop-blur-sm">
                    <Loader label="Loading..." />
                </div>
            )}
        </div>
    );
};

export default Layout;
