import type {
  InvitationShareAdapter,
  InvitationShareChannel,
  InvitationShareInput,
  InvitationShareResult,
  InvitationSharingModule,
} from "./interface";

const channelUrls: Record<Exclude<InvitationShareChannel, "system">, (message: string) => string> = {
  whatsapp: (message) => `whatsapp://send?text=${encodeURIComponent(message)}`,
  sms: (message) => `sms:?&body=${encodeURIComponent(message)}`,
};

export function buildInvitationShareMessage(
  tripName: string,
  invitationLink: string,
): string {
  const normalizedTripName = tripName.trim() || "mon Voyage";
  const normalizedLink = invitationLink.trim();
  if (!normalizedLink) throw new Error("An invitation link is required");
  return `Rejoins ${normalizedTripName} sur Naveyo : ${normalizedLink}`;
}

export function createInvitationSharingModule(
  adapter: InvitationShareAdapter,
): InvitationSharingModule {
  return {
    async share(input: InvitationShareInput): Promise<InvitationShareResult> {
      const invitationLink = input.invitationLink.trim();
      const message = buildInvitationShareMessage(
        input.tripName,
        invitationLink,
      );

      if (input.channel === "system") {
        const result = await adapter.shareSystem({
          message,
          invitationLink,
        });
        return {
          channel: input.channel,
          status: result === "dismissed" ? "cancelled" : "opened",
        };
      }

      const url = channelUrls[input.channel](message);
      if (!(await adapter.canOpenUrl(url))) {
        return { channel: input.channel, status: "unavailable" };
      }

      try {
        await adapter.openUrl(url);
      } catch {
        return { channel: input.channel, status: "unavailable" };
      }
      return { channel: input.channel, status: "opened" };
    },
  };
}
