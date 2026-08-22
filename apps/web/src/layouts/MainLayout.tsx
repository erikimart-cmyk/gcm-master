import type { ReactNode } from "react";
import { Header } from "../shared/components/layout/Header/Header";
import { Footer } from "../shared/components/layout/Footer/Footer";

type MainLayoutProps = {
  children: ReactNode;
};

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Header />

      <main>{children}</main>

      <Footer />
    </div>
  );
}