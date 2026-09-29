import { useEffect, useState } from 'react';
import { del, get, post, put } from '../../lib/api';
import { Field, SelectField } from '../../components/Field';
import { PERFIL_LABEL, type AdminDTO, type AdminPerfil } from '../../lib/types';
import { useAdminAuth } from '../../context/AdminAuthContext';

export function AdminAdmins() {
  const { admin } = useAdminAuth();
  const [list, setList] = useState<AdminDTO[]>([]);
  const [invite, setInvite] = useState('');
  const [form, setForm] = useState({ nome: '', email: '', perfil: 'ATENDENTE' as AdminPerfil });

  const load = () => void get<AdminDTO[]>('/api/admin/admins').then(setList);

  useEffect(() => {
    if (admin?.perfil === 'SUPER_ADMIN') load();
  }, [admin]);

  if (admin?.perfil !== 'SUPER_ADMIN') {
    return <p>Somente Super Admin.</p>;
  }

  return (
    <div className="space-y-4">
      <form
        className="card grid gap-3 md:grid-cols-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const data = await post<{ convite: { link: string } }>('/api/admin/admins', form);
          setInvite(data.convite.link);
          setForm({ nome: '', email: '', perfil: 'ATENDENTE' });
          load();
        }}
      >
        <Field label="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
        <Field label="E-mail" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <SelectField
          label="Perfil"
          value={form.perfil}
          onChange={(e) => setForm({ ...form, perfil: e.target.value as AdminPerfil })}
        >
          {(Object.keys(PERFIL_LABEL) as AdminPerfil[]).map((k) => (
            <option key={k} value={k}>
              {PERFIL_LABEL[k]}
            </option>
          ))}
        </SelectField>
        <div className="flex items-end">
          <button type="submit" className="btn-primary w-full">
            Convidar
          </button>
        </div>
      </form>
      {invite && (
        <p className="notice-card break-all text-sm">
          Link de primeiro acesso (envie por e-mail): {invite}
        </p>
      )}
      <div className="overflow-x-auto rounded-3xl bg-white shadow-card">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b text-secondary">
              <th className="p-3">Nome</th>
              <th className="p-3">E-mail</th>
              <th className="p-3">Perfil</th>
              <th className="p-3">Ativo</th>
              <th className="p-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {list.map((a) => (
              <tr key={a.id} className="border-b last:border-0">
                <td className="p-3">{a.nome}</td>
                <td className="p-3">{a.email}</td>
                <td className="p-3">
                  <select
                    className="field py-1"
                    value={a.perfil}
                    onChange={(e) => void put(`/api/admin/admins/${a.id}`, { perfil: e.target.value }).then(load)}
                  >
                    {(Object.keys(PERFIL_LABEL) as AdminPerfil[]).map((k) => (
                      <option key={k} value={k}>
                        {PERFIL_LABEL[k]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-3">{a.ativo === false ? 'Não' : 'Sim'}</td>
                <td className="p-3 space-x-2">
                  <button
                    type="button"
                    className="underline"
                    onClick={async () => {
                      const data = await post<{ link: string }>(`/api/admin/admins/${a.id}/reset-password`);
                      setInvite(data.link);
                    }}
                  >
                    Reset senha
                  </button>
                  <button
                    type="button"
                    className="underline"
                    onClick={() => void put(`/api/admin/admins/${a.id}`, { ativo: a.ativo === false }).then(load)}
                  >
                    {a.ativo === false ? 'Ativar' : 'Desativar'}
                  </button>
                  <button
                    type="button"
                    className="text-danger underline"
                    onClick={() => void del(`/api/admin/admins/${a.id}`).then(load)}
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
