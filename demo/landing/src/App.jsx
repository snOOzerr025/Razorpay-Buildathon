import React from 'react';
import Nav from './components/Nav';
import Hero from './components/Hero';
import ProblemFraming from './components/ProblemFraming';
import LiveRun from './components/LiveRun';
import ExceptionTable from './components/ExceptionTable';
import Architecture from './components/Architecture';
import Footer from './components/Footer';

function App() {
  return (
    <main className="bg-void min-h-screen text-ink flex flex-col items-center">
      <Nav />
      <Hero />
      <ProblemFraming />
      <LiveRun />
      <ExceptionTable />
      <Architecture />
      <Footer />
    </main>
  );
}

export default App;
