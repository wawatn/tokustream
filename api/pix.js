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
    const { accessToken, publicKey, paymentType, amount, description, email, cardData } = req.body || {};
    if (!accessToken) {
      return res.status(400).json({ message: 'Access token ausente' });
    }

    const token = accessToken.trim();

    // Process Credit Card Payment via Mercado Pago
    if (paymentType === 'card' && cardData) {
      try {
        const cleanCard = (cardData.cardNumber || '').replace(/\s+/g, '');
        const cleanCpf = (cardData.docNumber || '11122233344').replace(/\D/g, '');
        const expMonth = parseInt(cardData.expMonth, 10) || 12;
        const expYear = parseInt(cardData.expYear.length === 2 ? `20${cardData.expYear}` : cardData.expYear, 10) || 2030;

        // Detect Payment Method ID (brand)
        let paymentMethodId = 'visa';
        if (cleanCard.startsWith('4')) paymentMethodId = 'visa';
        else if (/^(5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[0-1]|2720)/.test(cleanCard)) paymentMethodId = 'master';
        else if (/^(4011|4312|4389|4514|4576|5041|5067|5090|6277|6362|6363)/.test(cleanCard)) paymentMethodId = 'elo';
        else if (/^(34|37)/.test(cleanCard)) paymentMethodId = 'amex';
        else if (/^(38|60)/.test(cleanCard)) paymentMethodId = 'hipercard';

        // Step 1: Create Card Token via Mercado Pago API
        const pubKeyParam = publicKey ? `?public_key=${publicKey.trim()}` : '';
        const tokenRes = await fetch(`https://api.mercadopago.com/v1/card_tokens${pubKeyParam}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            card_number: cleanCard,
            expiration_month: expMonth,
            expiration_year: expYear,
            security_code: cardData.cvv,
            cardholder: {
              name: cardData.holderName || 'CLIENTE TOKUSTREAM',
              identification: {
                type: 'CPF',
                number: cleanCpf
              }
            }
          })
        });

        const tokenData = await tokenRes.json();
        if (!tokenData.id) {
          const cardErr = tokenData.cause?.[0]?.description || tokenData.message || 'Dados do cartão recusados pelo Mercado Pago';
          return res.status(400).json({ message: cardErr });
        }

        // Step 2: Create Payment with Card Token
        const idempotencyKey = `tokustream-card-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
        const payRes = await fetch('https://api.mercadopago.com/v1/payments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-Idempotency-Key': idempotencyKey
          },
          body: JSON.stringify({
            transaction_amount: amount,
            token: tokenData.id,
            description: description || 'Tokustream - Creditos',
            statement_descriptor: 'TOKUSTREAM',
            installments: 1,
            payment_method_id: paymentMethodId,
            payer: {
              email: email || 'cliente@tokustream.com',
              identification: {
                type: 'CPF',
                number: cleanCpf
              }
            }
          })
        });

        const payData = await payRes.json();
        return res.status(payRes.status).json(payData);
      } catch (err) {
        return res.status(500).json({ message: `Erro ao processar cartão: ${err.message}` });
      }
    }

    // Default PIX Payment
    try {
      const response = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Idempotency-Key': `tokustream-${Date.now()}-${Math.floor(Math.random() * 1000000)}`
        },
        body: JSON.stringify({
          transaction_amount: amount,
          description: description || 'Tokustream - Creditos',
          statement_descriptor: 'TOKUSTREAM',
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
