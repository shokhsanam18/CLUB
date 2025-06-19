import React from "react";
import { Button, IconButton, Typography } from "@material-tailwind/react";
import { Link } from "react-router-dom";

export default function MainPage() {
  return (
    <div className="w-full min-h-screen">
      {/* Hero Section */}
      <section style={{
        backgroundImage: "url('/bg-image.png')",
      }}
        className="relative h-[85vh] flex flex-col bg-cover bg-bottom-right justify-center items-center text-center text-white bg-zinc-900 py-24 px-4 md:px-12">
        <div className="absolute inset-0 opacity-60"></div>
        <div className="relative">
          <h1 className="text-5xl md:text-7xl font-bold mb-4">
            Rediscover Yourself:
          </h1>
          <p className="text-2xl md:text-4xl font-bold mb-6">
            Find Your Club, Find Your People!
          </p>
          <Link to={'/Clubs'}>

            <Button variant="gradient" size="sm" className="bg-cover font-['Silkscreen'] px-6 py-4 cursor-pointer uppercase font-light text-xl text-[#77C042] bg-bottom"
              style={{
                backgroundImage: "url('/form.png')",
              }}
            >
              Explore clubs
            </Button>
          </Link>
        </div>
        <img src="/decoration1.png" alt="" className="absolute bottom-1 left-[3%] w-[60vw]" />
        <img src="/decoration3.png" alt="" className="absolute bottom-[11vh] right-[1%] w-[13vw]" />
        <img src="/decoration3.png" alt="" className="absolute bottom-[5vh] right-[18%] w-[13vw]" />
      </section>

      {/* Universities Section */}
      <section className=" bg-zinc-900  font-['Silkscreen'] py-10 px-4">
        <Typography
          variant="h6"
          color="white"
          className="text-center tracking-widest mb-6"
        >
          LIST OF UNIVERSITIES
        </Typography>
        <div className="flex flex-wrap justify-center gap-8">
          {Array.from({ length: 5 }).map((_, i) => (
            <img
              key={i}
              src="/uni.png"
              alt="IT Park Logo"
              className="h-12 md:h-16"
            />
          ))}
        </div>
      </section>
    </div>
  );
}
