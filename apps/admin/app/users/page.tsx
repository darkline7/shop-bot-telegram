'use client';
import { useEffect, useState } from 'react';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjustUser, setAdjustUser] = useState<any | null>(null);
  const [amount, setAmount] = useState('50000');
  const [reason, setReason] = useState('Admin hỗ trợ');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
  const token = typeof window !== 'undefined' ? sessionStorage.getItem('accessToken') || '' : '';

  async function loadUsers() {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await res.json();
      if (j.success) setUsers(j.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) loadUsers();
  }, [token]);

  async function handleAdjust(e: React.FormEvent) {
    e.preventDefault();
    const num = Number(amount);
    if (!Number.isFinite(num) || num === 0) return alert('Số tiền không hợp lệ');

    const res = await fetch(`${apiUrl}/users/${adjustUser.id}/adjust-balance`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: num, reason }),
    });
    const j = await res.json();
    if (j.success) {
      alert('Đã cập nhật số dư!');
      setAdjustUser(null);
      loadUsers();
    } else {
      alert(`❌ ${j.error?.message}`);
    }
  }

  return (
    <>
      <div className="top-bar">
        <div>
          <h1>👤 Quản lý Khách hàng MMO</h1>
          <p className="muted">Số dư và lịch sử giao dịch của khách hàng Telegram</p>
        </div>
        <button className="btn btn-secondary" onClick={loadUsers}>🔄 Làm mới</button>
      </div>

      <div className="grid">
        <div className="card stat-card">
          <h3>Tổng khách hàng</h3>
          <p className="val">{users.length}</p>
        </div>
        <div className="card stat-card">
          <h3>Tổng số dư ví khách</h3>
          <p className="val" style={{ color: '#38bdf8' }}>
            {users.reduce((acc, u) => acc + Number(u.balance || 0), 0).toLocaleString('vi-VN')} đ
          </p>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <p className="muted">Đang tải...</p>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Telegram ID</th>
                  <th>Họ tên</th>
                  <th>Số dư ví</th>
                  <th>Tổng nạp</th>
                  <th>Tổng chi tiêu</th>
                  <th>Ngày tham gia</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td><code>{u.telegramId}</code></td>
                    <td>
                      <b>{u.firstName || u.username || 'Khách'}</b>
                      {u.username && <div className="muted" style={{ fontSize: 11 }}>@{u.username}</div>}
                    </td>
                    <td><b style={{ color: '#10b981' }}>{Number(u.balance).toLocaleString('vi-VN')} đ</b></td>
                    <td className="muted">{Number(u.totalDeposit || 0).toLocaleString('vi-VN')} đ</td>
                    <td className="muted">{Number(u.totalSpent || 0).toLocaleString('vi-VN')} đ</td>
                    <td className="muted">{new Date(u.createdAt).toLocaleDateString('vi-VN')}</td>
                    <td>
                      <button className="btn btn-sm btn-secondary" onClick={() => setAdjustUser(u)}>
                        💰 Cộng/Trừ tiền
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {adjustUser && (
        <div className="modal-backdrop" onClick={() => setAdjustUser(null)}>
          <div className="modal-box" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Điều chỉnh số dư ví</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setAdjustUser(null)}>✕</button>
            </div>
            <p className="muted" style={{ margin: '0 0 10px' }}>
              Khách: <b>{adjustUser.firstName || adjustUser.username}</b> (TG: {adjustUser.telegramId})<br />
              Số dư hiện tại: <b style={{ color: '#10b981' }}>{Number(adjustUser.balance).toLocaleString('vi-VN')} đ</b>
            </p>
            <form onSubmit={handleAdjust}>
              <div style={{ marginBottom: 10 }}>
                <label className="muted">Số tiền (VNĐ, âm để trừ):</label>
                <input
                  className="input"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label className="muted">Lý do:</label>
                <input
                  className="input"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setAdjustUser(null)}>Hủy</button>
                <button className="btn btn-success">Xác nhận</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

