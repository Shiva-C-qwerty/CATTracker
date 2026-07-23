import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { PagePlaceholder } from '@/components/layout/PagePlaceholder';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<PagePlaceholder title="Dashboard" phase="Phase 7" />} />
          <Route path="mocks" element={<PagePlaceholder title="Mocks" phase="Phase 3" />} />
          <Route path="mocks/:id" element={<PagePlaceholder title="Mock detail" phase="Phase 3" />} />
          <Route
            path="sections/:sectionId"
            element={<PagePlaceholder title="Section" phase="Phase 2" />}
          />
          <Route
            path="chapters/:id"
            element={<PagePlaceholder title="Chapter detail" phase="Phase 2" />}
          />
          <Route path="mistakes" element={<PagePlaceholder title="Mistake Log" phase="Phase 4" />} />
          <Route path="revise" element={<PagePlaceholder title="Revision Queue" phase="Phase 8" />} />
          <Route path="formulas" element={<PagePlaceholder title="Formula Bank" phase="Phase 5" />} />
          <Route
            path="analytics"
            element={<PagePlaceholder title="Analytics" phase="Phase 9" />}
          />
          <Route path="settings" element={<PagePlaceholder title="Settings" phase="Phase 13" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
