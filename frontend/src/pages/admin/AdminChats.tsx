import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { get, post } from '../../lib/api';
import type { ChatMessage } from '../../lib/types';

interface ChatRow {
  id: string;
  token: string;
  status: string;
  admin: string | null;
  mensagens: number;
  criadoEm: string;
}

const QUICK = [
  'Você está em um espaço seguro. Como posso ajudar?',
  'Se estiver em perigo imediato, ligue 190.',
  'Posso orientar sobre medidas protetivas e redes de apoio.',
];

export function AdminChats() {
  const [list, setList] = useState<ChatRow[]>([]);
  const [current, setCurrent] = useState<ChatRow | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');

  const load = () => void get<ChatRow[]>('/api/admin/chats').then(setList);

  useEffect(() => {
    load();
    const socket = io({ withCredentials: true });
    socket.on('chat:message', () => load());
    socket.on('chat:closed', () => load());
    return () => {
      socket.disconnect();
    };
  }, []);

  const open = async (row: ChatRow) => {
    setCurrent(row);
    const data = await get<{ messages: ChatMessage[] }>(`/api/admin/chats/${row.id}/messages`);
    setMessages(data.messages);
    const socket = io({ withCredentials: true });
    socket.emit('admin:join-chat', { sessionId: row.id });
    socket.on('chat:message', (msg: ChatMessage) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    });
  };

  const send = async () => {
    if (!current || !text.trim()) return;
    const msg = await post<ChatMessage>(`/api/admin/chats/${current.id}/messages`, { conteudo: text.trim() });
    setMessages((prev) => [...prev, msg]);
    setText('');
  };

  const close = async () => {
    if (!current) return;
    await post(`/api/admin/chats/${current.id}/close`);
    setCurrent(null);
    setMessages([]);
    load();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <aside className="card max-h-[70vh] overflow-y-auto p-3">
        {list.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`mb-2 w-full rounded-2xl px-3 py-2 text-left text-sm ${current?.id === c.id ? 'bg-primary text-white' : 'bg-cream'}`}
            onClick={() => void open(c)}
          >
            {c.status} · {c.mensagens} msgs
            <span className="block text-xs opacity-80">{new Date(c.criadoEm).toLocaleString('pt-BR')}</span>
          </button>
        ))}
      </aside>
      <section className="card flex min-h-[60vh] flex-col">
        {!current ? (
          <p className="text-sm text-secondary">Selecione uma conversa.</p>
        ) : (
          <>
            <div className="mb-3 flex justify-between">
              <strong>{current.status}</strong>
              <button type="button" className="text-sm text-danger underline" onClick={() => void close()}>
                Encerrar e apagar
              </button>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto">
              {messages.map((m) => (
                <div key={m.id} className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.remetente === 'ESPECIALISTA' ? 'ml-auto bg-primary text-white' : 'bg-cream'}`}>
                  {m.conteudo}
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {QUICK.map((q) => (
                <button key={q} type="button" className="rounded-full bg-cream px-3 py-1 text-xs" onClick={() => setText(q)}>
                  {q}
                </button>
              ))}
            </div>
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void send();
              }}
            >
              <input className="field" value={text} onChange={(e) => setText(e.target.value)} placeholder="Responder…" />
              <button type="submit" className="btn-primary">
                Enviar
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
