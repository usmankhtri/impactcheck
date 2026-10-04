import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/design-system/ToastContext';
import { LandingPage } from './pages/LandingPage';
import { AppPage } from './pages/AppPage';
import { ReportPage } from './pages/ReportPage';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { DocsPage } from './pages/DocsPage';
import { SecurityPage } from './pages/SecurityPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { AboutPage } from './pages/AboutPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { syncDocumentMetadata } from './utils/url';

const MetadataSync: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    syncDocumentMetadata(location.pathname);
  }, [location.pathname]);

  return null;
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
          <MetadataSync />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/app" element={<AppPage />} />
            <Route path="/app/analyze" element={<AppPage />} />
            <Route path="/report" element={<ReportPage />} />
            <Route path="/app/report" element={<ReportPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/app/history" element={<HistoryPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/app/settings" element={<SettingsPage />} />
            <Route path="/docs" element={<DocsPage />} />
            <Route path="/security" element={<SecurityPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  );
};

export default App;
