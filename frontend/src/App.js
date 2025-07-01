// // CONTEXT ADDED
// import React, { useState } from 'react';
// import { BrowserRouter as Router, Route, Routes, Navigate, Outlet } from 'react-router-dom';
// import { AuthProvider } from './context/AuthContext';
// import { ModelProvider } from './context/ModelContext';
// import { AICoachProvider } from './context/AICoachContext';
// import { ReportWriterProvider } from './context/ReportWriterContext'; // Import the provider

// // Auth Components
// import Login from './components/auth/Login';
// // import Register from './components/auth/Register';
// import ProtectedRoute from './components/auth/ProtectedRoute';

// // Layout Components
// import Header from './components/layout/Header';
// import Sidebar from './components/layout/Sidebar';

// // Page Components
// import AICoach from './components/ai-coach/AICoach';
// import ReportWriter from './components/report-writer/ReportWriter';
// import Archive from './components/archive/Archive';
// import UserAdmin from './components/admin/UserAdmin';

// // Styles
// import './styles/auth.css';
// import './styles/ai-coach.css';
// import './styles/archive.css';

// import './components/common/FeedbackButtons.css';
// import './components/common/FeedbackModal.css';
// import './components/common/MarkdownRenderer.css';

// // Layout wrapper for protected routes with header and sidebar
// const ProtectedLayout = () => {
//   const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

//   const handleSidebarToggle = (collapsed) => {
//     setSidebarCollapsed(collapsed);
//   };

//   return (
//     <div className="app-layout">
//       <Sidebar onToggle={handleSidebarToggle} />
//       <div className={`main-container ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
//         <Header />
//         <div className="main-content">
//           <Outlet />
//         </div>
//       </div>
//     </div>
//   );
// };

// // CLEAR CONVERSATION MEMORY
// function App() {
//   return (
//     <AuthProvider>
//       <ModelProvider>
//         <AICoachProvider>
//           <ReportWriterProvider> {/* Add this wrapper */}
//             <Router>
//               <Routes>
//                 {/* Public routes */}
//                 <Route path="/login" element={<Login />} />
//                 {/* <Route path="/register" element={<Register />} /> */}
                
//                 {/* Protected routes with layout */}
//                 <Route element={<ProtectedRoute />}>
//                   <Route element={<ProtectedLayout />}>
//                     <Route path="/ai-coach" element={<AICoach />} />
//                     <Route path="/report-writer" element={<ReportWriter />} />
//                     <Route path="/archive" element={<Archive />} />
//                     <Route path="/user-admin" element={<UserAdmin />} />
//                   </Route>
//                 </Route>
                
//                 {/* Redirect to AI Coach by default for authenticated users */}
//                 <Route path="*" element={<Navigate to="/ai-coach" replace />} />
//               </Routes>
//             </Router>
//           </ReportWriterProvider>
//         </AICoachProvider>
//       </ModelProvider>
//     </AuthProvider>
//   );
// }


// export default App;

// CONTEXT ADDED
import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ModelProvider } from './context/ModelContext';
import { AICoachProvider } from './context/AICoachContext';
import { ReportWriterProvider } from './context/ReportWriterContext'; // Import the provider

// Auth Components
import Login from './components/auth/Login';
// import Register from './components/auth/Register';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Layout Components
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';

// Page Components
import AICoach from './components/ai-coach/AICoach';
import ReportWriter from './components/report-writer/ReportWriter';
import Archive from './components/archive/Archive';
import UserAdmin from './components/admin/UserAdmin';

// Styles
import './styles/auth.css';
import './styles/ai-coach.css';
import './styles/archive.css';

import './components/common/FeedbackButtons.css';
import './components/common/FeedbackModal.css';
import './components/common/MarkdownRenderer.css';

// Layout wrapper for protected routes with header and sidebar
const ProtectedLayout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleSidebarToggle = (collapsed) => {
    setSidebarCollapsed(collapsed);
  };

  return (
    <div className="app-layout">
      <Sidebar onToggle={handleSidebarToggle} />
      <div className={`main-container ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Header />
        <div className="main-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

// CLEAR CONVERSATION MEMORY
function App() {
  return (
    <AuthProvider>
      <ModelProvider>
        <AICoachProvider>
          <ReportWriterProvider> {/* Add this wrapper */}
            <Router>
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<Login />} />
                {/* <Route path="/register" element={<Register />} /> */}
                
                {/* Protected routes with layout */}
                <Route element={<ProtectedRoute />}>
                  <Route element={<ProtectedLayout />}>
                    <Route path="/ai-coach" element={<AICoach />} />
                    <Route path="/report-writer" element={<ReportWriter />} />
                    <Route path="/archive" element={<Archive />} />
                    <Route path="/user-admin" element={<UserAdmin />} />
                  </Route>
                </Route>
                
                {/* Redirect to AI Coach by default for authenticated users */}
                <Route path="*" element={<Navigate to="/ai-coach" replace />} />
              </Routes>
            </Router>
          </ReportWriterProvider>
        </AICoachProvider>
      </ModelProvider>
    </AuthProvider>
  );
}


export default App;