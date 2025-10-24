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
import CreateClub from "./pages/clubs/CreateClub.jsx";
import EditClub from "./pages/clubs/EditClub.jsx";
import ViewAccount from "./pages/accounts/ViewAccount";
import ClubJoinRequestsHistory from "./pages/ClubJoinRequestsHistory.jsx";
import { ROLES } from "./lib/roles.js";
import RequireRole from "./components/RequireRole.jsx";
import EventEdit from "./pages/events/EventEdit.jsx";
import PermissionDenied from "./components/PermissionDenied.jsx";
import ScrollToTop from "./components/ScrollToTop.jsx";
import NotificationsPage from "./pages/Notifications.jsx";
import ForgotPassword from "./pages/login/ForgotPassword.jsx";
import ResetPassword from "./pages/login/ResetPassword.jsx";

function App() {
    return (
        <div>
            <ScrollToTop />
            <Routes>
                <Route path="/" element={<Layout />}>
                    <Route index element={<MainPage />} />
                    <Route path="/About" element={<AboutUs />} />
                    <Route path="/News" element={<News />} />
                    <Route path="/Clubs" element={<Clubs />} />
                    <Route path="/Clubs/:id" element={<ONEClub />} />
                    <Route
                        path="/Clubs/:id/join-requests"
                        element={
                            <RequireRole roles={[ROLES.Ambassador, ROLES.Superadmin]}>
                                <ClubJoinRequestsHistory />
                            </RequireRole>
                        }
                    />
                    <Route
                        path="/Clubs/new"
                        element={
                            <RequireRole
                                roles={[ROLES.Ambassador, ROLES.Superadmin]}
                                fallback={
                                    <PermissionDenied
                                        title="You don’t have permission to create clubs."
                                        message="Only Ambassadors (and Superadmins) can create clubs."
                                        backTo="/Clubs"
                                    />
                                }
                            >
                                <ProtectedRoute>
                                    <CreateClub />
                                </ProtectedRoute>
                            </RequireRole>
                        }
                    />
                    <Route
                        path="/Clubs/:id/edit"
                        element={
                            <ProtectedRoute>
                                <EditClub />
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

                    <Route path="/Events/:id" element={<EventDetails />} />
                    <Route path="/Events/:id/edit" element={<EventEdit />} />

                    <Route
                        path="/Notifications"
                        element={
                            <ProtectedRoute>
                                <NotificationsPage />
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
                    <Route path="/Accounts/:userId" element={<ViewAccount />} />
                    <Route path="/Ranking" element={<Ranking />} />
                    <Route path="/Register" element={<Registration />} />
                    <Route path="/Login" element={<SignIn />} />
                    <Route path="/Forgot" element={<ForgotPassword />} />
                    <Route path="/reset-confirm/:uidb64/:token" element={<ResetPassword />} />
                </Route>
                <Route path="*" element={<div>404 Not found</div>} />
            </Routes>
        </div>
    );
}
export default App;
