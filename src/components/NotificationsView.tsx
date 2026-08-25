import { Bell, CheckCircle } from 'lucide-react';
import { Notification } from '../types';

interface NotificationsViewProps {
  notifications: Notification[];
  onMarkAllRead: () => void;
}

export default function NotificationsView({
  notifications,
  onMarkAllRead
}: NotificationsViewProps) {
  const hasUnread = notifications.some(n => n.unread);

  return (
    <div className="space-y-6 animate-[fadeInUp_0.3s_cubic-bezier(0.16,1,0.3,1)_both]">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <span className="w-9 h-9 bg-rose-600 text-white rounded-xl flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 stroke-[2.5]" />
            </span>
            Notifications Hub
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            System logs, payment alerts, and transaction statuses for Hamro Pay.
          </p>
        </div>
        {hasUnread && (
          <button 
            onClick={onMarkAllRead}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-800 rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all focus:outline-none"
          >
            <CheckCircle className="w-4 h-4" />
            Mark All as Read
          </button>
        )}
      </header>

      {/* List Card panel */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-xs overflow-hidden divide-y divide-slate-100">
        {notifications.length > 0 ? (
          notifications.map(n => (
            <article 
              key={n.id} 
              className={`
                p-5 flex items-start gap-4 transition-colors
                ${n.unread ? 'bg-slate-50/50' : 'bg-white hover:bg-slate-50/30'}
              `}
            >
              {/* Status Circle Indicator */}
              <span className={`
                w-2.5 h-2.5 rounded-full shrink-0 mt-1.5
                ${n.unread ? 'bg-rose-600 ring-4 ring-rose-100' : 'bg-slate-200'}
              `} />
              
              <div className="space-y-1 flex-1">
                <h3 className={`text-sm tracking-tight text-slate-800 ${n.unread ? 'font-extrabold' : 'font-semibold'}`}>
                  {n.title}
                </h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  {n.text}
                </p>
                <time className="block text-[10px] text-slate-400 font-bold tracking-tight pt-1">
                  {n.time}
                </time>
              </div>
            </article>
          ))
        ) : (
          <div className="p-12 text-center text-slate-500">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-4 border border-slate-100">
              <Bell className="w-6 h-6" />
            </div>
            <b className="text-sm font-bold text-slate-800 block mb-1">Your notification tray is empty</b>
            <p className="text-[11px] text-slate-400 font-medium">All caught up! We will alert you here of account updates.</p>
          </div>
        )}
      </div>
    </div>
  );
}
