import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@material-tailwind/react";

const News = () => {
  return (
    <div className="w-full min-h-screen">
      <section
        style={{
          backgroundImage: "url('/Vector 2.png')",
        }}
        className="relative h-[100vh] flex flex-col bg-cover bg-bottom-right justify-center items-center text-center text-white bg-zinc-900 py-24 px-4 md:px-12"
      >
        <div className="absolute inset-0 opacity-60"></div>
        <div className="relative">
          <h1 className="text-4xl md:text-7xl font-bold mb-4 ">
            Find about new <br /> events in our clubs !
          </h1>

          <Link to={"/Clubs"}>
            <Button
              variant="gradient"
              size="sm"
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
          src="/decoration1.png"
          alt=""
          className="absolute bottom-1 left-[3%] w-[60vw]"
        />
        <img
          src="/decoration3.png"
          alt=""
          className="absolute bottom-[11vh] right-[1%] w-[13vw]"
        />
        <img
          src="/decoration3.png"
          alt=""
          className="absolute bottom-[5vh] right-[18%] w-[13vw]"
        />
      </section>
    </div>
  );
};

export default News;
