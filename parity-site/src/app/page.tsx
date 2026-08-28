import HeroScene from "@/components/HeroScene";
import StatStrip from "@/components/StatStrip";
import ProblemNarrative from "@/components/ProblemNarrative";
import ArchitectureSequence from "@/components/ArchitectureSequence";
import TrustSection from "@/components/TrustSection";
import LivingInvariant from "@/components/LivingInvariant";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between w-full">
      <HeroScene />
      <StatStrip />
      <ProblemNarrative />
      <ArchitectureSequence />
      <TrustSection />
      
      {/* Footer / CTA area */}
      <div className="w-full bg-[var(--bg-paper)] pt-24 pb-12 flex flex-col items-center">
        <h2 className="text-3xl font-display mb-12 text-[var(--ink)]">Ready to implement deterministic reconciliation?</h2>
        <LivingInvariant />
      </div>
    </main>
  );
}
