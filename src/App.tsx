import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { FeedbackProvider } from './components/feedback';
import { Layout } from './components/Layout';
import { StoreProvider } from './data/store';
import Dashboard from './pages/Dashboard';
import SplitLunch from './pages/SplitLunch';
import MenuPage from './pages/MenuPage';
import PeoplePage from './pages/PeoplePage';
import HistoryPage from './pages/HistoryPage';
import LunchDetail from './pages/LunchDetail';

// HashRouter keeps deep links working on GitHub Pages (no server-side rewrites needed).
export default function App() {
  return (
    <FeedbackProvider>
      <StoreProvider>
        <HashRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="split" element={<SplitLunch />} />
              <Route path="split/:lunchId" element={<SplitLunch />} />
              <Route path="menu" element={<MenuPage />} />
              <Route path="people" element={<PeoplePage />} />
              <Route path="history" element={<HistoryPage />} />
              <Route path="history/:lunchId" element={<LunchDetail />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </HashRouter>
      </StoreProvider>
    </FeedbackProvider>
  );
}
