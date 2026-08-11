import { Linking, Share } from "react-native";
import type { InvitationShareAdapter } from "../../modules/invitation-sharing";

export function createReactNativeInvitationShareAdapter(): InvitationShareAdapter {
  return {
    async canOpenUrl(url) {
      try {
        return await Linking.canOpenURL(url);
      } catch {
        return false;
      }
    },
    openUrl: (url) => Linking.openURL(url),
    async shareSystem({ message, invitationLink }) {
      const result = await Share.share({
        message,
        url: invitationLink,
      });
      return result.action === Share.dismissedAction ? "dismissed" : "shared";
    },
  };
}
