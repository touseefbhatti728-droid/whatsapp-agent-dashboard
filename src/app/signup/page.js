import { getBranding } from "@/lib/branding";
import SignupForm from "@/components/SignupForm";

export default async function SignupPage() {
  const b = await getBranding();
  return <SignupForm appName={b.app_name} />;
}
