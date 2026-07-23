import React, { useState, useContext, useEffect, useRef } from 'react';
import { AppContext } from '../context/AppContext';
import { X, Coins, Check, CreditCard, QrCode, Copy, RefreshCw, AlertCircle } from 'lucide-react';

export default function CreditShop({ onClose }) {
  const { addCredits, mpConfig, currentUser } = useContext(AppContext);
  const [selectedPack, setSelectedPack] = useState(null);
  const [step, setStep] = useState('select'); // 'select' | 'payment' | 'success'
  const [paymentMethod, setPaymentMethod] = useState('card'); // 'card' | 'pix'
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Real Mercado Pago States
  const [realQrCodeBase64, setRealQrCodeBase64] = useState(null);
  const [realQrCodeCopy, setRealQrCodeCopy] = useState(null);
  const [paymentId, setPaymentId] = useState(null);
  const [mpLoading, setMpLoading] = useState(false);
  const [mpError, setMpError] = useState(null);

  // Credit Card Form States
  const [cardNumber, setCardNumber] = useState('');
  const [expDate, setExpDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [holderName, setHolderName] = useState('');
  const [cpf, setCpf] = useState('');
  const [cardError, setCardError] = useState(null);

  // Pix Timer
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const timerRef = useRef(null);
  const autoApproveRef = useRef(null);
  const pollRef = useRef(null);

  const generateRealPixPayment = async (pack) => {
    if (!mpConfig?.accessToken) return;
    setMpLoading(true);
    setMpError(null);
    setRealQrCodeBase64(null);
    setRealQrCodeCopy(null);

    const priceVal = parseFloat(pack.price.replace('.', '').replace(',', '.'));
    const token = mpConfig.accessToken.trim();
    const safeEmail = (currentUser?.email && currentUser.email.includes('@')) 
      ? currentUser.email 
      : 'cliente@tokustream.com';

    let data = null;
    let success = false;

    // Strategy 1: Vercel /api/pix serverless route
    try {
      const res = await fetch('/api/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: token,
          amount: priceVal,
          description: `Tokustream - ${pack.label} (${pack.credits} Creditos)`,
          email: safeEmail
        })
      });
      if (res.ok) {
        data = await res.json();
        if (data && data.id) success = true;
      }
    } catch (e) {
      console.log('Rota /api/pix indisponível, tentando proxy secundário...', e);
    }

    // Strategy 2: Proxy CORS para chamada direta sem bloqueio do navegador
    if (!success) {
      try {
        const idempotencyKey = `tokustream-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
        const targetUrl = 'https://corsproxy.io/?https://api.mercadopago.com/v1/payments';
        const res = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-Idempotency-Key': idempotencyKey
          },
          body: JSON.stringify({
            transaction_amount: priceVal,
            description: `Tokustream - ${pack.label} (${pack.credits} Creditos)`,
            payment_method_id: 'pix',
            payer: {
              email: safeEmail,
              first_name: currentUser?.username || 'Cliente',
              last_name: 'Tokustream'
            }
          })
        });

        data = await res.json();
      } catch (err) {
        console.error('Erro no proxy Mercado Pago:', err);
      }
    }

    if (data && data.id && data.point_of_interaction?.transaction_data) {
      setPaymentId(data.id);
      setRealQrCodeCopy(data.point_of_interaction.transaction_data.qr_code);
      setRealQrCodeBase64(data.point_of_interaction.transaction_data.qr_code_base64);
    } else if (data) {
      const errorDetail = data.cause?.[0]?.description || data.message || (typeof data === 'string' ? data : 'Erro ao processar com o Mercado Pago.');
      setMpError(errorDetail);
    } else {
      setMpError('Não foi possível conectar ao Mercado Pago.');
    }

    setMpLoading(false);
  };

  useEffect(() => {
    if (step === 'payment' && paymentMethod === 'pix') {
      setTimeLeft(300);
      
      // Start Countdown
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      if (mpConfig?.accessToken && selectedPack) {
        // Real Mercado Pago Flow
        generateRealPixPayment(selectedPack);
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [step, paymentMethod, selectedPack]);

  // Mercado Pago Real-time Status Polling
  useEffect(() => {
    if (paymentId && mpConfig?.accessToken && step === 'payment') {
      pollRef.current = setInterval(async () => {
        try {
          const token = mpConfig.accessToken.trim();
          let data = null;
          try {
            const res = await fetch(`/api/pix?id=${paymentId}&accessToken=${encodeURIComponent(token)}`);
            if (res.ok) data = await res.json();
          } catch(e) {}

          if (!data || !data.status) {
            const res = await fetch(`https://corsproxy.io/?https://api.mercadopago.com/v1/payments/${paymentId}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) data = await res.json();
          }

          if (data?.status === 'approved') {
            clearInterval(pollRef.current);
            handleSuccessApprove();
          }
        } catch (err) {
          console.error('Erro ao consultar status:', err);
        }
      }, 3000);
    }

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [paymentId, mpConfig, step]);

  const packs = [
    { id: 0, credits: 1, price: '1,00', discount: null, label: 'Pacote Teste 🧪' },
    { id: 1, credits: 10, price: '10,00', discount: null, label: 'Pacote Inicial' },
    { id: 2, credits: 50, price: '45,00', discount: '10% de desconto', label: 'Pacote Aventura' },
    { id: 3, credits: 100, price: '80,00', discount: '20% de desconto', label: 'Pacote Maratonador' }
  ];

  const handleSelectPack = (pack) => {
    setSelectedPack(pack);
    setStep('payment');
  };

  const handleSuccessApprove = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoApproveRef.current) clearTimeout(autoApproveRef.current);
    if (pollRef.current) clearInterval(pollRef.current);
    addCredits(selectedPack.credits);
    setStep('success');
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setCardError(null);

    if (!mpConfig?.accessToken) {
      setTimeout(() => {
        setLoading(false);
        handleSuccessApprove();
      }, 1500);
      return;
    }

    try {
      const priceVal = parseFloat(selectedPack.price.replace('.', '').replace(',', '.'));
      const token = mpConfig.accessToken.trim();
      const pubKey = mpConfig.publicKey ? mpConfig.publicKey.trim() : '';
      const [expMonth, expYear] = expDate.split('/').map(s => s.trim());
      const safeEmail = (currentUser?.email && currentUser.email.includes('@')) 
        ? currentUser.email 
        : 'cliente@tokustream.com';

      const res = await fetch('/api/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: token,
          publicKey: pubKey,
          paymentType: 'card',
          amount: priceVal,
          description: `Tokustream - ${selectedPack.label} (${selectedPack.credits} Creditos)`,
          email: safeEmail,
          cardData: {
            cardNumber,
            expMonth: expMonth || '12',
            expYear: expYear || '30',
            cvv,
            holderName: holderName || 'CLIENTE TOKUSTREAM',
            docNumber: cpf || '11122233344'
          }
        })
      });

      const data = await res.json();
      console.log('Resposta Cartao Mercado Pago:', data);

      if (data.status === 'approved') {
        handleSuccessApprove();
      } else {
        const detail = data.cause?.[0]?.description || data.message || data.status_detail || 'Pagamento recusado pela operadora do cartão.';
        setCardError(detail);
      }
    } catch (err) {
      console.error('Erro no pagamento com cartão:', err);
      setCardError(`Erro de processamento: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyKey = () => {
    const keyToCopy = realQrCodeCopy || `00020126360014BR.GOV.BCB.PIX0114tokustream@pix520400005303986540${selectedPack?.price.replace(',', '.')}5802BR5915TOKUSTREAM LTDA6009SAO PAULO62070503***6304ABCD`;
    navigator.clipboard.writeText(keyToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(8px)',
      padding: '16px'
    }}>
      <div 
        className="glass"
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: '20px 24px',
          borderRadius: '12px',
          position: 'relative',
          boxShadow: '0 0 30px rgba(254, 0, 0, 0.2)'
        }}
      >
        <button 
          onClick={onClose} 
          style={{ position: 'absolute', top: '16px', right: '16px', color: 'var(--color-text-secondary)', background: 'none', border: 'none', cursor: 'pointer', zIndex: 10 }}
        >
          <X size={22} />
        </button>

        {step === 'select' && (
          <div>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Coins size={28} color="var(--color-primary-red)" />
              Comprar Créditos
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '30px', fontSize: '0.95rem' }}>
              Adquira créditos para desbloquear episódios individuais. Cada episódio custa 1 crédito (R$ 1,00).
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {packs.map((pack) => (
                <div 
                  key={pack.id}
                  className="glass"
                  onClick={() => handleSelectPack(pack)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '20px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    border: '1px solid var(--glass-border)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-primary-red)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--glass-border)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--color-primary-red)', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                      {pack.label}
                    </span>
                    <span style={{ fontSize: '1.4rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {pack.credits} Créditos
                    </span>
                    {pack.discount && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-success)', display: 'block', marginTop: '4px' }}>
                        {pack.discount}
                      </span>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--color-primary-red)' }}>
                      R$ {pack.price}
                    </span>
                    <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                      Compra Única
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 'payment' && (
          <div>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Método de Pagamento
            </h2>
            <div style={{ marginBottom: '12px', padding: '8px 12px', background: 'rgba(254, 0, 0, 0.08)', borderRadius: '6px', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Você está comprando <strong>{selectedPack?.credits} Créditos</strong></span>
              <strong style={{ color: 'var(--color-primary-red)', fontSize: '0.95rem' }}>R$ {selectedPack?.price}</strong>
            </div>

            {/* Payment Method Selector Tabs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${paymentMethod === 'card' ? 'var(--color-primary-red)' : 'var(--glass-border)'}`,
                  background: paymentMethod === 'card' ? 'rgba(254,0,0,0.05)' : 'rgba(255,255,255,0.02)',
                  color: paymentMethod === 'card' ? 'var(--color-primary-red)' : '#fff',
                  fontWeight: 'bold',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <CreditCard size={16} />
                Cartão de Crédito
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('pix')}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${paymentMethod === 'pix' ? 'var(--color-primary-red)' : 'var(--glass-border)'}`,
                  background: paymentMethod === 'pix' ? 'rgba(254,0,0,0.05)' : 'rgba(255,255,255,0.02)',
                  color: paymentMethod === 'pix' ? 'var(--color-primary-red)' : '#fff',
                  fontWeight: 'bold',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <QrCode size={16} />
                Pix Instantâneo
              </button>
            </div>

            {paymentMethod === 'card' ? (
              <form onSubmit={handlePaymentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <label style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>Número do Cartão</label>
                  <input
                    type="text"
                    placeholder="4000 1234 5678 9010"
                    required
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    style={{ padding: '7px 10px', fontSize: '0.85rem' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <label style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>Validade (MM/AA)</label>
                    <input
                      type="text"
                      placeholder="12/29"
                      required
                      value={expDate}
                      onChange={(e) => setExpDate(e.target.value)}
                      style={{ padding: '7px 10px', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <label style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>CVV</label>
                    <input
                      type="text"
                      placeholder="123"
                      required
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value)}
                      style={{ padding: '7px 10px', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <label style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>CPF Titular</label>
                    <input
                      type="text"
                      placeholder="000.000.000-00"
                      required
                      value={cpf}
                      onChange={(e) => setCpf(e.target.value)}
                      style={{ padding: '7px 10px', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <label style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>Nome no Cartão</label>
                  <input
                    type="text"
                    placeholder="WAGNER SILVA"
                    required
                    value={holderName}
                    onChange={(e) => setHolderName(e.target.value)}
                    style={{ padding: '7px 10px', fontSize: '0.85rem' }}
                  />
                </div>

                {cardError && (
                  <div style={{ padding: '6px 10px', borderRadius: '4px', background: 'rgba(255, 0, 0, 0.15)', border: '1px solid var(--color-primary-red)', color: '#ff6b6b', fontSize: '0.75rem', fontWeight: 'bold' }}>
                    ⚠️ {cardError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setStep('select')}
                    style={{
                      flex: 1,
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--glass-border)',
                      color: '#fff',
                      padding: '8px',
                      borderRadius: '6px',
                      fontWeight: 'bold',
                      fontSize: '0.82rem',
                      cursor: 'pointer'
                    }}
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    className="btn-fire-glow"
                    disabled={loading}
                    style={{
                      flex: 1.5,
                      background: 'linear-gradient(45deg, var(--color-secondary-red), var(--color-primary-red))',
                      color: '#fff',
                      padding: '8px',
                      borderRadius: '6px',
                      fontWeight: 'bold',
                      fontSize: '0.82rem',
                      boxShadow: '0 0 15px rgba(254, 0, 0, 0.3)',
                      opacity: loading ? 0.7 : 1,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    {loading ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" style={{ animation: 'spin 1.5s linear infinite' }} />
                        Processando...
                      </>
                    ) : `Pagar R$ ${selectedPack?.price}`}
                  </button>
                </div>
              </form>
            ) : (
              /* Ultra-Compact 2-Column Pix Component */
              <div style={{ padding: '4px 0' }}>
                {mpLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '20px' }}>
                    <RefreshCw size={24} className="animate-spin" style={{ animation: 'spin 1.5s linear infinite', color: 'var(--color-neon-cyan)' }} />
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Gerando PIX Mercado Pago...</span>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '16px', alignItems: 'start' }}>
                    {/* Left Column: QR Code & Expiration */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                      <div style={{
                        padding: '6px',
                        background: '#ffffff',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 0 15px rgba(0, 240, 255, 0.25)'
                      }}>
                        {realQrCodeBase64 ? (
                          <img
                            src={`data:image/png;base64,${realQrCodeBase64}`}
                            alt="QR Code PIX"
                            style={{ width: '118px', height: '118px', display: 'block' }}
                          />
                        ) : (
                          <svg width="118" height="118" viewBox="0 0 180 180" style={{ shapeRendering: 'crispEdges' }}>
                            <rect width="180" height="180" fill="white" />
                            <rect x="10" y="10" width="50" height="50" fill="black" />
                            <rect x="20" y="20" width="30" height="30" fill="white" />
                            <rect x="10" y="120" width="50" height="50" fill="black" />
                            <rect x="20" y="130" width="30" height="30" fill="white" />
                            <rect x="120" y="10" width="50" height="50" fill="black" />
                            <rect x="130" y="20" width="30" height="30" fill="white" />
                            <path d="M70 20h20v20H70zm30 10h10v10h-10zm0 30h20v10h-20zm-20 20h30v10H80zm50 10h20v20h-20zm-30 20h10v10h-10zm10 20h10v10h-10zm-60 10h20v10H70zm20-50h10v20H90zm20 60h20v20h-20zm30-20h20v20h-20z" fill="black" />
                            <path d="M20 70h10v30H20zm40 10h10v20H60zm50-60h20v10h-20zm-30 90h10v20H80zm60 20h10v20h-10z" fill="black" />
                          </svg>
                        )}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
                        Expira em: <strong style={{ color: 'var(--color-danger)' }}>{formatTime(timeLeft)}</strong>
                      </span>
                    </div>

                    {/* Right Column: Copy Key + Status + Action Buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: mpConfig?.accessToken ? 'var(--color-neon-cyan)' : 'var(--color-primary-red)', fontWeight: 'bold' }}>
                        <RefreshCw size={14} className="animate-spin" style={{ animation: 'spin 2s linear infinite' }} />
                        <span>{mpConfig?.accessToken ? 'Aguardando PIX no banco...' : 'Aguardando confirmação...'}</span>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>Pix Copia e Cola</label>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <input
                            type="text"
                            readOnly
                            value={realQrCodeCopy || `00020126360014BR.GOV.BCB.PIX0114tokustream...`}
                            style={{ flexGrow: 1, padding: '6px 8px', fontSize: '0.78rem', background: 'rgba(255,255,255,0.02)', cursor: 'default' }}
                          />
                          <button
                            onClick={handleCopyKey}
                            style={{
                              padding: '6px 12px',
                              background: copied ? 'var(--color-success)' : 'rgba(255,255,255,0.08)',
                              border: '1px solid var(--glass-border)',
                              borderRadius: '4px',
                              fontSize: '0.8rem',
                              fontWeight: 'bold',
                              color: copied ? '#000' : '#fff',
                              cursor: 'pointer'
                            }}
                          >
                            {copied ? 'Copiado!' : 'Copiar'}
                          </button>
                        </div>
                      </div>

                      {mpError && (
                        <div style={{ padding: '6px 10px', borderRadius: '4px', background: 'rgba(255, 0, 0, 0.15)', border: '1px solid var(--color-primary-red)', color: '#ff6b6b', fontSize: '0.75rem', fontWeight: 'bold' }}>
                          ⚠️ {mpError}
                        </div>
                      )}

                      {!mpConfig?.accessToken && (
                        <div style={{ padding: '6px 10px', borderRadius: '4px', background: 'rgba(255, 170, 0, 0.1)', border: '1px solid #ffaa00', color: '#ffaa00', fontSize: '0.75rem' }}>
                          💡 Cole seu Access Token no Painel Admin para PIX real.
                        </div>
                      )}

                      {/* Compact Action Buttons */}
                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                        <button
                          type="button"
                          onClick={() => setStep('select')}
                          style={{
                            flex: 1,
                            padding: '8px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid var(--glass-border)',
                            color: '#fff',
                            borderRadius: '4px',
                            fontSize: '0.82rem',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                          }}
                        >
                          Voltar
                        </button>

                        {mpConfig?.accessToken ? (
                          <button
                            type="button"
                            onClick={async () => {
                              if (paymentId) {
                                try {
                                  const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
                                    headers: { 'Authorization': `Bearer ${mpConfig.accessToken}` }
                                  });
                                  const data = await res.json();
                                  if (data.status === 'approved') {
                                    handleSuccessApprove();
                                  } else {
                                    alert(`Status: ${data.status || 'pendente'}. Pague no app do banco para liberar.`);
                                  }
                                } catch(e) {
                                  alert('Aguardando confirmação...');
                                }
                              }
                            }}
                            style={{
                              flex: 1.5,
                              padding: '8px',
                              background: 'linear-gradient(45deg, var(--color-neon-cyan), var(--color-neon-violet))',
                              color: '#fff',
                              borderRadius: '4px',
                              fontSize: '0.82rem',
                              fontWeight: 'bold',
                              cursor: 'pointer'
                            }}
                          >
                            Checar Pagamento
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleSuccessApprove}
                            style={{
                              flex: 1.5,
                              padding: '8px',
                              background: 'rgba(255, 255, 255, 0.1)',
                              border: '1px solid var(--glass-border)',
                              color: '#fff',
                              borderRadius: '4px',
                              fontSize: '0.82rem',
                              fontWeight: 'bold',
                              cursor: 'pointer'
                            }}
                          >
                            Simular (Teste)
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {step === 'success' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'rgba(0, 255, 102, 0.1)',
              border: '2px solid var(--color-success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px auto',
              boxShadow: '0 0 20px rgba(0, 255, 102, 0.3)'
            }}>
              <Check size={40} color="var(--color-success)" />
            </div>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '10px', color: '#fff' }}>Compra Realizada!</h2>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '30px' }}>
              Seus <strong>{selectedPack?.credits} créditos</strong> foram adicionados à sua conta com sucesso.
            </p>
            <button
              onClick={onClose}
              className="btn-fire-glow"
              style={{
                background: 'linear-gradient(45deg, var(--color-secondary-red), var(--color-primary-red))',
                color: '#fff',
                padding: '12px 40px',
                borderRadius: '6px',
                fontWeight: 'bold',
                boxShadow: '0 0 15px rgba(254, 0, 0, 0.3)'
              }}
            >
              Começar a Assistir
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
