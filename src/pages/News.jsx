import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@material-tailwind/react";

const News = () => {
  return (
    <section className="w-full h-full">
      <div
        className=" w-full bg-[#282828] bg-no-repeat text-center h-screen bg-center flex items-center justify-center flex-col text-white z-0 bg-cover relative"
        style={{ backgroundImage: "url('/Vector 2.png')" }}
      >
        <h1
          className="font-bold  text-5xl md:text-7xl  mb-4"
          data-aos="fade-up"
          data-aos-duration="2000"
        >
          Find About New <br />
          Events in our clubs
        </h1>
        <h2
          className="lg:text-[40px] font-semibold sm:text-[30px] text-[20px]"
          data-aos="fade-up"
          data-aos-duration="3000"
        ></h2>
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
  );
};

export default News;
