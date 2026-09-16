import { getBranding } from "@/lib/branding";
import LoginForm from "@/components/LoginForm";

export default async function LoginPage() {
  const b = await getBranding();
  return <LoginForm appName={b.app_name} />;
}
