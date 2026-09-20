import React, { useState } from 'react';
import {
  Headphones,
  Sparkles,
  ArrowRight,
  Send,
  MessageSquare,
  Lightbulb,
  X,
  Loader2,
  CheckCircle2
} from 'lucide-react';
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
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) {
      showToast('Please type a message before submitting.', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await ApiService.submitSupport(topic, message, profileName, profileEmail);
      if (response?.success && !response?.isSimulated) {
        showToast('Your support ticket was submitted successfully to our backend.', 'success');
      } else {
        showToast('Support ticket registered successfully.', 'success');
      }
      setMessage('');
      setIsModalOpen(false);
    } catch (err: any) {
      showToast(err?.message || 'Failed to submit support ticket', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialClick = (name: string, url: string) => {
    if (url && url !== '#') {
      window.open(url, '_blank');
    } else {
      showToast(`Opening ${name} support channel…`, 'info');
    }
  };

  return (
    <div className="support-container">
      {/* Hero Section */}
      <div className="hero-support">
        <div className="hero-orb o1" />
        <div className="hero-orb o2" />

        <div className="hero-icon">
          <Headphones />
        </div>

        <h1 className="hero-title">
          Need help? <span className="grad">We're here.</span>
        </h1>
        <p className="hero-sub">
          Pick any channel below — our team and AI assistant are ready to help you out, 24/7.
        </p>

        <div className="hero-pills">
          <span className="hero-pill">
            <span className="dot" />
            AI Assistant online
          </span>
          <span className="hero-pill secondary">
            <span className="dot" />
            Avg. reply &lt; 5 min
          </span>
        </div>
      </div>

      {/* Primary — Agentic Support */}
      <div className="section-head">
        <span className="section-head-title">Fastest Support</span>
        <span className="section-head-line" />
      </div>

      <div
        className="agentic-card"
        onClick={() => setIsModalOpen(true)}
      >
        <div className="agentic-icon">
          <Sparkles />
        </div>
        <div className="agentic-body">
          <div className="agentic-title-row">
            <span className="agentic-title">Agentic Support</span>
            <span className="agentic-tag">New</span>
          </div>
          <div className="agentic-desc">
            Chat with <strong>Hamro AI</strong> — instant answers for payments, refunds, KYC &amp; more.
          </div>
        </div>
        <div className="agentic-arrow">
          <ArrowRight />
        </div>
      </div>

      {/* Social Support Channels */}
      <div className="section-head" style={{ marginTop: '24px' }}>
        <span className="section-head-title">Chat with us</span>
        <span className="section-head-line" />
      </div>

      <div className="support-grid">
        {/* Telegram */}
        <div
          className="social-card"
          onClick={() => handleSocialClick('Telegram', 'https://t.me/hamropay_support')}
          style={{ '--accent': '#2AABEE' } as React.CSSProperties}
        >
          <div className="social-icon telegram">
            <Send style={{ width: 22, height: 22 }} />
          </div>
          <div className="social-body">
            <span className="social-title">Telegram</span>
            <span className="social-desc">Join our channel for updates &amp; live chat</span>
          </div>
          <div className="social-arrow">
            <ArrowRight />
          </div>
        </div>

        {/* Instagram */}
        <div
          className="social-card"
          onClick={() => handleSocialClick('Instagram', 'https://instagram.com/hamropay')}
          style={{ '--accent': '#ee2a7b' } as React.CSSProperties}
        >
          <div className="social-icon instagram">
            <MessageSquare style={{ width: 22, height: 22 }} />
          </div>
          <div className="social-body">
            <span className="social-title">Instagram</span>
            <span className="social-desc">DM us — we reply fast</span>
          </div>
          <div className="social-arrow">
            <ArrowRight />
          </div>
        </div>

        {/* YouTube */}
        <div
          className="social-card"
          onClick={() => handleSocialClick('YouTube', 'https://youtube.com/hamropay')}
          style={{ '--accent': '#ff0000' } as React.CSSProperties}
        >
          <div className="social-icon youtube">
            <Sparkles style={{ width: 22, height: 22 }} />
          </div>
          <div className="social-body">
            <span className="social-title">YouTube</span>
            <span className="social-desc">Tutorials &amp; product videos</span>
          </div>
          <div className="social-arrow">
            <ArrowRight />
          </div>
        </div>

        {/* WhatsApp */}
        <div
          className="social-card"
          onClick={() => handleSocialClick('WhatsApp', 'https://wa.me/9779800000000')}
          style={{ '--accent': '#25D366' } as React.CSSProperties}
        >
          <div className="social-icon whatsapp">
            <Headphones style={{ width: 22, height: 22 }} />
          </div>
          <div className="social-body">
            <span className="social-title">WhatsApp</span>
            <span className="social-desc">Message us directly on WhatsApp</span>
          </div>
          <div className="social-arrow">
            <ArrowRight />
          </div>
        </div>
      </div>

      {/* Bottom Help Bar */}
      <div className="help-bar">
        <div className="help-bar-left">
          <div className="help-bar-icon">
            <Lightbulb />
          </div>
          <div className="help-bar-text">
            <strong>Still need help?</strong>
            <span>Our team replies within minutes, day or night.</span>
          </div>
        </div>
        <button
          className="help-bar-btn"
          onClick={() => setIsModalOpen(true)}
        >
          <MessageSquare />
          <span>Start a chat / Submit Ticket</span>
        </button>
      </div>

      {/* Ticket Modal */}
      {isModalOpen && (
        <div className="hp-w-modal-scrim" onClick={() => setIsModalOpen(false)}>
          <div className="hp-w-credit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="hp-w-modal-head">
              <div className="hp-w-modal-head-icon">
                <Headphones />
              </div>
              <div className="hp-w-modal-head-text">
                <div className="hp-w-modal-title">Submit Support Ticket</div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="hp-w-modal-close">
                <X />
              </button>
            </div>

            <div className="hp-w-credit-body">
              <form onSubmit={handleSubmit}>
                <div className="hp-w-field">
                  <div className="hp-w-field-label">
                    <span>Support Category</span>
                    <span className="req">*</span>
                  </div>
                  <div className="hp-w-input-wrap-f">
                    <select
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="hp-w-input-field"
                      style={{ background: 'rgba(20, 5, 10, 0.9)', color: '#fff' }}
                    >
                      <option value="Payment link issue">Payment link issue</option>
                      <option value="Wallet or withdrawal">Wallet or withdrawal</option>
                      <option value="Account access">Account access</option>
                      <option value="Other">Other merchant issue</option>
                    </select>
                  </div>
                </div>

                <div className="hp-w-field">
                  <div className="hp-w-field-label">
                    <span>How can we help?</span>
                    <span className="req">*</span>
                  </div>
                  <div className="hp-w-input-wrap-f">
                    <textarea
                      rows={4}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Describe your issue or question in detail..."
                      className="hp-w-input-field"
                      style={{ resize: 'vertical', paddingTop: '10px' }}
                      required
                    />
                  </div>
                </div>

                <div className="hp-w-modal-foot" style={{ borderTop: 'none', padding: '12px 0 0' }}>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="hp-w-modal-btn hp-w-btn-cancel"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="hp-w-modal-btn hp-w-btn-proceed"
                  >
                    {loading ? <Loader2 className="animate-spin" /> : <span>Submit Ticket</span>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
