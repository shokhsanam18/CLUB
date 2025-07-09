import MainPage from "./pages/Landing";
import { Route } from "react-router-dom";
import { Routes } from "react-router-dom";
import Layout from "./layout/Layout";
import SignIn from "./pages/login/SignIn";
import Registration from "./pages/login/Registration";
import AboutUs from "./pages/AboutUs";
import News from "./pages/News";
import Clubs from "./pages/Clubs";
import Account from "./pages/Account";
import Ranking from "./pages/Ranking";
import OneClub from "./pages/OneClub";

function App() {
  return (
    <div>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<MainPage />} />
          <Route path="/About" element={<AboutUs />} />
          <Route path="/News" element={<News />} />
          <Route path="/Clubs" element={<Clubs />} />
          <Route path="/Clubs/:id" element={<OneClub />} />
          <Route path="/Account" element={<Account />} />
          <Route path="/Ranking" element={<Ranking />} />
        </Route>
        <Route path="/Register" element={<Registration />} />
        <Route path="/Login" element={<SignIn />} />
        <Route path="*" element={<div>404 Not found</div>} />
      </Routes>
    </div>
  );
}

export default App;
