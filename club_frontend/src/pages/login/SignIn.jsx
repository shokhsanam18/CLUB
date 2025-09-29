import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/auth";
import { notify } from "../../store/notify";

const SignIn = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, loading, error } = useAuthStore();
    const [formData, setFormData] = useState({ email: "", password: "" });
    const [formErrors, setFormErrors] = useState({ email: "", password: "" });

    const validateForm = () => {
        let isValid = true;
        const next = { email: "", password: "" };
        if (!formData.email) {
            next.email = "Email is required";
            isValid = false;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            next.email = "Please enter a valid email";
            isValid = false;
        }
        if (!formData.password) {
            next.password = "Password is required";
            isValid = false;
        }
        setFormErrors(next);
        return isValid;
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;
        const res = await login({ emailOrUsername: formData.email, password: formData.password });
        if (res.ok) {
            notify.success(`Welcome${res.user?.first_name ? ", " + res.user.first_name : "!"}`);
            const redirect = location.state?.from?.pathname || "/";
            navigate(redirect);
        } else if (res?.error) {
            notify.error(String(res.error));
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((p) => ({ ...p, [name]: value }));
        if (formErrors[name]) setFormErrors((p) => ({ ...p, [name]: "" }));
    };

    return (
        <>
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
                            Welcome Back
                        </h2>

                        <form onSubmit={onSubmit} noValidate className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Email or Username
                                </label>
                                <input
                                    name="email"
                                    type="text"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className={`w-full h-12 px-4 border-2 ${formErrors.email ? "border-red-500" : "border-[#66cc33]"} rounded-lg focus:outline-none focus:ring-2 focus:ring-[#66cc33]`}
                                />
                                {formErrors.email && (
                                    <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Password
                                </label>
                                <input
                                    name="password"
                                    type="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className={`w-full h-12 px-4 border-2 ${formErrors.password ? "border-red-500" : "border-[#66cc33]"} rounded-lg focus:outline-none focus:ring-2 focus:ring-[#66cc33]`}
                                />
                                {formErrors.password && (
                                    <p className="text-red-500 text-xs mt-1">
                                        {formErrors.password}
                                    </p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full h-12 bg-[#66cc33] text-white font-semibold rounded-lg hover:bg-green-600 transition disabled:opacity-50 cursor-pointer"
                            >
                                {loading ? "Signing in..." : "Sign In"}
                            </button>
                            {(typeof error === "string" ? error : null) && (
                                <p className="text-red-500 text-center text-sm mt-4">
                                    {String(error)}
                                </p>
                            )}
                        </form>

                        <p className="mt-8 text-center text-sm text-gray-600">
                            Don't have an account?{" "}
                            <button
                                onClick={() => navigate("/Register")}
                                className="text-[#66cc33] font-semibold hover:underline cursor-pointer"
                            >
                                Register
                            </button>
                        </p>
                    </div>
                </section>
            </main>
        </>
    );
};

export default SignIn;
