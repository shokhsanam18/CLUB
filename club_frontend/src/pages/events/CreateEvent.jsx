import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useClubsStore } from "../../store/clubs";
import { useAuthStore } from "../../store/auth";
import { ROLES, hasAnyRole } from "../../lib/roles";

export default function CreateEvent() {
    const { id: clubId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const canManage = hasAnyRole(user, [ROLES.Ambassador, ROLES.Volunteer, ROLES.Superadmin]);

    const [form, setForm] = useState({
        title: "",
        description: "",
        start_time: "",
        end_time: "",
        location: "",
        cover: "",
        tags: "",
    });
    const [submitting, setSubmitting] = useState(false);
    const [err, setErr] = useState(null);

    if (!canManage) {
        return (
            <div className="max-w-xl mx-auto p-6">
                <p className="text-red-600">You don’t have permission to create events.</p>
                <Link to={`/Clubs/${clubId}`} className="text-blue-600 underline">
                    Back
                </Link>
            </div>
        );
    }

    const onChange = (e) => setForm((s) => ({ ...s, [e.target.name]: e.target.value }));

    const onSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setErr(null);
        try {
            const payload = {
                club: Number(clubId),
                title: form.title,
                description: form.description,
                start_time: form.start_time || undefined,
                end_time: form.end_time || undefined,
                location: form.location || undefined,
                cover: form.cover || undefined,
                tags: form.tags,
            };
            const createEvent = useClubsStore.getState().createEvent;
            await createEvent(payload);
            navigate(`/Clubs/${clubId}`);
        } catch (e2) {
            setErr(e2?.response?.data ? JSON.stringify(e2.response.data) : String(e2.message));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-4">Create Event</h1>
            <form onSubmit={onSubmit} className="space-y-4">
                <Field label="Title" name="title" value={form.title} onChange={onChange} required />
                <Field
                    label="Description"
                    name="description"
                    value={form.description}
                    onChange={onChange}
                    textarea
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field
                        label="Start time"
                        name="start_time"
                        value={form.start_time}
                        onChange={onChange}
                        placeholder="2025-09-01T09:00:00Z"
                    />
                    <Field
                        label="End time"
                        name="end_time"
                        value={form.end_time}
                        onChange={onChange}
                        placeholder="2025-09-01T11:00:00Z"
                    />
                </div>
                <Field label="Location" name="location" value={form.location} onChange={onChange} />
                <Field label="Cover URL" name="cover" value={form.cover} onChange={onChange} />
                <Field label="Tags" name="tags" value={form.tags} onChange={onChange} />

                <button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-12 bg-[#66cc33] text-white font-semibold rounded-lg hover:bg-green-600 transition disabled:opacity-50 cursor-pointer"
                >
                    {submitting ? "Creating…" : "Create Event"}
                </button>
                {err && <p className="text-red-600 text-sm text-center">{err}</p>}
            </form>
        </div>
    );
}

function Field({ label, name, value, onChange, textarea, ...rest }) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
            {textarea ? (
                <textarea
                    name={name}
                    value={value}
                    onChange={onChange}
                    rows={5}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#66cc33]"
                    {...rest}
                />
            ) : (
                <input
                    name={name}
                    value={value}
                    onChange={onChange}
                    className="w-full h-12 px-4 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#66cc33]"
                    {...rest}
                />
            )}
        </div>
    );
}
