import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/auth";
import { notify } from "../../store/notify";

export default function ForgotPassword() {
    const navigate = useNavigate();
    const requestPasswordReset = useAuthStore((s) => s.requestPasswordReset);

    const [email, setEmail] = useState("");
    const [err, setErr] = useState("");
    const [sent, setSent] = useState(false);
    const [busy, setBusy] = useState(false);

    const onSubmit = async (e) => {
        e.preventDefault();
        setErr("");
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setErr("Please enter a valid email.");
            return;
        }
        setBusy(true);
        const res = await requestPasswordReset(email.trim());
        setBusy(false);
        if (res.ok) {
            setSent(true);
            notify.success("If that email is registered, we’ve sent reset instructions.");
        } else {
            notify.error(String(res.error || "Could not send reset email."));
        }
    };

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
                        Reset your password
                    </h2>

                    {sent ? (
                        <div className="space-y-6 text-center">
                            <p className="text-gray-700">
                                If an account exists for <strong>{email}</strong>, a message with a
                                reset link has been sent.
                            </p>
                            <button
                                type="button"
                                onClick={() => navigate("/Login")}
                                className="w-full h-12 bg-[#66cc33] text-white font-semibold rounded-lg hover:bg-green-600 transition cursor-pointer"
                            >
                                Back to Sign In
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={onSubmit} noValidate className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Email
                                </label>
                                <input
                                    name="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className={`w-full h-12 px-4 border-2 ${err ? "border-red-500" : "border-[#66cc33]"} rounded-lg focus:outline-none focus:ring-2 focus:ring-[#66cc33]`}
                                />
                                {err && <p className="text-red-500 text-xs mt-1">{err}</p>}
                            </div>

                            <button
                                type="submit"
                                disabled={busy}
                                className="w-full h-12 bg-[#66cc33] text-white font-semibold rounded-lg hover:bg-green-600 transition disabled:opacity-50 cursor-pointer"
                            >
                                {busy ? "Sending..." : "Send reset link"}
                            </button>

                            <p className="text-center text-sm text-gray-600">
                                Remembered it?{" "}
                                <button
                                    onClick={() => navigate("/Login")}
                                    className="text-[#66cc33] font-semibold hover:underline cursor-pointer"
                                >
                                    Back to Sign In
                                </button>
                            </p>
                        </form>
                    )}
                </div>
            </section>
        </main>
    );
}
