import { SignOutButton } from "@/features/auth/components/SignOutButton";

import { WelcomeHero } from "../components/WelcomeHero";

export function OnboardingPage() {
  return (
    <main className="relative min-h-screen bg-[#09090B] text-white">
      <div className="absolute top-6 right-6 z-10">
        <SignOutButton />
      </div>

      <div className="flex min-h-screen items-center justify-center px-6">
        <WelcomeHero />
      </div>
    </main>
  );
}