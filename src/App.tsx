import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { SectionsPage } from '@/features/chapters/SectionsPage';
import { ChapterDetailPage } from '@/features/chapters/ChapterDetailPage';
import { MocksPage } from '@/features/mocks/MocksPage';
import { MockFormPage } from '@/features/mocks/MockFormPage';
import { MockDetailPage } from '@/features/mocks/MockDetailPage';
import { MockComparePage } from '@/features/mocks/MockComparePage';
import { MistakesPage } from '@/features/mistakes/MistakesPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { FormulaBankPage } from '@/features/formulas/FormulaBankPage';
import { RevisePage } from '@/features/revision/RevisePage';
import { AnalyticsPage } from '@/features/analytics/AnalyticsPage';
import { FormulaPrintPage } from '@/features/formulas/FormulaPrintPage';
import { SyncProvider } from '@/sync/SyncProvider';

export default function App() {
  return (
    <SyncProvider>
      <BrowserRouter>
        <Routes>
          {/* Standalone (no app shell) so it prints clean. */}
          <Route path="formulas/print" element={<FormulaPrintPage />} />
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="mocks" element={<MocksPage />} />
            <Route path="mocks/new" element={<MockFormPage />} />
            <Route path="mocks/compare" element={<MockComparePage />} />
            <Route path="mocks/:id" element={<MockDetailPage />} />
            <Route path="mocks/:id/edit" element={<MockFormPage />} />
            <Route path="sections/:sectionId" element={<SectionsPage />} />
            <Route path="chapters/:id" element={<ChapterDetailPage />} />
            <Route path="mistakes" element={<MistakesPage />} />
            <Route path="revise" element={<RevisePage />} />
            <Route path="formulas" element={<FormulaBankPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </SyncProvider>
  );
}
