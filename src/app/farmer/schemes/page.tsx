'use client';

import { useState, type FormEvent, useEffect } from 'react';
import { ArrowRight, BookOpen, Bot, Loader2, ScrollText, Search } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Scheme {
  name: string;
  description: string;
  eligibility: string;
  link: string;
}

interface ApiResponse {
  schemes: Scheme[];
  message: string;
  error?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SchemesPage() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<{ schemes: Scheme[]; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSchemes = async (searchQuery: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/ai/schemes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery }),
      });

      const data = (await res.json()) as ApiResponse;

      if (!res.ok || data.error) {
        setError(data.error ?? 'Failed to load schemes. Please try again.');
        setResult(null);
      } else {
        setResult({ schemes: data.schemes, message: data.message });
      }
    } catch {
      setError('Could not reach the AI service. Check your connection and try again.');
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Load default schemes on mount
  useEffect(() => {
    void fetchSchemes('');
  }, []);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    void fetchSchemes(query.trim());
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-primary-100 p-3 rounded-xl">
          <ScrollText className="h-7 w-7 text-primary-700" aria-hidden />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Government Scheme Finder</h1>
          <p className="text-sm text-neutral-500">
            Discover central and state government schemes for Konkan farmers.
          </p>
        </div>
      </div>

      {/* Search card */}
      <Card className="p-5">
        <h2 className="font-semibold text-neutral-800 mb-1">Find Specific Schemes</h2>
        <p className="text-sm text-neutral-500 mb-3">
          Enter a crop, state, or topic to find relevant schemes.
        </p>
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. 'subsidy for coconut farmers in Goa' or 'PM-KISAN'"
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            type="submit"
            size="sm"
            disabled={isLoading || !query.trim()}
            className="px-4 flex items-center gap-2"
          >
            {isLoading && query ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Search
          </Button>
        </form>
      </Card>

      {/* Loading skeletons */}
      {isLoading && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary-500" />
            <div className="h-4 w-56 rounded bg-neutral-200 animate-pulse" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-5 space-y-3">
                <div className="h-5 w-3/4 rounded bg-neutral-200 animate-pulse" />
                <div className="space-y-1.5">
                  <div className="h-3 w-20 rounded bg-neutral-200 animate-pulse" />
                  <div className="h-10 w-full rounded bg-neutral-200 animate-pulse" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-3 w-20 rounded bg-neutral-200 animate-pulse" />
                  <div className="h-8 w-full rounded bg-neutral-200 animate-pulse" />
                </div>
                <div className="h-9 w-full rounded bg-neutral-200 animate-pulse" />
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700 flex items-start gap-2">
          <span>{error}</span>
          <button
            onClick={() => void fetchSchemes(query)}
            className="underline ml-auto whitespace-nowrap hover:text-red-900"
          >
            Retry
          </button>
        </div>
      )}

      {/* Results */}
      {result && !isLoading && (
        <div className="space-y-4">
          {/* AI message */}
          <div className="flex items-start gap-2 text-sm">
            <Bot className="h-5 w-5 text-primary-500 flex-shrink-0 mt-0.5" />
            <p className="bg-neutral-100 rounded-lg px-4 py-2.5 text-neutral-700">
              {result.message}
            </p>
          </div>

          {/* Scheme cards */}
          {result.schemes.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {result.schemes.map((scheme, i) => (
                <Card key={i} className="flex flex-col p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex-shrink-0 bg-primary-50 p-2 rounded-lg mt-0.5">
                      <BookOpen className="h-5 w-5 text-primary-600" />
                    </div>
                    <h3 className="font-semibold text-neutral-900 text-sm leading-snug">{scheme.name}</h3>
                  </div>

                  <div className="flex-1 space-y-3 text-sm">
                    <div>
                      <p className="font-medium text-neutral-700 mb-0.5">Description</p>
                      <p className="text-neutral-500 leading-relaxed">{scheme.description}</p>
                    </div>
                    <div>
                      <p className="font-medium text-neutral-700 mb-0.5">Eligibility</p>
                      <p className="text-neutral-500 leading-relaxed">{scheme.eligibility}</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    {scheme.link && scheme.link !== '#' ? (
                      <a
                        href={scheme.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                      >
                        Learn More
                        <ArrowRight className="h-4 w-4" />
                      </a>
                    ) : (
                      <p className="text-xs text-neutral-400 text-center">No official link available</p>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-xl border border-neutral-100">
              <ScrollText className="h-10 w-10 text-neutral-300 mx-auto mb-3" />
              <p className="font-medium text-neutral-600">No schemes found for your query.</p>
              <p className="text-sm text-neutral-400 mt-1">Try a different or more general search term.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
