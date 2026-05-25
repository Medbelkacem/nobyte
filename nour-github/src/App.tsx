import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { I18nProvider } from '@/i18n';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { OutboxProvider } from '@/providers/OutboxProvider';
import { ToastProvider } from '@/components/ui/Toast';
import { Spinner } from '@/components/ui/Spinner';
import { AppShell } from '@/components/layout/AppShell';
import { NourPanel } from '@/components/nour/NourPanel';

const SplashPage      = lazy(() => import('@/pages/SplashPage').then(m => ({ default: m.SplashPage })));
const LoginPage       = lazy(() => import('@/pages/LoginPage').then(m => ({ default: m.LoginPage })));
const SignupPage      = lazy(() => import('@/pages/SignupPage').then(m => ({ default: m.SignupPage })));
const OTPVerifyPage   = lazy(() => import('@/pages/OTPVerifyPage').then(m => ({ default: m.OTPVerifyPage })));
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
const HomePage        = lazy(() => import('@/pages/HomePage').then(m => ({ default: m.HomePage })));
const WilayaPickerPage  = lazy(() => import('@/pages/WilayaPickerPage').then(m => ({ default: m.WilayaPickerPage })));
const InstitutionPickerPage = lazy(() => import('@/pages/InstitutionPickerPage').then(m => ({ default: m.InstitutionPickerPage })));
const EstablishmentPickerPage = lazy(() => import('@/pages/EstablishmentPickerPage').then(m => ({ default: m.EstablishmentPickerPage })));
const ServicePickerPage = lazy(() => import('@/pages/ServicePickerPage').then(m => ({ default: m.ServicePickerPage })));
const TicketPage      = lazy(() => import('@/pages/TicketPage').then(m => ({ default: m.TicketPage })));
const MyTicketsPage   = lazy(() => import('@/pages/MyTicketsPage').then(m => ({ default: m.MyTicketsPage })));
const ProfilePage     = lazy(() => import('@/pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const AgentDashboard  = lazy(() => import('@/pages/agent/AgentDashboard').then(m => ({ default: m.AgentDashboard })));
const AdminDashboard  = lazy(() => import('@/pages/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthed, loading } = useAuth();
  if (loading) return <Spinner label="…" />;
  if (!isAuthed) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireAgent({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'agent' && user.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <OutboxProvider>
          <ToastProvider>
            <BrowserRouter>
              <Suspense fallback={<Spinner />}>
                <Routes>
                  {/* Public */}
                  <Route path="/splash" element={<SplashPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/signup" element={<SignupPage />} />
                  <Route path="/verify" element={<OTPVerifyPage />} />
                  <Route path="/reset" element={<ResetPasswordPage />} />

                  {/* Privé — citoyen */}
                  <Route element={<RequireAuth><AppShell /></RequireAuth>}>
                    <Route index element={<HomePage />} />
                    <Route path="/flow/wilaya" element={<WilayaPickerPage />} />
                    <Route path="/flow/wilaya/:wilayaId/institutions" element={<InstitutionPickerPage />} />
                    <Route path="/flow/wilaya/:wilayaId/institutions/:typeId/establishments" element={<EstablishmentPickerPage />} />
                    <Route path="/flow/establishments/:establishmentId/services" element={<ServicePickerPage />} />
                    <Route path="/ticket/:ticketId" element={<TicketPage />} />
                    <Route path="/me/tickets" element={<MyTicketsPage />} />
                    <Route path="/me" element={<ProfilePage />} />
                    <Route path="/admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
                  </Route>

                  {/* Agent */}
                  <Route path="/agent" element={<RequireAgent><AgentDashboard /></RequireAgent>} />

                  <Route path="*" element={<Navigate to="/splash" replace />} />
                </Routes>
              </Suspense>
              {/* Panneau Nour flottant, accessible partout sauf splash/agent */}
              <NourPanel />
            </BrowserRouter>
          </ToastProvider>
          </OutboxProvider>
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
