import { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export interface ToastItem {
  id: string | number;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastProps {
  toasts: ToastItem[];
  onRemove: (id: string | number) => void;
}

export default function Toast({ toasts, onRemove }: ToastProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map(toast => (
        <ToastCard 
          key={toast.id} 
          toast={toast} 
          onRemove={onRemove} 
        />
      ))}
    </div>
  );
}

interface ToastCardProps {
  key?: string | number;
  toast: ToastItem;
  onRemove: (id: string | number) => void;
}

function ToastCard({ toast, onRemove }: ToastCardProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-white fill-emerald-600" />,
    error: <AlertCircle className="w-5 h-5 text-white fill-rose-600" />,
    info: <Info className="w-5 h-5 text-white fill-sky-600" />
  };

  const bgColors = {
    success: 'bg-emerald-600',
    error: 'bg-rose-600',
    info: 'bg-sky-600'
  };

  return (
    <div 
      className={`
        pointer-events-auto flex items-center justify-between gap-3 p-4 rounded-xl text-white shadow-xl
        animate-[toast-in_0.25s_cubic-bezier(0.16,1,0.3,1)_both] border border-white/10
        ${bgColors[toast.type]}
      `}
      role="alert"
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <span className="shrink-0">{icons[toast.type]}</span>
        <span className="text-xs font-bold leading-normal break-words truncate max-w-[250px] whitespace-normal">
          {toast.message}
        </span>
      </div>
      <button 
        onClick={() => onRemove(toast.id)}
        className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0 outline-none"
        aria-label="Dismiss toast"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
