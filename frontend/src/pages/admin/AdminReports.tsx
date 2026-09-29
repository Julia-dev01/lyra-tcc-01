import { download } from '../../lib/api';

export function AdminReports() {
  return (
    <div className="card space-y-3">
      <h2 className="font-bold">Relatórios anonimizados</h2>
      <p className="text-sm text-secondary">Sem nome, telefone ou endereço. O download fica no log de auditoria.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary" onClick={() => void download('/api/admin/reports/users.csv', 'usuarias.csv')}>
          CSV usuárias
        </button>
        <button type="button" className="btn-primary" onClick={() => void download('/api/admin/reports/alerts.csv', 'alertas.csv')}>
          CSV alertas
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => void download('/api/admin/reports/summary.pdf', 'resumo.pdf')}
        >
          PDF resumo
        </button>
      </div>
    </div>
  );
}
