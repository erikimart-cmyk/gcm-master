import { AppRouter } from "./app/router/router";
import { AuthProvider } from "./features/auth/context/AuthProvider";
import { useAuth } from "./features/auth/context/useAuth";
import { StudyProgressProvider } from "./features/landing/context/StudyProgressContext";

export function AppContent() {
  const { suppressAuthenticatedBootstrap, user } = useAuth();

  if (suppressAuthenticatedBootstrap) {
    return <AppRouter />;
  }

  return (
    <StudyProgressProvider key={user?.id ?? "signed-out"}>
      <AppRouter />
    </StudyProgressProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
