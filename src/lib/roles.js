export const ROLES = {
    Registered: "Registered",
    Member: "Member",
    Ambassador: "Ambassador",
    Volunteer: "Volunteer",
    Superadmin: "Superadmin",
};

export function getUserRoles(user) {
    if (!user) return [];
    if (Array.isArray(user.roles)) return user.roles.filter(Boolean);
    if (typeof user.role === "string") return [user.role].filter(Boolean);
    return [];
}
export const hasRole = (user, role) => getUserRoles(user).includes(role);
export const hasAnyRole = (user, allowed = []) =>
    getUserRoles(user).some((r) => allowed.includes(r));
