import { Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { Loading } from '../../components/Loading';
import { PERFIL_LABEL } from '../../lib/types';

const LINKS: Array<{ to: string; label: string; end?: boolean; roles?: string[] }> = [
  { to: '/admin', label: 'Painel', end: true },
  { to: '/admin/alertas', label: 'Alertas' },
  { to: '/admin/chats', label: 'Chats' },
  { to: '/admin/usuarias', label: 'Usuárias' },
  { to: '/admin/conteudo', label: 'Conteúdo' },
  { to: '/admin/admins', label: 'Admins', roles: ['SUPER_ADMIN'] },
  { to: '/admin/auditoria', label: 'Auditoria', roles: ['SUPER_ADMIN'] },
  { to: '/admin/relatorios', label: 'Relatórios', roles: ['SUPER_ADMIN', 'ATENDENTE'] },
];

export function AdminLayout() {
  const { admin, loading, logout } = useAdminAuth();
  const navigate = useNavigate();

  if (loading) return <Loading />;
  if (!admin) return <Navigate to="/admin/login" replace />;

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-gradient-to-r from-primary to-secondary px-4 pb-4 pt-14 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Alerta Segura · Admin</h1>
            <p className="text-xs text-white/80">
              {admin.nome} · {PERFIL_LABEL[admin.perfil]}
            </p>
          </div>
          <button
            type="button"
            className="rounded-2xl bg-white/15 px-3 py-2 text-sm font-semibold"
            onClick={async () => {
              await logout();
              navigate('/admin/login');
            }}
          >
            Sair
          </button>
        </div>
        <nav className="mx-auto mt-4 flex max-w-6xl gap-2 overflow-x-auto pb-1">
          {LINKS.filter((l) => !l.roles || l.roles.includes(admin.perfil)).map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-full px-3 py-2 text-sm ${isActive ? 'bg-white text-primary' : 'bg-white/15 text-white'}`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
