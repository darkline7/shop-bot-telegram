'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/auth/login`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ username, password }),
        }
      );
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.success) {
        return setError(j?.error?.message || `Không thể đăng nhập (HTTP ${res.status})`);
      }
      sessionStorage.setItem('accessToken', j.data.accessToken);
      sessionStorage.setItem('refreshToken', j.data.refreshToken);
      router.push('/dashboard');
    } catch {
      setError('Không thể kết nối API máy chủ. Vui lòng kiểm tra lại dịch vụ.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        background: '#0a0f1d',
      }}
    >
      <section className="card" style={{ maxWidth: 400, width: '100%', padding: '32px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🛒</div>
          <h1 style={{ margin: '0 0 6px', fontSize: 22 }}>MMO Admin Portal</h1>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            Hệ thống quản trị tài nguyên & nạp tự động Telegram Bot
          </p>
        </div>

        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              padding: '8px 12px',
              borderRadius: 8,
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="muted" style={{ display: 'block', fontSize: 12, marginBottom: 6 }}>
              Tên tài khoản:
            </label>
            <input
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              required
            />
          </div>

          <div>
            <label className="muted" style={{ display: 'block', fontSize: 12, marginBottom: 6 }}>
              Mật khẩu:
            </label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
            />
          </div>

          <button className="btn" type="submit" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? 'Đang đăng nhập...' : '🔐 Đăng nhập hệ thống'}
          </button>
        </form>
      </section>
    </div>
  );
}


