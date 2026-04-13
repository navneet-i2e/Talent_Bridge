import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useParams,
} from "react-router-dom";
import KanbanPipeline from "./pages/employer/KanbanPipeline";
import { Provider, useSelector } from "react-redux";
import { Toaster } from "react-hot-toast";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

import { store } from "./store";
import AppLayout from "./components/layout/AppLayout";
import { LoginPage, RegisterPage } from "./pages/Auth";
import SeekerDashboard from "./pages/seeker/Dashboard";
import JobsPage from "./pages/seeker/Jobs";
import JobDetailPage from "./pages/seeker/JobDetail";
import ApplicationsPage from "./pages/seeker/Applications";
import { ProfileSetupPage, EditProfilePage } from "./pages/Profile";
import EmployerDashboard from "./pages/employer/EmployerDashboard";
import { PostJobPage, ManageJobsPage } from "./pages/employer/ManageJobs";
import AdminDashboard from "./pages/admin/AdminDashboard";
import { Badge, Button, Spinner, EmptyState } from "./components/ui/UI";
import { jobsAPI } from "./lib/api";
import { Bookmark, ArrowUpRight } from "lucide-react";
import "./styles/globals.css";

// ── Guards ─────────────────────────────────────────────────────────────────────
function ProtectedRoute({ children, roles }) {
  const { user, token } = useSelector((s) => s.auth);
  if (!token || !user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role))
    return <Navigate to="/dashboard" replace />;
  return children;
}

function Wrap({ children, roles }) {
  return (
    <ProtectedRoute roles={roles}>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
}

function DashboardRedirect() {
  const { user } = useSelector((s) => s.auth);
  if (user?.role === "employer")
    return <Navigate to="/employer/dashboard" replace />;
  if (user?.role === "admin") return <Navigate to="/admin" replace />;
  return <SeekerDashboard />;
}

function RootRedirect() {
  const { token } = useSelector((s) => s.auth);
  return <Navigate to={token ? "/dashboard" : "/login"} replace />;
}

// ── Saved Jobs page ────────────────────────────────────────────────────────────
function SavedJobsPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    jobsAPI
      .saved()
      .then((r) => setJobs(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
        <Spinner size="lg" />
      </div>
    );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.75rem",
            color: "var(--navy-950)",
          }}
        >
          Saved Jobs
        </h1>
        <p
          style={{
            color: "var(--text-muted)",
            marginTop: 4,
            fontSize: "0.875rem",
          }}
        >
          {jobs.length} saved jobs
        </p>
      </div>
      {jobs.length === 0 ? (
        <EmptyState
          icon={<Bookmark size={40} />}
          title="No saved jobs"
          description="Save jobs you're interested in to review later"
          action={
            <Link to="/jobs">
              <Button>Browse Jobs</Button>
            </Link>
          }
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {jobs.map((job, i) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Link
                to={`/jobs/${job.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  background: "var(--white)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius-lg)",
                  padding: "16px 20px",
                  boxShadow: "var(--shadow-sm)",
                  color: "inherit",
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background:
                      "linear-gradient(135deg, var(--navy-600), var(--navy-800))",
                    color: "var(--white)",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {job.employer?.company_name?.[0] || "C"}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: "0.9375rem",
                      color: "var(--navy-900)",
                      marginBottom: 4,
                    }}
                  >
                    {job.title}
                  </div>
                  <div
                    style={{
                      fontSize: "0.78rem",
                      color: "var(--text-muted)",
                      display: "flex",
                      gap: 8,
                    }}
                  >
                    <span>{job.employer?.company_name}</span>
                    <span>·</span>
                    <span>{job.location || "Remote"}</span>
                  </div>
                </div>
                <ArrowUpRight
                  size={16}
                  style={{ color: "var(--text-muted)" }}
                />
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Edit Job wrapper ───────────────────────────────────────────────────────────
function EditJobPage() {
  const { id } = useParams();
  const [job, setJob] = useState(null);

  useEffect(() => {
    if (id)
      jobsAPI
        .get(id)
        .then((r) => setJob(r.data))
        .catch(() => {});
  }, [id]);

  if (!job)
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
        <Spinner />
      </div>
    );
  return <PostJobPage editJob={job} />;
}

// ── Applicants placeholder page ────────────────────────────────────────────────
function ApplicantsPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem" }}>
        Applicants
      </h1>
      <p style={{ color: "var(--text-muted)" }}>
        Go to Manage Jobs and click "View applicants" on any listing.
      </p>
      <Link to="/jobs/manage">
        <Button variant="secondary">← Manage Jobs</Button>
      </Link>
    </div>
  );
}

// ── Routes ────────────────────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Onboarding — no AppLayout */}
      <Route
        path="/profile/setup"
        element={
          <ProtectedRoute>
            <ProfileSetupPage />
          </ProtectedRoute>
        }
      />

      {/* Shared */}
      <Route
        path="/dashboard"
        element={
          <Wrap>
            <DashboardRedirect />
          </Wrap>
        }
      />
      <Route
        path="/profile"
        element={
          <Wrap>
            <EditProfilePage />
          </Wrap>
        }
      />

      {/* Seeker */}
      <Route
        path="/jobs"
        element={
          <Wrap roles={["seeker"]}>
            <JobsPage />
          </Wrap>
        }
      />
      <Route
        path="/jobs/:id"
        element={
          <Wrap roles={["seeker"]}>
            <JobDetailPage />
          </Wrap>
        }
      />
      <Route
        path="/applications"
        element={
          <Wrap roles={["seeker"]}>
            <ApplicationsPage />
          </Wrap>
        }
      />
      <Route
        path="/saved"
        element={
          <Wrap roles={["seeker"]}>
            <SavedJobsPage />
          </Wrap>
        }
      />

      {/* Employer */}
      <Route
        path="/employer/dashboard"
        element={
          <Wrap roles={["employer"]}>
            <EmployerDashboard />
          </Wrap>
        }
      />
      <Route
        path="/jobs/manage"
        element={
          <Wrap roles={["employer"]}>
            <ManageJobsPage />
          </Wrap>
        }
      />
      <Route
        path="/jobs/post"
        element={
          <Wrap roles={["employer"]}>
            <PostJobPage />
          </Wrap>
        }
      />
      <Route
        path="/jobs/edit/:id"
        element={
          <Wrap roles={["employer"]}>
            <EditJobPage />
          </Wrap>
        }
      />
      <Route
        path="/applicants"
        element={
          <Wrap roles={["employer"]}>
            <ApplicantsPage />
          </Wrap>
        }
      />

      {/* Admin */}
      <Route
        path="/admin"
        element={
          <Wrap roles={["admin"]}>
            <AdminDashboard />
          </Wrap>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />

      <Route path="/employer/pipeline/:jobId" element={<KanbanPipeline />} />
    </Routes>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              fontFamily: "var(--font-body)",
              fontSize: "0.875rem",
              borderRadius: "10px",
              border: "1px solid var(--border-color)",
              boxShadow: "var(--shadow-md)",
            },
            success: { iconTheme: { primary: "#10b981", secondary: "#fff" } },
            error: { iconTheme: { primary: "#ef4444", secondary: "#fff" } },
          }}
        />
      </BrowserRouter>
    </Provider>
  );
}
