import { describe, expect, it } from "vitest";
import type { TripMember, UUID } from "../modules/_shared/model";
import {
  buildInvitationDeepLink,
  describeMember,
  isInvitationEmailValid,
  normalizeInvitationEmail,
} from "./invite-family-model";

describe("invite family presentation model", () => {
  it("normalizes and validates an invitation email", () => {
    expect(normalizeInvitationEmail("  Sophie@Example.COM ")).toBe(
      "sophie@example.com",
    );
    expect(isInvitationEmailValid("sophie@example.com")).toBe(true);
    expect(isInvitationEmailValid("Sophie Laurent")).toBe(false);
  });

  it("builds the existing Expo Router invitation deep link", () => {
    expect(buildInvitationDeepLink({ token: "invite-token" as UUID })).toBe(
      "naveyo://invite/invite-token",
    );
  });

  it("keeps the V0 owner and editor roles", () => {
    const owner: TripMember = {
      accountId: "account-owner" as UUID,
      role: "owner",
    };
    const editor: TripMember = {
      accountId: "account-editor" as UUID,
      role: "editor",
    };

    expect(describeMember(owner, 0).status).toBe("Propriétaire");
    expect(describeMember(editor, 1).status).toBe("Éditeur");
  });
});
