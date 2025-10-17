import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/auth";
import { notify } from "../../store/notify";

const Registration = () => {
    const navigate = useNavigate();
    const { register, getRegisterSchema, loading, error } = useAuthStore();

    const [schema, setSchema] = useState({
        required_fields: [
            "email",
            "first_name",
            "last_name",
            "password",
            "password_confirm",
            "tg_id",
        ],
        optional_fields: ["university", "bio"],
    });

    const [form, setForm] = useState({
        email: "",
        first_name: "",
        last_name: "",
        password: "",
        password_confirm: "",
        tg_id: "",
        university: "",
        bio: "",
    });

    const [errs, setErrs] = useState({});

    useEffect(() => {
        (async () => {
            const s = await getRegisterSchema();
            if (s?.required_fields) setSchema((prev) => ({ ...prev, ...s }));
        })();
    }, []);

    const validate = () => {
        const e = {};
        schema.required_fields.forEach((f) => {
            if (!form[f]) e[f] = "Required";
        });
        if ((form.password || "").length < 6) e.password = "Min 6 characters";
        if (form.password !== form.password_confirm) e.password_confirm = "Passwords do not match";
        setErrs(e);
        return !Object.keys(e).length;
    };

    const onSubmit = async (ev) => {
        ev.preventDefault();
        if (!validate()) return;
        const payload = { ...form };
        const res = await register(payload);
        if (res.ok) {
            notify.success("Account created");
            navigate("/");
        } else if (res?.error) {
            notify.error(String(res.error));
        }
    };

    const onChange = (e) => {
        const { name, value } = e.target;
        setForm((p) => ({ ...p, [name]: value }));
        if (errs[name]) setErrs((p) => ({ ...p, [name]: null }));
    };

    return (
        <>
            <main className="min-h-[calc(100svh-64px)] md:min-h-[calc(100svh-80px)] grid grid-cols-1 md:grid-cols-2 overflow-hidden font-['Outfit'] bg-[#121212]">
                <section className="order-2 md:order-1 bg-black bg-opacity-60 flex items-center justify-center px-4 sm:px-6 lg:pl-10 2xl:pl-12 lg:pr-8 py-6 md:py-8">
                    <div className="w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl bg-white p-6 sm:p-8 md:p-10 rounded-3xl shadow-2xl">
                        <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-8 text-gray-800">
                            Create an Account
                        </h2>

                        <form onSubmit={onSubmit} noValidate className="space-y-5">
                            <Field
                                label="First name"
                                name="first_name"
                                value={form.first_name}
                                onChange={onChange}
                                error={errs.first_name}
                                placeholder="John"
                            />
                            <Field
                                label="Last name"
                                name="last_name"
                                value={form.last_name}
                                onChange={onChange}
                                error={errs.last_name}
                                placeholder="Doe"
                            />
                            <Field
                                label="Email"
                                name="email"
                                type="email"
                                value={form.email}
                                onChange={onChange}
                                error={errs.email}
                                placeholder="youremail@gmail.com"
                            />
                            <Field
                                label="Password"
                                name="password"
                                type="password"
                                value={form.password}
                                onChange={onChange}
                                error={errs.password}
                                placeholder="********"
                            />
                            <Field
                                label="Confirm password"
                                name="password_confirm"
                                type="password"
                                value={form.password_confirm}
                                onChange={onChange}
                                error={errs.password_confirm}
                                placeholder="********"
                            />
                            <Field
                                label="Telegram Nickname"
                                name="tg_id"
                                value={form.tg_id}
                                onChange={onChange}
                                error={errs.tg_id}
                                placeholder="@yournickname"
                            />
                            <Field
                                label="University / Region"
                                name="university"
                                value={form.university}
                                onChange={onChange}
                                placeholder="MIT / Tashkent"
                            />
                            <Field
                                label="Bio (optional)"
                                name="bio"
                                value={form.bio}
                                onChange={onChange}
                                placeholder="Your bio"
                            />

                            <button
                                type="submit"
                                className="w-full h-12 bg-[#66cc33] text-white font-semibold rounded-lg hover:bg-green-600 transition disabled:opacity-50 cursor-pointer"
                                disabled={loading}
                            >
                                {loading ? "Processing..." : "Create Account"}
                            </button>

                            {error && (
                                <p className="text-red-500 text-center text-sm mt-4">
                                    {typeof error === "string" ? error : JSON.stringify(error)}
                                </p>
                            )}
                        </form>

                        <div className="mt-6 text-center text-sm text-gray-600">
                            Already have an account?{" "}
                            <button
                                onClick={() => navigate("/Login")}
                                className="text-[#66cc33] font-medium hover:underline cursor-pointer"
                            >
                                Log In
                            </button>
                        </div>
                    </div>
                </section>

                <aside className="hidden md:block order-1 md:order-2">
                    <img
                        src="/auth-background.png"
                        alt="Auth background"
                        className="object-cover w-full h-full"
                    />
                </aside>
            </main>
        </>
    );
};

function Field({ label, name, value, onChange, error, type = "text", placeholder = "" }) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
            <input
                name={name}
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className={`w-full h-12 px-4 border-2 ${error ? "border-red-500" : "border-[#66cc33]"} rounded-lg focus:outline-none focus:ring-2 focus:ring-[#66cc33]`}
            />
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>
    );
}

export default Registration;
