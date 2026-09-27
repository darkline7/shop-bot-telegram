'use client';
import { useEffect, useState } from 'react';

export default function DepositsPage() {
  const [deposits, setDeposits] = useState<any[]>([]);
  const [bankConfig, setBankConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
  const token = typeof window !== 'undefined' ? sessionStorage.getItem('accessToken') || '' : '';

  async function loadData() {
    setLoading(true);
    try {
      const [dRes, bRes] = await Promise.all([
        fetch(`${apiUrl}/deposits`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${apiUrl}/bank/config`),
      ]);
      const [dJ, bJ] = await Promise.all([dRes.json(), bRes.json()]);
      if (dJ.success) setDeposits(dJ.data || []);
      if (bJ.success) setBankConfig(bJ.data || null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) loadData();
  }, [token]);

  async function handleSyncBank() {
    setSyncing(true);
    try {
      const res = await fetch(`${apiUrl}/deposits/sync-bank`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await res.json();
      alert(j.data?.message || 'Đã đồng bộ ngân hàng!');
      loadData();
    } finally {
      setSyncing(false);
    }
  }

  async function handleApprove(id: string) {
    if (!confirm('Duyệt nạp tiền cho khách?')) return;
    const res = await fetch(`${apiUrl}/deposits/${id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) loadData();
  }

  async function handleReject(id: string) {
    const reason = prompt('Lý do:') || 'Admin từ chối';
    const res = await fetch(`${apiUrl}/deposits/${id}/reject`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    if (res.ok) loadData();
  }

  const pending = deposits.filter((d) => d.status === 'PENDING').length;
  const total = deposits
    .filter((d) => d.status === 'COMPLETED')
    .reduce((acc, d) => acc + Number(d.amount || 0), 0);

  return (
    <>
      <div className="top-bar">
        <div>
          <h1>💳 Nạp tiền & Auto Bank</h1>
          <p className="muted">Đối soát tự động qua ThueApiBank (ACB) 24/7</p>
        </div>
        <button className="btn btn-success" disabled={syncing} onClick={handleSyncBank}>
          {syncing ? '⏳ Đang quét...' : '🔄 Quét Bank ACB ngay'}
        </button>
      </div>

      <div className="grid">
        <div className="card stat-card">
          <h3>Tổng đã nạp</h3>
          <p className="val" style={{ color: '#10b981' }}>{total.toLocaleString('vi-VN')} đ</p>
        </div>
        <div className="card stat-card">
          <h3>Chờ duyệt</h3>
          <p className="val" style={{ color: pending > 0 ? '#f59e0b' : '#94a3b8' }}>{pending}</p>
        </div>
        <div className="card stat-card">
          <h3>Ngân hàng nhận</h3>
          <p className="val" style={{ fontSize: 16 }}>
            {bankConfig ? `${bankConfig.bankName} - ${bankConfig.bankAccount}` : 'ACB'}
          </p>
          <span className="muted">{bankConfig?.accountName}</span>
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
                  <th>Mã GD</th>
                  <th>Khách hàng</th>
                  <th>Số tiền</th>
                  <th>Phương thức</th>
                  <th>Trạng thái</th>
                  <th>Thời gian</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {deposits.map((d) => (
                  <tr key={d.id}>
                    <td><code>{d.transactionCode}</code></td>
                    <td>
                      <b>{d.user?.firstName || d.user?.username || 'Khách'}</b>
                      <div className="muted" style={{ fontSize: 11 }}>TG: {d.user?.telegramId}</div>
                    </td>
                    <td><b style={{ color: '#38bdf8' }}>{Number(d.amount).toLocaleString('vi-VN')} đ</b></td>
                    <td><span className="badge badge-blue">{d.method}</span></td>
                    <td>
                      <span className={`badge ${d.status === 'COMPLETED' ? 'badge-green' : d.status === 'PENDING' ? 'badge-yellow' : 'badge-red'}`}>
                        {d.status === 'COMPLETED' ? 'THÀNH CÔNG' : d.status === 'PENDING' ? 'CHỜ DUYỆT' : 'TỪ CHỐI'}
                      </span>
                    </td>
                    <td className="muted">{new Date(d.createdAt).toLocaleString('vi-VN')}</td>
                    <td>
                      {d.status === 'PENDING' ? (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-sm btn-success" onClick={() => handleApprove(d.id)}>Duyệt</button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleReject(d.id)}>Hủy</button>
                        </div>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

