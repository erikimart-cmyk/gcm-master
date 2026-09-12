import { BrowserRouter, Route, Routes } from "react-router-dom";

import { HomePage } from "@/pages/Home/HomePage";
import { ReviewPage } from "@/features/landing/pages/Review/ReviewPage";
import { QuestionsPage } from "@/features/landing/pages/Review/QuestionsPage";
import { ReviewContentPage } from "@/features/landing/pages/Review/ReviewContentPage";
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";
import { OnboardingPage } from "@/features/onboarding";
import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { AuthPage } from "@/features/auth/pages/AuthPage";
import { PlansPage } from "@/features/plans/pages/PlansPage";

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/planos" element={<PlansPage />} />
        <Route element={<RequireAuth />}>
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/revisao/questoes" element={<QuestionsPage />} />
          <Route path="/revisao/conteudo" element={<ReviewContentPage />} />
          <Route path="/revisao" element={<ReviewPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
