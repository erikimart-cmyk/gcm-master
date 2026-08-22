import { BrowserRouter, Route, Routes } from "react-router-dom";

import { HomePage } from "@/pages/Home/HomePage";
import { ReviewPage } from "@/features/landing/pages/Review/ReviewPage";
import { QuestionsPage } from "@/features/landing/pages/Review/QuestionsPage";

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        
        <Route
  path="/revisao/questoes"
  element={<QuestionsPage />}
/>
        <Route path="/revisao" element={<ReviewPage />} />
      </Routes>
    </BrowserRouter>
  );
}