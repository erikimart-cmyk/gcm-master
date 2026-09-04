import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../context/useAuth";

export function RequireAuth() {
  const { isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#09090B] px-6 text-zinc-300">
        Verificando sua sessão…
      </main>
    );
  }

  if (!user) {
    return <Navigate replace to="/auth" state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
