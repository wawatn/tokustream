export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    const { accessToken, amount, description, email } = req.body || {};
    if (!accessToken) {
      return res.status(400).json({ message: 'Access token ausente' });
    }

    try {
      const response = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-Idempotency-Key': `tokustream-${Date.now()}-${Math.floor(Math.random() * 1000000)}`
        },
        body: JSON.stringify({
          transaction_amount: amount,
          description: description || 'Creditos Tokustream',
          payment_method_id: 'pix',
          payer: {
            email: email || 'cliente@tokustream.com',
            first_name: 'Cliente',
            last_name: 'Tokustream'
          }
        })
      });

      const data = await response.json();
      return res.status(response.status).json(data);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }

  if (req.method === 'GET') {
    const { id, accessToken } = req.query || {};
    if (!id || !accessToken) {
      return res.status(400).json({ message: 'Parâmetros ausentes' });
    }

    try {
      const response = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      const data = await response.json();
      return res.status(response.status).json(data);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }

  return res.status(405).json({ message: 'Método não permitido' });
}
