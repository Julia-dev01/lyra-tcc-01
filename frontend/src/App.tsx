import { Navigate, Route, Routes } from 'react-router-dom';
import { QuickExitButton } from './components/QuickExitButton';
import { DisguiseScreen } from './components/DisguiseScreen';
import { useDisguise } from './context/DisguiseContext';
import { HomePage } from './pages/HomePage';
import { RegisterPage } from './pages/RegisterPage';
import { LoginPage } from './pages/LoginPage';
import { AlertPage } from './pages/AlertPage';
import { ChatPage } from './pages/ChatPage';
import { SupportPage } from './pages/SupportPage';
import { SettingsPage } from './pages/SettingsPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminAlerts } from './pages/admin/AdminAlerts';
import { AdminChats } from './pages/admin/AdminChats';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminAdmins } from './pages/admin/AdminAdmins';
import { AdminContent } from './pages/admin/AdminContent';
import { AdminAudit } from './pages/admin/AdminAudit';
import { AdminReports } from './pages/admin/AdminReports';

export default function App() {
  const { enabled, unlocked } = useDisguise();

  if (enabled && !unlocked) {
    return (
      <>
        <QuickExitButton />
        <DisguiseScreen />
      </>
    );
  }

  return (
    <>
      <QuickExitButton />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/cadastro" element={<RegisterPage />} />
        <Route path="/entrar" element={<LoginPage />} />
        <Route path="/alerta" element={<AlertPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/apoio" element={<SupportPage />} />
        <Route path="/configuracoes" element={<SettingsPage />} />
        <Route path="/privacidade" element={<PrivacyPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin/primeiro-acesso" element={<AdminLoginPage />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="alertas" element={<AdminAlerts />} />
          <Route path="chats" element={<AdminChats />} />
          <Route path="usuarias" element={<AdminUsers />} />
          <Route path="admins" element={<AdminAdmins />} />
          <Route path="conteudo" element={<AdminContent />} />
          <Route path="auditoria" element={<AdminAudit />} />
          <Route path="relatorios" element={<AdminReports />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
