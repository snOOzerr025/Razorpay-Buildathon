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
        <div className="anim-stagger p-4 rounded-lg flex items-center gap-4"
          style={{
            backgroundColor: 'var(--accent-soft)',
            border: '1px solid var(--accent-primary)',
            color: 'var(--accent-primary)',
          }}>
          <User className="w-5 h-5" />
          <div className="text-sm">
            <span className="font-semibold uppercase tracking-wider block mb-1">Active User: {persona.user}</span>
            <span style={{ color: 'var(--text-secondary)' }}>Reconciliation Engine</span>
          </div>
        </div>
      )}

      <div className="anim-stagger rounded-xl p-8"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-elevated)',
        }}>
        <h2 className="text-2xl font-display mb-6" style={{ color: 'var(--text-primary)' }}>Data Ingestion</h2>
        
        <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Gateway File Upload */}
          <div className="p-6 flex flex-col items-center justify-center text-center rounded-lg relative transition-colors group"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              border: '2px dashed var(--border)',
            }}>
            <input 
              type="file" 
              accept=".csv,.xlsx" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={(e) => setGatewayFile(e.target.files?.[0] || null)}
            />
            {gatewayFile ? (
              <>
                <FileText className="w-8 h-8 mb-3" style={{ color: 'var(--accent-primary)' }} />
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{gatewayFile.name}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--success)' }}>Ready for processing</p>
              </>
            ) : (
              <>
                <UploadCloud className="w-8 h-8 mb-3" style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--text-secondary)' }}>Gateway Capture</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Drop CSV or Excel file here</p>
              </>
            )}
          </div>

          {/* Bank File Upload */}
          <div className="p-6 flex flex-col items-center justify-center text-center rounded-lg relative transition-colors group"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              border: '2px dashed var(--border)',
            }}>
            <input 
              type="file" 
              accept=".csv,.xlsx" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={(e) => setBankFile(e.target.files?.[0] || null)}
            />
            {bankFile ? (
              <>
                <FileText className="w-8 h-8 mb-3" style={{ color: 'var(--accent-primary)' }} />
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{bankFile.name}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--success)' }}>Ready for processing</p>
              </>
            ) : (
              <>
                <UploadCloud className="w-8 h-8 mb-3" style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--text-secondary)' }}>Bank Settlement</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Drop CSV or Excel file here</p>
              </>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <MagneticButton onClick={handleRun}>
            <div className="px-6 py-3 font-semibold uppercase tracking-widest text-sm rounded-lg transition-colors"
              style={!gatewayFile || !bankFile
                ? { backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)', cursor: 'not-allowed' }
                : { backgroundColor: 'var(--accent-primary)', color: '#fff' }
              }>
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
            className="rounded-xl overflow-hidden"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-elevated)',
            }}
          >
            <div className="p-6" style={{ backgroundColor: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
              <h2 className="text-xl font-display flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
                Live Execution Trace
                {isComplete && <CheckCircle2 className="w-5 h-5" style={{ color: 'var(--success)' }} />}
              </h2>
            </div>
            
            <div className="p-8">
              {/* Pipeline shimmer bar */}
              {isRunning && <div className="mb-8 h-1.5 rounded-full pipeline-shimmer opacity-60" />}

              <div className="flex flex-col gap-4 mb-12">
                {PASSES.map((pass, i) => {
                  const isActive = progress === i + 1
                  const isDone = progress > i + 1
                  return (
                    <div key={pass} className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-sm font-bold border transition-colors ${
                        isActive ? 'animate-pulse' : ''
                      }`}
                        style={
                          isDone
                            ? { backgroundColor: 'var(--success)', color: '#fff', borderColor: 'transparent' }
                            : isActive
                              ? { backgroundColor: 'var(--accent-primary)', color: '#fff', borderColor: 'transparent' }
                              : { backgroundColor: 'transparent', borderColor: 'var(--border)', color: 'var(--text-muted)' }
                        }
                      >
                        {i + 1}
                      </div>
                      <div className="font-display text-lg"
                        style={{ color: isActive || isDone ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {pass}
                      </div>
                      {isActive && (
                        <div className="ml-auto font-mono text-sm animate-pulse" style={{ color: 'var(--accent-primary)' }}>
                          Processing...
                        </div>
                      )}
                      {isDone && (
                        <div className="ml-auto font-mono text-sm" style={{ color: 'var(--text-sandy)' }}>
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
                  className="pt-8 grid grid-cols-1 md:grid-cols-2 gap-12"
                  style={{ borderTop: '1px solid var(--border)' }}
                >
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-widest mb-6" style={{ color: 'var(--text-muted)' }}>Run Summary</h3>
                    <div className="flex flex-col gap-4 font-mono">
                      <div className="flex justify-between">
                        <span style={{ color: 'var(--text-muted)' }}>Processed Files:</span>
                        <span style={{ color: 'var(--text-primary)' }}>2 Files</span>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: 'var(--text-muted)' }}>Throughput:</span>
                        <span style={{ color: 'var(--text-primary)' }}>{selectedData.throughput.toLocaleString()}/sec</span>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: 'var(--text-muted)' }}>Match Rate:</span>
                        <span style={{ color: 'var(--accent-primary)' }}>{selectedData.matchRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: 'var(--text-muted)' }}>Routed to Exception Queue:</span>
                        <span style={{ color: 'var(--danger-bright)' }}>{(100 - selectedData.matchRate).toFixed(2)}%</span>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => router.push('/exceptions')}
                      className="mt-8 underline underline-offset-4 font-display text-lg transition-colors"
                      style={{ color: 'var(--accent-primary)' }}
                    >
                      View Generated Exceptions &rarr;
                    </button>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-widest mb-6" style={{ color: 'var(--text-muted)' }}>Latency by Pass (ms)</h3>
                    <div className="h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={latencyData}>
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                          <Tooltip 
                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                            contentStyle={{
                              backgroundColor: 'var(--bg-elevated)',
                              color: 'var(--text-primary)',
                              border: '1px solid var(--border)',
                              borderRadius: 8,
                            }}
                          />
                          <Bar dataKey="ms" radius={[4, 4, 0, 0]}>
                            {latencyData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.ms > 1500 ? '#9B3A2E' : (index === 3 ? '#C25E1A' : '#3D3D3D')} />
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
