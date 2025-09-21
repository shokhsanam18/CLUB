import React, { useEffect, useState } from "react";
import { useAuthStore } from "../store/auth";

const Account = () => {
    const { user, fetchMyProfile, updateMyProfile, loading, error } = useAuthStore();
    const [form, setForm] = useState({
        email: "",
        first_name: "",
        last_name: "",
        university: "",
        bio: "",
        is_profile_public: true,
    });
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        (async () => {
            const p = await fetchMyProfile();
            const src = p || user || {};
            setForm({
                email: src.email || "",
                first_name: src.first_name || "",
                last_name: src.last_name || "",
                university: src.university || "",
                bio: src.bio || "",
                is_profile_public: !!src.is_profile_public,
            });
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const onChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm((s) => ({ ...s, [name]: type === "checkbox" ? checked : value }));
        setSaved(false);
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        const patch = { ...form };
        const { ok } = await updateMyProfile(patch);
        setSaved(ok);
    };

    return (
        <div className="max-w-2xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-4">My Profile</h1>
            <form onSubmit={onSubmit} className="space-y-4">
                <Field label="Email" name="email" value={form.email} onChange={onChange} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field
                        label="First name"
                        name="first_name"
                        value={form.first_name}
                        onChange={onChange}
                    />
                    <Field
                        label="Last name"
                        name="last_name"
                        value={form.last_name}
                        onChange={onChange}
                    />
                </div>
                <Field
                    label="University"
                    name="university"
                    value={form.university}
                    onChange={onChange}
                />
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                    <textarea
                        name="bio"
                        value={form.bio}
                        onChange={onChange}
                        rows={4}
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#66cc33]"
                    />
                </div>
                <label className="inline-flex items-center gap-2">
                    <input
                        type="checkbox"
                        name="is_profile_public"
                        checked={form.is_profile_public}
                        onChange={onChange}
                    />
                    <span>Profile is public</span>
                </label>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 bg-[#66cc33] text-white font-semibold rounded-lg hover:bg-green-600 transition disabled:opacity-50 cursor-pointer"
                >
                    {loading ? "Saving..." : "Save changes"}
                </button>

                {saved && <p className="text-green-600 text-sm text-center">Saved!</p>}
                {error && <p className="text-red-500 text-sm text-center">{String(error)}</p>}
            </form>
        </div>
    );
};

function Field({ label, name, value, onChange, type = "text" }) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
            <input
                name={name}
                type={type}
                value={value}
                onChange={onChange}
                className="w-full h-12 px-4 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#66cc33]"
            />
        </div>
    );
}

export default Account;
