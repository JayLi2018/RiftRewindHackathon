import React from "react";
import { CompareForm } from "@/components/CompareForm";

export default function ComparePage() {
  return (
    <main className="min-h-screen bg-[#03040E] text-zinc-100 flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold mb-8">League Player Comparison</h1>
      <CompareForm />
    </main>
  );
}