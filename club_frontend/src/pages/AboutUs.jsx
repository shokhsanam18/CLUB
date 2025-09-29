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
        <div
            className="bg-[#282828] bg-cover bg-no-repeat bg-center md:h-screen w-full flex xl:gap-20 gap-16 items-center justify-center py-10 relative z-0"
            style={{ backgroundImage: "url('/background2.png')" }}
        >
            <div className="md:w-[50%] w-10/12 flex flex-col gap-5">
                <h2 className="text-[45px] font-semibold text-white">About project</h2>
                <p className="xl:text-xl md:text-[16px] text-lg md:w-auto text-white">
                    This platform was developed by Uzbekistan’s IT community to bring together all
                    university clubs across the city into one space. Whether you're into technology,
                    art, entrepreneurship, science, or volunteering — you'll find a club that fits
                    your passion. By participating in events, workshops, and competitions organized
                    through the platform, you can earn points, climb the leaderboard, win exciting
                    prizes, and bring recognition to your university. The more active you are, the
                    more you contribute to your campus ranking. It’s more than just joining a club —
                    it’s about discovering your potential, building connections, and becoming part
                    of something bigger. Explore. Compete. Grow. Represent your university with
                    pride!
                </p>
                <button
                    className="font-[Silkscreen] px-2 text-lime-500 py-3 text-lg bg-center bg-cover sm:w-6/12 xl:w-1/3 h-full relative"
                    style={{ backgroundImage: "url('/btn.png')" }}
                >
                    <Link to="/Clubs">Explore clubs</Link>
                    <img src="/dots3.png" alt="" className="absolute w-6 h-auto right-2 bottom-1" />
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

export const Section2 = () => {
    return (
        <div className="bg-[#282828] py-10 text-white w-full">
            <div className="max-w-[74rem] mx-auto px-4 sm:px-6">
                <div className="relative font-[Silkscreen]">
                    <img src="/line.png" alt="" className="sm:hidden block" />
                    <div className="flex flex-col gap-2 pb-4">
                        <h2 className="text-[25px] text-[#77C042]">Who we are?</h2>
                        <h2 className="text-[25px]">IT Community of Uzbekistan !</h2>
                    </div>
                    <div className="flex justify-end">
                        <img
                            src="/line.png"
                            alt=""
                            className="bottom-0 right-0 xl:w-9/12 sm:w-8/12  w-fullh-auto"
                        />
                    </div>
                </div>

                <div className="mt-6 font-['Outfit'] space-y-5 sm:space-y-6">
                    <p className="text-[15px] sm:text-[16px] md:text-[18px] lg:text-[19px] xl:text-[20px] leading-7 sm:leading-8 md:leading-8 lg:leading-9 text-white/90">
                        The Community Clubs Platform is a space that brings together university and
                        regional student clubs across Uzbekistan. It was created to support student
                        initiatives, encourage leadership, and make it easier to organize and join
                        club activities.
                    </p>

                    <p className="text-[15px] sm:text-[16px] md:text-[18px] lg:text-[19px] xl:text-[20px] leading-7 sm:leading-8 md:leading-8 lg:leading-9 text-white/90">
                        On the platform, students can:
                    </p>

                    <ul className="list-disc pl-5 sm:pl-6 md:pl-8 space-y-2 sm:space-y-2.5 text-white/90 text-[15px] sm:text-[16px] md:text-[18px] lg:text-[19px] xl:text-[20px] leading-7 sm:leading-8 md:leading-8 lg:leading-9">
                        <li>
                            Join a club based on their interests, such as programming, AI, public
                            speaking, debates, movies, and more.
                        </li>
                        <li>
                            Take part in events like meetups, hackathons, discussions, and
                            workshops.
                        </li>
                        <li>Grow into leaders by becoming volunteers or ambassadors.</li>
                    </ul>

                    <p className="text-[15px] sm:text-[16px] md:text-[18px] lg:text-[19px] xl:text-[20px] leading-7 sm:leading-8 md:leading-8 lg:leading-9 text-white/90">
                        Ambassadors manage the clubs: they coordinate with universities, oversee
                        activities, and submit short reports after each meetup. Volunteers help with
                        event ideas and organization, while participants can simply join in and
                        later take on more active roles.
                    </p>

                    <p className="text-[15px] sm:text-[16px] md:text-[18px] lg:text-[19px] xl:text-[20px] leading-7 sm:leading-8 md:leading-8 lg:leading-9 text-white/90">
                        The IT Community Clubs Platform was designed to make student life more
                        engaging, connect like-minded people, and build stronger IT and creative
                        communities across Uzbekistan.
                    </p>
                </div>
            </div>
        </div>
    );
};

export const Section3 = () => {
    return (
        <div>
            <div
                className="bg-[#282828] bg-cover bg-no-repeat bg-center md:h-screen w-full flex xl:gap-20 gap-16 items-center border-none justify-center py-10 relative sm:text-left text-center z-0 border-[1px] border-white"
                style={{ backgroundImage: "url('/background3.png')" }}
            >
                <div className="md:w-[50%] w-10/12 flex flex-col gap-5 py-10">
                    <h3 className="text-white text-2xl font-semibold font-['Outfit']">
                        Didn't Find What You're Looking For?
                    </h3>
                    <h2 className="lg:text-[45px] sm:text-[40px] text-[30px] font-semibold text-white font-['Outfit']">
                        Start Your Own Club!
                    </h2>
                    <p className="xl:text-xl md:text-[16px] text-lg md:w-auto text-white font-['Outfit'] font-extralight">
                        We’ve got a growing list of student clubs — but maybe none of them match
                        your interests or belong to your university. That’s okay! Every great club
                        starts with one person who saw something missing and decided to create it.
                        Whether you're into something niche, bold, or completely new, this is your
                        chance to lead the way. Start your own club and bring like-minded people
                        together.
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
        </>
    );
};

export default AboutUs;
