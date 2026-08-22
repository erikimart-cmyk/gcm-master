import { MainLayout } from "../../layouts/MainLayout";
import { LandingPage } from "../../features/landing/pages/LandingPage";

export function HomePage() {
  return (
    <MainLayout>
      <LandingPage />
    </MainLayout>
  );
}