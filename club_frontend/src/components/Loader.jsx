import React from "react";

export default function Loader({ label = "Loading...", size = 150, className = "" }) {
    const style = {
        width: `${size}px`,
        height: `${size}px`,
        lineHeight: `${size}px`,
    };
    return (
        <div
            role="status"
            aria-live="polite"
            aria-label={label}
            className={`it-loader ${className}`}
            style={style}
        >
            {label}
            <span aria-hidden="true" />
        </div>
    );
}
