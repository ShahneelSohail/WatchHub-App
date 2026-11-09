import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import { THEME_BOOTSTRAP } from '@/components/admin/theme';
import { RequireAuth } from '@/components/RequireAuth';

export const metadata: Metadata = { title: 'Admin' };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      <RequireAuth role="ADMIN">
        <Suspense>
          <AdminShell>
            <Suspense>{children}</Suspense>
          </AdminShell>
        </Suspense>
      </RequireAuth>
    </>
  );
}
