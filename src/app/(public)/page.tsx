import React from "react";
import Link from "next/link";
import { ArrowRight, Leaf, Users, ShoppingBag, CloudSun, Sprout, Shield, Stethoscope, Tractor } from "lucide-react";
import { ROUTES } from "@/lib/constants";
import { Button } from "@/components/ui/Button";

const FEATURES = [
  {
    icon: Sprout,
    title: "Farm & Crop Management",
    description: "Manage multiple farms and crops. Track growth stages, irrigation, and harvest schedules.",
    color: "text-primary-600 bg-primary-50",
  },
  {
    icon: Users,
    title: "Labour Marketplace",
    description: "Find skilled agricultural workers. Post jobs, review applications and schedule work.",
    color: "text-blue-600 bg-blue-50",
  },
  {
    icon: ShoppingBag,
    title: "Product Marketplace",
    description: "List agricultural products, connect with buyers and manage orders and available stock.",
    color: "text-accent-600 bg-accent-50",
  },
  {
    icon: Stethoscope,
    title: "AI Crop Disease Detection",
    description: "Get cautious, image-based crop-health information with clear uncertainty and expert-verification guidance.",
    color: "text-red-600 bg-red-50",
  },
  {
    icon: CloudSun,
    title: "Weather & Crop Advisory",
    description: "Use local weather, seasonal information and crop context to support farm decisions.",
    color: "text-purple-600 bg-purple-50",
  },
  {
    icon: Tractor,
    title: "Farm Services",
    description: "Discover harvesting, equipment rental, irrigation and other agricultural services.",
    color: "text-amber-700 bg-amber-50",
  },
  {
    icon: Shield,
    title: "Government Schemes",
    description: "Discover agricultural subsidies, loans and government schemes relevant to Goa and Konkan.",
    color: "text-orange-600 bg-orange-50",
  },
];

const STEPS = [
  { step: "01", title: "Register your account", desc: "Sign up as a farmer, worker or buyer in minutes." },
  { step: "02", title: "Set up your profile", desc: "Add your farm details, crops or buying preferences." },
  { step: "03", title: "Start connecting", desc: "Post jobs, list products or browse the marketplace." },
];

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="relative bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC40Ij48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCA0LTRzNCAyIDQgNC0yIDQtNCA0LTQtMi00LTR6bS0xNiAwYzAtMiAyLTQgNC00czQgMiA0IDQtMiA0LTQgNC00LTItNC00eiIvPjwvZz48L2c+PC9zdmc+')]" />
        <div className="container-page relative section-padding text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <Leaf className="w-4 h-4" aria-hidden />
            Goa &amp; Konkan Agriculture Platform
          </div>
          <h1 className="text-4xl md:text-6xl font-bold font-heading mb-6 max-w-3xl mx-auto leading-tight">
            Your trusted partner in agriculture
          </h1>
          <p className="text-lg md:text-xl text-primary-100 max-w-2xl mx-auto mb-10">
            Manage farms and crops, discover workers and services, connect with buyers, and access
            crop and weather information in one connected platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={ROUTES.REGISTER}>
              <Button
                size="lg"
                variant="secondary"
                className="border-0 shadow-lg hover:bg-primary-50"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5 ml-1" aria-hidden />
              </Button>
            </Link>
            <Link href={ROUTES.MARKETPLACE}>
              <Button size="lg" variant="ghost" className="text-white border border-white/30 hover:bg-white/10">
                Browse Marketplace
              </Button>
            </Link>
          </div>
          <div className="flex justify-center gap-8 mt-12 text-sm text-primary-200">
            <span>✓ Four connected roles</span>
            <span>✓ Designed for mobile</span>
            <span>✓ Delivered in verified phases</span>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────── */}
      <section className="section-padding bg-neutral-50">
        <div className="container-page">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold font-heading text-neutral-900 mb-3">
              One connected platform for agriculture
            </h2>
            <p className="text-neutral-500 max-w-xl mx-auto">
              KrishiBandhu brings farm management, crop intelligence, labour, services and market access
              together. Capabilities are being delivered in tested phases.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6 hover:shadow-md transition-shadow">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${f.color}`}>
                    <Icon className="w-6 h-6" aria-hidden />
                  </div>
                  <h3 className="font-semibold text-neutral-900 mb-2">{f.title}</h3>
                  <p className="text-sm text-neutral-500 leading-relaxed">{f.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────── */}
      <section className="section-padding bg-white">
        <div className="container-page">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold font-heading text-neutral-900 mb-3">How It Works</h2>
            <p className="text-neutral-500">Start with the workflows that support your role.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map((s, i) => (
              <div key={s.step} className="text-center relative">
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-6 left-1/2 w-full h-0.5 bg-primary-100" />
                )}
                <div className="relative z-10 inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary-600 text-white font-bold text-lg mb-4">
                  {s.step}
                </div>
                <h3 className="font-semibold text-neutral-900 mb-2">{s.title}</h3>
                <p className="text-sm text-neutral-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section className="section-padding bg-primary-700 text-white">
        <div className="container-page text-center">
          <h2 className="text-3xl font-bold font-heading mb-4">
            Ready to transform your farm?
          </h2>
          <p className="text-primary-200 mb-8 max-w-lg mx-auto">
            Join farmers, workers and buyers building a more connected agricultural community.
          </p>
          <Link href={ROUTES.REGISTER}>
            <Button size="lg" className="bg-white text-primary-800 hover:bg-primary-50 border-0 shadow-lg">
              Create Your Free Account
              <ArrowRight className="w-5 h-5 ml-1" aria-hidden />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
