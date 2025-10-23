import React, { useState } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { useAuthStore } from "../../store/auth";
import { notify } from "../../store/notify";

export default function ResetPassword() {
    const { uidb64, token } = useParams();
    const navigate = useNavigate();
    const confirmPasswordReset = useAuthStore((s) => s.confirmPasswordReset);

    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [err, setErr] = useState("");
    const [busy, setBusy] = useState(false);

    const invalidParams = !uidb64 || !token;

    const validate = () => {
        if (!password) return "Password is required.";
        if (password.length < 8) return "Use at least 8 characters.";
        if (password !== confirm) return "Passwords do not match.";
        return "";
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        const v = validate();
        setErr(v);
        if (v) return;
        setBusy(true);
        const res = await confirmPasswordReset({ uidb64, token, new_password: password });
        setBusy(false);
        if (res.ok) {
            notify.success("Password updated. You can now sign in.");
            navigate("/Login");
        } else {
            notify.error(String(res.error || "Could not reset password."));
        }
    };

    if (invalidParams) {
        return <Navigate to="/Login" replace />;
    }

    return (
        <main className="min-h-[calc(100svh-64px)] md:min-h-[calc(100svh-80px)] grid grid-cols-1 md:grid-cols-2 overflow-hidden font-['Outfit'] bg-[#121212]">
            <aside className="hidden md:block">
                <img
                    src="/auth-background.png"
                    alt="Auth background"
                    className="object-cover w-full h-full"
                />
            </aside>

            <section className="bg-black bg-opacity-60 flex items-center justify-center px-4 sm:px-6 lg:pr-10 2xl:pr-12 lg:pl-8 py-6 md:py-8">
                <div className="w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl bg-white p-6 sm:p-8 md:p-10 rounded-3xl shadow-2xl">
                    <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-8 md:mb-10 text-gray-800">
                        Set a new password
                    </h2>

                    <form onSubmit={onSubmit} noValidate className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                New password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className={`w-full h-12 px-4 border-2 ${err ? "border-red-500" : "border-[#66cc33]"} rounded-lg focus:outline-none focus:ring-2 focus:ring-[#66cc33]`}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Confirm password
                            </label>
                            <input
                                type="password"
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                className={`w-full h-12 px-4 border-2 ${err ? "border-red-500" : "border-[#66cc33]"} rounded-lg focus:outline-none focus:ring-2 focus:ring-[#66cc33]`}
                            />
                            {err && <p className="text-red-500 text-xs mt-1">{err}</p>}
                        </div>

                        <button
                            type="submit"
                            disabled={busy}
                            className="w-full h-12 bg-[#66cc33] text-white font-semibold rounded-lg hover:bg-green-600 transition disabled:opacity-50 cursor-pointer"
                        >
                            {busy ? "Updating..." : "Update password"}
                        </button>

                        <p className="text-center text-sm text-gray-600">
                            Back to{" "}
                            <button
                                onClick={() => navigate("/Login")}
                                className="text-[#66cc33] font-semibold hover:underline cursor-pointer"
                            >
                                Sign In
                            </button>
                        </p>
                    </form>
                </div>
            </section>
        </main>
    );
}
