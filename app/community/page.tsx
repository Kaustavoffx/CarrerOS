import { redirect } from "next/navigation";

export default function CommunityRedirectPage() {
  // Redirect to the central community dashboard
  redirect("/community-command-center");
}
