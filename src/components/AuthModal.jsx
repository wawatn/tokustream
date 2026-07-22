import React, { useState, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { X, Lock, User, Mail, CheckCircle2 } from 'lucide-react';

export default function AuthModal({ onClose }) {
  const { loginUser, registerUser } = useContext(AppContext);
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!email || !password || (isRegister && !username)) {
      setError('Por favor preencha todos os campos.');
      return;
    }

    setLoading(true);
    if (isRegister) {
      const res = await registerUser(email, password, username);
      setLoading(false);
      if (res.success) {
        setSuccessMessage(res.message || 'Cadastro realizado! Verifique seu e-mail para confirmar a conta.');
      } else {
        setError(res.message);
      }
    } else {
      const res = await loginUser(email, password);
      setLoading(false);
      if (res.success) {
        onClose();
      } else {
        setError(res.message);
      }
    }
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
      backdropFilter: 'blur(8px)'
    }}>
      <div 
        className="glass"
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: '40px',
          borderRadius: '12px',
          position: 'relative',
          boxShadow: '0 0 30px rgba(254, 0, 0, 0.2)'
        }}
      >
        <button 
          onClick={onClose} 
          style={{ position: 'absolute', top: '20px', right: '20px', color: 'var(--color-text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <X size={24} />
        </button>

        <h2 style={{ fontSize: '2rem', marginBottom: '24px', fontWeight: 700, color: '#fff' }}>
          {isRegister ? 'Criar Conta' : 'Entrar'}
        </h2>

        {successMessage ? (
          <div style={{
            background: 'rgba(0, 240, 255, 0.1)',
            border: '1px solid var(--color-neon-cyan)',
            color: 'var(--color-neon-cyan)',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            <CheckCircle2 size={36} style={{ marginBottom: '10px' }} />
            <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.4' }}>{successMessage}</p>
            <button
              onClick={() => { setIsRegister(false); setSuccessMessage(''); setError(''); }}
              style={{
                marginTop: '16px',
                background: 'var(--color-neon-cyan)',
                color: '#000',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Ir para o Login
            </button>
          </div>
        ) : (
          <>
            {error && (
              <div style={{
                background: 'rgba(255, 0, 85, 0.15)',
                border: '1px solid var(--color-danger)',
                color: 'var(--color-danger)',
                padding: '12px',
                borderRadius: '6px',
                marginBottom: '20px',
                fontSize: '0.9rem'
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>E-mail</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--color-text-secondary)' }} />
                  <input
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ width: '100%', paddingLeft: '40px' }}
                    required
                  />
                </div>
              </div>

              {isRegister && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Nome de Usuário</label>
                  <div style={{ position: 'relative' }}>
                    <User size={18} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--color-text-secondary)' }} />
                    <input
                      type="text"
                      placeholder="Ex: wagner"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      style={{ width: '100%', paddingLeft: '40px' }}
                      required
                    />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Senha</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--color-text-secondary)' }} />
                  <input
                    type="password"
                    placeholder="Sua senha (mínimo 6 caracteres)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ width: '100%', paddingLeft: '40px' }}
                    minLength={6}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn-fire-glow"
                disabled={loading}
                style={{
                  background: 'linear-gradient(45deg, var(--color-secondary-red), var(--color-primary-red))',
                  color: '#fff',
                  padding: '12px',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  marginTop: '10px',
                  cursor: loading ? 'wait' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  boxShadow: '0 0 15px rgba(254, 0, 0, 0.3)'
                }}
              >
                {loading ? 'Aguarde...' : (isRegister ? 'Cadastrar' : 'Entrar')}
              </button>
            </form>

            <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
              {isRegister ? (
                <>
                  Já tem uma conta?{' '}
                  <span 
                    onClick={() => { setIsRegister(false); setError(''); }}
                    style={{ color: 'var(--color-primary-red)', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Faça login
                  </span>
                </>
              ) : (
                <>
                  Novo por aqui?{' '}
                  <span 
                    onClick={() => { setIsRegister(true); setError(''); }}
                    style={{ color: 'var(--color-primary-red)', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Cadastre-se agora
                  </span>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
