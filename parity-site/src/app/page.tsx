import SmoothScroll from "@/components/SmoothScroll";
import HeroScene from "@/components/HeroScene";
import StatStrip from "@/components/StatStrip";
import ProblemNarrative from "@/components/ProblemNarrative";
import ArchitectureSequence from "@/components/ArchitectureSequence";
import TrustSection from "@/components/TrustSection";
import LivingInvariant from "@/components/LivingInvariant";
import ScrollMan from "@/components/ScrollMan";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <SmoothScroll>
      <main className="flex min-h-screen flex-col items-center justify-between w-full bg-[#050505]">
        <NavBar />
        <ScrollMan />
        
        <HeroScene />
        <StatStrip />
        <ProblemNarrative />
        <ArchitectureSequence />
        <TrustSection />
        
        {/* Massive Footer CTA */}
        <Footer />
      </main>
    </SmoothScroll>
  );
}
