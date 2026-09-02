'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import MagneticButton from '@/components/MagneticButton'
import { progressiveRunData } from '@/lib/mock-data'
import { motion, AnimatePresence } from 'framer-motion'
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { CheckCircle2, User, UploadCloud, FileText } from 'lucide-react'

const PASSES = ["Pass 1: Exact", "Pass 2: Tolerance", "Pass 3: Linkage", "Pass 4: Roll-up", "Pass 5: AI & Queue"]

export default function LiveRunPage() {
  const router = useRouter()
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0) // 0 to 5
  const [isComplete, setIsComplete] = useState(false)
  const [persona, setPersona] = useState<any>(null)
  
  // File upload state
  const [gatewayFile, setGatewayFile] = useState<File | null>(null)
  const [bankFile, setBankFile] = useState<File | null>(null)

  useEffect(() => {
    const session = localStorage.getItem('parity_session')
    if (session) {
      setPersona(JSON.parse(session))
    }
  }, [])

  const handleRun = () => {
    if (!gatewayFile || !bankFile) {
      alert("Please upload both Gateway and Bank CSV files to run the reconciliation engine.")
      return
    }

    setIsRunning(true)
    setIsComplete(false)
    setProgress(0)

    const runPass = (step: number) => {
      if (step > 5) {
        setIsRunning(false)
        setIsComplete(true)
        return
      }
      setProgress(step)
      
      let delay = 800;
      if (step === 4 && persona?.id === 'cfo') delay = 2500;
      if (step === 2 && persona?.id === 'merchant') delay = 2000;
      
      setTimeout(() => runPass(step + 1), delay)
    }

    setTimeout(() => runPass(1), 500)
  }

  // Use the 36k mock data as our baseline for uploaded files
  const selectedData = progressiveRunData.find(d => d.size === '36k')!

  const latencyData = PASSES.map((name, i) => {
    let ms = 120 + Math.random() * 50;
    if (i === 3) ms = persona?.id === 'cfo' ? 2450 : 1240;
    if (i === 4) ms = persona?.id === 'finops' ? 1800 : 890;
    if (i === 1) ms = persona?.id === 'merchant' ? 1950 : 180;
    return { name: `P${i + 1}`, fullName: name, ms }
  })

  return (
    <div className="max-w-4xl mx-auto py-8 flex flex-col gap-12">
      {persona && (
        <div className="bg-[#00E5FF]/10 border border-[#00E5FF]/30 p-4 rounded-sm flex items-center gap-4 text-[#00E5FF]">
          <User className="w-5 h-5" />
          <div className="text-sm">
            <span className="font-semibold uppercase tracking-wider block mb-1">Active User: {persona.user}</span>
            <span className="text-white opacity-80">Reconciliation Engine</span>
          </div>
        </div>
      )}

      <div className="bg-[#0a0a0a] border border-white/10 p-8 rounded-sm shadow-xl">
        <h2 className="text-2xl font-display mb-6 text-white tracking-tight">Data Ingestion</h2>
        
        <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Gateway File Upload */}
          <div className="border border-dashed border-white/20 p-6 flex flex-col items-center justify-center text-center bg-[#050505] rounded-sm relative hover:border-[#00E5FF] transition-colors group">
            <input 
              type="file" 
              accept=".csv,.xlsx" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={(e) => setGatewayFile(e.target.files?.[0] || null)}
            />
            {gatewayFile ? (
              <>
                <FileText className="w-8 h-8 text-[#00E5FF] mb-3" />
                <p className="text-sm text-white font-medium">{gatewayFile.name}</p>
                <p className="text-xs text-[#00E5FF] mt-1">Ready for processing</p>
              </>
            ) : (
              <>
                <UploadCloud className="w-8 h-8 text-gray-500 mb-3 group-hover:text-[#00E5FF] transition-colors" />
                <p className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-1">Gateway Capture</p>
                <p className="text-xs text-gray-600">Drop CSV or Excel file here</p>
              </>
            )}
          </div>

          {/* Bank File Upload */}
          <div className="border border-dashed border-white/20 p-6 flex flex-col items-center justify-center text-center bg-[#050505] rounded-sm relative hover:border-[#00E5FF] transition-colors group">
            <input 
              type="file" 
              accept=".csv,.xlsx" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={(e) => setBankFile(e.target.files?.[0] || null)}
            />
            {bankFile ? (
              <>
                <FileText className="w-8 h-8 text-[#00E5FF] mb-3" />
                <p className="text-sm text-white font-medium">{bankFile.name}</p>
                <p className="text-xs text-[#00E5FF] mt-1">Ready for processing</p>
              </>
            ) : (
              <>
                <UploadCloud className="w-8 h-8 text-gray-500 mb-3 group-hover:text-[#00E5FF] transition-colors" />
                <p className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-1">Bank Settlement</p>
                <p className="text-xs text-gray-600">Drop CSV or Excel file here</p>
              </>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <MagneticButton onClick={handleRun}>
            <div className={`px-6 py-3 font-semibold uppercase tracking-widest text-sm transition-colors ${!gatewayFile || !bankFile ? 'bg-white/10 text-gray-500 cursor-not-allowed' : 'bg-white text-black hover:bg-gray-200'}`}>
              {isRunning ? 'Running...' : 'Execute Deterministic Engine'}
            </div>
          </MagneticButton>
        </div>
      </div>

      <AnimatePresence>
        {(isRunning || isComplete) && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#0a0a0a] border border-white/10 overflow-hidden shadow-xl"
          >
            <div className="p-6 border-b border-white/10 bg-[#050505]">
              <h2 className="text-xl font-display flex items-center gap-3 text-white">
                Live Execution Trace
                {isComplete && <CheckCircle2 className="w-5 h-5 text-[#00E5FF]" />}
              </h2>
            </div>
            
            <div className="p-8">
              <div className="flex flex-col gap-4 mb-12">
                {PASSES.map((pass, i) => {
                  const isActive = progress === i + 1
                  const isDone = progress > i + 1
                  return (
                    <div key={pass} className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-sm font-bold border transition-colors ${
                        isDone ? 'bg-[#00E5FF] text-black border-transparent' :
                        isActive ? 'bg-white text-black border-transparent animate-pulse' :
                        'bg-transparent border-white/10 text-gray-500'
                      }`}>
                        {i + 1}
                      </div>
                      <div className={`font-display text-lg ${isActive || isDone ? 'text-white' : 'text-gray-500'}`}>
                        {pass}
                      </div>
                      {isActive && (
                        <div className="ml-auto font-mono text-sm text-gray-400 animate-pulse">
                          Processing...
                        </div>
                      )}
                      {isDone && (
                        <div className="ml-auto font-mono text-sm text-[#00E5FF]">
                          {latencyData[i].ms.toFixed(0)}ms
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {isComplete && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="pt-8 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-12"
                >
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-6">Run Summary</h3>
                    <div className="flex flex-col gap-4 font-mono">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Processed Files:</span>
                        <span className="text-white">2 Files</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Throughput:</span>
                        <span className="text-white">{selectedData.throughput.toLocaleString()}/sec</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Match Rate:</span>
                        <span className="text-[#00E5FF]">{selectedData.matchRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Routed to Exception Queue:</span>
                        <span className="text-[#FF4400]">{(100 - selectedData.matchRate).toFixed(2)}%</span>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => router.push('/exceptions')}
                      className="mt-8 text-white underline underline-offset-4 hover:text-[#00E5FF] transition-colors font-display text-lg"
                    >
                      View Generated Exceptions &rarr;
                    </button>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-6">Latency by Pass (ms)</h3>
                    <div className="h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={latencyData}>
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} />
                          <Tooltip 
                            cursor={{ fill: 'rgba(255,255,255,0.1)' }}
                            contentStyle={{ backgroundColor: '#1A1A1A', color: '#FFF', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4 }}
                            itemStyle={{ color: '#00E5FF' }}
                          />
                          <Bar dataKey="ms" radius={[4, 4, 0, 0]}>
                            {latencyData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.ms > 1500 ? '#FF4400' : (index === 3 ? '#00E5FF' : '#4B5563')} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
