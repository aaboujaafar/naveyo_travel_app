export type InvitationShareChannel = "whatsapp" | "sms" | "system";

export type InvitationShareStatus = "opened" | "cancelled" | "unavailable";

export interface InvitationShareInput {
  channel: InvitationShareChannel;
  tripName: string;
  invitationLink: string;
}

export interface InvitationShareResult {
  channel: InvitationShareChannel;
  status: InvitationShareStatus;
}

export interface InvitationShareAdapter {
  canOpenUrl(url: string): Promise<boolean>;
  openUrl(url: string): Promise<void>;
  shareSystem(input: {
    message: string;
    invitationLink: string;
  }): Promise<"shared" | "dismissed">;
}

export interface InvitationSharingModule {
  share(input: InvitationShareInput): Promise<InvitationShareResult>;
}
