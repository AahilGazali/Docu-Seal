import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { ROUTES } from '../utils/constants';

const DashboardLayout = lazy(() => import('../layouts/DashboardLayout').then((m) => ({ default: m.DashboardLayout })));
const Login = lazy(() => import('../features/auth/Login').then((m) => ({ default: m.Login })));
const Register = lazy(() => import('../features/auth/Register').then((m) => ({ default: m.Register })));
const ForgotPassword = lazy(() => import('../features/auth/ForgotPassword').then((m) => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import('../features/auth/ResetPassword').then((m) => ({ default: m.ResetPassword })));
const NotFound = lazy(() => import('../features/errors/NotFound').then((m) => ({ default: m.NotFound })));
const Dashboard = lazy(() => import('../features/documents/Dashboard').then((m) => ({ default: m.Dashboard })));
const UploadDocument = lazy(() => import('../features/documents/UploadDocument').then((m) => ({ default: m.UploadDocument })));
const ViewDocument = lazy(() => import('../features/documents/ViewDocument').then((m) => ({ default: m.ViewDocument })));
const AuditTrail = lazy(() => import('../features/documents/AuditTrail').then((m) => ({ default: m.AuditTrail })));
const Trash = lazy(() => import('../features/documents/Trash').then((m) => ({ default: m.Trash })));
const SignDocument = lazy(() => import('../features/signatures/SignDocument').then((m) => ({ default: m.SignDocument })));
const Settings = lazy(() => import('../features/settings/Settings').then((m) => ({ default: m.Settings })));

function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
    </div>
  );
}

export function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route path={ROUTES.LOGIN} element={<Login />} />
      <Route path={ROUTES.REGISTER} element={<Register />} />
      <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPassword />} />
      <Route path={ROUTES.RESET_PASSWORD} element={<ResetPassword />} />
      <Route path={ROUTES.SIGN_DOCUMENT} element={<SignDocument />} />
      <Route
        path={ROUTES.DASHBOARD}
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="upload" element={<UploadDocument />} />
        <Route path="audit" element={<AuditTrail />} />
        <Route path="trash" element={<Trash />} />
        <Route path="settings" element={<Settings />} />
        {/* Keep documents/:id last to avoid route conflicts */}
        <Route path="documents/:id" element={<ViewDocument />} />
      </Route>
      <Route path="/" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
    </Suspense>
  );
}
