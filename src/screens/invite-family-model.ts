import type { TripInvitation, TripMember } from "../modules/_shared/model";

const invitationEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeInvitationEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isInvitationEmailValid(value: string): boolean {
  return invitationEmailPattern.test(normalizeInvitationEmail(value));
}

export function isInvitationShareReady(
  invitation: Pick<TripInvitation, "token"> | null,
  email: string,
): boolean {
  return invitation !== null || isInvitationEmailValid(email);
}

export function buildInvitationDeepLink(
  invitation: Pick<TripInvitation, "token">,
): string {
  return `naveyo://invite/${invitation.token}`;
}

export function describeMember(
  member: TripMember,
  index: number,
): { name: string; role: string; status: "Propriétaire" | "Éditeur" } {
  const accountNumber = index + 1;
  return {
    name: `Compte ${accountNumber}`,
    role:
      member.role === "owner"
        ? "Organisateur · compte propriétaire"
        : "Membre du Voyage · compte éditeur",
    status: member.role === "owner" ? "Propriétaire" : "Éditeur",
  };
}
