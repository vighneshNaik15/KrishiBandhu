'use client';

import { PageIntro } from '@/components/ui/PageIntro';
import { auth } from '@/lib/firebase/config';
import { useState, useRef, useEffect, type FormEvent } from 'react';
import { Bot, Loader2, Mic, Send, Sparkles, User } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
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
  const [speechAvailable, setSpeechAvailable] = useState(false);
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
    const timer = window.setTimeout(() => setSpeechAvailable(true), 0);
    return () => {
      window.clearTimeout(timer);
      recognitionRef.current = null;
      rec.abort();
    };
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

    const history = messages.slice(-6).map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));

    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Sign in as a farmer to continue.');
      const idToken = await user.getIdToken();
      const res = await fetch('/api/ai/advisory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
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
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <PageIntro title="AI Advisory" icon={<Sparkles />}
        description="Ask about crops, soil, or seasonal farm work in the Konkan region."
        actions={messages.length > 0 && (
          <Button variant="secondary" onClick={handleReset}>New chat</Button>
        )} />

      <Card className="flex min-h-[30rem] flex-col overflow-hidden" padding="none">
        <div role="log" aria-label="Advisory conversation" className="flex-1 space-y-4 p-4 sm:p-6">
          {/* Welcome message */}
          {messages.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center gap-5 py-6 sm:py-9">
              <div className="rounded-2xl bg-primary-50 p-4">
                <Bot className="size-8 text-primary-700" aria-hidden />
              </div>
              <div className="text-center space-y-1">
                <h2 className="font-heading text-3xl font-normal text-forest">What’s happening on your farm?</h2>
              </div>
              <div className="grid gap-2 w-full max-w-sm">
                {STARTER_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => void sendMessage(q)}
                    className="min-h-11 rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-left text-sm text-neutral-700 transition-colors hover:border-primary-300 hover:bg-primary-50"
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

              <div className={`min-w-0 max-w-[80%] space-y-2 ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                <div
                  className={`rounded-2xl px-4 py-3 text-sm leading-relaxed wrap-anywhere whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-primary-600 text-white rounded-tr-sm'
                      : 'bg-neutral-100 text-neutral-800 rounded-tl-sm'
                  }`}
                >
                  {msg.content}
                </div>

                {msg.role === 'assistant' && msg.confidence !== undefined && (
                  <p className="px-1 text-xs text-neutral-600">
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
            <div role="status" className="flex justify-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary-700" />
              </div>
              <div className="bg-neutral-100 rounded-2xl rounded-tl-sm px-4 py-3">
                <span className="text-sm text-neutral-600">Preparing your answer…</span>
              </div>
            </div>
          )}

          {/* Error */}
          {error && <Alert variant="error">{error}</Alert>}

          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div className="border-t border-neutral-200 bg-ivory p-3 sm:p-5">
          <form onSubmit={event => void handleSubmit(event)} className="flex items-center gap-2 [&>div:first-child]:flex-1">
            <Input
              aria-label="Ask a farming question"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about crops, pests, soil, schemes…"
              disabled={isLoading}
              className="flex-1"
            />
            {speechAvailable && (
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
            <Button type="submit" aria-label="Send question" disabled={isLoading || !input.trim()} className="shrink-0 px-3">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
          <p className="mt-2 text-center text-xs text-neutral-600">
            AI advice is for guidance only. Consult your local KVK for expert verification.
          </p>
        </div>
      </Card>
    </div>
  );
}
