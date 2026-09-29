import { useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';
import { installEscQuickExit, performQuickExit } from '../lib/quickExit';

const TIP_KEY = 'as.quickExitTip';

export function QuickExitButton() {
  const [showTip, setShowTip] = useState(false);

  useEffect(() => {
    const seen = sessionStorage.getItem(TIP_KEY);
    if (!seen) {
      setShowTip(true);
      sessionStorage.setItem(TIP_KEY, '1');
    }
    return installEscQuickExit();
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => void performQuickExit()}
        className="fixed right-3 top-3 z-[80] inline-flex min-h-[44px] min-w-[44px] items-center gap-2 rounded-2xl bg-danger px-3 py-2 text-sm font-bold text-white shadow-card"
        aria-label="Saída rápida. Limpa seus dados nesta sessão e abre um site neutro."
      >
        <LogOut size={18} aria-hidden />
        Saída rápida
      </button>
      {showTip && (
        <div
          role="status"
          className="fixed right-3 top-[4.2rem] z-[80] max-w-[16rem] rounded-2xl bg-white p-3 text-xs text-primary shadow-card"
        >
          Se precisar sair rápido, clique aqui ou aperte ESC duas vezes. Prefira usar uma aba
          anônima.
          <button
            type="button"
            className="mt-2 block font-semibold underline"
            onClick={() => setShowTip(false)}
          >
            Entendi
          </button>
        </div>
      )}
    </>
  );
}
