import { WelcomeHero } from "../components/WelcomeHero";

export function OnboardingPage() {
  return (
    <main className="min-h-screen bg-[#09090B] text-white">

      <div className="flex min-h-screen items-center justify-center px-6">

        <WelcomeHero />

      </div>

    </main>
  );
}