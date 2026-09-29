import { useEffect, useRef, useState } from 'react';
import { DISGUISE_PIN } from '../lib/disguise';
import { useDisguise } from '../context/DisguiseContext';

export function DisguiseScreen() {
  const { unlock } = useDisguise();
  const [pin, setPin] = useState('');
  const holdRef = useRef<number | null>(null);
  const [holding, setHolding] = useState(false);

  const startHold = () => {
    setHolding(true);
    holdRef.current = window.setTimeout(() => {
      unlock();
    }, 3000);
  };

  const endHold = () => {
    setHolding(false);
    if (holdRef.current) window.clearTimeout(holdRef.current);
  };

  useEffect(() => () => endHold(), []);

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-white px-5 py-10 text-slate-800">
      <header className="mb-8 text-center">
        <button
          type="button"
          className="mx-auto mb-3 block text-3xl font-semibold text-emerald-800"
          onMouseDown={startHold}
          onMouseUp={endHold}
          onMouseLeave={endHold}
          onTouchStart={startHold}
          onTouchEnd={endHold}
          aria-label="Receitas e Dicas"
        >
          Receitas & Dicas
        </button>
        <p className="text-sm text-slate-500">Ideias simples para o dia a dia</p>
        {holding && <p className="mt-2 text-xs text-slate-400">Segure o logo por 3 segundos…</p>}
      </header>
      <article className="rounded-2xl border border-slate-200 p-4">
        <h2 className="text-lg font-semibold">Bolo de caneca</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Misture 4 colheres de farinha, 3 de açúcar, 2 de chocolate, 1 ovo e 3 de leite. Leve ao
          micro-ondas por 3 minutos.
        </p>
      </article>
      <form
        className="mt-8"
        onSubmit={(e) => {
          e.preventDefault();
          if (pin === DISGUISE_PIN) unlock();
          else setPin('');
        }}
      >
        <label className="sr-only" htmlFor="disguise-pin">
          Código secreto
        </label>
        <input
          id="disguise-pin"
          inputMode="numeric"
          autoComplete="off"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          placeholder="Código da receita (opcional)"
        />
      </form>
    </div>
  );
}
