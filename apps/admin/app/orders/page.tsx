'use client';
import { useEffect, useState } from 'react';

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
  const token = typeof window !== 'undefined' ? sessionStorage.getItem('accessToken') || '' : '';

  async function loadOrders() {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await res.json();
      if (j.success) setOrders(j.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) loadOrders();
  }, [token]);

  const totalRev = orders
    .filter((o) => o.status === 'COMPLETED')
    .reduce((acc, o) => acc + Number(o.totalAmount || 0), 0);

  return (
    <>
      <div className="top-bar">
        <div>
          <h1>🛒 Quản lý Đơn hàng MMO</h1>
          <p className="muted">Lịch sử giao dịch và tài nguyên đã bàn giao cho khách</p>
        </div>
        <button className="btn btn-secondary" onClick={loadOrders}>🔄 Làm mới</button>
      </div>

      <div className="grid">
        <div className="card stat-card">
          <h3>Tổng đơn hàng</h3>
          <p className="val">{orders.length}</p>
        </div>
        <div className="card stat-card">
          <h3>Doanh thu bán hàng</h3>
          <p className="val" style={{ color: '#10b981' }}>{totalRev.toLocaleString('vi-VN')} đ</p>
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
                  <th>Mã đơn</th>
                  <th>Khách hàng</th>
                  <th>Sản phẩm</th>
                  <th>Tổng tiền</th>
                  <th>Trạng thái</th>
                  <th>Thời gian</th>
                  <th>Tài nguyên</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const prod = o.items?.[0]?.product;
                  const count = o.productItems?.length || o.items?.[0]?.quantity || 1;
                  return (
                    <tr key={o.id}>
                      <td><code>{o.orderCode}</code></td>
                      <td>
                        <b>{o.user?.firstName || o.user?.username || 'Khách'}</b>
                        <div className="muted" style={{ fontSize: 11 }}>TG: {o.user?.telegramId}</div>
                      </td>
                      <td>
                        <b>{prod?.name || 'Sản phẩm'}</b>
                        <div className="muted" style={{ fontSize: 11 }}>SL: {count}</div>
                      </td>
                      <td><b style={{ color: '#38bdf8' }}>{Number(o.totalAmount).toLocaleString('vi-VN')} đ</b></td>
                      <td>
                        <span className={`badge ${o.status === 'COMPLETED' ? 'badge-green' : 'badge-yellow'}`}>
                          {o.status === 'COMPLETED' ? 'HOÀN TẤT' : o.status}
                        </span>
                      </td>
                      <td className="muted">{new Date(o.createdAt).toLocaleString('vi-VN')}</td>
                      <td>
                        <button className="btn btn-sm btn-secondary" onClick={() => setSelectedOrder(o)}>
                          👁️ Xem acc ({count})
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedOrder && (
        <div className="modal-backdrop" onClick={() => setSelectedOrder(null)}>
          <div className="modal-box" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Đơn hàng: {selectedOrder.orderCode}</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedOrder(null)}>✕</button>
            </div>
            <p className="muted" style={{ margin: '0 0 10px' }}>
              Khách hàng: <b>{selectedOrder.user?.firstName || selectedOrder.user?.username}</b> (TG: {selectedOrder.user?.telegramId})
            </p>
            <p className="muted" style={{ margin: '0 0 6px' }}>Tài nguyên đã xuất kho cho khách:</p>
            <div className="code-block" style={{ maxHeight: 250, overflowY: 'auto' }}>
              {(selectedOrder.productItems || []).map((i: any) => i.content).join('\n') || 'Xuất thủ công hoặc không có dữ liệu kho'}
            </div>
            <div style={{ marginTop: 14, textAlign: 'right' }}>
              <button className="btn" onClick={() => setSelectedOrder(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

