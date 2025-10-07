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

export const CAN_MANAGE_CLUBS = [ROLES.Ambassador, ROLES.Superadmin];
export const CAN_MANAGE_EVENTS = [ROLES.Ambassador, ROLES.Volunteer, ROLES.Superadmin];

export const canManageClubs = (user) => hasAnyRole(user, CAN_MANAGE_CLUBS);
export const canManageEvents = (user) => hasAnyRole(user, CAN_MANAGE_EVENTS);

export const CAN_ADD_EVENT_REPORT = [ROLES.Ambassador, ROLES.Volunteer];
export const CAN_REVIEW_EVENT_REPORTS = [ROLES.Ambassador];
export const CAN_APPROVE_EVENT_REPORTS = [ROLES.Ambassador];
export const CAN_VIEW_EVENT_REPORTS = [ROLES.Ambassador, ROLES.Volunteer];

export const canAddEventReport = (u) => hasAnyRole(u, CAN_ADD_EVENT_REPORT);
export const canReviewEventReports = (u) => hasAnyRole(u, CAN_REVIEW_EVENT_REPORTS);
export const canApproveEventReports = (u) => hasAnyRole(u, CAN_APPROVE_EVENT_REPORTS);
export const canViewEventReports = (u) => hasAnyRole(u, CAN_VIEW_EVENT_REPORTS);

export const isSuperadmin = (u) => hasRole(u, ROLES.Superadmin);
export const isAmbassador = (u) => hasRole(u, ROLES.Ambassador);
export const isVolunteer = (u) => hasRole(u, ROLES.Volunteer);

export function isMemberOfClub(user, club) {
    if (!user || !club) return false;
    if (typeof club.is_member === "boolean") return club.is_member;

    const list = Array.isArray(club.members) ? club.members : [];
    return list.some(
        (m) =>
            String(m?.id) === String(user?.id) ||
            (m?.username && m.username === user?.username) ||
            (m?.email && m.email === user?.email),
    );
}

export function canManageClubUI(user, club) {
    if (isSuperadmin(user)) return true;
    return isAmbassador(user) && isMemberOfClub(user, club);
}

export function canManageEventsInClub(user, club) {
    if (isSuperadmin(user)) return true;
    return (isAmbassador(user) || isVolunteer(user)) && isMemberOfClub(user, club);
}

export function canSeeJoinRequestsForClub(user, club) {
    if (isSuperadmin(user)) return true;
    return isAmbassador(user) && isMemberOfClub(user, club);
}

export function canSeeEventReportsForClub(user, club) {
    if (isSuperadmin(user)) return true;
    return (isAmbassador(user) || isVolunteer(user)) && isMemberOfClub(user, club);
}
