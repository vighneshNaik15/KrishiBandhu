import React from "react";
import Link from "next/link";
import { Leaf } from "lucide-react";
import { APP_NAME, ROUTES } from "@/lib/constants";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      {/* Simple auth header */}
      <header className="bg-white border-b border-neutral-200">
        <div className="container-page h-14 flex items-center">
          <Link href={ROUTES.HOME} className="flex items-center gap-2 font-bold text-primary-700">
            <Leaf className="w-5 h-5 text-primary-600" aria-hidden />
            <span className="font-heading">{APP_NAME}</span>
          </Link>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        {children}
      </main>
      <footer className="py-4 text-center text-xs text-neutral-400">
        © {new Date().getFullYear()} {APP_NAME} — Konkan&apos;s agriculture platform
      </footer>
    </div>
  );
}
