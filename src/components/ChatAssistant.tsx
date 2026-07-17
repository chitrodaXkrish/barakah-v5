import { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, Mic, ArrowUpRight, Menu, Plus, Trash2, MessageSquare } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import aiAssistantLogo from '@/assets/ai-assistant-logo.png.asset.json';
import aiSendBtn from '@/assets/ai-send-btn.png.asset.json';
import { assetUrl } from '@/lib/assetUrl';

type Msg = { role: 'user' | 'assistant'; content: string };
type Thread = { id: string; title: string; updated_at: string };

const CREAM_BG = '#FFF1DD';
const BROWN = '#2C1309';
const BROWN_BTN = '#B0552A';
const OLIVE = '#8A8B2A';
const MUTED = '#A89684';
const BORDER = '#E6D4B8';
const INPUT_BG = '#F6EFE2';
const SUGGESTION_COLOR = '#776F69';
const SERIF_ITALIC = "'Newsreader', Georgia, serif";

const SUGGESTIONS = [
  { title: '99 Names of Allah', sub: 'Explore the beautiful names of Allah S.W.T' },
  { title: 'How to perform Wudu', sub: 'Step-by-step guide to ablution' },
  { title: 'Dua for anxiety', sub: 'Find peace with authentic supplications' },
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

async function streamChat({
  messages,
  onDelta,
  onDone,
  onError,
}: {
  messages: Msg[];
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (err: string) => void;
}) {
  const resp = await fetch(CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages }),
  });

  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    onError(data.error || 'Failed to connect');
    return;
  }

  if (!resp.body) { onError('No response'); return; }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buffer.indexOf('\n')) !== -1) {
      let line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (!line.startsWith('data: ')) continue;
      const json = line.slice(6).trim();
      if (json === '[DONE]') { onDone(); return; }
      try {
        const parsed = JSON.parse(json);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onDelta(content);
      } catch {
        buffer = line + '\n' + buffer;
        break;
      }
    }
  }
  onDone();
}

interface ChatAssistantProps {
  open: boolean;
  onClose: () => void;
}

export const ChatAssistant = ({ open, onClose }: ChatAssistantProps) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [showThreads, setShowThreads] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const userName = user?.displayName?.split(' ')[0] || '';

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Load thread list when the assistant opens
  useEffect(() => {
    if (!open || !user?.uid) return;
    (async () => {
      const { data } = await supabase
        .from('chat_threads')
        .select('id, title, updated_at')
        .eq('user_id', user.uid)
        .order('updated_at', { ascending: false });
      setThreads((data as Thread[]) || []);
    })();
  }, [open, user?.uid]);

  // Load messages when the active thread changes
  useEffect(() => {
    if (!activeThreadId) {
      setMessages([]);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('role, content')
        .eq('thread_id', activeThreadId)
        .order('created_at', { ascending: true });
      setMessages(((data as Msg[]) || []));
    })();
  }, [activeThreadId]);

  const startNewChat = useCallback(() => {
    setActiveThreadId(null);
    setMessages([]);
    setShowThreads(false);
  }, []);

  const openThread = useCallback((id: string) => {
    setActiveThreadId(id);
    setShowThreads(false);
  }, []);

  const deleteThread = useCallback(async (id: string) => {
    await supabase.from('chat_threads').delete().eq('id', id);
    setThreads((prev) => prev.filter((t) => t.id !== id));
    if (activeThreadId === id) {
      setActiveThreadId(null);
      setMessages([]);
    }
  }, [activeThreadId]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    if (!user?.uid) return;
    setInput('');

    const userMsg: Msg = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);

    // Ensure a thread exists
    let threadId = activeThreadId;
    if (!threadId) {
      const title = text.length > 60 ? text.slice(0, 60) + '…' : text;
      const { data: created, error } = await supabase
        .from('chat_threads')
        .insert({ user_id: user.uid, title })
        .select('id, title, updated_at')
        .single();
      if (error || !created) {
        setIsLoading(false);
        setMessages(prev => [...prev, { role: 'assistant', content: 'Failed to start chat.' }]);
        return;
      }
      threadId = created.id;
      setActiveThreadId(threadId);
      setThreads(prev => [created as Thread, ...prev]);
    }

    // Persist user message
    await supabase.from('chat_messages').insert({
      thread_id: threadId,
      user_id: user.uid,
      role: 'user',
      content: text,
    });

    let assistantSoFar = '';
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
        }
        return [...prev, { role: 'assistant', content: assistantSoFar }];
      });
    };

    try {
      await streamChat({
        messages: newMessages,
        onDelta: upsert,
        onDone: async () => {
          setIsLoading(false);
          if (assistantSoFar && threadId) {
            await supabase.from('chat_messages').insert({
              thread_id: threadId,
              user_id: user.uid,
              role: 'assistant',
              content: assistantSoFar,
            });
            await supabase
              .from('chat_threads')
              .update({ updated_at: new Date().toISOString() })
              .eq('id', threadId);
            setThreads(prev => {
              const found = prev.find(t => t.id === threadId);
              if (!found) return prev;
              const rest = prev.filter(t => t.id !== threadId);
              return [{ ...found, updated_at: new Date().toISOString() }, ...rest];
            });
          }
        },
        onError: (err) => {
          setMessages(prev => [...prev, { role: 'assistant', content: err }]);
          setIsLoading(false);
        },
      });
    } catch {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, user?.uid, activeThreadId]);

  if (!open) return null;

  const handleSuggestion = (s: string) => {
    setInput(s);
  };

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col font-arabic max-w-md mx-auto"
      style={{ backgroundColor: CREAM_BG, color: BROWN }}
    >
      <ChatView
        userName={userName}
        onBack={onClose}
        messages={messages}
        input={input}
        setInput={setInput}
        isLoading={isLoading}
        send={send}
        scrollRef={scrollRef}
        onSuggestion={handleSuggestion}
        onOpenThreads={() => setShowThreads(true)}
        onNewChat={startNewChat}
      />
      {showThreads && (
        <ThreadsPanel
          threads={threads}
          activeThreadId={activeThreadId}
          onClose={() => setShowThreads(false)}
          onSelect={openThread}
          onNew={startNewChat}
          onDelete={deleteThread}
        />
      )}
    </div>
  );
};

const Logo = ({ size = 32 }: { size?: number }) => (
  <img
    src={assetUrl(aiAssistantLogo)}
    alt="Islamic AI Assistant"
    className="rounded-full shrink-0 object-cover"
    style={{ width: size, height: size }}
  />
);

/* ---------------- Threads Panel ---------------- */

const ThreadsPanel = ({
  threads,
  activeThreadId,
  onClose,
  onSelect,
  onNew,
  onDelete,
}: {
  threads: Thread[];
  activeThreadId: string | null;
  onClose: () => void;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}) => {
  return (
    <div className="absolute inset-0 z-50 flex" onClick={onClose}>
      <div
        className="w-[82%] max-w-sm h-full flex flex-col shadow-xl"
        style={{ backgroundColor: '#FFFFFF' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="px-5 pt-5 pb-4 flex items-center justify-between border-b"
          style={{ borderColor: BORDER }}
        >
          <span className="font-bold text-[16px]" style={{ color: BROWN }}>Your chats</span>
          <button
            onClick={onNew}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold"
            style={{ backgroundColor: BROWN_BTN, color: '#FFF' }}
          >
            <Plus className="h-4 w-4" strokeWidth={2} /> New
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {threads.length === 0 ? (
            <div className="px-3 py-6 text-center text-[13px]" style={{ color: MUTED }}>
              No chats yet. Start a new conversation.
            </div>
          ) : (
            <ul className="flex flex-col gap-1">
              {threads.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 cursor-pointer"
                  style={{
                    backgroundColor: t.id === activeThreadId ? INPUT_BG : 'transparent',
                  }}
                  onClick={() => onSelect(t.id)}
                >
                  <MessageSquare className="h-4 w-4 shrink-0" style={{ color: BROWN }} strokeWidth={1.75} />
                  <span
                    className="flex-1 truncate text-[14px]"
                    style={{ color: BROWN }}
                  >
                    {t.title}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(t.id);
                    }}
                    aria-label="Delete chat"
                    className="p-1"
                  >
                    <Trash2 className="h-4 w-4" style={{ color: MUTED }} strokeWidth={1.75} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

/* ---------------- Chat View ---------------- */

const ChatView = ({
  userName,
  onBack,
  messages,
  input,
  setInput,
  isLoading,
  send,
  scrollRef,
  onSuggestion,
  onOpenThreads,
  onNewChat,
}: {
  userName: string;
  onBack: () => void;
  messages: Msg[];
  input: string;
  setInput: (v: string) => void;
  isLoading: boolean;
  send: () => void;
  scrollRef: React.RefObject<HTMLDivElement>;
  onSuggestion: (s: string) => void;
  onOpenThreads: () => void;
  onNewChat: () => void;
}) => {
  const empty = messages.length === 0;

  return (
    <>
      {/* Header — white bar */}
      <div
        className="px-4 pt-5 pb-4 flex items-center justify-between"
        style={{ backgroundColor: '#FFFFFF' }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="h-10 w-10 rounded-full border flex items-center justify-center"
            style={{ borderColor: '#D9D2C7', color: BROWN }}
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2} />
          </button>
          <button
            onClick={onOpenThreads}
            className="h-10 w-10 rounded-full border flex items-center justify-center"
            style={{ borderColor: '#D9D2C7', color: BROWN }}
            aria-label="Chat history"
          >
            <Menu className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
        <div className="flex items-center gap-2.5">
          <Logo size={32} />
          <span
            className="font-bold text-[17px] tracking-tight"
            style={{ color: BROWN }}
          >
            Islamic Ai Assistant
          </span>
        </div>
        <button
          onClick={onNewChat}
          className="h-10 w-10 rounded-full border flex items-center justify-center"
          style={{ borderColor: '#D9D2C7', color: BROWN }}
          aria-label="New chat"
        >
          <Plus className="h-5 w-5" strokeWidth={2} />
        </button>
      </div>

      {/* Body */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 pt-10 pb-3"
        style={{ backgroundColor: CREAM_BG }}
      >
        {empty ? (
          <div className="pt-16">
            <h2
              className="text-center italic text-[34px] leading-tight mb-12"
              style={{
                fontFamily: SERIF_ITALIC,
                color: OLIVE,
                fontWeight: 500,
                letterSpacing: '-0.01em',
              }}
            >
              As-salamu alaykum{userName ? `, ${userName}` : ''}!
            </h2>
            <div className="flex flex-col gap-4">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => onSuggestion(s.title)}
                  className="text-left rounded-full px-5 py-3 border flex items-center gap-3 transition-transform active:scale-[0.99]"
                  style={{ backgroundColor: 'transparent', borderColor: SUGGESTION_COLOR }}
                >
                  <div className="flex-1 min-w-0">
                    <div
                      className="font-bold text-[15px] truncate"
                      style={{ color: SUGGESTION_COLOR }}
                    >
                      {s.title}
                    </div>
                    <div
                      className="text-[12px] truncate mt-0.5"
                      style={{ color: SUGGESTION_COLOR }}
                    >
                      {s.sub}
                    </div>
                  </div>
                  <ArrowUpRight
                    className="h-5 w-5 shrink-0"
                    style={{ color: SUGGESTION_COLOR }}
                    strokeWidth={2}
                  />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="max-w-[85%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed"
                  style={
                    msg.role === 'user'
                      ? { backgroundColor: BROWN_BTN, color: '#FFF' }
                      : { backgroundColor: '#FFFFFF', color: BROWN, border: `1px solid ${BORDER}` }
                  }
                >
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none [&_p]:m-0" style={{ color: BROWN }}>
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="flex justify-start">
                <div
                  className="rounded-2xl px-4 py-3 border"
                  style={{ backgroundColor: '#FFFFFF', borderColor: BORDER }}
                >
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: BROWN_BTN, animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: BROWN_BTN, animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: BROWN_BTN, animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Composer */}
      <div
        className="px-4 pb-6 pt-3 flex items-center gap-3"
        style={{ backgroundColor: '#FFFFFF' }}
      >
        <div
          className="flex-1 flex items-center gap-2 rounded-full px-5 py-3.5 border"
          style={{ backgroundColor: '#FFFFFF', borderColor: '#B0A89E' }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Ask me Anything..."
            className="flex-1 bg-transparent outline-none text-[15px] placeholder:text-[#9E948A]"
            style={{ color: BROWN }}
          />
          <button className="opacity-80" aria-label="Voice input">
            <Mic className="h-5 w-5" style={{ color: '#7A6B5E' }} strokeWidth={1.75} />
          </button>
        </div>
        <button
          onClick={send}
          disabled={!input.trim() || isLoading}
          className="h-12 w-12 rounded-full flex items-center justify-center disabled:opacity-50 overflow-hidden"
          style={{ backgroundColor: 'transparent', padding: 0 }}
          aria-label="Send"
        >
          <img
            src={assetUrl(aiSendBtn)}
            alt="Send"
            className="h-full w-full object-cover"
          />
        </button>
      </div>
    </>
  );
};