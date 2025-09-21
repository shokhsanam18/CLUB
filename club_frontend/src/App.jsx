import MainPage from "./pages/Landing";
import { Route, Routes } from "react-router-dom";
import Layout from "./layout/Layout";
import SignIn from "./pages/login/SignIn";
import Registration from "./pages/login/Registration";
import AboutUs from "./pages/AboutUs";
import News from "./pages/News";
import Clubs from "./pages/Clubs";
import Account from "./pages/Account";
import Ranking from "./pages/Ranking";
import ONEClub from "./pages/OneClub";
import ProtectedRoute from "./components/ProtectedRoute";
import CreateEvent from "./pages/events/CreateEvent";
import EventDetails from "./pages/events/EventDetails";

function App() {
    return (
        <div>
            <Routes>
                <Route path="/" element={<Layout />}>
                    <Route index element={<MainPage />} />
                    <Route path="/About" element={<AboutUs />} />
                    <Route path="/News" element={<News />} />
                    <Route
                        path="/Clubs"
                        element={
                            <ProtectedRoute>
                                <Clubs />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/Clubs/:id"
                        element={
                            <ProtectedRoute>
                                <ONEClub />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/Clubs/:id/events/new"
                        element={
                            <ProtectedRoute>
                                <CreateEvent />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/Events/:id"
                        element={
                            <ProtectedRoute>
                                <EventDetails />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/Account"
                        element={
                            <ProtectedRoute>
                                <Account />
                            </ProtectedRoute>
                        }
                    />
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
