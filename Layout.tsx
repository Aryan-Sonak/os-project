import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import GeneralScheduler from './pages/GeneralScheduler';
import MLFQScheduler from './pages/MLFQScheduler';

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<GeneralScheduler />} />
          <Route path="/mlfq" element={<MLFQScheduler />} />
        </Routes>
      </Layout>
    </Router>
  );
}
