"use client";
import { AssignmentForm } from "@/components/create/AssignmentForm";
import { Sparkles } from "lucide-react";
import React from "react";

export default function CreatePage() {
  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:py-12">
      <div className="mb-10 animate-fadeIn">
        <div className="inline-flex items-center gap-2 bg-brand-50 border border-brand-100/60 px-3 py-1 rounded-full text-brand-700 font-bold text-[10px] tracking-wider uppercase mb-3">
          <Sparkles className="w-3.5 h-3.5 text-brand-600 animate-pulse" />
          AI Question Engine
        </div>
        <h1 className="text-3xl font-extrabold text-[var(--text)] tracking-tight font-display sm:text-4xl">
          Create Assessment
        </h1>
        <p className="text-slate-500 font-medium mt-1.5 text-sm sm:text-base">
          Configure sections and difficulty, optionally ground generation in
          your documents, and let Cognita build a complete paper with an answer
          key.
        </p>
      </div>

      <AssignmentForm />
    </div>
  );
}
