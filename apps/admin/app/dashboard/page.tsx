'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Dashboard() {
  const [d, setD] = useState<any>();
  const [loading, setLoading] = useState(true);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
  const token = typeof window !== 'undefined' ? sessionStorage.getItem('accessToken') || '' : '';

  useEffect(() => {
    if (!token) return;
    fetch(`${apiUrl}/dashboard`, { headers: { Authorization: `Bearer ${token}` } })
      .then((x) => x.json())
      .then((x) => setD(x.data))
      .finally(() => setLoading(false));
  }, [apiUrl, token]);

  const cards = [
    { title: 'Doanh thu bán hàng', val: `${Number(d?.revenue || 0).toLocaleString('vi-VN')} đ`, color: '#10b981' },
    { title: 'Tổng nạp vào hệ thống', val: `${Number(d?.totalDeposits || 0).toLocaleString('vi-VN')} đ`, color: '#38bdf8' },
    { title: 'Tổng đơn hàng', val: d?.orders ?? '—', color: '#f59e0b' },
    { title: 'Khách hàng', val: d?.users ?? '—', color: '#a855f7' },
    { title: 'Tài nguyên trong kho', val: d?.availableStock ?? '—', color: '#ec4899' },
    { title: 'Sản phẩm kinh doanh', val: d?.products ?? '—', color: '#6366f1' },
  ];

  return (
    <>
      <div className="top-bar">
        <div>
          <h1>📊 Bảng điều khiển MMO Shop</h1>
          <p className="muted">Tổng quan doanh thu, tồn kho tài nguyên và hoạt động kinh doanh</p>
        </div>
      </div>

      <div className="grid">
        {cards.map((c) => (
          <div className="card stat-card" key={c.title}>
            <h3>{c.title}</h3>
            <p className="val" style={{ color: c.color }}>{loading ? '...' : c.val}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        <div className="card">
          <h3 style={{ margin: '0 0 10px', fontSize: 16 }}>⚡ Lối tắt quản trị nhanh</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Link href="/products" className="btn btn-secondary" style={{ justifyContent: 'space-between' }}>
              <span>📦 Nhập kho tài nguyên mới</span>
              <span>➔</span>
            </Link>
            <Link href="/deposits" className="btn btn-secondary" style={{ justifyContent: 'space-between' }}>
              <span>💳 Kiểm tra & Đối soát Bank ACB</span>
              <span>➔</span>
            </Link>
            <Link href="/orders" className="btn btn-secondary" style={{ justifyContent: 'space-between' }}>
              <span>🛒 Xem đơn hàng đã bán</span>
              <span>➔</span>
            </Link>
            <Link href="/users" className="btn btn-secondary" style={{ justifyContent: 'space-between' }}>
              <span>👤 Quản lý số dư khách hàng</span>
              <span>➔</span>
            </Link>
          </div>
        </div>

        <div className="card">
          <h3 style={{ margin: '0 0 10px', fontSize: 16 }}>🛡️ Trạng thái hệ thống</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="muted">API Máy chủ:</span>
              <span className="badge badge-green">Hoạt động (Port 4000)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="muted">Telegram Bot:</span>
              <span className="badge badge-green">Đang chạy (Polling 24/7)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="muted">Cơ chế giao hàng:</span>
              <span className="badge badge-green">Tự động xuất kho (Instant)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="muted">Cổng nạp tự động:</span>
              <span className="badge badge-blue">VietQR + ThueApiBank (ACB)</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

