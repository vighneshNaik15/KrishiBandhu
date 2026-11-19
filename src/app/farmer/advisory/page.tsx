'use client';

import { useState, useRef, useEffect, type FormEvent } from 'react';
import { Bot, Loader2, Mic, RotateCcw, Send, Sparkles, User } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/features/auth/AuthContext';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  suggestedFollowups?: string[];
  confidence?: number;
}

interface ApiResponse {
  answer: string;
  suggestedFollowups: string[];
  confidence: number;
  error?: string;
}

// ── Starter questions ─────────────────────────────────────────────────────────

const STARTER_QUESTIONS = [
  'When is the best time to harvest coconuts in Konkan?',
  'How do I treat yellowing leaves on my arecanut trees?',
  'What fertilizer should I use for mango trees before monsoon?',
  'How can I protect my cashew crop from tea mosquito bugs?',
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdvisoryPage() {
  const { userProfile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const nextId = useRef(1);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Setup Web Speech API
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionCtor: (new () => any) | undefined =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).webkitSpeechRecognition ?? (window as any).SpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec: any = new SpeechRecognitionCtor();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-IN';
    rec.onstart = () => setIsListening(true);
    rec.onend = () => setIsListening(false);
    rec.onerror = () => setIsListening(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (event: any) => {
      const transcript: string = event.results[0]?.[0]?.transcript ?? '';
      if (transcript) {
        setInput(transcript);
      }
    };
    recognitionRef.current = rec;
    return () => rec.abort();
  }, []);

  const handleMic = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.abort();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
    }
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    setInput('');
    setError(null);

    const userMsg: Message = { id: nextId.current++, role: 'user', content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    const history = messages.slice(-10).map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch('/api/ai/advisory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: trimmed,
          language: 'English',
          farmerContext: userProfile
            ? `Farmer name: ${userProfile.name}. Location: Konkan region, India.`
            : undefined,
          conversationHistory: history,
        }),
      });

      const data = (await res.json()) as ApiResponse;

      if (!res.ok || data.error) {
        setError(data.error ?? 'Something went wrong. Please try again.');
      } else {
        const botMsg: Message = {
          id: nextId.current++,
          role: 'assistant',
          content: data.answer,
          suggestedFollowups: data.suggestedFollowups,
          confidence: data.confidence,
        };
        setMessages((prev) => [...prev, botMsg]);
      }
    } catch {
      setError('Could not reach the AI service. Check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void sendMessage(input);
  };

  const handleReset = () => {
    setMessages([]);
    setInput('');
    setError(null);
  };

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-primary-100 p-3 rounded-xl">
            <Sparkles className="h-6 w-6 text-primary-700" aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">AI Advisory</h1>
            <p className="text-sm text-neutral-500">Ask anything about farming in the Konkan region</p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleReset}
            className="flex items-center gap-1 text-xs"
          >
            <RotateCcw className="h-3 w-3" />
            New chat
          </Button>
        )}
      </div>

      {/* Chat area */}
      <Card className="flex flex-col flex-1 min-h-[480px] overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Welcome message */}
          {messages.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center h-full py-12 gap-6">
              <div className="bg-primary-50 p-5 rounded-2xl">
                <Bot className="h-12 w-12 text-primary-600" />
              </div>
              <div className="text-center space-y-1">
                <p className="font-semibold text-neutral-800">Your AI farming advisor</p>
                <p className="text-sm text-neutral-500 max-w-sm">
                  Ask me about crops, pests, fertilizers, weather, soil, government schemes, and more.
                </p>
              </div>
              <div className="grid gap-2 w-full max-w-sm">
                {STARTER_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => void sendMessage(q)}
                    className="text-left text-sm px-4 py-2.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 hover:border-primary-300 transition-colors text-neutral-700"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary-700" />
                </div>
              )}

              <div className={`max-w-[80%] space-y-2 ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                <div
                  className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-primary-600 text-white rounded-tr-sm'
                      : 'bg-neutral-100 text-neutral-800 rounded-tl-sm'
                  }`}
                >
                  {msg.content}
                </div>

                {msg.role === 'assistant' && msg.confidence !== undefined && (
                  <p className="text-[10px] text-neutral-400 px-1">
                    Confidence: {Math.round(msg.confidence * 100)}%
                  </p>
                )}

                {msg.role === 'assistant' && msg.suggestedFollowups && msg.suggestedFollowups.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {msg.suggestedFollowups.map((q) => (
                      <button
                        key={q}
                        onClick={() => void sendMessage(q)}
                        disabled={isLoading}
                        className="text-xs px-3 py-1.5 rounded-full border border-primary-200 text-primary-700 bg-primary-50 hover:bg-primary-100 transition-colors disabled:opacity-50"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center">
                  <User className="h-4 w-4 text-neutral-600" />
                </div>
              )}
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary-700" />
              </div>
              <div className="bg-neutral-100 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex items-center gap-1">
                  <span className="h-2 w-2 bg-neutral-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 bg-neutral-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 bg-neutral-400 rounded-full animate-bounce" />
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div className="border-t border-neutral-100 p-3">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about crops, pests, soil, schemes…"
              disabled={isLoading}
              className="flex-1"
            />
            {recognitionRef.current && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleMic}
                disabled={isLoading}
                className="px-3"
                aria-label="Voice input"
              >
                <Mic className={`h-4 w-4 ${isListening ? 'text-red-500 animate-pulse' : ''}`} />
              </Button>
            )}
            <Button type="submit" size="sm" disabled={isLoading || !input.trim()} className="px-3">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
          <p className="text-[11px] text-neutral-400 mt-2 text-center">
            AI advice is for guidance only. Consult your local KVK for expert verification.
          </p>
        </div>
      </Card>
    </div>
  );
}
