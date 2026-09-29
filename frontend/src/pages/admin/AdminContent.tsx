import { useEffect, useState } from 'react';
import { del, get, post } from '../../lib/api';
import { Field, SelectField, TextAreaField } from '../../components/Field';
import type { ContentPage, Ngo } from '../../lib/types';

export function AdminContent() {
  const [ngos, setNgos] = useState<Ngo[]>([]);
  const [pages, setPages] = useState<ContentPage[]>([]);
  const [ngoForm, setNgoForm] = useState({ nome: '', descricao: '', telefone: '', cidade: '', uf: '' });
  const [pageForm, setPageForm] = useState({
    tipo: 'JURIDICA',
    titulo: '',
    resumo: '',
    conteudo: '',
  });

  const load = () => {
    void get<Ngo[]>('/api/admin/ngos').then(setNgos);
    void get<ContentPage[]>('/api/admin/content-pages').then(setPages);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <section className="card">
        <h2 className="mb-3 font-bold">ONGs parceiras</h2>
        <form
          className="grid gap-2 md:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            await post('/api/admin/ngos', ngoForm);
            setNgoForm({ nome: '', descricao: '', telefone: '', cidade: '', uf: '' });
            load();
          }}
        >
          <Field label="Nome" value={ngoForm.nome} onChange={(e) => setNgoForm({ ...ngoForm, nome: e.target.value })} required />
          <Field label="Telefone" value={ngoForm.telefone} onChange={(e) => setNgoForm({ ...ngoForm, telefone: e.target.value })} />
          <Field label="Cidade" value={ngoForm.cidade} onChange={(e) => setNgoForm({ ...ngoForm, cidade: e.target.value })} />
          <Field label="UF" value={ngoForm.uf} onChange={(e) => setNgoForm({ ...ngoForm, uf: e.target.value })} />
          <div className="md:col-span-2">
            <Field label="Descrição" value={ngoForm.descricao} onChange={(e) => setNgoForm({ ...ngoForm, descricao: e.target.value })} />
          </div>
          <button type="submit" className="btn-primary">
            Adicionar ONG
          </button>
        </form>
        <ul className="mt-4 space-y-2 text-sm">
          {ngos.map((n) => (
            <li key={n.id} className="flex justify-between gap-2">
              <span>
                {n.nome} {n.ativo ? '' : '(inativa)'}
              </span>
              <button type="button" className="text-danger underline" onClick={() => void del(`/api/admin/ngos/${n.id}`).then(load)}>
                Desativar
              </button>
            </li>
          ))}
        </ul>
      </section>
      <section className="card">
        <h2 className="mb-3 font-bold">Orientações</h2>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await post('/api/admin/content-pages', pageForm);
            setPageForm({ tipo: 'JURIDICA', titulo: '', resumo: '', conteudo: '' });
            load();
          }}
        >
          <SelectField label="Tipo" value={pageForm.tipo} onChange={(e) => setPageForm({ ...pageForm, tipo: e.target.value })}>
            <option value="JURIDICA">Jurídica</option>
            <option value="PSICOLOGICA">Psicológica</option>
            <option value="OUTRA">Outra</option>
          </SelectField>
          <Field label="Título" value={pageForm.titulo} onChange={(e) => setPageForm({ ...pageForm, titulo: e.target.value })} required />
          <Field label="Resumo" value={pageForm.resumo} onChange={(e) => setPageForm({ ...pageForm, resumo: e.target.value })} />
          <TextAreaField
            label="Conteúdo"
            value={pageForm.conteudo}
            onChange={(e) => setPageForm({ ...pageForm, conteudo: e.target.value })}
            required
          />
          <button type="submit" className="btn-primary">
            Publicar
          </button>
        </form>
        <ul className="mt-4 space-y-2 text-sm">
          {pages.map((p) => (
            <li key={p.id} className="flex justify-between gap-2">
              <span>
                {p.titulo} ({p.tipo})
              </span>
              <button
                type="button"
                className="text-danger underline"
                onClick={() => void del(`/api/admin/content-pages/${p.id}`).then(load)}
              >
                Despublicar
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
