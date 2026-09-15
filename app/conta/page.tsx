import { chatGPTSignOutPath, requireChatGPTUser } from "@/app/chatgpt-auth";
import { loadAccountAccess } from "@/lib/account-access";
import { AccountAccessPanel } from "./account-access-panel";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await requireChatGPTUser("/conta");
  const access = await loadAccountAccess(user);
  return <AccountAccessPanel
    displayName={user.displayName}
    email={user.email}
    signOutPath={chatGPTSignOutPath("/")}
    initialMemberships={access.memberships}
    initialInvitations={access.invitations}
  />;
}
