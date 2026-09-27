'use client';
import { useState } from 'react';

export function ProductFormModal({
  product,
  categories,
  token,
  apiUrl,
  onClose,
  onReload,
}: {
  product?: any;
  categories: any[];
  token: string;
  apiUrl: string;
  onClose: () => void;
  onReload: () => void;
}) {
  const isEdit = Boolean(product);
  const [name, setName] = useState(product?.name || '');
  const [categoryId, setCategoryId] = useState(product?.categoryId || categories[0]?.id || '');
  const [price, setPrice] = useState(product?.price ? String(product.price) : '50000');
  const [salePrice, setSalePrice] = useState(product?.salePrice ? String(product.salePrice) : '');
  const [description, setDescription] = useState(product?.description || '');
  const [autoDelivery, setAutoDelivery] = useState(product?.autoDelivery !== false);
  const [status, setStatus] = useState(product?.status || 'ACTIVE');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return alert('Vui lòng nhập tên sản phẩm');
    if (!categoryId) return alert('Vui lòng chọn danh mục');
    if (!price || Number(price) <= 0) return alert('Vui lòng nhập giá hợp lệ');

    setSubmitting(true);
    try {
      const url = isEdit ? `${apiUrl}/products/${product.id}` : `${apiUrl}/products`;
      const method = isEdit ? 'PATCH' : 'POST';
      const body: any = {
        name,
        categoryId,
        price: Number(price),
        salePrice: salePrice ? Number(salePrice) : null,
        description,
        autoDelivery,
        status,
      };

      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = await res.json();
      if (j.success) {
        alert(isEdit ? 'Đã cập nhật sản phẩm!' : 'Đã tạo sản phẩm thành công!');
        onReload();
        onClose();
      } else {
        alert(`❌ ${j.error?.message}`);
      }
    } catch (err: any) {
      alert(`❌ Lỗi: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 550 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ margin: 0 }}>{isEdit ? '✏️ Sửa sản phẩm' : '➕ Thêm sản phẩm mới'}</h3>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 10 }}>
            <label className="muted">Danh mục:</label>
            <select
              className="select"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label className="muted">Tên sản phẩm:</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: ChatGPT Plus 1 Tháng"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label className="muted">Giá gốc (VNĐ):</label>
              <input
                className="input"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div>
              <label className="muted">Giá khuyến mãi (VNĐ):</label>
              <input
                className="input"
                type="number"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                placeholder="Để trống nếu không có"
              />
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label className="muted">Mô tả & Định dạng tài nguyên:</label>
            <textarea
              className="textarea"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Định dạng: user|pass|2fa. Bảo hành 30 ngày..."
            />
          </div>

          <div style={{ display: 'flex', gap: 20, marginBottom: 14 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={autoDelivery}
                onChange={(e) => setAutoDelivery(e.target.checked)}
              />
              ⚡ Tự động xuất kho khi mua
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={status === 'ACTIVE'}
                onChange={(e) => setStatus(e.target.checked ? 'ACTIVE' : 'INACTIVE')}
              />
              🟢 Đang mở bán
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
            <button className="btn" disabled={submitting}>
              {submitting ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo sản phẩm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
