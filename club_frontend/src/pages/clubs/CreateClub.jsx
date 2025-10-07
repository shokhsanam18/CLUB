import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "../../store/auth";
import { useClubsStore } from "../../store/clubs";
import { canManageClubs } from "../../lib/roles";
import { notify } from "../../store/notify";

const formatApiError = (ex) => {
    const d = ex?.response?.data;
    if (!d) return ex?.message || "Request failed";
    if (typeof d === "string") return d;
    if (Array.isArray(d)) return d.join(", ");
    return Object.entries(d)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
        .join(" | ");
};

export default function CreateClub() {
    const { user, fetchMyProfile } = useAuthStore();
    const navigate = useNavigate();
    const createClub = useClubsStore((s) => s.createClub);

    const profileUniversity = useMemo(() => {
        const raw =
            typeof user?.university === "string"
                ? user?.university
                : user?.university?.name || user?.university || "";
        return String(raw || "").trim();
    }, [user?.university]);

    const [form, setForm] = useState({ name: "", university: "", description: "" });
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState(null);

    useEffect(() => {
        fetchMyProfile?.().catch(() => {});
    }, [fetchMyProfile]);

    useEffect(() => {
        setForm((s) => ({ ...s, university: profileUniversity }));
    }, [profileUniversity]);

    if (!canManageClubs(user)) {
        return (
            <div className="max-w-xl mx-auto p-6">
                <p className="text-red-600">You don’t have permission to create clubs.</p>
                <Link to="/Clubs" className="text-blue-600 underline">
                    Back
                </Link>
            </div>
        );
    }

    const onChange = (e) => {
        const { name, value } = e.target;
        setForm((s) => ({ ...s, [name]: value }));
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        setErr(null);
        if (!form.name.trim()) return setErr("Name is required");
        if (form.name.length > 100) return setErr("Name must be ≤ 100 chars");
        if (form.university.length > 200) return setErr("University must be ≤ 200 chars");
        if (form.description.length > 200) return setErr("Description must be ≤ 200 chars");

        setLoading(true);
        try {
            const created = await createClub(form);
            notify.success("Club created");
            navigate(`/Clubs/${created.id}`);
        } catch (ex) {
            const msg = formatApiError(ex);
            setErr(msg);
            notify.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const noUniversity = !form.university.trim();

    return (
        <div className="min-h-screen bg-[#1F1F1F] font-['Outfit']">
            <div className="mx-auto max-w-3xl px-6 py-10">
                <h1 className="text-white text-2xl font-bold mb-6">Create a new club</h1>

                <form
                    onSubmit={onSubmit}
                    className="bg-[#262626] rounded-xl ring-1 ring-white/10 p-6 space-y-5"
                >
                    <Field
                        label="Name *"
                        name="name"
                        value={form.name}
                        onChange={onChange}
                        maxLength={100}
                        required
                    />
                    <Field
                        label="University (from your profile)"
                        name="university"
                        value={form.university}
                        onChange={onChange}
                        maxLength={200}
                        readOnly
                    />
                    <div className="text-sm text-white/60 -mt-3">
                        {noUniversity ? (
                            <>
                                No university set.{" "}
                                <Link to="/Account" className="underline text-white">
                                    Add it in My Account
                                </Link>{" "}
                                and come back.
                            </>
                        ) : (
                            <>
                                To change the university, update it in{" "}
                                <Link to="/Account" className="underline text-white">
                                    My Account
                                </Link>
                                .
                            </>
                        )}
                    </div>
                    <Field
                        label="Description"
                        name="description"
                        value={form.description}
                        onChange={onChange}
                        maxLength={200}
                        textarea
                    />

                    <button
                        type="submit"
                        disabled={loading}
                        className="px-8 py-2 bg-[#77C042] text-white font-semibold rounded-md hover:bg-[#67b539] disabled:opacity-50 cursor-pointer"
                    >
                        {loading ? "Creating…" : "Create"}
                    </button>
                    {err && <p className="text-red-400 text-sm mt-2">{err}</p>}
                </form>

                <div className="mt-6">
                    <Link to="/Clubs" className="text-white/80 hover:underline">
                        Back to list
                    </Link>
                </div>
            </div>
        </div>
    );
}

function Field({ label, name, value, onChange, textarea = false, ...rest }) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
            {textarea ? (
                <textarea
                    className="w-full bg-transparent text-white placeholder-gray-400 px-4 py-3 border border-white/20 rounded-md outline-none resize-y"
                    name={name}
                    value={value}
                    onChange={onChange}
                    rows={5}
                    {...rest}
                />
            ) : (
                <input
                    className="w-full bg-transparent text-white placeholder-gray-400 px-4 py-3 border border-white/20 rounded-md outline-none"
                    name={name}
                    value={value}
                    onChange={onChange}
                    {...rest}
                />
            )}
        </div>
    );
}
