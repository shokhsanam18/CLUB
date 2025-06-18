import React from "react";
import { Button, IconButton, Typography } from "@material-tailwind/react";

export default function MainPage() {
  return (
    <div className="w-full min-h-screen font-['Pixelify_Sans']">
      {/* Navbar */}
      <header className="bg-lime-500 flex items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-4">
          <img src="/logo.png" alt="Logo" className="h-10 w-auto" />
          <nav className="hidden md:flex space-x-6 text-white font-semibold">
            <a href="#">ABOUT US</a>
            <a href="#">EVENTS</a>
            <a href="#">CLUBS</a>
            <a href="#">RATING</a>
          </nav>
        </div>
        <div className="flex items-center space-x-4">
          <IconButton variant="text" color="white">
            <i className="fas fa-user"></i>
          </IconButton>
          <Button size="sm" color="white" className="text-lime-600 font-bold">
            OPEN CLUB
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative flex flex-col justify-center items-center text-center text-white bg-gray-900 py-24 px-4 md:px-12">
        <div className="absolute inset-0 bg-black opacity-60"></div>
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Rediscover Yourself:
          </h1>
          <p className="text-xl md:text-2xl mb-6">
            Find Your Club, Find Your People!
          </p>
          <Button
            color="white"
            className="text-lime-600 font-bold border border-white"
          >
            EXPLORE CLUBS
          </Button>
        </div>
      </section>

      {/* Universities Section */}
      <section className="bg-gray-900 py-10 px-4">
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
