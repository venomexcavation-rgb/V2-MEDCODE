import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Scenarios } from './pages/Scenarios';
import { Training } from './pages/Training';
import { Performance } from './pages/Performance';
import { Reference } from './pages/Reference';
import { AARPage } from './pages/AARPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/scenarios" element={<Scenarios />} />
        <Route path="/training/:scenarioId" element={<Training />} />
        <Route path="/training/:scenarioId/aar" element={<AARPage />} />
        <Route path="/performance" element={<Performance />} />
        <Route path="/reference" element={<Reference />} />
      </Route>
    </Routes>
  );
}
