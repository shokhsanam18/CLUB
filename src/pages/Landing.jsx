import React from "react";
import { Button, IconButton, Typography } from "@material-tailwind/react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { useEffect } from "react";
import decoration1 from "../../public/decoration1.png";
import image1 from "../../public/image1.png";

export default function MainPage() {
  const API_CONFIG = {
    club: {
      endpoint: "https://api.yourservice.com/clubs",
      defaultData: {
        name: "Club Name",
        description: `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.`,
        action1: "JOIN CLUB",
        action2: "GIVE SCORES",
        image: "https://via.placeholder.com/150",
      },
    },
    scores: {
      endpoint: "https://api.yourservice.com/scores",
      defaultScore: 1050,
    },
    leaders: {
      endpoint: "https://api.yourservice.com/leaders",
      defaultData: [
        {
          name: "Name 1",
          role: "Club leader",
          image: "https://via.placeholder.com/150",
        },
        {
          name: "Name 2",
          role: "Club leader",
          image: "https://via.placeholder.com/150",
        },
        {
          name: "Name 3",
          role: "Club leader",
          image: "https://via.placeholder.com/150",
        },
      ],
    },
    events: {
      endpoint: "https://api.yourservice.com/events",
      defaultData: Array(8).fill({
        title: "Workshop at BMU",
        description:
          "Our recent workshop brought together passionate students for a day of learning, collaboration, and innovation. Participants gained hands-on experience, tackled real challenges, and walked away with new skills, ideas, and connections. A big thank you to everyone who joined and made it a success!",
        time: "2 hours ago",
        likes: 32,
        comments: 6,
        image: "https://via.placeholder.com/456x517",
      }),
    },
  };

  const [clubData, setClubData] = useState(API_CONFIG.club.defaultData);
  const [score, setScore] = useState(API_CONFIG.scores.defaultScore);
  const [leaders, setLeaders] = useState(API_CONFIG.leaders.defaultData);
  const [loading, setLoading] = useState({
    club: true,
    scores: true,
    leaders: true,
  });
  const [error, setError] = useState({
    club: null,
    scores: null,
    leaders: null,
  });

  const [events, setEvents] = useState(API_CONFIG.events.defaultData);
  const [eventLoading, setEventLoading] = useState(true);
  const [eventError, setEventError] = useState(null);

  const fetchClubData = async () => {
    try {
      const response = await fetch(API_CONFIG.club.endpoint);
      if (!response.ok) throw new Error("Ошибка загрузки данных клуба");

      const data = await response.json();
      setClubData({
        name: data.name || API_CONFIG.club.defaultData.name,
        description:
          data.description || API_CONFIG.club.defaultData.description,
        action1: data.action1 || API_CONFIG.club.defaultData.action1,
        action2: data.action2 || API_CONFIG.club.defaultData.action2,
        image: data.image || API_CONFIG.club.defaultData.image,
      });
    } catch (err) {
      setError((prev) => ({ ...prev, club: err.message }));
      console.error("Club API Error:", err);
    } finally {
      setLoading((prev) => ({ ...prev, club: false }));
    }
  };

  const fetchEvents = async () => {
    try {
      const response = await fetch(API_CONFIG.events.endpoint);
      if (!response.ok) throw new Error("Ошибка загрузки мероприятий");

      const data = await response.json();
      setEvents(
        Array.isArray(data) && data.length
          ? data
          : API_CONFIG.events.defaultData
      );
    } catch (err) {
      setEventError(err.message);
      console.error("Events API Error:", err);
    } finally {
      setEventLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([fetchClubData(), fetchEvents()]);
  }, []);

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

      <section className="  bg-[#282828]  font-['Silkscreen'] py-10 px-4">
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
      <div
        className="bg-[#282828] bg-cover bg-no-repeat bg-center md:h-screen w-full flex xl:gap-20 gap-16 items-center justify-center py-10 relative z-0"
        style={{ backgroundImage: "url('/background2.png')" }}
      >
        <div className="md:w-[50%] w-10/12 flex flex-col gap-5">
          <h2 className="text-[45px] font-semibold text-white">
            Join the competition
          </h2>
          <p className="xl:text-xl md:text-[16px] text-lg md:w-auto text-white">
            This platform was developed by Uzbekistan’s IT community to bring
            together all university clubs across the city into one space.
            Whether you're into technology, art, entrepreneurship, science, or
            volunteering — you'll find a club that fits your passion. By
            participating in events, workshops, and competitions organized
            through the platform, you can earn points, climb the leaderboard,
            win exciting prizes, and bring recognition to your university. The
            more active you are, the more you contribute to your campus ranking.
            It’s more than just joining a club — it’s about discovering your
            potential, building connections, and becoming part of something
            bigger. Explore. Compete. Grow. Represent your university with
            pride!
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
      <div className="px-6 py-10 bg-[#282828]">
        <Typography className="text-[#77C042] text-2xl font-bold mb-4 font-[Silkscreen] text-left">
          View Our Events
        </Typography>
        <div className="flex justify-end mb-6">
          <img src={decoration1} alt="Decoration" />
        </div>

        {eventLoading ? (
          <div className="text-center text-white">Loading events...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {events.map((event, index) => (
              <div
                key={index}
                className="bg-white rounded-lg shadow-md overflow-hidden"
              >
                <img
                  src={event.image}
                  alt={event.title}
                  className="w-full h-[200px] object-cover"
                  onError={(e) => (e.target.src = image1)}
                />
                <div className="p-4">
                  <Typography
                    variant="h6"
                    className="font-semibold text-gray-900"
                  >
                    {event.title}
                  </Typography>
                  <Typography
                    variant="paragraph"
                    className="text-sm text-gray-700 my-2"
                  >
                    {event.description}
                  </Typography>
                  <div className="text-xs text-gray-500 flex justify-between items-center">
                    <span>{event.time}</span>
                    <span className="flex gap-2 items-center">
                      ❤️ {event.likes} &nbsp; 💬 {event.comments}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {/* {eventError && (
                <div className="text-center mt-2">
                  <Typography variant="small" className="text-yellow-500">
                    (используются мероприятия по умолчанию)
                  </Typography>
                </div>
              )} */}
      </div>
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
