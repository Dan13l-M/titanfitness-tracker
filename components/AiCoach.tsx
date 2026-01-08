
import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, CompletedWorkout, BodyMetric, ChatMessage, ChatSession } from '../types';
import { getCoachResponse } from '../services/geminiService';

interface AiCoachProps {
  userProfile: UserProfile | null;
  history: CompletedWorkout[];
  metrics: BodyMetric[];
  chats: ChatSession[];
  onUpdateChats: (chats: ChatSession[]) => void;
}

// Simple markdown-like formatting for AI responses
const formatMessage = (text: string) => {
  // Split by newlines and format
  return text.split('\n').map((line, i) => {
    // Bold text **text**
    let formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold">$1</strong>');
    // Headers starting with #
    if (line.startsWith('### ')) {
      return <h4 key={i} className="font-bold text-primary mt-3 mb-1 text-sm">{line.replace('### ', '')}</h4>;
    }
    if (line.startsWith('## ')) {
      return <h3 key={i} className="font-bold mt-3 mb-1">{line.replace('## ', '')}</h3>;
    }
    // Bullet points
    if (line.startsWith('- ') || line.startsWith('• ')) {
      return <li key={i} className="ml-4 list-disc" dangerouslySetInnerHTML={{ __html: formatted.substring(2) }} />;
    }
    // Numbered lists
    if (/^\d+\.\s/.test(line)) {
      return <li key={i} className="ml-4 list-decimal" dangerouslySetInnerHTML={{ __html: formatted.replace(/^\d+\.\s/, '') }} />;
    }
    // Empty lines
    if (line.trim() === '') {
      return <br key={i} />;
    }
    // Regular text
    return <p key={i} className="mb-1" dangerouslySetInnerHTML={{ __html: formatted }} />;
  });
};

const AiCoach: React.FC<AiCoachProps> = ({ userProfile, history, metrics, chats, onUpdateChats }) => {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!activeSessionId && chats.length > 0) {
      const sorted = [...chats].sort((a, b) => b.lastMessageAt - a.lastMessageAt);
      setActiveSessionId(sorted[0].id);
    } else if (chats.length === 0) {
      createNewChat();
    }
  }, [chats.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSessionId, chats]);

  const activeSession = chats.find(c => c.id === activeSessionId);

  const createNewChat = () => {
    const newSession: ChatSession = {
      id: `chat_${Date.now()}`,
      title: `Nueva Sesión`,
      createdAt: Date.now(),
      lastMessageAt: Date.now(),
      messages: [{
        id: 'welcome',
        role: 'model',
        text: `¡Hola ${userProfile?.name || 'Atleta'}! 👋\n\nSoy **Titan Coach**, tu asistente de entrenamiento con IA.\n\n### ¿En qué puedo ayudarte?\n- 📊 Analizar tu progreso\n- 🍎 Consejos de nutrición\n- 💪 Ajustar tu rutina\n- 🏋️ Técnica de ejercicios\n\n¡Pregúntame lo que quieras!`,
        timestamp: Date.now()
      }]
    };
    onUpdateChats([...chats, newSession]);
    setActiveSessionId(newSession.id);
    setIsSidebarOpen(false);
  };

  const deleteChat = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("¿Borrar este chat?")) {
      const updated = chats.filter(c => c.id !== id);
      onUpdateChats(updated);
      if (activeSessionId === id) {
        setActiveSessionId(null);
      }
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || !activeSessionId) return;

    const currentChat = chats.find(c => c.id === activeSessionId);
    if (!currentChat) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: inputText,
      timestamp: Date.now()
    };

    const updatedMessages = [...currentChat.messages, userMsg];
    
    let updatedTitle = currentChat.title;
    if (currentChat.messages.length <= 1) {
      updatedTitle = inputText.length > 35 ? inputText.substring(0, 35) + '...' : inputText;
    }

    const updatedSession = { 
      ...currentChat, 
      messages: updatedMessages, 
      lastMessageAt: Date.now(),
      title: updatedTitle
    };

    onUpdateChats(chats.map(c => c.id === activeSessionId ? updatedSession : c));
    setInputText('');
    setIsTyping(true);

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    try {
      const responseText = await getCoachResponse(
        userMsg.text, 
        currentChat.messages,
        userProfile, 
        history, 
        metrics
      );

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: Date.now()
      };

      const finalSession = {
        ...updatedSession,
        messages: [...updatedMessages, aiMsg],
        lastMessageAt: Date.now()
      };

      onUpdateChats(chats.map(c => c.id === activeSessionId ? finalSession : c));

    } catch (err) {
      console.error('Error getting AI response:', err);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: '⚠️ Error al obtener respuesta. Por favor intenta de nuevo.',
        timestamp: Date.now()
      };
      const errorSession = {
        ...updatedSession,
        messages: [...updatedMessages, errorMsg],
        lastMessageAt: Date.now()
      };
      onUpdateChats(chats.map(c => c.id === activeSessionId ? errorSession : c));
    } finally {
      setIsTyping(false);
    }
  };

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
  };

  // Handle Enter key (Shift+Enter for new line)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-[calc(100vh-140px)] md:h-[calc(100vh-60px)] animate-fadeIn gap-0 md:gap-4">
       
       {/* Sidebar (Desktop) / Drawer (Mobile) */}
        <div className={`
            fixed inset-y-0 left-0 w-72 bg-[var(--color-surface)] z-50 transform transition-transform duration-300 md:relative md:transform-none md:flex flex-col md:w-64 lg:w-72 p-4 border-r border-[var(--color-border)]
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
       `}>
            <div className="flex justify-between items-center mb-4 md:hidden">
                <h3 className="font-bold text-lg text-[var(--color-text)]">💬 Historial</h3>
                <button onClick={() => setIsSidebarOpen(false)} className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] p-1">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <button 
                onClick={createNewChat}
                className="w-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] text-[var(--color-bg)] font-bold py-3 px-4 rounded-xl mb-4 hover:shadow-lg transition flex items-center justify-center gap-2 group"
            >
                <svg className="w-5 h-5 group-hover:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nuevo Chat
            </button>

            <div className="hidden md:block text-xs text-[var(--color-text-muted)] font-bold uppercase tracking-wider mb-2 px-1">
              Conversaciones
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
                {[...chats].sort((a,b) => b.lastMessageAt - a.lastMessageAt).map(chat => (
                    <div 
                        key={chat.id}
                        onClick={() => { setActiveSessionId(chat.id); setIsSidebarOpen(false); }}
                        className={`p-3 rounded-xl cursor-pointer border transition-all duration-200 flex justify-between items-center group ${
                          activeSessionId === chat.id 
                            ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 shadow-sm' 
                            : 'bg-transparent border-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]'
                        }`}
                    >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="text-sm opacity-60">💬</span>
                            <div className="truncate text-sm font-medium text-[var(--color-text)]">
                                {chat.title}
                            </div>
                        </div>
                        <button 
                            onClick={(e) => deleteChat(chat.id, e)}
                            className="opacity-60 md:opacity-0 group-hover:opacity-100 text-[var(--color-text-subtle)] hover:text-red-400 transition p-1 flex-none cursor-pointer"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                ))}
                {chats.length === 0 && (
                  <div className="text-center text-[var(--color-text-subtle)] text-sm py-8">
                    No hay conversaciones
                  </div>
                )}
            </div>
       </div>

       {/* Main Chat Area */}
       <div className="flex-1 flex flex-col h-full card rounded-none md:rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-surface)]">
                <div className="flex items-center gap-3">
                    <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-[var(--color-text-muted)] hover:text-[var(--color-primary)] p-1">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[var(--color-secondary)] via-[var(--color-primary)] to-[var(--color-secondary)] flex items-center justify-center shadow-lg">
                        <span className="text-2xl">🤖</span>
                    </div>
                    <div>
                        <h2 className="text-lg font-black tracking-tight text-[var(--color-text)]">
                          TITAN <span className="text-[var(--color-primary)]">COACH</span>
                        </h2>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]"></span>
                            <span className="text-[10px] text-green-400 font-bold uppercase tracking-wide">Gemini 2.5 Flash</span>
                        </div>
                    </div>
                </div>
                {activeSession && (
                    <div className="hidden md:flex flex-col items-end">
                      <span className="text-xs text-[var(--color-text-subtle)]">
                          {new Date(activeSession.lastMessageAt).toLocaleDateString()}
                      </span>
                      <span className="text-[10px] text-[var(--color-text-subtle)]">
                          {activeSession.messages.length} mensajes
                      </span>
                    </div>
                )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar p-4 md:p-6 space-y-4 bg-gradient-to-b from-transparent to-black/5">
                {activeSession ? (
                    activeSession.messages.map((msg) => (
                        <div 
                            key={msg.id} 
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn w-full`}
                        >
                            <div className={`relative group w-full ${
                                msg.role === 'user' 
                                ? 'flex justify-end' 
                                : 'flex justify-start'
                            }`}>
                                {/* Avatar for AI */}
                                {msg.role === 'model' && (
                                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-tr from-[var(--color-secondary)] to-[var(--color-primary)] flex items-center justify-center text-sm shadow-md mr-2 mt-1">
                                    🤖
                                  </div>
                                )}
                                
                                <div className={`p-4 rounded-2xl shadow-lg ${
                                    msg.role === 'user' 
                                    ? 'bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] text-[var(--color-bg)] rounded-br-sm max-w-[85%]' 
                                    : 'bg-[var(--color-surface)] border border-[var(--color-border)] rounded-bl-sm flex-1 max-w-[calc(100%-48px)]'
                                }`} style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                    <div className={`text-sm md:text-base leading-relaxed ${msg.role === 'user' ? '' : 'text-[var(--color-text)]'}`}>
                                        {msg.role === 'user' ? (
                                            <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                                        ) : (
                                            <div className="space-y-1 break-words">{formatMessage(msg.text)}</div>
                                        )}
                                    </div>
                                    <span className={`text-[9px] block mt-2 opacity-60 ${msg.role === 'user' ? 'text-right' : 'text-[var(--color-text-muted)]'}`}>
                                        {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-muted)] gap-4">
                        <div className="w-16 h-16 rounded-full bg-[var(--color-surface)] flex items-center justify-center text-3xl">
                          🤖
                        </div>
                        <p>Selecciona o crea un chat para comenzar</p>
                    </div>
                )}
                
                {isTyping && (
                    <div className="flex justify-start animate-fadeIn">
                        <div className="bg-[var(--color-surface)] p-4 rounded-2xl rounded-bl-sm border border-[var(--color-border)] flex items-center gap-2 ml-4">
                            <div className="flex gap-1">
                              <div className="w-2 h-2 bg-[var(--color-primary)] rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                              <div className="w-2 h-2 bg-[var(--color-primary)] rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                              <div className="w-2 h-2 bg-[var(--color-primary)] rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                            </div>
                            <span className="text-xs text-[var(--color-text-muted)] ml-2">Pensando...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area - Improved */}
            <form onSubmit={handleSend} className="p-3 md:p-4 bg-[var(--color-surface)] border-t border-[var(--color-border)]">
                <div className="flex gap-2 items-end">
                    <div className="flex-1 relative">
                        <textarea 
                            ref={inputRef}
                            value={inputText}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            placeholder={activeSession ? "Escribe tu mensaje... (Shift+Enter para nueva línea)" : "Crea un chat nuevo..."}
                            className="input-modern w-full py-3 px-4 rounded-xl resize-none overflow-hidden min-h-[48px] max-h-[150px] pr-12"
                            disabled={isTyping || !activeSession}
                            rows={1}
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={isTyping || !inputText.trim() || !activeSession}
                        className="btn-primary p-3 rounded-xl transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex-none h-12 w-12 flex items-center justify-center"
                    >
                        {isTyping ? (
                          <div className="w-5 h-5 border-2 border-[var(--color-bg)] border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                          </svg>
                        )}
                    </button>
                </div>
                <p className="text-[10px] text-[var(--color-text-subtle)] mt-2 text-center hidden md:block">
                  Powered by Google Gemini 2.5 Flash • Los consejos no reemplazan asesoría profesional
                </p>
            </form>
       </div>

       {/* Mobile Overlay */}
       {isSidebarOpen && (
           <div 
            className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
           ></div>
       )}
    </div>
  );
};

export default AiCoach;
