import React from "react";
import NavBar from "./NavBar";
import SideBar from "./SideBar";
import { Outlet } from "react-router-dom";
import Footer from "./Footer";

const Layout = () => {
    return (
        <div id="top" style={{ display: "flex", flexDirection: "column" }}>
            <NavBar />
            <SideBar />
            <Outlet />
            <Footer />
        </div>
    );
};

export default Layout;
