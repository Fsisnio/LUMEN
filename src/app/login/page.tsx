import { Suspense } from "react";
import { LoginFallback, LoginPageClient } from "./LoginPageClient";

export default function LoginPage() {
  const showDemoAccounts = process.env.NODE_ENV !== "production";

  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginPageClient showDemoAccounts={showDemoAccounts} />
    </Suspense>
  );
}
