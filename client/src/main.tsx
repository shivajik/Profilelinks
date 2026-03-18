import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { inject } from "@vercel/analytics";

// Initialize Vercel Analytics
inject();

createRoot(document.getElementById("root")!).render(<App />);
