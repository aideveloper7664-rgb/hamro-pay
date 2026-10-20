/* Auto-generated Hamro Pay API Documentation Data */

export interface CodeBlock {
  label: string;
  code: string;
}

export interface SampleLang {
  label: string;
  short: string;
  name: string;
  intro: string;
  blocks: CodeBlock[];
  notes?: [string, string][];
}

export interface ErrorItem {
  cat: 'auth' | 'validation' | 'limits';
  code: string;
  name: string;
  msg: string;
  why: string;
  fix: string;
  payload?: string;
}

export const BASE_URL = "https://hamropay-backends.onrender.com";

export const LANGS = [
  "html",
  "php",
  "node",
  "python",
  "java",
  "kotlin",
  "js"
] as const;
export type LangKey = typeof LANGS[number];

export const SAMPLES: Record<LangKey, SampleLang> = {
  "html": {
    "label": "HTML / JS",
    "short": "HT",
    "name": "index.html",
    "intro": "Add the widget script, set your callbacks and call createOrder. The widget opens the payment popup and watches the order for you.",
    "blocks": [
      {
        "label": "index.html",
        "code": "<script src=\"https://hamropay-backends.onrender.com/hamropay-pay.js\"></script>\n\n<button onclick=\"payNow()\">Pay ₹100</button>\n\n<script>\n  HamroPay.setCallbacks({\n    onSuccess: function (order) {\n      // order = { order_id, amount }. This is only a UI signal.\n      // Confirm on YOUR server with order-status before you deliver anything.\n      console.log('Payment successful:', order.order_id);\n    },\n    onFailed: function (order) {\n      // order = { order_id, amount, reason } OR { error } when the order could not be created\n      console.log('Payment failed:', order);\n    },\n    onTimeout: function (order) {\n      // Order expired, or the popup was closed and no payment was found\n      console.log('Payment timed out:', order);\n    }\n  });\n\n  function payNow() {\n    HamroPay.createOrder({\n      hamro_api: 'YOUR_HAMRO_API_KEY',\n      amount: 100,\n      title: 'Order #123',            // optional\n      customer_mobile: '9999999999'   // optional\n    });\n  }\n</script>"
      }
    ],
    "notes": [
      [
        "info",
        "createOrder opens a 430×700 popup <b>immediately</b> on click (so browsers do not block it) and then points it at the payment page. If popups are blocked it falls back to opening the payment page in the same tab. In that case use <code>redirect_url</code> flow and verify on return."
      ],
      [
        "warn",
        "<b>The widget fails silently on missing input.</b> If <code>hamro_api</code> or <code>amount</code> is missing it only writes to the browser console and no callback fires. Test with DevTools open."
      ],
      [
        "bad",
        "With the widget, your API key is visible in page source. For a real store, create the order on your server (PHP / Node / Python tabs) and open the returned <code>payment_url</code>."
      ]
    ]
  },
  "php": {
    "label": "PHP",
    "short": "PHP",
    "name": "create-order.php",
    "intro": "Two scripts: one creates the order on your server and redirects the customer, the other handles their return and confirms the payment before trusting it.",
    "blocks": [
      {
        "label": "create-order.php",
        "code": "<?php\nsession_start();\n\n// A redirect is a full page navigation: nothing in this script's memory survives it.\n// Save what you need now (a PHP session works) and read it back on return.\n$_SESSION['customer_name']  = $_POST['name']  ?? '';\n$_SESSION['customer_phone'] = $_POST['phone'] ?? '';\n\n$ch = curl_init('https://hamropay-backends.onrender.com/api/developer/create-order');\ncurl_setopt($ch, CURLOPT_POST, true);\ncurl_setopt($ch, CURLOPT_RETURNTRANSFER, true);\ncurl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);\ncurl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([\n    'hamro_api'    => 'YOUR_HAMRO_API_KEY',\n    'amount'       => 100,                      // take this from YOUR database, never from the browser\n    'title'        => 'Order #123',\n    'redirect_url' => 'https://yourstore.com/payment-return.php'\n]));\n$response = curl_exec($ch);\ncurl_close($ch);\n\n$result = json_decode($response, true);\n\nif ($result['success']) {\n    $_SESSION['order_id'] = $result['data']['order_id'];\n    header('Location: ' . $result['data']['payment_url']);\n    exit;\n}\necho 'Could not start payment: ' . htmlspecialchars($result['message']);"
      },
      {
        "label": "payment-return.php",
        "code": "<?php\nsession_start();\n// hp_result in the URL can be spoofed by anyone. Never trust it alone.\n$orderId = $_GET['hp_order'] ?? null;\nif (!$orderId || $orderId !== ($_SESSION['order_id'] ?? null)) {\n    die('Unknown order.');\n}\n\n$ch = curl_init(\"https://hamropay-backends.onrender.com/api/developer/order-status/{$orderId}\");\ncurl_setopt($ch, CURLOPT_RETURNTRANSFER, true);\ncurl_setopt($ch, CURLOPT_HTTPHEADER, ['X-HamroAPI-Key: YOUR_HAMRO_API_KEY']);\n$response = curl_exec($ch);\ncurl_close($ch);\n$result = json_decode($response, true);\n\nif ($result['success'] && $result['data']['status'] === 'success') {\n    // Verified on the server: safe to fulfil. Do it once per order_id.\n    echo 'Payment confirmed for order ' . htmlspecialchars($result['data']['order_id']);\n} elseif ($result['success'] && $result['data']['status'] === 'pending') {\n    echo 'Payment still pending, please check again shortly.';\n} else {\n    echo 'Payment failed or expired.';\n}"
      }
    ],
    "notes": [
      [
        "bad",
        "Never branch fulfilment on <code>$_GET['hp_result']</code>. The only trustworthy signal is a server-to-server <code>order-status</code> call returning <code>\"success\"</code>."
      ]
    ]
  },
  "node": {
    "label": "Node.js",
    "short": "JS",
    "name": "routes/checkout.js",
    "intro": "Express example: one route creates the order and redirects the customer, another handles their return and confirms the payment.",
    "blocks": [
      {
        "label": "routes/checkout.js",
        "code": "const express = require('express');\nconst router = express.Router();\n\nconst HAMRO_API_KEY = process.env.HAMRO_API_KEY;   // keep the key in an environment variable\nconst BASE_URL = 'https://hamropay-backends.onrender.com';\n\nrouter.post('/create-order', async (req, res) => {\n  const response = await fetch(BASE_URL + '/api/developer/create-order', {\n    method: 'POST',\n    headers: { 'Content-Type': 'application/json' },\n    body: JSON.stringify({\n      hamro_api: HAMRO_API_KEY,\n      amount: 100,                                  // from YOUR database, not from req.body\n      title: 'Order #123',\n      redirect_url: 'https://yourstore.com/payment-return'\n    })\n  });\n  const result = await response.json();\n\n  if (!result.success) return res.status(400).json({ error: result.message });\n  // Save result.data.order_id against your own order here\n  res.redirect(result.data.payment_url);\n});\n\n// hp_order and hp_result are appended by Hamro Pay.\n// hp_result can be spoofed. Always confirm with order-status from this server.\nrouter.get('/payment-return', async (req, res) => {\n  const orderId = req.query.hp_order;\n  if (!orderId) return res.status(400).send('Missing order id.');\n\n  const response = await fetch(BASE_URL + '/api/developer/order-status/' + encodeURIComponent(orderId), {\n    headers: { 'X-HamroAPI-Key': HAMRO_API_KEY }\n  });\n  const result = await response.json();\n\n  if (result.success && result.data.status === 'success') {\n    res.send('Payment confirmed for order ' + result.data.order_id);   // fulfil once per order_id\n  } else if (result.success && result.data.status === 'pending') {\n    res.send('Payment still pending, please check again shortly.');\n  } else {\n    res.status(400).send('Payment failed or expired.');\n  }\n});\n\nmodule.exports = router;"
      }
    ],
    "notes": [
      [
        "info",
        "Set the key as an environment variable: <code>HAMRO_API_KEY=hmpay_...</code>. Requires Node 18+ for built-in <code>fetch</code>."
      ],
      [
        "bad",
        "Never branch fulfilment on <code>req.query.hp_result</code>. Only a server-side <code>order-status</code> result of <code>\"success\"</code> counts."
      ]
    ]
  },
  "python": {
    "label": "Python",
    "short": "PY",
    "name": "app.py",
    "intro": "Flask + requests: one route creates the order and redirects the customer, another handles their return and confirms the payment.",
    "blocks": [
      {
        "label": "app.py",
        "code": "import os\nimport requests\nfrom flask import Flask, request, redirect, jsonify\n\napp = Flask(__name__)\n\nHAMRO_API_KEY = os.environ['HAMRO_API_KEY']   # keep the key in an environment variable\nBASE_URL = 'https://hamropay-backends.onrender.com'\n\n@app.route('/create-order', methods=['POST'])\ndef create_order():\n    resp = requests.post(BASE_URL + '/api/developer/create-order', json={\n        'hamro_api': HAMRO_API_KEY,\n        'amount': 100,                         # from YOUR database, not from request data\n        'title': 'Order #123',\n        'redirect_url': 'https://yourstore.com/payment-return'\n    }, timeout=15)\n    result = resp.json()\n\n    if not result['success']:\n        return jsonify({'error': result['message']}), 400\n    # Save result['data']['order_id'] against your own order here\n    return redirect(result['data']['payment_url'])\n\n# hp_order and hp_result are appended by Hamro Pay.\n# hp_result can be spoofed. Always confirm with order-status from this server.\n@app.route('/payment-return')\ndef payment_return():\n    order_id = request.args.get('hp_order')\n    if not order_id:\n        return 'Missing order id.', 400\n\n    resp = requests.get(\n        BASE_URL + '/api/developer/order-status/' + order_id,\n        headers={'X-HamroAPI-Key': HAMRO_API_KEY}, timeout=15)\n    result = resp.json()\n\n    if result['success'] and result['data']['status'] == 'success':\n        return 'Payment confirmed for order ' + result['data']['order_id']   # fulfil once per order_id\n    if result['success'] and result['data']['status'] == 'pending':\n        return 'Payment still pending, please check again shortly.'\n    return 'Payment failed or expired.', 400\n\nif __name__ == '__main__':\n    app.run(port=5000)"
      }
    ],
    "notes": [
      [
        "info",
        "Set the key as an environment variable: <code>HAMRO_API_KEY=hmpay_...</code>"
      ],
      [
        "bad",
        "Never branch fulfilment on <code>hp_result</code> alone. Only a server-side <code>order-status</code> result of <code>\"success\"</code> counts."
      ]
    ]
  },
  "java": {
    "label": "Java (Android)",
    "short": "JV",
    "name": "HamroPayClient.java",
    "intro": "OkHttp: create the order, open payment_url in a Chrome Custom Tab, then poll order-status until it resolves.",
    "blocks": [
      {
        "label": "HamroPayClient.java",
        "code": "OkHttpClient client = new OkHttpClient();\nString HAMRO_API_KEY = \"YOUR_HAMRO_API_KEY\";   // better: fetch the order from YOUR backend so the key is not in the app\nString BASE_URL = \"https://hamropay-backends.onrender.com\";\nHandler handler = new Handler(Looper.getMainLooper());\n\npublic void createOrder(double amount, String title, OrderCallback callback) {\n    JSONObject body = new JSONObject();\n    try {\n        body.put(\"hamro_api\", HAMRO_API_KEY);\n        body.put(\"amount\", amount);\n        body.put(\"title\", title);\n        body.put(\"useEmbedded\", true);\n    } catch (JSONException e) { callback.onError(e.getMessage()); return; }\n\n    Request request = new Request.Builder()\n        .url(BASE_URL + \"/api/developer/create-order\")\n        .post(RequestBody.create(body.toString(), MediaType.parse(\"application/json\")))\n        .build();\n\n    client.newCall(request).enqueue(new Callback() {\n        @Override public void onFailure(Call call, IOException e) { callback.onError(e.getMessage()); }\n        @Override public void onResponse(Call call, Response response) throws IOException {\n            try {\n                JSONObject json = new JSONObject(response.body().string());\n                if (json.getBoolean(\"success\")) {\n                    JSONObject data = json.getJSONObject(\"data\");\n                    openCustomTab(data.getString(\"payment_url\"));\n                    pollOrderStatus(data.getString(\"order_id\"), callback);\n                } else {\n                    callback.onError(json.getString(\"message\"));\n                }\n            } catch (JSONException e) { callback.onError(e.getMessage()); }\n        }\n    });\n}\n\nvoid openCustomTab(String url) {\n    new CustomTabsIntent.Builder().build().launchUrl(context, Uri.parse(url));\n}\n\n// Poll every ~2.5 s. Orders expire after 15 minutes, so stop by then.\npublic void pollOrderStatus(String orderId, OrderCallback callback) {\n    Request request = new Request.Builder()\n        .url(BASE_URL + \"/api/developer/order-status/\" + orderId)\n        .header(\"X-HamroAPI-Key\", HAMRO_API_KEY)\n        .get().build();\n\n    client.newCall(request).enqueue(new Callback() {\n        @Override public void onFailure(Call call, IOException e) { callback.onError(e.getMessage()); }\n        @Override public void onResponse(Call call, Response response) throws IOException {\n            try {\n                JSONObject json = new JSONObject(response.body().string());\n                if (!json.getBoolean(\"success\")) { callback.onError(json.getString(\"message\")); return; }\n                JSONObject data = json.getJSONObject(\"data\");\n                String status = data.getString(\"status\");\n                if (status.equals(\"success\")) callback.onSuccess(data);\n                else if (status.equals(\"failed\")) callback.onFailed(data);\n                else handler.postDelayed(() -> pollOrderStatus(orderId, callback), 2500);   // still pending\n            } catch (JSONException e) { callback.onError(e.getMessage()); }\n        }\n    });\n}\n\npublic interface OrderCallback {\n    void onSuccess(JSONObject data);\n    void onFailed(JSONObject data);\n    void onError(String message);\n}"
      }
    ],
    "notes": [
      [
        "bad",
        "Only treat the purchase as paid inside <code>onSuccess</code>, which runs after <code>order-status</code> returned <code>\"success\"</code>. Never because the Custom Tab simply closed."
      ]
    ]
  },
  "kotlin": {
    "label": "Kotlin (Android)",
    "short": "KT",
    "name": "HamroPayClient.kt",
    "intro": "OkHttp + coroutines: create the order, open payment_url in a Chrome Custom Tab, then suspend-poll order-status until it resolves.",
    "blocks": [
      {
        "label": "HamroPayClient.kt",
        "code": "class HamroPayClient(private val context: Context) {\n    private val client = OkHttpClient()\n    private val apiKey = \"YOUR_HAMRO_API_KEY\"   // better: fetch the order from YOUR backend so the key is not in the app\n    private val baseUrl = \"https://hamropay-backends.onrender.com\"\n    private val json = \"application/json; charset=utf-8\".toMediaType()\n\n    data class OrderResult(val orderId: String, val status: String, val amount: Double)\n\n    suspend fun createOrder(amount: Double, title: String): OrderResult = withContext(Dispatchers.IO) {\n        val body = JSONObject().apply {\n            put(\"hamro_api\", apiKey)\n            put(\"amount\", amount)\n            put(\"title\", title)\n            put(\"useEmbedded\", true)\n        }\n        val request = Request.Builder()\n            .url(baseUrl + \"/api/developer/create-order\")\n            .post(body.toString().toRequestBody(json))\n            .build()\n\n        client.newCall(request).execute().use { response ->\n            val res = JSONObject(response.body!!.string())\n            if (!res.getBoolean(\"success\")) throw Exception(res.getString(\"message\"))\n            val data = res.getJSONObject(\"data\")\n            openCustomTab(data.getString(\"payment_url\"))\n            pollOrderStatus(data.getString(\"order_id\"))\n        }\n    }\n\n    private fun openCustomTab(url: String) {\n        CustomTabsIntent.Builder().build().launchUrl(context, Uri.parse(url))\n    }\n\n    // Orders expire after 15 minutes: the status turns \"failed\", so this loop ends on its own.\n    suspend fun pollOrderStatus(orderId: String): OrderResult = withContext(Dispatchers.IO) {\n        while (true) {\n            val request = Request.Builder()\n                .url(baseUrl + \"/api/developer/order-status/\" + orderId)\n                .header(\"X-HamroAPI-Key\", apiKey)\n                .get().build()\n\n            client.newCall(request).execute().use { response ->\n                val res = JSONObject(response.body!!.string())\n                if (!res.getBoolean(\"success\")) throw Exception(res.getString(\"message\"))\n                val data = res.getJSONObject(\"data\")\n                val status = data.getString(\"status\")\n                if (status == \"success\" || status == \"failed\") {\n                    return@withContext OrderResult(orderId, status, data.getDouble(\"amount\"))\n                }\n            }\n            delay(2500)\n        }\n        @Suppress(\"UNREACHABLE_CODE\")\n        throw IllegalStateException()\n    }\n}\n\n// From a coroutine scope (viewModelScope, lifecycleScope...):\n// val result = hamroPayClient.createOrder(100.0, \"Order #123\")\n// if (result.status == \"success\") { /* fulfil */ }"
      }
    ],
    "notes": [
      [
        "bad",
        "Only fulfil when <code>pollOrderStatus</code> itself returns <code>status == \"success\"</code>. That is the real confirmation, not the Custom Tab closing."
      ]
    ]
  },
  "js": {
    "label": "JavaScript",
    "short": "JS",
    "name": "checkout.js",
    "intro": "The same widget as the HTML tab, wired from an external or bundled JS file (no inline script tags): bundlers, CMS custom-JS blocks and similar.",
    "blocks": [
      {
        "label": "checkout.js",
        "code": "// <script src=\"https://hamropay-backends.onrender.com/hamropay-pay.js\"></script> must already be on the page\n\nHamroPay.setCallbacks({\n  onSuccess: function (order) {\n    // UI signal only. Ask YOUR server to confirm with order-status before you deliver anything.\n    fetch('/api/confirm-order?order_id=' + encodeURIComponent(order.order_id))\n      .then(function (r) { return r.json(); })\n      .then(function (data) {\n        if (data.confirmed) document.getElementById('checkout-status').textContent = 'Payment confirmed!';\n      });\n  },\n  onFailed: function () {\n    document.getElementById('checkout-status').textContent = 'Payment failed.';\n  },\n  onTimeout: function () {\n    document.getElementById('checkout-status').textContent = 'Payment timed out.';\n  }\n});\n\ndocument.getElementById('pay-button').addEventListener('click', function () {\n  HamroPay.createOrder({\n    hamro_api: 'YOUR_HAMRO_API_KEY',   // for a real site, create the order on your server instead\n    amount: 100,\n    title: 'Order #123',\n    customer_mobile: document.getElementById('phone-input').value\n  });\n});\n\n// /api/confirm-order on YOUR server should call\n//   GET https://hamropay-backends.onrender.com/api/developer/order-status/:orderId\n// with header X-HamroAPI-Key: YOUR_HAMRO_API_KEY\n// and only answer confirmed: true when data.status === \"success\"."
      }
    ],
    "notes": [
      [
        "bad",
        "Even though <code>onSuccess</code> fired, treat it as a UI signal only. The server-side <code>order-status</code> check is what gates fulfilment."
      ]
    ]
  }
};

export const ERRORS: ErrorItem[] = [
  {
    "cat": "auth",
    "code": "401",
    "name": "Missing HamroAPI key",
    "msg": "Missing HamroAPI key...",
    "why": "Neither a <code>hamro_api</code> field in the body nor an <code>X-HamroAPI-Key</code> header was found. Both places are checked.",
    "fix": "Send the key as the <code>X-HamroAPI-Key</code> header (server calls) or as <code>hamro_api</code> in the body (widget). Check the variable is not empty at send time: usually a missing environment variable.",
    "payload": "{ \"success\": false, \"message\": \"Missing HamroAPI key. Pass it as \\\"hamro_api\\\" in the request body or an \\\"X-HamroAPI-Key\\\" header.\" }"
  },
  {
    "cat": "auth",
    "code": "401",
    "name": "Invalid HamroAPI key",
    "msg": "Invalid HamroAPI key",
    "why": "A key was sent but it does not match any account. Usually a stale key after regenerating, a copy-paste slip (extra space or missing character), or a key from another account.",
    "fix": "Copy the key again from the dashboard Developer section. After regenerating, update every place that uses it. The old key stops working instantly.",
    "payload": "{ \"success\": false, \"message\": \"Invalid HamroAPI key\" }"
  },
  {
    "cat": "auth",
    "code": "403",
    "name": "Account suspended",
    "msg": "This account has been suspended.",
    "why": "The key is valid but the account has been suspended. This is checked on every request.",
    "fix": "Not fixable in code. Contact Hamro Pay support to resolve the suspension.",
    "payload": "{ \"success\": false, \"message\": \"This account has been suspended.\", \"banned\": true }"
  },
  {
    "cat": "validation",
    "code": "400",
    "name": "Validation failed",
    "msg": "Validation failed",
    "why": "A <code>create-order</code> field is invalid, most often: <b>1)</b> <code>amount</code> sent as a formatted string such as <code>\"₹499\"</code> or <code>\"1,999\"</code>, or outside ₹1 to ₹5,000, or with more than 2 decimals; <b>2)</b> <code>customer_mobile</code> with spaces, dashes or brackets; <b>3)</b> <code>title</code> over 100 characters; <b>4)</b> <code>redirect_url</code> that is not a valid http(s) URL; <b>5)</b> <code>useEmbedded</code> that is not true/false.",
    "fix": "Sanitise before sending: <code>Number(String(price).replace(/[^0-9.]/g,''))</code> for amount, strip non-digits from phone numbers (or omit the field). The <code>errors</code> array names each failing field.",
    "payload": "{ \"success\": false, \"message\": \"Validation failed\",\n  \"errors\": [ { \"field\": \"amount\", \"msg\": \"Amount must be a plain number between ₹1 and ₹5,000\" } ] }"
  },
  {
    "cat": "validation",
    "code": "404",
    "name": "Order not found",
    "msg": "Order not found",
    "why": "Returned by <code>order-status</code> when the order id does not exist <b>or</b> belongs to another account. Both cases return the same message on purpose.",
    "fix": "Pass the exact <code>order_id</code> from create-order, unmodified, and use the same API key that created it.",
    "payload": "{ \"success\": false, \"message\": \"Order not found\" }"
  },
  {
    "cat": "limits",
    "code": "400",
    "name": "No payment account connected",
    "msg": "Please connect FamPay or Paytm account first...",
    "why": "Live mode needs a connected, active FamPay account to receive payments. Test mode does not.",
    "fix": "Connect a FamPay account in the dashboard (UPI ID + Gmail App Password), or switch to Test mode while developing.",
    "payload": "{ \"success\": false, \"message\": \"Please connect FamPay or Paytm account first to accept payments\" }"
  },
  {
    "cat": "limits",
    "code": "400",
    "name": "Insufficient Hamro Credits",
    "msg": "Insufficient Hamro Credits...",
    "why": "Your credits balance is empty (Live mode). Commission is paid from credits.",
    "fix": "Add credits from the dashboard. Test mode does not use credits.",
    "payload": "{ \"success\": false, \"message\": \"Insufficient Hamro Credits. Please purchase more credits.\" }"
  },
  {
    "cat": "limits",
    "code": "400",
    "name": "Wallet full",
    "msg": "Your Hamro wallet is full...",
    "why": "Wallet balance plus this order would exceed your plan's wallet limit. Live mode only.",
    "fix": "Withdraw funds or upgrade your plan. It is an account limit that no request parameter can change.",
    "payload": "{ \"success\": false, \"message\": \"Your Hamro wallet is full. Upgrade your plan or withdraw first.\" }"
  },
  {
    "cat": "limits",
    "code": "429",
    "name": "Rate limited",
    "msg": "Too many API requests...",
    "why": "More than 60 requests in 15 minutes on this key (or IP if no key was sent), shared across create-order and order-status. Often caused by polling faster than every 2 to 3 seconds, or a retry loop without backoff.",
    "fix": "Poll no faster than every 2.5 seconds, add exponential backoff to retries, and wait for the window to reset (no early reset).",
    "payload": "{ \"success\": false, \"message\": \"Too many API requests. Please try again later.\" }"
  },
  {
    "cat": "limits",
    "code": "429",
    "name": "Too many pending orders",
    "msg": "Too many pending orders right now...",
    "why": "Hamro Pay gives each waiting order a unique amount. Up to 50 orders for your account can be waiting at the same time.",
    "fix": "Wait a few minutes: orders free their amount when paid, cancelled or expired (15 minutes). Do not create a new order on every page refresh: reuse the one you already have.",
    "payload": "{ \"success\": false, \"message\": \"Too many pending orders right now. Please try again in a few minutes.\" }"
  },
  {
    "cat": "limits",
    "code": "503",
    "name": "Maintenance mode",
    "msg": "Payment system is under maintenance.",
    "why": "Hamro Pay has paused new orders platform-wide. Unrelated to your account or request. Only on create-order in Live mode.",
    "fix": "Nothing to change in your code. Retry after a short delay.",
    "payload": "{ \"success\": false, \"message\": \"Payment system is under maintenance.\" }"
  },
  {
    "cat": "validation",
    "code": "JS",
    "name": "Widget: nothing happens on click",
    "msg": "console: \"hamro_api key is required\" / \"amount is required\"",
    "why": "Not an API error: it never reaches the network. The widget checks <code>hamro_api</code> and <code>amount</code> first and, if either is missing, only logs to the console. No callback fires.",
    "fix": "Open DevTools while testing. Confirm the object passed to <code>HamroPay.createOrder({...})</code> has non-empty values at the moment of the click."
  },
  {
    "cat": "validation",
    "code": "JS",
    "name": "Widget: onFailed({ error })",
    "msg": "onFailed({ error: \"network_error\" })",
    "why": "The browser could not reach the API (offline, blocked by an ad-blocker or firewall, or the server was asleep and timed out). Other API errors arrive in the same callback with the API's own message in <code>error</code>.",
    "fix": "Show the message to the user and let them retry. If it is always <code>network_error</code>, check the Network tab for blocked requests to the API host."
  }
];

export const ERROR_CATEGORIES = [
  { id: 'all', label: 'All errors' },
  { id: 'auth', label: 'Authentication' },
  { id: 'validation', label: 'Validation' },
  { id: 'limits', label: 'Limits & account' }
] as const;

export function stripHtml(t: string): string {
  return t.replace(/<[^>]+>/g, '');
}

export function generatePromptFor(l: LangKey): string {
  const s = SAMPLES[l];
  const lines: string[] = [
    'You are integrating the Hamro Pay UPI payment API into an existing ' + s.label + ' codebase that I am about to give you (or have already given you). Read my existing code first and wire this into my REAL checkout flow. Do not create a disconnected demo and call it done. If something is ambiguous for my codebase, ask me ONE clarifying question first; otherwise implement the full flow.',
    '',
    '=== NON-NEGOTIABLE RULES ===',
    '1. A redirect landing, a popup closing or a client-side callback is NEVER proof of payment. The only trustworthy signal is GET /api/developer/order-status/:orderId called from the SERVER returning status === "success". Build this verification even if I did not ask.',
    '2. "amount" must be a plain number (499), never a formatted string. Strip it: Number(String(price).replace(/[^0-9.]/g, "")). Take the amount from my own database/cart, never from the browser.',
    '3. "customer_mobile" is optional: exactly 10 digits (optional 91/+91/0 prefix). If you cannot guarantee that, omit it.',
    '4. Handle the real errors in the table below with actionable messages (validation, key problems, rate limit, no payment account, no credits, network).',
    '5. Keep the API key in server-side config / environment variables where the stack allows. Never put it in a public file if a server option exists.',
    '6. Fulfil each order_id only once (idempotent). Store order_id against my own order.',
    '7. Before telling me you are done, re-read rules 1 to 6 against what you wrote. If unsure it works, say so and tell me what to test.',
    '',
    'API REFERENCE',
    '=============',
    'POST ' + BASE_URL + '/api/developer/create-order   (Content-Type: application/json)',
    '  hamro_api        string   required unless X-HamroAPI-Key header is used',
    '  amount           number   REQUIRED. Rs.1 to Rs.5000, max 2 decimals. Plain number (499). Sanitise: Number(String(price).replace(/[^0-9.]/g,""))',
    '  title            string   optional, max 100 chars, default "Hamro Pay Payment"',
    '  customer_mobile  string   optional, 10 digits, optional 91/+91/0 prefix, no spaces or dashes',
    '  redirect_url     string   optional http(s) URL. Hamro Pay appends ?hp_order=<id>&hp_result=success|failed',
    '  useEmbedded      boolean  optional. true for popup / in-app checkout',
    '',
    'GET ' + BASE_URL + '/api/developer/order-status/:orderId   (header X-HamroAPI-Key)',
    '  Returns 200: { success: true, data: { status, order_id, amount, pay_amount, utr, is_test, mode } }',
    '',
    '=== ERROR TABLE ==='
  ];

  ERRORS.filter(e => e.code !== 'JS').forEach(e => {
    lines.push(e.code + ' "' + e.msg + '": ' + stripHtml(e.fix));
  });

  lines.push('');
  lines.push('=== REFERENCE IMPLEMENTATION (' + s.label + ') ===');
  s.blocks.forEach(b => {
    lines.push('--- ' + b.label + ' ---');
    lines.push(b.code);
    lines.push('');
  });

  lines.push('=== STEPS FOR YOU ===');
  lines.push('1. Find my existing buy / checkout / order-creation code.');
  lines.push('2. Insert order creation where payment starts, using the REAL price from my data (sanitised).');
  lines.push('3. Add the return / callback / polling step that verifies via order-status before fulfilling.');
  lines.push('4. Persist order_id and its status in my existing storage if I have any.');
  lines.push('5. Show specific UI for failed, timed-out and pending states.');
  lines.push('6. Tell me which files you changed, and what to replace YOUR_HAMRO_API_KEY with (or which environment variable HAMRO_API_KEY to set).');

  return lines.join(String.fromCharCode(10));
}

export function generateFullDoc(filterLang?: LangKey): string {
  const lines: string[] = [
    'HAMRO PAY API: INTEGRATION REFERENCE',
    '===================================',
    '',
    'WHAT THIS IS',
    "Hamro Pay accepts UPI payments. Your server creates an order, the customer pays the exact amount shown from any UPI app, Hamro Pay detects the payment automatically from the merchant's connected FamPay account, and you confirm the result server-side before fulfilling.",
    '',
    'HOW TO GET STARTED',
    '1. Open your Hamro Pay dashboard -> Developer.',
    '2. Copy your HamroAPI key (starts with hmpay_).',
    '3. Connect a FamPay account in the dashboard (UPI ID + Gmail App Password) so incoming payments can be spotted.',
    '4. Add Hamro Credits: commission is deducted from credits on each successful payment.',
    '5. Create orders from your server, redirect the customer to payment_url, and confirm status with order-status before fulfilling.',
    '',
    'API SPECIFICATION',
    'BASE URL: ' + BASE_URL,
    'AUTH: Send key as header "X-HamroAPI-Key: YOUR_KEY" (recommended) or in request body as "hamro_api".',
    'RATE LIMIT: 60 requests / 15 minutes per key.',
    '',
    'ENDPOINTS:',
    '1) POST ' + BASE_URL + '/api/developer/create-order',
    '   Body (JSON):',
    '     hamro_api: string (required if no header)',
    '     amount: number (required, 1 to 5000, 2 decimals)',
    '     title: string (optional, max 100)',
    '     customer_mobile: string (optional, 10 digits)',
    '     redirect_url: string (optional URL)',
    '     useEmbedded: boolean (optional)',
    '   Response 200: { success: true, data: { order_id, payment_url, pay_amount, status } }',
    '',
    '2) GET ' + BASE_URL + '/api/developer/order-status/:orderId',
    '   Header: X-HamroAPI-Key: YOUR_KEY',
    '   Response 200: { success: true, data: { status, order_id, amount, pay_amount, utr, is_test, mode } }',
    '',
    'WEBHOOKS (OPTIONAL):',
    'Configure a Webhook URL in your dashboard. Hamro Pay will POST:',
    JSON.stringify({
      event: 'payment.success',
      order_id: 'HP1792316718001ETM0',
      amount: 499,
      utr: '429381729482',
      timestamp: 1739281729,
      test: false
    }, null, 2),
    'Always confirm on your server with order-status before fulfilling.',
    '',
    'TEST MODE vs LIVE MODE:',
    'Each account has a mode (Dashboard -> Developer).',
    '- In Test mode, create-order returns a simulator payment_url with Success / Failed / Cancelled buttons. No money moves and no connected FamPay account / credits are needed.',
    '- In Live mode, real UPI checkout is created.',
    '',
    'CODE IMPLEMENTATION SAMPLES:'
  ];

  const langsToInclude = filterLang ? [filterLang] : LANGS;
  langsToInclude.forEach(l => {
    const s = SAMPLES[l];
    lines.push('=== ' + s.label + ' (' + s.name + ') ===');
    lines.push(s.intro);
    lines.push('');
    s.blocks.forEach(b => {
      lines.push('-- ' + b.label + ' --');
      lines.push(b.code);
      lines.push('');
    });
  });

  lines.push('ERROR REFERENCE:');
  ERRORS.forEach(e => {
    lines.push('[' + e.code + '] ' + e.name + ' (' + e.msg + ')');
    lines.push('  Why: ' + stripHtml(e.why));
    lines.push('  Fix: ' + stripHtml(e.fix));
    if (e.payload) lines.push('  Payload: ' + e.payload);
    lines.push('');
  });

  return lines.join(String.fromCharCode(10));
}
