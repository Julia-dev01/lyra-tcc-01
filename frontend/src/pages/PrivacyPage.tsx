import { PageShell } from '../components/PageShell';

export function PrivacyPage() {
  return (
    <PageShell title="Política de Privacidade" subtitle="Como usamos as informações" backTo="/cadastro">
      <section className="card space-y-3 text-sm leading-relaxed">
        <p>
          No cadastro pedimos nome completo, endereço, tipo de violência, se há arma e se existe
          familiar para contato de emergência.
        </p>
        <p>
          Essas informações ficam protegidas e são usadas para oferecer apoio neste sistema. Em um
          alerta, a equipe autorizada pode ver o necessário para encaminhar o atendimento.
        </p>
        <p>
          Você pode acessar, corrigir ou excluir seus dados em Configurações.
        </p>
      </section>
    </PageShell>
  );
}
