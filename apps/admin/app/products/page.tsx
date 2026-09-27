'use client';
import { useEffect, useState } from 'react';
import { StockModal } from './stock-modal';
import { ProductFormModal } from './product-form-modal';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stockProduct, setStockProduct] = useState<any | null>(null);
  const [formProduct, setFormProduct] = useState<any | null | undefined>(undefined);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
  const token = typeof window !== 'undefined' ? sessionStorage.getItem('accessToken') || '' : '';

  async function loadData() {
    setLoading(true);
    try {
      const [pRes, cRes] = await Promise.all([
        fetch(`${apiUrl}/products?status=ALL`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${apiUrl}/categories?all=true`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const [pJ, cJ] = await Promise.all([pRes.json(), cRes.json()]);
      if (pJ.success) setProducts(pJ.data || []);
      if (cJ.success) setCategories(cJ.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) loadData();
  }, [token]);

  async function handleDelete(p: any) {
    if (!confirm(`Xóa sản phẩm "${p.name}"?`)) return;
    const res = await fetch(`${apiUrl}/products/${p.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) loadData();
  }

  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <div className="top-bar">
        <div>
          <h1>📦 Quản lý Sản phẩm & Kho hàng</h1>
          <p className="muted">Quản lý kho tài nguyên MMO, tồn kho và xuất hàng tự động</p>
        </div>
        <button className="btn btn-success" onClick={() => setFormProduct(null)}>
          ➕ Thêm sản phẩm
        </button>
      </div>

      <div className="grid">
        <div className="card stat-card">
          <h3>Tổng sản phẩm</h3>
          <p className="val">{products.length}</p>
        </div>
        <div className="card stat-card">
          <h3>Đang mở bán</h3>
          <p className="val" style={{ color: '#10b981' }}>
            {products.filter((p) => p.status === 'ACTIVE').length}
          </p>
        </div>
        <div className="card stat-card">
          <h3>Tổng tồn kho</h3>
          <p className="val" style={{ color: '#38bdf8' }}>
            {products.reduce((acc, p) => acc + (p.stock || 0), 0)}
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <input
          className="input"
          style={{ maxWidth: 300 }}
          placeholder="🔍 Tìm kiếm sản phẩm..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card">
        {loading ? (
          <p className="muted">Đang tải danh sách...</p>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Tên sản phẩm</th>
                  <th>Danh mục</th>
                  <th>Giá bán</th>
                  <th>Kho hàng</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td><b>{p.name}</b></td>
                    <td><span className="badge badge-blue">{p.category?.name || 'MMO'}</span></td>
                    <td><b>{Number(p.salePrice || p.price).toLocaleString('vi-VN')} đ</b></td>
                    <td>
                      <span className={`badge ${p.stock > 0 ? 'badge-green' : 'badge-red'}`}>
                        {p.stock > 0 ? `Còn ${p.stock}` : 'Hết hàng'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${p.status === 'ACTIVE' ? 'badge-green' : 'badge-red'}`}>
                        {p.status === 'ACTIVE' ? 'Đang bán' : 'Đã ẩn'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-sm btn-success" onClick={() => setStockProduct(p)}>
                          📥 Kho ({p.stock || 0})
                        </button>
                        <button className="btn btn-sm btn-secondary" onClick={() => setFormProduct(p)}>
                          ✏️
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(p)}>
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {stockProduct && (
        <StockModal
          product={stockProduct}
          token={token}
          apiUrl={apiUrl}
          onClose={() => setStockProduct(null)}
          onReload={loadData}
        />
      )}

      {formProduct !== undefined && (
        <ProductFormModal
          product={formProduct}
          categories={categories}
          token={token}
          apiUrl={apiUrl}
          onClose={() => setFormProduct(undefined)}
          onReload={loadData}
        />
      )}
    </>
  );
}

