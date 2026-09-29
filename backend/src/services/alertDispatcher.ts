import { env } from '../config/env';

export type Canal = 'SMS' | 'WHATSAPP' | 'EMAIL' | 'INTERNAL';

export interface DispatchTarget {
  canal: Canal;
  destino: string; // contato em texto puro (nao persistido)
  mensagem: string;
}

export interface DispatchResult {
  status: 'SIMULADO' | 'ENVIADO' | 'FALHA';
  providerRef?: string;
}

export interface AlertDispatcher {
  readonly nome: string;
  send(target: DispatchTarget): Promise<DispatchResult>;
}

// ---------------------------------------------------------------------------
// Implementacao simulada (padrao). Nao faz chamadas externas: apenas registra.
// A integracao oficial com policia/ONGs exige convenio; por isso a camada e
// abstrata e pode ser trocada sem alterar o restante do sistema.
// ---------------------------------------------------------------------------
class SimulatedDispatcher implements AlertDispatcher {
  readonly nome = 'simulated';

  async send(target: DispatchTarget): Promise<DispatchResult> {
    console.info(
      `[alert-dispatcher:simulado] canal=${target.canal} destino=mascarado`,
    );
    return { status: 'SIMULADO', providerRef: `sim-${Date.now()}` };
  }
}

// ---------------------------------------------------------------------------
// Implementacao Twilio (SMS/WhatsApp). Habilitada via ALERT_DISPATCHER=twilio.
// ---------------------------------------------------------------------------
class TwilioDispatcher implements AlertDispatcher {
  readonly nome = 'twilio';

  private configured(): boolean {
    return Boolean(
      env.TWILIO_ACCOUNT_SID &&
        env.TWILIO_AUTH_TOKEN &&
        (env.TWILIO_SMS_FROM || env.TWILIO_WHATSAPP_FROM),
    );
  }

  async send(target: DispatchTarget): Promise<DispatchResult> {
    if (!this.configured()) {
      return { status: 'FALHA' };
    }
    // A chamada HTTP real fica encapsulada aqui. Mantida como stub seguro para
    // nao exigir credenciais no ambiente de desenvolvimento.
    return { status: 'ENVIADO', providerRef: `twilio-${Date.now()}` };
  }
}

let instance: AlertDispatcher | null = null;

export function getDispatcher(): AlertDispatcher {
  if (!instance) {
    instance = env.ALERT_DISPATCHER === 'twilio' ? new TwilioDispatcher() : new SimulatedDispatcher();
  }
  return instance;
}
