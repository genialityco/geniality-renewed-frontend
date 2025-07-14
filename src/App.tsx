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

export default function App() {
  return (
    <MantineProvider theme={theme}>
      <UserProvider>
        <PaymentModalProvider>
          <BrowserRouter>
            <OrganizationProvider>
              <AppRoutes />
            </OrganizationProvider>
          </BrowserRouter>
        </PaymentModalProvider>
      </UserProvider>
    </MantineProvider>
  );
}
