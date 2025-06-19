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
        className="relative h-[90vh] flex flex-col bg-cover bg-bottom justify-center items-center text-center text-white bg-gray-900 py-24 px-4 md:px-12">
        <div className="absolute inset-0 opacity-60"></div>
        <div className="relative">
          <h1 className="text-5xl md:text-7xl font-bold mb-4">
            Rediscover Yourself:
          </h1>
          <p className="text-2xl md:text-4xl font-bold mb-6">
            Find Your Club, Find Your People!
          </p>
          <Link to={'/Clubs'}>

            <Button variant="gradient" size="sm" className="bg-cover font-['Silkscreen'] cursor-pointer uppercase font-light text-xl text-[#77C042] bg-bottom"
              style={{
                backgroundImage: "url('/form.png')",
              }}
            >
              Explore clubs
            </Button>
          </Link>
        </div>
      </section>

      {/* Universities Section */}
      <section className="bg-gray-900 font-['Pixelify_Sans'] py-10 px-4">
        <Typography
          variant="h6"
          color="white"
          className="text-center tracking-widest mb-6"
        >
          LIST OF UNIVERSITIES
        </Typography>
        <div className="flex flex-wrap justify-center gap-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <img
              key={i}
              src="/itpark-logo.png"
              alt="IT Park Logo"
              className="h-12 md:h-16"
            />
          ))}
        </div>
      </section>
    </div>
  );
}
