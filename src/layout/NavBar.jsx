import React from "react";
import {
  Navbar,
  Collapse,
  Typography,
  Button,
  IconButton,
} from "@material-tailwind/react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";

export default function NavBar() {
  const [openNav, setOpenNav] = React.useState(false);

  React.useEffect(() => {
    window.addEventListener(
      "resize",
      () => window.innerWidth >= 960 && setOpenNav(false)
    );
  }, []);

  const navList = (
    <ul className="mb-2 mt-1 font-semibold flex text-xl  gap-2 lg:mb-0 lg:mt-0 flex-row items-center lg:gap-6">
      <Typography as="li" variant="small" color="blue-gray" className="p-1">
        <Link to={"/About"} className="flex items-center">
          About us
        </Link>
      </Typography>
      <Typography
        as="li"
        variant="small"
        color="blue-gray"
        className="p-1 font-normal"
      >
        <Link to={"/News"} className="flex items-center">
          EVENTS
        </Link>
      </Typography>
      <Typography
        as="li"
        variant="small"
        color="blue-gray"
        className="p-1 font-normal"
      >
        <Link to={"/Clubs"} className="flex items-center">
          Clubs
        </Link>
      </Typography>
      <Typography as="li" variant="small" color="blue-gray" className="p-1">
        <Link to={"/Ranking"} className="flex items-center">
          Rating
        </Link>
      </Typography>
    </ul>
  );

  return (
    <Navbar className="sticky top-0 z-10 font-['Silkscreen'] uppercase text-white border-none bg-[#77C042] rounded-none px-4 py-1 lg:px-8 lg:py-2">
      <div className="flex items-center justify-between text-blue-gray-900">
        <Link to={"/"} className="mr-4 cursor-pointer py-1.5 font-medium">
          <img src="/logo.png" alt="" className="h-15 w-auto" />
        </Link>
        <div className="mr-4 hidden lg:block">{navList}</div>

        <div className="lg:flex items-center hidden gap-5">
          <Link to={"/Registration"}>
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
          <Link to={"/"}>
            <Button
              variant="gradient"
              size="sm"
              className="bg-cover cursor-pointer uppercase flex items-center justify-center p-2 text-[#77C042] font-light bg-bottom"
              style={{
                backgroundImage: "url('/form.png')",
              }}
            >
              Open club
            </Button>
          </Link>
        </div>
        <IconButton
          variant="text"
          className="lg:hidden cursor-pointer items-center justify-center flex px-6"
          onClick={() => setOpenNav(!openNav)}
        >
          {openNav ? (
            <XMarkIcon className="h-6 w-6" strokeWidth={2} />
          ) : (
            <Bars3Icon className="h-6 w-6" strokeWidth={2} />
          )}
        </IconButton>
      </div>
      {/* <Collapse open={openNav} className="flex items-center gap-3 justify-end">
        {navList}
        <Link to={"/Registration"}>
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
        <Button
          variant="gradient"
          size="sm"
          className="bg-cover uppercase flex items-center justify-center text-[#77C042] bg-bottom-right"
          style={{
            backgroundImage: "url('/form.png')",
          }}
        ></Button>
      </Collapse> */}
    </Navbar>
  );
}
