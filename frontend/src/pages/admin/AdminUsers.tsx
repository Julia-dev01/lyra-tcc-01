import { useEffect, useState } from 'react';
import { del, get, post } from '../../lib/api';
import { Field, SelectField } from '../../components/Field';
import { TIPO_VIOLENCIA_OPTIONS, ARMA_OPTIONS, type UserDTO } from '../../lib/types';

export function AdminUsers() {
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<UserDTO | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    nomeCompleto: '',
    contato: '',
    secret: '123456',
    endereco: '',
    tipoViolencia: 'PREFIRO_NAO_INFORMAR',
    agressorArma: 'NAO_SEI',
    consentimentoLgpd: true,
  });

  const load = () => {
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    void get<{ users: UserDTO[] }>(`/api/admin/users${q}`).then((d) => setUsers(d.users));
  };

  useEffect(() => {
    load();
  }, []);

  const open = async (id: string) => {
    const data = await get<{ user: UserDTO }>(`/api/admin/users/${id}`);
    setSelected(data.user);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input
          className="field max-w-xs"
          placeholder="Buscar"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
        />
        <button type="button" className="btn-ghost" onClick={load}>
          Buscar
        </button>
        <button type="button" className="btn-primary" onClick={() => setCreating(true)}>
          Cadastrar manualmente
        </button>
      </div>
      <div className="overflow-x-auto rounded-3xl bg-white shadow-card">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b text-secondary">
              <th className="p-3">Nome</th>
              <th className="p-3">Contato</th>
              <th className="p-3">Tipo</th>
              <th className="p-3">Arma</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b last:border-0">
                <td className="p-3">
                  <button type="button" className="underline" onClick={() => void open(u.id)}>
                    {u.nomeCompleto}
                  </button>
                </td>
                <td className="p-3">{u.contato}</td>
                <td className="p-3">{u.tipoViolencia}</td>
                <td className="p-3">{u.agressorArma}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected && (
        <div className="card space-y-2">
          <h2 className="font-bold">Ficha</h2>
          <p>
            {selected.nomeCompleto} · {selected.contato}
          </p>
          <p>{selected.endereco}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-ghost"
              onClick={async () => {
                await post(`/api/admin/users/${selected.id}/archive`);
                setSelected(null);
                load();
              }}
            >
              Arquivar
            </button>
            <button
              type="button"
              className="btn-ghost text-danger"
              onClick={async () => {
                if (!confirm('Excluir (LGPD)?')) return;
                await del(`/api/admin/users/${selected.id}`);
                setSelected(null);
                load();
              }}
            >
              Excluir
            </button>
          </div>
        </div>
      )}
      {creating && (
        <form
          className="card"
          onSubmit={async (e) => {
            e.preventDefault();
            await post('/api/admin/users', form);
            setCreating(false);
            load();
          }}
        >
          <h2 className="mb-3 font-bold">Cadastro manual</h2>
          <Field label="Nome" value={form.nomeCompleto} onChange={(e) => setForm({ ...form, nomeCompleto: e.target.value })} required />
          <Field label="Contato" value={form.contato} onChange={(e) => setForm({ ...form, contato: e.target.value })} required />
          <Field label="Endereço" value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} required />
          <Field label="PIN/senha" value={form.secret} onChange={(e) => setForm({ ...form, secret: e.target.value })} required />
          <SelectField
            label="Tipo"
            value={form.tipoViolencia}
            onChange={(e) => setForm({ ...form, tipoViolencia: e.target.value })}
          >
            {TIPO_VIOLENCIA_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Arma"
            value={form.agressorArma}
            onChange={(e) => setForm({ ...form, agressorArma: e.target.value })}
          >
            {ARMA_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </SelectField>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary">
              Salvar
            </button>
            <button type="button" className="btn-ghost" onClick={() => setCreating(false)}>
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
