import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageShell } from '../components/PageShell';
import { Field, SelectField } from '../components/Field';
import { del, get, post, put, ApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useDisguise } from '../context/DisguiseContext';
import { CONTACT_TYPE_OPTIONS, type ContactType, type EmergencyContact } from '../lib/types';

export function SettingsPage() {
  const { user, setUser, logout } = useAuth();
  const { enabled, setEnabled } = useDisguise();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ nomeCompleto: '', endereco: '' });
  const [newContact, setNewContact] = useState({ nome: '', telefone: '', tipo: 'FAMILIAR' as ContactType });
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setForm({ nomeCompleto: user.nomeCompleto, endereco: user.endereco });
      void get<EmergencyContact[]>('/api/users/me/contacts').then(setContacts);
    }
  }, [user]);

  const saveProfile = async () => {
    setError('');
    try {
      const data = await put<{ user: NonNullable<typeof user> }>('/api/users/me', form);
      setUser(data.user);
      setEditing(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível salvar.');
    }
  };

  const removeAccount = async () => {
    if (!confirm('Excluir seu cadastro de forma permanente?')) return;
    await del('/api/users/me');
    setUser(null);
    navigate('/');
  };

  const addContact = async () => {
    if (!newContact.nome.trim() || !newContact.telefone.trim()) return;
    const created = await post<EmergencyContact>('/api/users/me/contacts', newContact);
    setContacts((c) => [...c, created]);
    setNewContact({ nome: '', telefone: '', tipo: 'FAMILIAR' });
  };

  const removeContact = async (id: string) => {
    await del(`/api/users/me/contacts/${id}`);
    setContacts((c) => c.filter((x) => x.id !== id));
  };

  return (
    <PageShell title="Configurações" subtitle="Ajustes simples e independentes" backTo="/">
      <div className="space-y-4">
        <section className="card">
          <h2 className="font-bold">Modo Disfarce</h2>
          <p className="mb-3 mt-1 text-sm text-secondary">
            Troca o nome da aba por algo neutro. Segure o logo por 3 segundos ou use o PIN 2580 para
            voltar.
          </p>
          <label className="flex min-h-[44px] items-center justify-between gap-3">
            <span>Ativar modo disfarce</span>
            <input
              type="checkbox"
              className="h-6 w-6"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
          </label>
        </section>

        <section className="card">
          <h2 className="font-bold">Meus Dados</h2>
          <p className="mb-3 mt-1 text-sm text-secondary">Veja, edite ou exclua o que foi cadastrado.</p>
          {!user ? (
            <p className="text-sm">
              <Link to="/cadastro" className="underline">
                Faça o cadastro
              </Link>{' '}
              para gerenciar seus dados.
            </p>
          ) : editing ? (
            <>
              <Field
                label="Nome completo"
                value={form.nomeCompleto}
                onChange={(e) => setForm({ ...form, nomeCompleto: e.target.value })}
              />
              <Field
                label="Endereço"
                value={form.endereco}
                onChange={(e) => setForm({ ...form, endereco: e.target.value })}
              />
              {error && <p className="text-sm text-danger">{error}</p>}
              <div className="flex gap-2">
                <button type="button" className="btn-primary" onClick={() => void saveProfile()}>
                  Salvar
                </button>
                <button type="button" className="btn-ghost" onClick={() => setEditing(false)}>
                  Cancelar
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm">
                <strong>Nome:</strong> {user.nomeCompleto}
              </p>
              <p className="text-sm">
                <strong>Endereço:</strong> {user.endereco}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="btn-ghost" onClick={() => setEditing(true)}>
                  Editar
                </button>
                <button type="button" className="btn-ghost" onClick={() => void removeAccount()}>
                  Excluir cadastro
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={async () => {
                    await logout();
                    navigate('/');
                  }}
                >
                  Sair
                </button>
              </div>
            </>
          )}
        </section>

        <section className="card">
          <h2 className="font-bold">Contatos de Emergência</h2>
          <p className="mb-3 mt-1 text-sm text-secondary">Pessoas ou serviços avisados no alerta.</p>
          {!user ? (
            <p className="text-sm text-secondary">Disponível após o cadastro.</p>
          ) : (
            <>
              <ul className="mb-4 space-y-2 text-sm">
                {contacts.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2">
                    <span>
                      {c.nome} · {c.telefone} · {c.tipo}
                    </span>
                    <button type="button" className="text-danger underline" onClick={() => void removeContact(c.id)}>
                      Remover
                    </button>
                  </li>
                ))}
              </ul>
              <Field
                label="Nome"
                value={newContact.nome}
                onChange={(e) => setNewContact({ ...newContact, nome: e.target.value })}
              />
              <Field
                label="Telefone"
                value={newContact.telefone}
                onChange={(e) => setNewContact({ ...newContact, telefone: e.target.value })}
              />
              <SelectField
                label="Tipo"
                value={newContact.tipo}
                onChange={(e) => setNewContact({ ...newContact, tipo: e.target.value as ContactType })}
              >
                {CONTACT_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </SelectField>
              <button type="button" className="btn-primary" onClick={() => void addContact()}>
                Adicionar
              </button>
            </>
          )}
        </section>

        <section className="card text-sm">
          <h2 className="font-bold">Sobre o App</h2>
          <p className="mt-1 text-secondary">
            Alerta Segura oferece apoio e um canal de pedido de ajuda. Em emergência real, ligue 190,
            192 ou 193.
          </p>
        </section>
      </div>
    </PageShell>
  );
}
