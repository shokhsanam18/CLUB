import React from "react";
import { Button, IconButton, Typography } from "@material-tailwind/react";
import { Link } from "react-router-dom";

export default function MainPage() {
  return (
    <div className="w-full min-h-screen">
      <section className="w-full h-full">
        <div
          className=" w-full bg-[#282828] bg-no-repeat text-center h-screen bg-center flex items-center justify-center flex-col text-white z-0 bg-cover relative"
          style={{ backgroundImage: "url('/showcase.png')" }}
        >
          <h1
            className="font-bold  text-5xl md:text-7xl  mb-2"
            data-aos="fade-up"
            data-aos-duration="2000"
          >
            Rediscover Yourself:
          </h1>
          <h2
            className="lg:text-[40px] font-semibold sm:text-[30px] text-[20px] mb-2"
            data-aos="fade-up"
            data-aos-duration="3000"
          >
            Find Your Club, Find Your People!
          </h2>
          <Link to={"/Clubs"}>
            <Button
              variant="gradient"
              size="sm"
              data-aos="fade-up"
              data-aos-duration="3000"
              className="bg-cover hover:scale-90 hover:ease-in-out hover:transition-colors hover:duration-300  font-['Silkscreen'] px-6 py-4 cursor-pointer uppercase font-light text-xl text-[#77C042] bg-bottom rounded-none"
              style={{
                backgroundImage: "url('/form.png')",
              }}
            >
              Explore clubs
            </Button>
          </Link>
        </div>

        <img
          src="/line.png"
          className="absolute -bottom-18 left-[3%] md:w-[50vw] sm:w-[70vw] w-11/12"
          alt=""
        />
        <img
          src="/dots.png"
          className="absolute -bottom-4 lg:right-[1%] lg:flex hidden  w-[10vw]"
          alt=""
        />
        <img
          src="/dots.png"
          className="absolute -bottom-10 lg:right-[15%] md:right-[7%] md:flex hidden w-[11vw]"
          alt=""
        />
      </section>

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

// <Link to={"/Clubs"}>
//           <Button
//             variant="gradient"
//             size="sm"
//             className="bg-cover hover:scale-90 hover:ease-in-out hover:transition-colors hover:duration-300  font-['Silkscreen'] px-6 py-4 cursor-pointer uppercase font-light text-xl text-[#77C042] bg-bottom rounded-none"
//             style={{
//               backgroundImage: "url('/form.png')",
//             }}
//           >
//             Explore clubs
//           </Button>
//         </Link>
