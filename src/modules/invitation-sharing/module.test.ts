import { describe, expect, it, vi } from "vitest";
import {
  buildInvitationShareMessage,
  createInvitationSharingModule,
  type InvitationShareAdapter,
} from ".";

function fakeAdapter(): InvitationShareAdapter {
  return {
    canOpenUrl: vi.fn(async () => true),
    openUrl: vi.fn(async () => undefined),
    shareSystem: vi.fn(async () => "shared" as const),
  };
}

describe("invitation sharing module", () => {
  it("builds one consistent message for every channel", () => {
    expect(buildInvitationShareMessage("Lisbonne 2026", "naveyo://invite/abc"))
      .toBe("Rejoins Lisbonne 2026 sur Naveyo : naveyo://invite/abc");
  });

  it("opens WhatsApp with the encoded invitation message", async () => {
    const adapter = fakeAdapter();
    const module = createInvitationSharingModule(adapter);

    const result = await module.share({
      channel: "whatsapp",
      tripName: "Lisbonne 2026",
      invitationLink: "naveyo://invite/abc",
    });

    expect(result).toEqual({ channel: "whatsapp", status: "opened" });
    expect(adapter.canOpenUrl).toHaveBeenCalledWith(
      "whatsapp://send?text=Rejoins%20Lisbonne%202026%20sur%20Naveyo%20%3A%20naveyo%3A%2F%2Finvite%2Fabc",
    );
    expect(adapter.openUrl).toHaveBeenCalledWith(
      "whatsapp://send?text=Rejoins%20Lisbonne%202026%20sur%20Naveyo%20%3A%20naveyo%3A%2F%2Finvite%2Fabc",
    );
  });

  it("opens the SMS composer with the encoded body", async () => {
    const adapter = fakeAdapter();
    const module = createInvitationSharingModule(adapter);

    await module.share({
      channel: "sms",
      tripName: "Porto",
      invitationLink: "naveyo://invite/abc",
    });

    expect(adapter.openUrl).toHaveBeenCalledWith(
      "sms:?&body=Rejoins%20Porto%20sur%20Naveyo%20%3A%20naveyo%3A%2F%2Finvite%2Fabc",
    );
  });

  it("maps a dismissed system sheet to a cancelled result", async () => {
    const adapter = fakeAdapter();
    adapter.shareSystem = vi.fn(async () => "dismissed" as const);
    const module = createInvitationSharingModule(adapter);

    await expect(
      module.share({
        channel: "system",
        tripName: "Porto",
        invitationLink: "naveyo://invite/abc",
      }),
    ).resolves.toEqual({ channel: "system", status: "cancelled" });
    expect(adapter.shareSystem).toHaveBeenCalledWith({
      message: "Rejoins Porto sur Naveyo : naveyo://invite/abc",
      invitationLink: "naveyo://invite/abc",
    });
  });

  it("reports an unavailable app without throwing", async () => {
    const adapter = fakeAdapter();
    adapter.canOpenUrl = vi.fn(async () => false);
    const module = createInvitationSharingModule(adapter);

    await expect(
      module.share({
        channel: "whatsapp",
        tripName: "Porto",
        invitationLink: "naveyo://invite/abc",
      }),
    ).resolves.toEqual({ channel: "whatsapp", status: "unavailable" });
    expect(adapter.openUrl).not.toHaveBeenCalled();
  });
});
