import React from "react";

import AOS from "aos";
import "aos/dist/aos.css";
import { Link } from "react-router-dom";
AOS.init();

export const Showcase = () => {
  return (
    <section className="w-full h-full">
      <div
        className=" w-full bg-[#282828] bg-no-repeat text-center h-screen bg-center flex items-center justify-center flex-col text-white z-0 bg-cover relative"
        style={{ backgroundImage: "url('/showcase.png')" }}
      >
        <h1
          className="font-bold  text-5xl md:text-7xl  mb-4"
          data-aos="fade-up"
          data-aos-duration="2000"
        >
          Rediscover Yourself:
        </h1>
        <h2
          className="lg:text-[40px] font-semibold sm:text-[30px] text-[20px]"
          data-aos="fade-up"
          data-aos-duration="3000"
        >
          Find Your Club, Find Your People!
        </h2>
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

export const Section1 = () => {
  return (
    <section className="w-full h-full bg-[#282828] py-7 px-4 flex flex-col gap-10 z-0">
      <h2 className="text-white text-center font-[Silkscreen] sm:text-3xl text-xl">
        List of Universities
      </h2>
      <div className="flex items-center justify-center flex-wrap w-full h-full xl:gap-20 gap-15 leading-8">
        {Array.from({ length: 5 }).map((_, index) => (
          <img
            src={"/img1.png"}
            alt="IT Park logo"
            key={index}
            className="xl:w-[200px] sm:w-[150px] w-7/12"
          />
        ))}
      </div>
    </section>
  );
};

export const Section2 = () => {
  return (
    <div
      className="bg-[#282828] bg-cover bg-no-repeat bg-center md:h-screen w-full flex xl:gap-20 gap-16 items-center justify-center py-10 relative z-0"
      style={{ backgroundImage: "url('/background2.png')" }}
    >
      <div className="md:w-[50%] w-10/12 flex flex-col gap-5">
        <h2 className="text-[45px] font-semibold text-white">About project</h2>
        <p className="xl:text-xl md:text-[16px] text-lg md:w-auto text-white">
          This platform was developed by Uzbekistan’s IT community to bring
          together all university clubs across the city into one space. Whether
          you're into technology, art, entrepreneurship, science, or
          volunteering — you'll find a club that fits your passion. By
          participating in events, workshops, and competitions organized through
          the platform, you can earn points, climb the leaderboard, win exciting
          prizes, and bring recognition to your university. The more active you
          are, the more you contribute to your campus ranking. It’s more than
          just joining a club — it’s about discovering your potential, building
          connections, and becoming part of something bigger. Explore. Compete.
          Grow. Represent your university with pride!
        </p>
        <button
          className="font-[Silkscreen] px-2 text-lime-500 py-3 text-lg bg-center bg-cover sm:w-6/12 xl:w-1/3 h-full relative"
          style={{ backgroundImage: "url('/btn.png')" }}
        >
          <Link to="/Clubs">Explore clubs</Link>
          <img
            src="/dots3.png"
            alt=""
            className="absolute w-6 h-auto right-2 bottom-1"
          />
        </button>
      </div>
      <div className="xl:w-[20%] w-[35%] h-auto items-center justify-center md:flex hidden">
        <img src="/img2.png" alt="Img2" className="lg:h-[450px] w-sm" />
      </div>
      <div className="absolute inset-0 pointer-events-none">
        <img
          src="/dots2.png"
          alt="Dots_section2"
          className="xl:w-[12vw] lg:w-[9vw] hidden lg:flex absolute xl:left-4 left-2 top-11 z-[9999]"
        />
        <img
          src="/dots2.png"
          alt="Dots_section2"
          className="xl:w-[12vw] lg:w-[9vw] lg:flex hidden absolute xl:right-5 right-3 bottom-8 z-[9999]"
        />
      </div>
    </div>
  );
};

export const Section3 = () => {
  return (
    <div className="bg-[#282828] py-10 px-4 text-white w-full h-full flex flex-col gap-10 z-0">
      <div className="font-[Silkscreen] w-full h-full relative sm:inline-block flex items-center justify-center flex-col">
        <div className="xl:w-1/2 w-full flex flex-col gap-5">
          <img src="/line.png" alt="" className="sm:hidden flex" />
          <h2 className=" text-[25px] sm:text-left text-center text-semibold text-[#77C042]">
            Who we are?
          </h2>
          <h2 className="text-center text-[25px] pb-14">
            IT Community of Uzbekistan !
          </h2>
        </div>
        <img
          src="/line.png"
          alt=""
          className="absolute bottom-0 right-0 xl:w-9/12 sm:w-8/12  w-fullh-auto"
        />
      </div>
      <div className="relative">
        <p className="xl:text-[30px] md:text-[20px] text-md md:px-8 px-2">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis viverra
          arcu imperdiet lectus pharetra, at scelerisque augue ultrices. Ut in
          condimentum turpis. Nunc pulvinar quis nisi sed fermentum. Nulla
          facilisi. Aenean at augue quis elit rutrum sollicitudin. Quisque
          congue et magna vel condimentum. In quis sem ut magna dictum feugiat
          eu vel ex. Mauris elementum diam eu tempus aliquet. Mauris tempor, ex
          eget auctor molestie, orci justo commodo orci, sit amet placerat
          tellus massa sed augue. Donec non fermentum leo, at tincidunt tellus.
          Maecenas ac pharetra justo. Sed commodo, ligula vel aliquam varius,
          enim metus eleifend felis, id interdum purus nunc non lectus.
        </p>
      </div>
    </div>
  );
};

export const Section4 = () => {
  return (
    <div>
      <div
        className="bg-[#282828] bg-cover bg-no-repeat bg-center md:h-screen w-full flex xl:gap-20 gap-16 items-center border-none justify-center py-10 relative sm:text-left text-center z-0 border-[1px] border-white"
        style={{ backgroundImage: "url('/background3.png')" }}
      >
        <div className="md:w-[50%] w-10/12 flex flex-col gap-5 py-10">
          <h3 className="text-white text-2xl font-semibold">
            Didn't Find What You're Looking For?
          </h3>
          <h2 className="lg:text-[45px] sm:text-[40px] text-[30px] font-semibold text-white">
            Start Your Own Club!
          </h2>
          <p className="xl:text-xl md:text-[16px] text-lg md:w-auto text-white">
            We’ve got a growing list of student clubs — but maybe none of them
            match your interests or belong to your university. That’s okay!
            Every great club starts with one person who saw something missing
            and decided to create it. Whether you're into something niche, bold,
            or completely new, this is your chance to lead the way. Start your
            own club and bring like-minded people together.
          </p>
          <button
            className="font-[Silkscreen] px-2  text-[#77C042] py-3 text-lg bg-center bg-cover sm:w-5/12 xl:w-1/3 w-9/12 h-full relative"
            style={{ backgroundImage: "url('/btn.png')" }}
          >
            <Link to="#">Start club</Link>
            <img
              src="/dots3.png"
              alt=""
              className="absolute w-6 h-auto right-2 bottom-1"
            />
          </button>
        </div>
        <div className="xl:w-[20%] w-[35%] h-auto items-center justify-center md:flex hidden">
          <img src="/img2.png" alt="Img2" className="lg:h-[450px] w-sm" />
        </div>
        <div className="absolute inset-0 pointer-events-none">
          <img
            src="/dots2.png"
            alt="Dots_section2"
            className="xl:w-[12vw] lg:w-[9vw] hidden lg:flex absolute xl:left-4 left-2 top-11 z-[9999]"
          />
        </div>
      </div>
    </div>
  );
};

const AboutUs = () => {
  return (
    <>
      <Showcase />
      <Section1 />
      <Section2 />
      <Section3 />
      <Section4 />
    </>
  );
};

export default AboutUs;
