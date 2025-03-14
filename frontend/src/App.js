// import React from 'react';
// import { BrowserRouter as Router, Route, Routes, Navigate, Outlet } from 'react-router-dom';
// import { AuthProvider } from './context/AuthContext';

// // Auth Components
// import Login from './components/auth/Login';
// import Register from './components/auth/Register';
// import ProtectedRoute from './components/auth/ProtectedRoute';

// // Layout Components
// import Header from './components/layout/Header';
// import Sidebar from './components/layout/Sidebar';  // Add this import

// // Page Components
// import ProjectList from './components/projects/ProjectList';
// import ProjectDetail from './components/projects/ProjectDetail';
// import CreateProject from './components/projects/CreateProject';
// import EditProject from './components/projects/EditProject';
// import ProjectBoard from './components/projects/board/ProjectBoard';
// import KeyDecisionDetail from './components/key-decisions/KeyDecisionDetail';
// import KnowledgeGapDetail from './components/knowledge-gaps/KnowledgeGapDetail';
// import AICoach from './components/ai-coach/AICoach';
// import CoreHypothesis from './components/core-hypothesis/CoreHypothesis';
// import ReportWriter from './components/report-writer/ReportWriter';
// import ProjectAdmin from './components/admin/ProjectAdmin';

// // Styles
// import './styles/auth.css';
// import './styles/projects.css';
// import './styles/ai-coach.css';

// // Layout wrapper for protected routes with header and sidebar
// const ProtectedLayout = () => (
//   <div className="app-layout">
//     <Sidebar />
//     <div className="main-container">
//       <Header />
//       <div className="main-content">
//         <Outlet />
//       </div>
//     </div>
//   </div>
// );

// function App() {
//   return (
//     <AuthProvider>
//       <Router>
//         <Routes>
//           {/* Public routes */}
//           <Route path="/login" element={<Login />} />
//           <Route path="/register" element={<Register />} />
          
//           {/* Protected routes with layout */}
//           <Route element={<ProtectedRoute />}>
//             <Route element={<ProtectedLayout />}>
//               <Route path="/projects" element={<ProjectList />} />
//               <Route path="/projects/:id" element={<ProjectDetail />} />
//               <Route path="/projects/create" element={<CreateProject />} />
//               <Route path="/projects/edit/:id" element={<EditProject />} />
//               <Route path="/projects/:id/board" element={<ProjectBoard />} />
//               <Route path="/projects/:projectId/key-decisions/:decisionId" element={<KeyDecisionDetail />} />
//               <Route path="/projects/:projectId/knowledge-gaps/:gapId" element={<KnowledgeGapDetail />} />
//               <Route path="/ai-coach" element={<AICoach />} />
//               <Route path="/core-hypothesis/:projectId" element={<CoreHypothesis />} />
//               <Route path="/report-writer/:projectId" element={<ReportWriter />} />
//               <Route path="/project-admin" element={<ProjectAdmin />} />
//             </Route>
//           </Route>
          
//           {/* Redirect to dashboard by default for authenticated users */}
//           <Route path="*" element={<Navigate to="/ai-coach" replace />} />
//         </Routes>
//       </Router>
//     </AuthProvider>
//   );
// }

// export default App;

import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// Auth Components
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Layout Components
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';

// Page Components
import ProjectList from './components/projects/ProjectList';
import ProjectDetail from './components/projects/ProjectDetail';
import CreateProject from './components/projects/CreateProject';
import EditProject from './components/projects/EditProject';
import ProjectBoard from './components/projects/board/ProjectBoard';
import KeyDecisionDetail from './components/key-decisions/KeyDecisionDetail';
import KnowledgeGapDetail from './components/knowledge-gaps/KnowledgeGapDetail';
import AICoach from './components/ai-coach/AICoach';
import CoreHypothesis from './components/core-hypothesis/CoreHypothesis';
import ReportWriter from './components/report-writer/ReportWriter';
import ProjectAdmin from './components/admin/ProjectAdmin';

// Styles
import './styles/auth.css';
import './styles/projects.css';
import './styles/ai-coach.css';

// Layout wrapper for protected routes with header and sidebar
const ProtectedLayout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleSidebarToggle = (collapsed) => {
    setSidebarCollapsed(collapsed);
  };

  return (
    <div className="app-layout">
      <Sidebar onToggle={(collapsed) => setSidebarCollapsed(collapsed)} />
      <div className={`main-container ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Header />
        <div className="main-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Protected routes with layout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<ProtectedLayout />}>
              <Route path="/projects" element={<ProjectList />} />
              <Route path="/projects/:id" element={<ProjectDetail />} />
              <Route path="/projects/create" element={<CreateProject />} />
              <Route path="/projects/edit/:id" element={<EditProject />} />
              <Route path="/projects/:id/board" element={<ProjectBoard />} />
              <Route path="/projects/:projectId/key-decisions/:decisionId" element={<KeyDecisionDetail />} />
              <Route path="/projects/:projectId/knowledge-gaps/:gapId" element={<KnowledgeGapDetail />} />
              <Route path="/ai-coach" element={<AICoach />} />
              <Route path="/core-hypothesis/:projectId" element={<CoreHypothesis />} />
              <Route path="/report-writer/:projectId" element={<ReportWriter />} />
              <Route path="/project-admin" element={<ProjectAdmin />} />
            </Route>
          </Route>
          
          {/* Redirect to dashboard by default for authenticated users */}
          <Route path="*" element={<Navigate to="/ai-coach" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;