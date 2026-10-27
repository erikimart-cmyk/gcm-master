import { AccountSessionControl } from "@/features/auth/components/AccountSessionControl";

import { WelcomeHero } from "../components/WelcomeHero";

export function OnboardingPage() {
  return (
    <main className="relative min-h-screen bg-[#09090B] text-white">
      <AccountSessionControl />

      <div className="flex min-h-screen items-center justify-center px-6 pt-20">
        <WelcomeHero />
      </div>
    </main>
  );
}