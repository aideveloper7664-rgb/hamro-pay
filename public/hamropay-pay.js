/*!
 * Hamro Pay checkout widget
 * <script src="https://YOUR-HAMRO-API/hamropay-pay.js"></script>
 *
 * HamroPay.setCallbacks({ onSuccess, onFailed, onTimeout });
 * HamroPay.createOrder({ hamro_api, amount, title?, customer_mobile? });
 *
 * NOTE: onSuccess sirf UI signal hai. Maal dene se pehle apne SERVER se
 * GET /api/developer/order-status/:orderId call karke status === "success" check karo.
 */
(function (global) {
  'use strict';

  var BASE = 'https://hamropay-backends.onrender.com';
  try {
    var cs = document.currentScript;
    if (cs && cs.src) BASE = new URL(cs.src).origin;   // script jahan se aayi, API wahin hai
  } catch (e) {}

  var POLL_MS = 2500;
  var CLOSED_GRACE_MS = 60 * 1000;   // popup band hone ke baad bhi itni der payment dhundte rehte hain
  var callbacks = {};

  function fire(name, payload) {
    try {
      if (typeof callbacks[name] === 'function') callbacks[name](payload);
    } catch (e) {
      console.error('HamroPay.js: error inside ' + name + ' callback', e);
    }
  }

  function setCallbacks(cb) {
    callbacks = cb || {};
  }

  function poll(order, popup) {
    var finished = false;
    var closedAt = null;

    function finish(name, payload) {
      if (finished) return;
      finished = true;
      try { if (popup && !popup.closed) popup.close(); } catch (e) {}
      fire(name, payload);
    }

    function schedule() {
      if (!finished) setTimeout(tick, POLL_MS);
    }

    function tick() {
      if (finished) return;

      if (popup && popup.closed && closedAt === null) closedAt = Date.now();
      if (closedAt !== null && Date.now() - closedAt > CLOSED_GRACE_MS) {
        return finish('onTimeout', { order_id: order.order_id, amount: order.amount, reason: 'closed' });
      }

      fetch(BASE + '/api/developer/public-order-status/' + encodeURIComponent(order.order_id))
        .then(function (r) { return r.json(); })
        .then(function (res) {
          if (finished) return;
          var d = res && res.data;
          if (!res || !res.success || !d) return schedule();

          if (d.status === 'paid') {
            finish('onSuccess', { order_id: order.order_id, amount: order.amount });
          } else if (d.status === 'cancelled' || d.status === 'failed') {
            finish('onFailed', { order_id: order.order_id, amount: order.amount, reason: d.status });
          } else if (d.status === 'expired' || d.status === 'disabled') {
            finish('onTimeout', { order_id: order.order_id, amount: order.amount, reason: d.status });
          } else {
            schedule();
          }
        })
        .catch(schedule);
    }

    tick();
  }

  function createOrder(opts) {
    opts = opts || {};

    // Yahan fail hone par sirf console me dikhta hai, koi callback nahi chalta (network tak baat jaati hi nahi)
    if (!opts.hamro_api) { console.error('HamroPay.js: hamro_api key is required'); return; }
    if (opts.amount === undefined || opts.amount === null || opts.amount === '') {
      console.error('HamroPay.js: amount is required');
      return;
    }

    // Popup click ke turant baad kholna zaroori hai, warna browser block kar deta hai
    var popup = null;
    try {
      popup = window.open('', 'hamropay_checkout', 'width=430,height=700,menubar=no,toolbar=no,location=yes,resizable=yes,scrollbars=yes');
      if (popup && popup.document) {
        popup.document.write('<title>Hamro Pay</title><body style="margin:0;height:100vh;display:flex;align-items:center;justify-content:center;background:#0b0508;color:#fff;font-family:system-ui,sans-serif">Opening secure checkout...</body>');
      }
    } catch (e) { popup = null; }

    var body = { hamro_api: opts.hamro_api, amount: opts.amount, useEmbedded: true };
    if (opts.title) body.title = opts.title;
    if (opts.customer_mobile) body.customer_mobile = opts.customer_mobile;

    fetch(BASE + '/api/developer/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
      .then(function (r) {
        return r.json().catch(function () { return { success: false, message: 'Invalid response from server' }; });
      })
      .then(function (res) {
        if (!res.success || !res.data) {
          try { if (popup) popup.close(); } catch (e) {}
          return fire('onFailed', { error: res.message || 'Could not create order', errors: res.errors || null });
        }

        var d = res.data;
        if (popup && !popup.closed) {
          popup.location.href = d.payment_url;
          poll(d, popup);
        } else {
          // Popup block hua: same tab me payment page. Return par apna server order-status se verify kare.
          window.location.href = d.payment_url;
        }
      })
      .catch(function () {
        try { if (popup) popup.close(); } catch (e) {}
        fire('onFailed', { error: 'network_error' });
      });
  }

  global.HamroPay = { setCallbacks: setCallbacks, createOrder: createOrder, version: '1.0.0' };
})(window);
