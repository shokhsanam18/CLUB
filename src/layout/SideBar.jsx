import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Typography } from "@material-tailwind/react";

const SideBar = () => {
  const [open, setOpen] = useState(false);

  const navList = (
    <ul className="mb-2 mt-1 font-semibold flex flex-col text-xl gap-4">
      <Typography as="li" variant="small" color="white" className="p-1">
        <Link to={"/About"} className="flex items-center">
          About us
        </Link>
      </Typography>
      <Typography
        as="li"
        variant="small"
        color="white"
        className="p-1 font-normal"
      >
        <Link to={"/News"} className="flex items-center">
          Events
        </Link>
      </Typography>
      <Typography
        as="li"
        variant="small"
        color="white"
        className="p-1 font-normal"
      >
        <Link to={"/Clubs"} className="flex items-center">
          Clubs
        </Link>
      </Typography>
      <Typography as="li" variant="small" color="white" className="p-1">
        <Link to={"/Ranking"} className="flex items-center">
          Rating
        </Link>
      </Typography>
    </ul>
  );

  return (
    <>
      <aside
        className={`fixed top-0 right-0 h-full w-64 bg-[#77C042] shadow-lg border-l border-gray-200 z-50 flex flex-col p-6 transform transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        } lg:hidden`}
        style={{ willChange: "transform" }}
      >
        <button
          className="absolute top-4 right-4 text-2xl text-white hover:text-red-200 focus:outline-none"
          onClick={() => setOpen(false)}
          aria-label="Close sidebar"
        >
          &times;
        </button>
        <h2 className="text-xl font-bold mb-8 mt-2 text-white">Menu</h2>
        {navList}
      </aside>
    </>
  );
};

export default SideBar;
