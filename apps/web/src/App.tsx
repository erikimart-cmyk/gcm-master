import { AppRouter } from "./app/router/router";
import { StudyProgressProvider } from "./features/landing/context/StudyProgressContext";

function App() {
  return (
    <StudyProgressProvider>
      <AppRouter />
    </StudyProgressProvider>
  );
}

export default App;