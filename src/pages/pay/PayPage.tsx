import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'https://hamropay-backends.onrender.com';

const PayPage: React.FC<{ onBackToDashboard?: () => void }> = () => {
  let paramId = '';
  try {
    const params = useParams<{ id: string }>();
    paramId = params?.id || '';
  } catch {
    paramId = '';
  }

  const id = paramId || (typeof window !== 'undefined' ? (window.location.pathname.split('/pay/')[1]?.split('?')[0] || window.location.pathname.split('/').pop() || '') : '');
  const [data, setData] = useState<any>(null);
  const [type, setType] = useState<'order' | 'link' | null>(null);
  const [utr, setUtr] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    // Try as payment link first
    if (id.startsWith('lnk_')) {
      fetch(`${API_URL}/api/payment-link/${id}`)
        .then(r => r.json())
        .then(res => {
          if (res.success) { setData(res.data); setType('link'); }
          setLoading(false);
        }).catch(() => setLoading(false));
    } else {
      // Try as order
      fetch(`${API_URL}/order/status/${id}`)
        .then(r => r.json())
        .then(res => {
          if (res.success) { setData(res.data); setType('order'); }
          setLoading(false);
        }).catch(() => setLoading(false));
    }
  }, [id]);

  const handleVerify = async () => {
    if (!utr || utr.length < 6) { setMessage('Enter valid UTR'); return; }
    setStatus('loading');
    try {
      let res;
      if (type === 'link') {
        res = await fetch(`${API_URL}/api/payment-link/${id}/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ utr, amount: data?.amount }),
        });
      } else {
        res = await fetch(`${API_URL}/order/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': '' },
          body: JSON.stringify({ order_id: id, utr }),
        });
      }
      const result = await res.json();
      if (result.success) {
        setStatus('success');
        setMessage('Payment verified! Thank you.');
      } else {
        setStatus('error');
        setMessage(result.message || 'Verification failed');
      }
    } catch {
      setStatus('error');
      setMessage('Something went wrong. Try again.');
    }
  };

  if (loading) return (
    <div style={{display:'flex',justifyContent:'center',alignItems:'center',minHeight:'100vh'}}>
      <p>Loading...</p>
    </div>
  );

  if (!data) return (
    <div style={{display:'flex',justifyContent:'center',alignItems:'center',minHeight:'100vh'}}>
      <p>Payment not found</p>
    </div>
  );

  return (
    <div style={{maxWidth:'420px',margin:'2rem auto',padding:'1.5rem',border:'1px solid #e5e7eb',borderRadius:'16px',fontFamily:'sans-serif',boxShadow:'0 4px 6px rgba(0,0,0,0.05)'}}>
      <div style={{textAlign:'center',marginBottom:'1.5rem'}}>
        <img src="/logo.png" alt="HamroPay" style={{height:'40px',marginBottom:'1rem'}} onError={(e)=>{(e.target as any).style.display='none'}} />
        <h2 style={{margin:0,color:'#111827'}}>Complete Payment</h2>
        {data.title && <p style={{color:'#6b7280',margin:'0.25rem 0'}}>{data.title}</p>}
      </div>

      <div style={{textAlign:'center',background:'#f9fafb',padding:'1.5rem',borderRadius:'12px',marginBottom:'1.5rem'}}>
        <div style={{fontSize:'2.5rem',fontWeight:'bold',color:'#4f46e5'}}>₹{data.amount}</div>
        <div style={{color:'#6b7280',fontSize:'0.875rem',marginTop:'0.25rem'}}>Pay this amount via UPI</div>
      </div>

      <div style={{background:'#eff6ff',padding:'1rem',borderRadius:'12px',marginBottom:'1.5rem',textAlign:'center'}}>
        <div style={{fontSize:'0.875rem',color:'#6b7280',marginBottom:'0.25rem'}}>Pay to UPI ID</div>
        <div style={{fontSize:'1.25rem',fontWeight:'bold',color:'#1d4ed8'}}>9769516928@fam</div>
        <div style={{fontSize:'0.875rem',color:'#374151',marginTop:'0.25rem'}}>MOHD MUKHTAR</div>
        <button
          onClick={() => {navigator.clipboard.writeText('9769516928@fam')}}
          style={{marginTop:'0.5rem',padding:'0.25rem 0.75rem',background:'#dbeafe',border:'none',borderRadius:'6px',cursor:'pointer',fontSize:'0.875rem',color:'#1d4ed8'}}
        >
          Copy UPI ID
        </button>
      </div>

      {status !== 'success' && (
        <>
          <div style={{marginBottom:'1rem'}}>
            <label style={{display:'block',marginBottom:'0.5rem',fontWeight:'500',color:'#374151'}}>
              Enter UTR Number after payment:
            </label>
            <input
              type="text"
              value={utr}
              onChange={e => setUtr(e.target.value)}
              placeholder="e.g. 623851978381"
              style={{width:'100%',padding:'0.75rem',border:'1px solid #d1d5db',borderRadius:'8px',fontSize:'1rem',boxSizing:'border-box',outline:'none'}}
            />
            <p style={{fontSize:'0.75rem',color:'#9ca3af',marginTop:'0.25rem'}}>
              UTR is found in your UPI app payment receipt
            </p>
          </div>

          <button
            onClick={handleVerify}
            disabled={status === 'loading'}
            style={{width:'100%',padding:'0.875rem',background:'#4f46e5',color:'white',border:'none',borderRadius:'8px',fontSize:'1rem',cursor:'pointer',fontWeight:'600',opacity:status==='loading'?0.7:1}}
          >
            {status === 'loading' ? 'Verifying...' : 'Confirm Payment'}
          </button>
        </>
      )}

      {message && (
        <div style={{marginTop:'1rem',padding:'0.75rem',borderRadius:'8px',textAlign:'center',background:status==='success'?'#d1fae5':status==='error'?'#fee2e2':'#f3f4f6',color:status==='success'?'#065f46':status==='error'?'#991b1b':'#374151'}}>
          {status === 'success' ? '✅ ' : status === 'error' ? '❌ ' : ''}{message}
        </div>
      )}

      <p style={{textAlign:'center',fontSize:'0.75rem',color:'#9ca3af',marginTop:'1.5rem'}}>
        Secured by HamroPay
      </p>
    </div>
  );
};

export { PayPage };
export default PayPage;
