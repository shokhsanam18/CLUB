import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useClubsStore } from "../../store/clubs";
import { useAuthStore } from "../../store/auth";
import { canManageClubs } from "../../lib/roles";
import { notify } from "../../store/notify";
import Loader from "../../components/Loader.jsx";

export default function EditClub() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const getClub = useClubsStore((s) => s.getClub);
    const updateClub = useClubsStore((s) => s.updateClub);
    const deleteClub = useClubsStore((s) => s.deleteClub);

    const [form, setForm] = useState({
        name: "",
        university: "",
        description: "",
    });
    const [logoPreview, setLogoPreview] = useState("/uni_logo.png");
    const [logoFile, setLogoFile] = useState(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState(null);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const c = await getClub(id, true);
                setForm({
                    name: c?.name || "",
                    university: c?.university || "",
                    description: c?.description || "",
                });
                setLogoPreview(c?.logo && String(c.logo).trim() ? c.logo : "/uni_logo.png");
            } finally {
                setLoading(false);
            }
        })();
    }, [id, getClub]);

    useEffect(
        () => () => {
            if (logoPreview && logoPreview.startsWith("blob:")) {
                URL.revokeObjectURL(logoPreview);
            }
        },
        [logoPreview],
    );

    if (!canManageClubs(user)) {
        return (
            <div className="max-w-xl mx-auto p-6">
                <p className="text-red-600">You don’t have permission to edit clubs.</p>
                <Link to={`/Clubs/${id}`} className="text-blue-600 underline">
                    Back
                </Link>
            </div>
        );
    }

    const onChange = (e) => {
        const { name, value } = e.target;
        setForm((s) => ({ ...s, [name]: value }));
    };

    const onLogoChange = (e) => {
        const file = e.target.files?.[0] || null;
        if (logoPreview && logoPreview.startsWith("blob:")) {
            URL.revokeObjectURL(logoPreview);
        }
        if (file) {
            setLogoFile(file);
            setLogoPreview(URL.createObjectURL(file));
        } else {
            setLogoFile(null);
        }
    };

    const onSave = async (e) => {
        e.preventDefault();
        setErr(null);
        if (!form.name.trim()) return setErr("Name is required");
        if (form.name.length > 100) return setErr("Name must be ≤ 100 chars");
        if (form.university.length > 200) return setErr("University must be ≤ 200 chars");
        if (form.description.length > 200) return setErr("Description must be ≤ 200 chars");
        setSaving(true);
        try {
            const updated = await updateClub(id, { ...form, logo: logoFile }, "put");
            if (updated?.logo) {
                setLogoPreview(updated.logo);
            }
            notify.success("Club updated");
            navigate(`/Clubs/${id}`);
        } catch (ex) {
            const m = typeof ex?.response?.data === "string" ? ex.response.data : ex.message;
            setErr(m);
            notify.error(m);
        } finally {
            setSaving(false);
        }
    };

    const onDelete = async () => {
        if (!confirm("Delete this club? This cannot be undone.")) return;
        try {
            await deleteClub(id);
            notify.success("Club deleted");
            navigate("/Clubs");
        } catch (ex) {
            notify.error(typeof ex?.response?.data === "string" ? ex.response.data : ex.message);
        }
    };

    if (loading) {
        return (
            <div className="relative min-h-[50vh] bg-[#121212]">
                <Loader label="Loading..." />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#1F1F1F] font-['Outfit']">
            <div className="mx-auto max-w-3xl px-6 py-10">
                <h1 className="text-white text-2xl font-bold mb-6">Edit club</h1>

                <form
                    onSubmit={onSave}
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
                        label="University"
                        name="university"
                        value={form.university}
                        onChange={onChange}
                        maxLength={200}
                    />
                    <Field
                        label="Description"
                        name="description"
                        value={form.description}
                        onChange={onChange}
                        maxLength={200}
                        textarea
                    />

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Logo</label>
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full overflow-hidden bg-white/10 flex items-center justify-center text-[11px] text-gray-400">
                                {logoPreview ? (
                                    <img
                                        src={logoPreview}
                                        alt="Logo"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <>No logo</>
                                )}
                            </div>
                            <div>
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={onLogoChange}
                                    className="text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[#77C042] file:text-white hover:file:bg-[#67b539]"
                                />
                                <p className="mt-1 text-xs text-white/60">
                                    Upload a new logo to replace the current one. JPEG, PNG or WEBP,
                                    up to 2MB.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-6 py-2 bg-[#77C042] text-white rounded-md disabled:opacity-50 cursor-pointer"
                        >
                            {saving ? "Saving…" : "Save"}
                        </button>
                        <button
                            type="button"
                            onClick={onDelete}
                            className="px-6 py-2 bg-red-600 text-white rounded-md cursor-pointer"
                        >
                            Delete
                        </button>
                        <Link
                            to={`/Clubs/${id}`}
                            className="px-6 py-2 bg-black text-white rounded-md"
                        >
                            Cancel
                        </Link>
                    </div>
                    {err && <p className="text-red-400 text-sm mt-2">{err}</p>}
                </form>
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
