// src/App.tsx
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import { MantineProvider } from "@mantine/core";
import { BrowserRouter } from "react-router-dom";

import { UserProvider } from "./context/UserContext";
import { PaymentModalProvider } from "./context/PaymentModalContext";
import { OrganizationProvider } from "./context/OrganizationContext";

import AppRoutes from "./routes/AppRoutes";
import { theme } from "./theme";
import SessionWatcher from './components/SessionWatcher';
import ActivityWatcher from './components/ActivityWatcher';

export default function App() {
  return (
    <MantineProvider theme={theme}>
      <BrowserRouter>
        <UserProvider>
          <SessionWatcher />
          <ActivityWatcher />
          <PaymentModalProvider>
            <OrganizationProvider>
              <AppRoutes />
            </OrganizationProvider>
          </PaymentModalProvider>
        </UserProvider>
      </BrowserRouter>
    </MantineProvider>
  );
}
