import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ApplyLeave from "./pages/ApplyLeave.jsx";
import Approvals from "./pages/Approvals.jsx";
import WFHRequest from "./pages/WFHRequest.jsx";
import WFHApprovals from "./pages/WFHApprovals.jsx";
import EmployeeDirectory from "./pages/EmployeeDirectory.jsx";
import EmployeeProfile from "./pages/EmployeeProfile.jsx";
import AddEmployee from "./pages/AddEmployee.jsx";
import { ToastProvider } from "./components/Toast.jsx";

function ProtectedRoute({ children }) {
  const token = localStorage.getItem("hrms_token");
  return token ? children : <Navigate to="/login" replace />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/leave/apply" element={<ProtectedRoute><ApplyLeave /></ProtectedRoute>} />
          <Route path="/approvals" element={<ProtectedRoute><Approvals /></ProtectedRoute>} />
          <Route path="/wfh/apply" element={<ProtectedRoute><WFHRequest /></ProtectedRoute>} />
          <Route path="/wfh/approvals" element={<ProtectedRoute><WFHApprovals /></ProtectedRoute>} />
          <Route path="/employees" element={<ProtectedRoute><EmployeeDirectory /></ProtectedRoute>} />
          <Route path="/employees/add" element={<ProtectedRoute><AddEmployee /></ProtectedRoute>} />
          <Route path="/employees/:id" element={<ProtectedRoute><EmployeeProfile /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><EmployeeProfile /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  </React.StrictMode>
);

