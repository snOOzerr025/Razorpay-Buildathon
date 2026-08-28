import React from 'react';
import { motion } from 'framer-motion';

const Statement = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40% 0px -40% 0px" }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="font-display text-[clamp(32px,4vw,56px)] leading-[1.1] tracking-[-0.02em] text-ink mb-16"
    >
      {children}
    </motion.div>
  );
};

export default function ProblemFraming() {
  return (
    <section id="overview" className="bg-surface w-full py-32 md:py-48 border-t border-hairline">
      <div className="max-w-[1280px] px-6 mx-auto">
        <h2 className="font-body text-ink-dim uppercase tracking-wider text-sm font-semibold mb-24">
          Most reconciliation still runs on trust, not proof.
        </h2>
        
        <div className="max-w-[900px]">
          <Statement>
            A spreadsheet doesn't tell you when a float comparison silently drops a match.
          </Statement>
          <Statement>
            A dashboard that says "99% accurate" without showing its exception list is a claim, not an audit.
          </Statement>
          <Statement>
            Most systems that miss a transaction don't tell you they missed it.
          </Statement>
        </div>
      </div>
    </section>
  );
}
