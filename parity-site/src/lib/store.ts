import { create } from 'zustand';
import { Exception, ExceptionStatus, mockExceptions } from './mock-data';

export interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  exceptionId: string;
  beforeStatus: ExceptionStatus;
  afterStatus: ExceptionStatus;
}

interface AppState {
  exceptions: Exception[];
  auditTrail: AuditEntry[];
  updateExceptionStatus: (id: string, newStatus: ExceptionStatus, actor: string, actionDesc: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  exceptions: [...mockExceptions],
  auditTrail: [
    {
      id: 'audit_001',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      actor: 'System (HOOTL)',
      action: 'Auto-posted exact match',
      exceptionId: 'N/A',
      beforeStatus: 'Open',
      afterStatus: 'Posted'
    }
  ],
  updateExceptionStatus: (id, newStatus, actor, actionDesc) => set((state) => {
    const exc = state.exceptions.find(e => e.id === id);
    if (!exc) return state;

    const beforeStatus = exc.status;
    
    return {
      exceptions: state.exceptions.map(e => 
        e.id === id ? { ...e, status: newStatus } : e
      ),
      auditTrail: [
        ...state.auditTrail,
        {
          id: `audit_${Date.now()}`,
          timestamp: new Date().toISOString(),
          actor,
          action: actionDesc,
          exceptionId: id,
          beforeStatus,
          afterStatus: newStatus
        }
      ]
    };
  })
}));
