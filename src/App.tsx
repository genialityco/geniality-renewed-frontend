// src/App.tsx
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/tiptap/styles.css';
import '@mantine/notifications/styles.css';
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { BrowserRouter, unstable_HistoryRouter as HistoryRouter } from "react-router-dom";

import { UserProvider } from "./context/UserContext";
import { PaymentModalProvider } from "./context/PaymentModalContext";
import { OrganizationProvider } from "./context/OrganizationContext";

import AppRoutes from "./routes/AppRoutes";
import { theme } from "./theme";
import SessionWatcher from './components/SessionWatcher';
import ActivityWatcher from './components/ActivityWatcher';
import { getOrgIdFromHost } from "./config/customDomains";
import { createBrandedHistory } from "./router/brandedHistory";

// En dominios white-label la URL se muestra "limpia" (sin el prefijo
// /organization/<id>), traduciendo en el history del router. Ver
// src/router/brandedHistory.ts y src/config/customDomains.ts.
const brandedOrgId = getOrgIdFromHost();
const brandedHistory = brandedOrgId ? createBrandedHistory(brandedOrgId) : null;

export default function App() {
  const content = (
    <UserProvider>
      <SessionWatcher />
      <ActivityWatcher />
      <PaymentModalProvider>
        <OrganizationProvider>
          <AppRoutes />
        </OrganizationProvider>
      </PaymentModalProvider>
    </UserProvider>
  );

  return (
    <MantineProvider theme={theme}>
      <Notifications position="top-center" zIndex={2000} />
      {brandedHistory ? (
        <HistoryRouter history={brandedHistory}>{content}</HistoryRouter>
      ) : (
        <BrowserRouter>{content}</BrowserRouter>
      )}
    </MantineProvider>
  );
}
