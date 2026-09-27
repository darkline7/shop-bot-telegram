'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';
  const [checkedAuth, setCheckedAuth] = useState(false);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('accessToken') : null;
    if (!isLoginPage && !token) {
      router.replace('/login');
    }
    setCheckedAuth(true);
  }, [isLoginPage, router, pathname]);

  function handleLogout() {
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    router.replace('/login');
  }

  const navItems = [
    ['/dashboard', '📊 Tổng quan'],
    ['/products', '📦 Sản phẩm & Kho'],
    ['/deposits', '💳 Nạp tiền & Bank'],
    ['/orders', '🛒 Đơn hàng'],
    ['/users', '👤 Khách hàng'],
    ['/settings', '⚙️ Cài đặt'],
  ];

  return (
    <div className={isLoginPage ? 'login-container' : 'admin-container'}>
      {!isLoginPage && (
        <aside>
          <h2>🛒 MMO ADMIN</h2>
          <nav>
            {navItems.map(([href, label]) => {
              const isActive = pathname === href;
              return (
                <Link key={href} href={href} className={isActive ? 'active' : ''}>
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="sidebar-footer">
            <button
              onClick={handleLogout}
              className="btn btn-secondary"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              🚪 Đăng xuất
            </button>
          </div>
        </aside>
      )}
      <main style={isLoginPage ? { marginLeft: 0, padding: 0 } : undefined}>
        {children}
      </main>
    </div>
  );
}
