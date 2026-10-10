import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { homeFor, Layout, RequireRole } from './components/Layout';
import { Notice, Page } from './components/ui';
import { AuthProvider, useAuth } from './lib/auth';
import { DurabilityPage } from './pages/AdminPages';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import { EarningsPage, PublishRidePage, RidesPage, VehiclesPage } from './pages/DriverPages';
import { BookingsPage, SearchPage } from './pages/PassengerPages';

function Home() {
  const { user } = useAuth();
  return <Navigate to={user ? homeFor(user.role) : '/login'} replace />;
}

function NotFound() {
  return (
    <Page title="Page not found">
      <Notice tone="info">There is nothing at this address.</Notice>
    </Page>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route element={<RequireRole role="PASSENGER" />}>
          <Route path="search" element={<SearchPage />} />
          <Route path="bookings" element={<BookingsPage />} />
        </Route>
        <Route element={<RequireRole role="DRIVER" />}>
          <Route path="rides" element={<RidesPage />} />
          <Route path="rides/new" element={<PublishRidePage />} />
          <Route path="vehicles" element={<VehiclesPage />} />
          <Route path="earnings" element={<EarningsPage />} />
        </Route>
        <Route element={<RequireRole role="ADMIN" />}>
          <Route path="admin/durability" element={<DurabilityPage />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  // A failed request is shown with a retry button; silent automatic retries would
  // hide a 4xx the user needs to read.
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } }));
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
