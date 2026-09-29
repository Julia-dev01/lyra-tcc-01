import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MoreVertical, Send } from 'lucide-react';
import { io, type Socket } from 'socket.io-client';
import { HeroHeader } from '../components/HeroHeader';
import { get, post } from '../lib/api';
import type { ChatMessage } from '../lib/types';

const TOKEN_KEY = 'as.chatToken';

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [menu, setMenu] = useState(false);
  const [closed, setClosed] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      const stored = sessionStorage.getItem(TOKEN_KEY);
      if (stored) {
        try {
          const data = await get<{ token: string; messages: ChatMessage[]; status: string }>(
            `/api/chat/sessions/${stored}`,
          );
          if (cancelled) return;
          setToken(data.token);
          setMessages(data.messages);
          if (data.status === 'ENCERRADA') setClosed(true);
          setLoading(false);
          return;
        } catch {
          sessionStorage.removeItem(TOKEN_KEY);
        }
      }
      const created = await post<{ token: string; messages: ChatMessage[] }>('/api/chat/sessions');
      if (cancelled) return;
      sessionStorage.setItem(TOKEN_KEY, created.token);
      setToken(created.token);
      setMessages(created.messages);
      setLoading(false);
    }
    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!token) return;
    const socket = io({ withCredentials: true, transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.emit('chat:join', { token });
    socket.on('chat:message', (msg: ChatMessage) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    });
    socket.on('chat:history', (hist: ChatMessage[]) => setMessages(hist));
    socket.on('chat:closed', () => {
      setClosed(true);
      sessionStorage.removeItem(TOKEN_KEY);
    });
    return () => {
      socket.disconnect();
    };
  }, [token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!token || !text.trim() || closed) return;
    const conteudo = text.trim();
    setText('');
    const msg = await post<ChatMessage>(`/api/chat/sessions/${token}/messages`, { conteudo });
    setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
  };

  const closeChat = async () => {
    if (!token) return;
    await post(`/api/chat/sessions/${token}/close`);
    sessionStorage.removeItem(TOKEN_KEY);
    setClosed(true);
    setMessages([]);
    setMenu(false);
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col sm:max-w-lg">
      <HeroHeader
        title="Apoio Confidencial"
        subtitle="Conversa anônima e segura"
        right={
          <div className="relative">
            <button
              type="button"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/15"
              aria-label="Mais opções"
              onClick={() => setMenu((v) => !v)}
            >
              <MoreVertical size={20} />
            </button>
            {menu && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white p-2 text-primary shadow-card">
                <button type="button" className="w-full rounded-xl px-3 py-2 text-left text-sm" onClick={() => void closeChat()}>
                  Encerrar e apagar conversa
                </button>
              </div>
            )}
          </div>
        }
      />
      <div className="flex items-center justify-between px-4 py-3">
        <Link to="/" className="btn-ghost gap-2 text-sm">
          <ArrowLeft size={16} /> Voltar
        </Link>
        <p className="text-xs text-secondary">Conversa privada</p>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-4">
        {loading && <p className="text-center text-sm text-secondary">Abrindo conversa…</p>}
        {messages.map((m) => {
          const mine = m.remetente === 'USUARIA';
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-3xl px-4 py-2 text-sm ${
                  mine ? 'bg-primary text-white' : 'bg-white text-primary shadow-soft'
                }`}
              >
                <p>{m.conteudo}</p>
                <time className={`mt-1 block text-[10px] ${mine ? 'text-white/80' : 'text-secondary'}`}>
                  {formatTime(m.criadoEm)}
                </time>
              </div>
            </div>
          );
        })}
        {closed && <p className="text-center text-sm text-secondary">Esta conversa foi encerrada e apagada.</p>}
        <div ref={bottomRef} />
      </div>
      <form
        className="flex items-center gap-2 border-t border-secondary/20 bg-cream px-4 py-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <label className="sr-only" htmlFor="chat-input">
          Digite sua mensagem
        </label>
        <input
          id="chat-input"
          className="field"
          placeholder="Digite sua mensagem..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={closed}
        />
        <button type="submit" className="btn-primary min-h-[44px] min-w-[44px] px-3" disabled={closed} aria-label="Enviar">
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
