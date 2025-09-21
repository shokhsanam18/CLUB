import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/auth";

export default function ProtectedRoute({ children }) {
    const { tokens } = useAuthStore();
    const location = useLocation();
    const isAuthed = Boolean(tokens?.access);
    return isAuthed ? children : <Navigate to="/Login" replace state={{ from: location }} />;
}
