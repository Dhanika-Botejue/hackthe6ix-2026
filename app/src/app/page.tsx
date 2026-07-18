import { auth0 } from "@/lib/auth0";
import { HomeClient } from "@/components/HomeClient";

export default async function Page() {
  const session = await auth0.getSession();
  return <HomeClient user={session?.user ?? null} />;
}
