'use client';
import { useEffect, useState } from 'react';

export default function SettingsPage() {
  const [bankConfig, setBankConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

  useEffect(() => {
    fetch(`${apiUrl}/bank/config`)
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setBankConfig(j.data);
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, [apiUrl]);

  return (
    <>
      <div className="top-bar">
        <div>
          <h1>⚙️ Cài đặt Hệ thống MMO</h1>
          <p className="muted">Cấu hình ngân hàng, cổng nạp VietQR và tham số vận hành</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
        <div className="card">
          <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>🏦 Cấu hình Ngân hàng Nạp tiền</h3>
          {loading ? (
            <p className="muted">Đang tải cấu hình...</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="muted">Ngân hàng:</span>
                <b>{bankConfig?.bankName || 'ACB'}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="muted">Số tài khoản:</span>
                <code style={{ fontSize: 14 }}>{bankConfig?.bankAccount || '6286861'}</code>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="muted">Chủ tài khoản:</span>
                <b style={{ color: '#38bdf8' }}>{bankConfig?.accountName || 'TRAN TUAN PHONG'}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="muted">Cổng Auto Bank:</span>
                <span className="badge badge-blue">
                  {bankConfig?.hasAutoBank ? '✅ ThueApiBank (Đã kết nối)' : '⚠️ ThueApiBank (Chưa nhập Token)'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="muted">Hạn mức nạp tối thiểu:</span>
                <span>{Number(bankConfig?.minDeposit || 10000).toLocaleString('vi-VN')} đ</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="muted">Cú pháp nạp tiền:</span>
                <code style={{ color: '#10b981' }}>NAP &lt;Telegram_ID&gt;</code>
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>🤖 Thông tin Bot & Máy chủ</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="muted">Chế độ Bot:</span>
              <span className="badge badge-green">Polling 24/7 (Long-polling)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="muted">Giao diện tương tác:</span>
              <span className="badge badge-purple">Single-Message Navigation</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="muted">Quét ngân hàng tự động:</span>
              <span className="badge badge-blue">Mỗi 60 giây</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="muted">Định dạng file tài khoản:</span>
              <code>username|password|2fa</code>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="muted">Cơ chế phát hàng:</span>
              <span className="badge badge-green">Tự động trừ kho & giao tức thì</span>
            </div>
          </div>
        </div>

        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <h3 style={{ margin: '0 0 10px', fontSize: 16 }}>📝 Hướng dẫn cập nhật cấu hình bảo mật</h3>
          <p className="muted" style={{ lineHeight: 1.6, margin: 0 }}>
            Để đảm bảo an toàn tuyệt đối, các khóa bí mật như <b>THUEAPIBANK_TOKEN</b>, <b>TELEGRAM_BOT_TOKEN</b>, 
            và <b>ADMIN_PASSWORD</b> được bảo mật trong tệp tin <code>.env</code> ở thư mục gốc của dự án. 
            Khi cập nhật tệp tin <code>.env</code>, hệ thống máy chủ sẽ tự động nạp cấu hình mới mà không làm gián đoạn khách hàng đang mua hàng.
          </p>
        </div>
      </div>
    </>
  );
}

