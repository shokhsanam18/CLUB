import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Lock } from "react-feather";

export default function PermissionDenied({
    title = "You don’t have permission to view this page.",
    message = "If you believe this is a mistake, contact your ambassador or support.",
    backTo = "/",
    ctaHref = null,
    ctaText = null,
}) {
    const navigate = useNavigate();
    return (
        <div className="bg-[#222222] min-h-[60vh] flex items-center">
            <div className="max-w-3xl mx-auto w-full px-6 py-14 text-white">
                <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-8">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center">
                            <Lock size={18} className="text-white" />
                        </div>
                        <h1 className="text-2xl font-semibold">{title}</h1>
                    </div>

                    <p className="mt-3 text-white/80">{message}</p>

                    <div className="mt-6 flex flex-wrap gap-3">
                        <button
                            type="button"
                            className="px-4 py-2 rounded-md bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                            onClick={() =>
                                window.history.length > 1 ? navigate(-1) : navigate(backTo)
                            }
                        >
                            Back
                        </button>

                        {ctaHref && ctaText ? (
                            <Link
                                to={ctaHref}
                                className="px-4 py-2 rounded-md bg-[#77C042] text-black font-semibold cursor-pointer"
                            >
                                {ctaText}
                            </Link>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
}
