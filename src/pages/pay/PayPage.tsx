import React, { useState, useEffect } from 'react';

const API_URL = (import.meta as any).env.VITE_API_URL || 'https://hamropay-backends.onrender.com';

const PayPage: React.FC = () => {
  const orderId = window.location.pathname.split('/').pop() || '';
  const [order, setOrder] = useState<any>(null);
  const [utr, setUtr] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;
    fetch(`${API_URL}/order/status/${orderId}`, {
      headers: { 'x-api-key': '' }
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) setOrder(data.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [orderId]);

  const handleSubmit = async () => {
    if (!utr || utr.length < 6) {
      setMessage('Please enter a valid UTR number');
      return;
    }
    setStatus('loading');
    try {
      const res = await fetch(`${API_URL}/order/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': '' },
        body: JSON.stringify({ order_id: orderId, utr }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus('success');
        setMessage('Payment verified successfully! Thank you.');
      } else {
        setStatus('error');
        setMessage(data.message || 'Payment verification failed');
      }
    } catch {
      setStatus('error');
      setMessage('Something went wrong. Please try again.');
    }
  };

  if (loading) return <div style={{textAlign:'center',padding:'2rem'}}>Loading...</div>;
  if (!order) return <div style={{textAlign:'center',padding:'2rem'}}>Order not found</div>;
  if (order.status === 'success') return <div style={{textAlign:'center',padding:'2rem',color:'green'}}>✅ Payment already completed!</div>;
  if (order.status === 'expired') return <div style={{textAlign:'center',padding:'2rem',color:'red'}}>❌ Order expired</div>;

  return (
    <div style={{maxWidth:'400px',margin:'2rem auto',padding:'1.5rem',border:'1px solid #eee',borderRadius:'12px',fontFamily:'sans-serif'}}>
      <h2 style={{textAlign:'center',marginBottom:'1rem'}}>Complete Payment</h2>
      <div style={{textAlign:'center',marginBottom:'1rem'}}>
        <div style={{fontSize:'2rem',fontWeight:'bold',color:'#6366f1'}}>₹{order.amount}</div>
        <div style={{color:'#666',fontSize:'0.9rem'}}>Order: {orderId}</div>
      </div>
      <div style={{background:'#f9f9f9',padding:'1rem',borderRadius:'8px',marginBottom:'1rem',textAlign:'center'}}>
        <div style={{fontWeight:'bold',marginBottom:'0.5rem'}}>Pay to UPI ID:</div>
        <div style={{fontSize:'1.2rem',color:'#6366f1',fontWeight:'bold'}}>9769516928@fam</div>
        <div style={{color:'#666',fontSize:'0.8rem',marginTop:'0.5rem'}}>MOHD MUKHTAR</div>
      </div>
      <div style={{marginBottom:'1rem'}}>
        <label style={{display:'block',marginBottom:'0.5rem',fontWeight:'500'}}>Enter UTR Number after payment:</label>
        <input
          type="text"
          value={utr}
          onChange={e => setUtr(e.target.value)}
          placeholder="Enter UTR number"
          style={{width:'100%',padding:'0.75rem',border:'1px solid #ddd',borderRadius:'8px',fontSize:'1rem',boxSizing:'border-box'}}
        />
      </div>
      {message && (
        <div style={{padding:'0.75rem',borderRadius:'8px',marginBottom:'1rem',background:status==='success'?'#d1fae5':status==='error'?'#fee2e2':'#f3f4f6',color:status==='success'?'#065f46':status==='error'?'#991b1b':'#374151'}}>
          {message}
        </div>
      )}
      {status !== 'success' && (
        <button
          onClick={handleSubmit}
          disabled={status === 'loading'}
          style={{width:'100%',padding:'0.875rem',background:'#6366f1',color:'white',border:'none',borderRadius:'8px',fontSize:'1rem',cursor:'pointer',fontWeight:'600'}}
        >
          {status === 'loading' ? 'Verifying...' : 'Verify Payment'}
        </button>
      )}
    </div>
  );
};

export { PayPage };
export default PayPage;
