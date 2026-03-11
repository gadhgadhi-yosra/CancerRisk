// import { Toaster } from "@/components/ui/toaster";
// import { Toaster as Sonner } from "@/components/ui/sonner";
// import { TooltipProvider } from "@/components/ui/tooltip";
// import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// import { BrowserRouter, Routes, Route } from "react-router-dom";
// import { Suspense, lazy } from "react";
// import Layout from "@/components/Layout";

// const Index = lazy(() => import("./pages/Index"));
// const Dashboard = lazy(() => import("./pages/Dashboard"));
// const RiskScore = lazy(() => import("./pages/RiskScore"));
// const XAIPage = lazy(() => import("./pages/XAIPage"));
// const Assistant = lazy(() => import("./pages/Assistant"));
// const NotFound = lazy(() => import("./pages/NotFound"));

// const queryClient = new QueryClient();

// const App = () => (
//   <QueryClientProvider client={queryClient}>
//     <TooltipProvider>
//       <Toaster />
//       <Sonner />
//       <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
//         <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Chargement...</div>}>
//           <Routes>
//             <Route element={<Layout />}>
//               <Route path="/" element={<Index />} />
//               <Route path="/dashboard" element={<Dashboard />} />
//               <Route path="/risk-score" element={<RiskScore />} />
//               <Route path="/xai" element={<XAIPage />} />
//               <Route path="/assistant" element={<Assistant />} />
//             </Route>
//             <Route path="*" element={<NotFound />} />
//           </Routes>
//         </Suspense>
//       </BrowserRouter>
//     </TooltipProvider>
//   </QueryClientProvider>
// );

// export default App;

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import Layout from "@/components/Layout";

const Index = lazy(() => import("./pages/Index"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const RiskScore = lazy(() => import("./pages/RiskScore"));
const XAIPage = lazy(() => import("./pages/XAIPage"));
const Assistant = lazy(() => import("./pages/Assistant"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense
          fallback={
            <div className="p-6 text-sm text-muted-foreground">
              Chargement...
            </div>
          }
        >
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Index />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/risk-score" element={<RiskScore />} />
              <Route path="/xai" element={<XAIPage />} />
              <Route path="/assistant" element={<Assistant />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;