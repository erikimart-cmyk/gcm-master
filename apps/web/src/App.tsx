import { AppRouter } from "./app/router/router";
import { AuthProvider } from "./features/auth/context/AuthProvider";
import { useAuth } from "./features/auth/context/useAuth";
import { StudyProgressProvider } from "./features/landing/context/StudyProgressContext";

function AppContent() {
  const { user } = useAuth();

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
