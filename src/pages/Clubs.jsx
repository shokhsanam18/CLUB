// {
//   "name": "Club Name",
//   "description": "Club description...",
//   "action1": "JOIN CLUB",
//   "action2": "GIVE SCORES",
//   "image": "URL_TO_CLUB_IMAGE"
// }
import React, { useState, useEffect } from "react";
import { Typography, Button } from "@material-tailwind/react";
import bgclub from "../../public/bgclub.png";
import form from "../../public/form.png";
import decoration1 from "../../public/decoration1.png";
import image1 from "../../public/image1.png";

const Clubs = () => {
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

  const fetchScores = async () => {
    try {
      const response = await fetch(API_CONFIG.scores.endpoint);
      const data = await response.json();

      if (!response.ok) throw new Error("Ошибка загрузки оценок");
      setScore(data.score || API_CONFIG.scores.defaultScore);
    } catch (err) {
      setError((prev) => ({ ...prev, scores: err.message }));
      console.error("Scores API Error:", err);
    } finally {
      setLoading((prev) => ({ ...prev, scores: false }));
    }
  };

  const fetchLeaders = async () => {
    try {
      const response = await fetch(API_CONFIG.leaders.endpoint);
      if (!response.ok) throw new Error("Ошибка загрузки лидеров");

      const data = await response.json();
      setLeaders(
        data.map((leader) => ({
          name: leader.name || "Leader Name",
          role: leader.role || "Club leader",
          image: leader.image || "https://via.placeholder.com/150",
        }))
      );
    } catch (err) {
      setError((prev) => ({ ...prev, leaders: err.message }));
      console.error("Leaders API Error:", err);
    } finally {
      setLoading((prev) => ({ ...prev, leaders: false }));
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
    Promise.all([
      fetchClubData(),
      fetchScores(),
      fetchLeaders(),
      fetchEvents(),
    ]);
  }, []);

  const isLoading = loading.club || loading.scores || loading.leaders;

  // if (isLoading) {
  //   return (
  //     <div className="flex justify-center items-center min-h-screen">
  //       <div className="text-center">
  //         <Typography variant="h5" className="mb-4 text-white">
  //           {loading.club ? "Загрузка данных клуба..." : "Загрузка оценок..."}
  //         </Typography>
  //         <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="bg-[#222222]">
      <div
        className="flex items-center justify-center p-4 md:p-8 w-full min-h-screen"
        style={{
          backgroundImage: `url(${bgclub})`,
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
        }}
      >
        <div className="flex flex-col max-w-4xl w-full bg-opacity-90 rounded-lg overflow-hidden">
          <div className="flex flex-col items-center p-4 md:p-6 bg-opacity-50">
            <div className="w-40 h-40 rounded-full overflow-hidden border-4 bg-gray-300 border-white shadow-lg mb-4">
              <img
                src={clubData.image}
                alt={clubData.name}
                className="w-full h-full object-cover"
                onError={(e) =>
                  (e.target.src = API_CONFIG.club.defaultData.image)
                }
              />
            </div>
            <div className="flex justify-center mt-4">
              <div className="px-4 py-1 rounded-full bg-gradient-to-r from-green-500 to-green-600/60 backdrop-blur-md bg-opacity-40 shadow-md">
                <Typography
                  variant="small"
                  className="text-lime-400 font-semibold"
                >
                  {score.toLocaleString()} score
                </Typography>
              </div>
            </div>
            {/* {error.scores && (
            <div className="text-center mt-2">
              <Typography variant="small" className="text-yellow-500">
                (используется значение по умолчанию)
              </Typography>
            </div>
          )} */}
          </div>

          <div className="w-full p-4">
            <Typography
              variant="h2"
              className="text-3xl font-bold mb-4 text-white text-center"
            >
              {clubData.name}
              {/* {error.club && (
              <Typography
                variant="small"
                className="text-yellow-500 block mt-1"
              >
                (используются данные по умолчанию)
              </Typography>
            )} */}
            </Typography>

            <hr className="my-4 border-gray-600 w-1/2 mx-auto" />

            <Typography
              variant="paragraph"
              className="text-gray-300 mb-6 whitespace-pre-line text-center"
            >
              {clubData.description}
            </Typography>
            <div className="flex justify-center gap-4">
              <Button
                className="text-green-500 rounded-none"
                style={{
                  backgroundImage: `url(${form})`,
                  backgroundSize: "cover",
                }}
              >
                {clubData.action1}
              </Button>
              <Button
                className="text-green-500 rounded-none p-2  hover:scale-90 hover:ease-in-out hover:transition-colors hover:duration-300  font-['Silkscreen']"
                style={{
                  backgroundImage: `url(${form})`,
                  backgroundSize: "cover",
                }}
              >
                {clubData.action2}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full p-6">
        <Typography
          variant="h3"
          className="text-2xl font-bold mb-6 text-white text-center"
        >
          Team Leaders
        </Typography>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {leaders.map((leader, index) => (
            <div key={index} className="text-center">
              <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-gray-600 mx-auto mb-4">
                <img
                  src={leader.image}
                  alt={leader.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = "https://via.placeholder.com/150";
                  }}
                />
              </div>
              <Typography variant="h4" className="text-white mb-1">
                {leader.name}
              </Typography>
              <Typography variant="paragraph" className="text-gray-400">
                {leader.role}
              </Typography>
            </div>
          ))}
        </div>
        {/* {error.leaders && (
            <div className="text-center mt-2">
              <Typography variant="small" className="text-yellow-500">
                (используются данные по умолчанию)
              </Typography>
            </div>
          )} */}
      </div>

      <div className="px-6 py-10 ">
        <Typography className="text-green-600 text-2xl font-bold mb-4 font-[Silkscreen] text-left">
          View Our Events
        </Typography>
        <div className="flex justify-end mb-6">
          <img src={decoration1} alt="Decoration" />
        </div>

        {eventLoading ? (
          <div className="text-center text-white">Загрузка мероприятий...</div>
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
};

export default Clubs;
