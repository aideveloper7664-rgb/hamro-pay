import React, { useState } from 'react';
import { Headphones, Send, AlertCircle, HelpCircle, Loader2 } from 'lucide-react';
import { ApiService } from '../lib/api';

interface SupportViewProps {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  profileName: string;
  profileEmail: string;
}

export default function SupportView({ showToast, profileName, profileEmail }: SupportViewProps) {
  const [topic, setTopic] = useState('Payment link issue');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) {
      showToast('Please type a message before submitting.', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await ApiService.submitSupport(topic, message, profileName, profileEmail);
      if (response.success && !response.isSimulated) {
        showToast('Your support ticket was submitted successfully to our backend.', 'success');
      } else {
        showToast('Support ticket registered locally.', 'success');
      }
      setMessage('');
    } catch (err: any) {
      showToast(err.message || 'Failed to submit support ticket', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-[fadeInUp_0.3s_cubic-bezier(0.16,1,0.3,1)_both]">
      {/* Header */}
      <header>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
          <span className="w-9 h-9 bg-rose-600 text-white rounded-xl flex items-center justify-center shrink-0">
            <Headphones className="w-5 h-5 stroke-[2.5]" />
          </span>
          Support Desk
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Ask questions or report payment errors to the Hamro Pay support engineers.
        </p>
      </header>

      {/* Support Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Form Panel */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs">
          <div className="pb-4 border-b border-slate-100 mb-6">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span className="w-6 h-6 bg-rose-600 text-white rounded-lg flex items-center justify-center">
                <Send className="w-3.5 h-3.5" />
              </span>
              Submit a Request
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Topic Select */}
            <div className="space-y-2">
              <label htmlFor="supportTopic" className="block text-xs font-bold text-slate-700 tracking-wide uppercase">
                Support Category
              </label>
              <select
                id="supportTopic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full text-sm px-3.5 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold focus:border-rose-500 focus:outline-none transition-all cursor-pointer"
              >
                <option value="Payment link issue">Payment link issue</option>
                <option value="Wallet or withdrawal">Wallet or withdrawal</option>
                <option value="Account access">Account access</option>
                <option value="Other">Other merchant issue</option>
              </select>
            </div>

            {/* Message Area */}
            <div className="space-y-2">
              <label htmlFor="supportMessage" className="block text-xs font-bold text-slate-700 tracking-wide uppercase">
                How can we help?
              </label>
              <textarea
                id="supportMessage"
                rows={4}
                placeholder="Describe your issue or question in detail..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full text-sm px-4 py-3 rounded-xl border border-slate-200 text-slate-800 placeholder:text-slate-400 bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 focus:outline-none transition-all font-semibold resize-y"
                required
              />
            </div>

            {/* Submit Support Button */}
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs tracking-wider rounded-xl shadow-md shadow-rose-600/10 active:scale-[0.98] transition-all focus:outline-none disabled:bg-rose-400"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  Submit Ticket
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Info Panel */}
        <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-xs flex flex-col justify-center items-center text-center min-h-[340px]">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center border border-slate-100 mb-4">
            <Headphones className="w-6 h-6 stroke-[2]" />
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">Fast Merchant Support</h3>
          <p className="text-xs text-slate-400 font-medium leading-relaxed max-w-sm">
            Use this secure local portal to draft messages and log questions. As a local sandbox demonstrate workspace, no real support tickets are transmitted over the web.
          </p>
        </div>
      </div>
    </div>
  );
}
