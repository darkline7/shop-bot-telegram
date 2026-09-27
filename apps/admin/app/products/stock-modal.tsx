'use client';
import { useState, useEffect } from 'react';

export function StockModal({
  product,
  token,
  apiUrl,
  onClose,
  onReload,
}: {
  product: any;
  token: string;
  apiUrl: string;
  onClose: () => void;
  onReload: () => void;
}) {
  const [tab, setTab] = useState<'view' | 'add'>('view');
  const [items, setItems] = useState<any[]>([]);
  const [raw, setRaw] = useState('');
  const [adding, setAdding] = useState(false);

  async function loadStock() {
    try {
      const res = await fetch(`${apiUrl}/products/${product.id}/stock`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await res.json();
      if (j.success) setItems(j.data.items || []);
    } catch {
      setItems([]);
    }
  }

  useEffect(() => { loadStock(); }, [product.id]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!raw.trim()) return;
    setAdding(true);
    try {
      const res = await fetch(`${apiUrl}/products/${product.id}/stock`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: raw }),
      });
      const j = await res.json();
      if (j.success) {
        alert(`Đã nhập ${j.data.added} tài khoản!`);
        setRaw('');
        setTab('view');
        loadStock();
        onReload();
      }
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Xóa tài khoản này?')) return;
    const res = await fetch(`${apiUrl}/products/${product.id}/stock/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== id));
      onReload();
    }
  }

  async function handleClearAll() {
    if (!confirm('Xóa TOÀN BỘ tài khoản chưa bán?')) return;
    const res = await fetch(`${apiUrl}/products/${product.id}/stock`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      loadStock();
      onReload();
    }
  }

  const lines = raw.split(/\r?\n/).filter((s) => s.trim()).length;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 650 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Kho tài nguyên: {product.name}</h3>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button
            className={`btn btn-sm ${tab === 'view' ? '' : 'btn-secondary'}`}
            onClick={() => setTab('view')}
          >
            📋 Xem kho ({items.length})
          </button>
          <button
            className={`btn btn-sm ${tab === 'add' ? 'btn-success' : 'btn-secondary'}`}
            onClick={() => setTab('add')}
          >
            ➕ Nhập thêm tài khoản
          </button>
        </div>

        {tab === 'add' ? (
          <form onSubmit={handleAdd}>
            <p className="muted" style={{ margin: '0 0 6px' }}>Mỗi dòng 1 tài khoản (ví dụ user|pass|2fa):</p>
            <textarea
              className="textarea"
              rows={8}
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder="acc1@mmo.com|pass1|2fa&#10;acc2@mmo.com|pass2|2fa"
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
              <span className="muted">Số dòng: <b>{lines}</b></span>
              <button className="btn btn-success" disabled={adding || lines === 0}>
                {adding ? 'Đang lưu...' : `Xác nhận nhập (${lines})`}
              </button>
            </div>
          </form>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
              <button className="btn btn-danger btn-sm" onClick={handleClearAll}>
                🗑️ Xóa sạch kho chưa bán
              </button>
            </div>
            <div className="table-wrapper" style={{ maxHeight: 320 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Tài khoản</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((i) => (
                    <tr key={i.id}>
                      <td><code>{i.content}</code></td>
                      <td>
                        <span className={`badge ${i.status === 'AVAILABLE' ? 'badge-green' : 'badge-yellow'}`}>
                          {i.status === 'AVAILABLE' ? 'CHƯA BÁN' : 'ĐÃ BÁN'}
                        </span>
                      </td>
                      <td>
                        {i.status === 'AVAILABLE' && (
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(i.id)}>
                            Xóa
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!items.length && (
                    <tr><td colSpan={3} style={{ textAlign: 'center' }}>Kho đang trống</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
