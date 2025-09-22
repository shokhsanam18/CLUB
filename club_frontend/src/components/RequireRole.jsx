import { useAuthStore } from "../store/auth";
import { hasAnyRole } from "../lib/roles";

export default function RequireRole({ roles = [], children, fallback = null }) {
    const { user } = useAuthStore();
    if (!roles.length) return children;
    return hasAnyRole(user, roles) ? children : fallback;
}
