import "@fontsource-variable/geist";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import App from "./App";
import { ServidorAcordando } from "./components/ServidorAcordando";
import { ConviteInstalarPwa } from "./components/ConviteInstalarPwa";
import { registrarServiceWorker } from "./pwa/registrar";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ServidorAcordando />
        <App />
        <ConviteInstalarPwa />
        <Toaster richColors position="top-right" />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);

registrarServiceWorker();
