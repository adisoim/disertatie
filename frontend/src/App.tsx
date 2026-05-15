import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DashboardPage from "./pages/DashboardPage.tsx";
import ExperimentsPage from "./pages/ExperimentsPage.tsx";
import RunPage from "./pages/RunPage.tsx";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-[#0f172a] text-white flex flex-col w-full">
          <nav className="bg-[#1e293b] border-b border-gray-700/50 p-4 w-full">
            <div className="w-full px-4 md:px-8 flex gap-6">
              <Link to="/" className="text-lg font-bold text-blue-400">
                SQLancer Dashboard
              </Link>
              <Link to="/" className="hover:text-blue-300 transition-colors">
                Dashboard
              </Link>
              <Link to="/experiments" className="hover:text-blue-300 transition-colors">
                Experiments
              </Link>
              <Link to="/run" className="hover:text-blue-300 transition-colors">
                Run New
              </Link>
            </div>
          </nav>
          
          <main className="w-full flex-grow p-4 md:p-8">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/experiments" element={<ExperimentsPage />} />
              <Route path="/run" element={<RunPage />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}