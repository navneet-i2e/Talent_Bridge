import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { applicationsAPI } from "../../lib/api";
import { Badge, Spinner, EmptyState, Button } from "../../components/ui/UI";
import {
  openChat,
  createSession,
  setActiveSession,
} from "../../store/slices/chatSlice";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import styles from "./Applications.module.css";
import Pagination from "../../components/ui/Pagination";

import {
  Briefcase,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Target,
  ArrowUpRight,
  Sparkles,
  Calendar,
  Building2,
  TrendingUp,
} from "lucide-react";

const STATUS_CONFIG = {
  applied: { label: "Applied", icon: Clock, color: "#3b82f6", bg: "#eff6ff" },
  under_review: {
    label: "Under Review",
    icon: AlertCircle,
    color: "#f59e0b",
    bg: "#fffbeb",
  },
  shortlisted: {
    label: "Shortlisted",
    icon: CheckCircle,
    color: "#10b981",
    bg: "#ecfdf5",
  },
  interview_scheduled: {
    label: "Interview",
    icon: Target,
    color: "#8b5cf6",
    bg: "#f5f3ff",
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    color: "#ef4444",
    bg: "#fff1f1",
  },
  hired: {
    label: "Hired 🎉",
    icon: CheckCircle,
    color: "#10b981",
    bg: "#ecfdf5",
  },
  withdrawn: {
    label: "Withdrawn",
    icon: XCircle,
    color: "#94a3b8",
    bg: "#f8fafc",
  },
};

const FILTERS = [
  "all",
  "applied",
  "under_review",
  "shortlisted",
  "interview_scheduled",
  "rejected",
  "hired",
];

export default function ApplicationsPage() {
  const dispatch = useDispatch();

  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [withdrawingId, setWithdrawingId] = useState(null);

  // ✅ Pagination state
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;

  useEffect(() => {
    applicationsAPI
      .myApplications()
      .then((r) => {
        // Handle all possible backend response shapes
        const data = r.data?.data || r.data?.applications || r.data;

        setApps(Array.isArray(data) ? data : []);
      })
      .catch(() => setApps([]))
      .finally(() => setLoading(false));
  }, []);

  // ✅ Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [filter]);

  const handleWithdraw = async (appId) => {
    if (!confirm("Withdraw this application?")) return;
    setWithdrawingId(appId);
    try {
      await applicationsAPI.withdraw(appId);
      setApps((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status: "withdrawn" } : a)),
      );
      toast.success("Application withdrawn");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error withdrawing");
    } finally {
      setWithdrawingId(null);
    }
  };

  const handleAI = async (prompt) => {
    const res = await dispatch(createSession({ title: prompt.slice(0, 60) }));
    if (res.payload) {
      dispatch(setActiveSession(res.payload.id));
      dispatch(openChat());
    }
  };

  // ✅ Filtering
  const filtered = Array.isArray(apps)
    ? filter === "all"
      ? apps
      : apps.filter((a) => a.status === filter)
    : [];
  // ✅ Pagination logic
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const paginatedApps = filtered.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  // ✅ Stats
  const stats = {
    total: apps.length,
    active: apps.filter(
      (a) => !["rejected", "withdrawn", "hired"].includes(a.status),
    ).length,
    interviews: apps.filter((a) => a.status === "interview_scheduled").length,
    offers: apps.filter((a) => a.status === "hired").length,
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1>My Applications</h1>
          <p>Track and manage all your job applications</p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            handleAI(
              "Analyze my job application pipeline and give me tips to improve my success rate",
            )
          }
        >
          <Sparkles size={15} /> AI Pipeline Analysis
        </Button>
      </div>

      {/* Stats */}
      <div className={styles.statsRow}>
        {[
          {
            label: "Total Applied",
            value: stats.total,
            icon: Briefcase,
            color: "#3b82f6",
          },
          {
            label: "In Progress",
            value: stats.active,
            icon: TrendingUp,
            color: "#f59e0b",
          },
          {
            label: "Interviews",
            value: stats.interviews,
            icon: Target,
            color: "#8b5cf6",
          },
          {
            label: "Offers",
            value: stats.offers,
            icon: CheckCircle,
            color: "#10b981",
          },
        ].map(({ label, value, icon: Icon, color }, i) => (
          <motion.div
            key={label}
            className={styles.statCard}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <div
              className={styles.statIcon}
              style={{ background: `${color}18`, color }}
            >
              <Icon size={18} />
            </div>
            <div>
              <div className={styles.statVal}>{value}</div>
              <div className={styles.statLbl}>{label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className={styles.filterBar}>
        {FILTERS.map((f) => {
          const count =
            f === "all"
              ? apps.length
              : apps.filter((a) => a.status === f).length;

          return (
            <button
              key={f}
              className={`${styles.filterTab} ${filter === f ? styles.filterTabActive : ""}`}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "All" : STATUS_CONFIG[f]?.label}
              <span className={styles.filterCount}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* List */}
      {loading ? (
        <div className={styles.loadingCenter}>
          <Spinner size="lg" />
        </div>
      ) : paginatedApps.length === 0 ? (
        <EmptyState
          icon={<Briefcase size={40} />}
          title={
            filter === "all"
              ? "No applications yet"
              : `No ${STATUS_CONFIG[filter]?.label} applications`
          }
          action={
            filter === "all" && (
              <Link to="/jobs">
                <Button>Browse Jobs</Button>
              </Link>
            )
          }
        />
      ) : (
        <>
          <div className={styles.list}>
            <AnimatePresence>
              {paginatedApps.map((app, i) => {
                const conf = STATUS_CONFIG[app.status] || STATUS_CONFIG.applied;
                const Icon = conf.icon;

                return (
                  <motion.div
                    key={app.id}
                    className={styles.appCard}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <div
                      className={styles.statusBar}
                      style={{ background: conf.color }}
                    />

                    <div className={styles.cardContent}>
                      <div className={styles.cardMain}>
                        <div className={styles.companyAvatar}>
                          {app.job?.employer?.company_name?.[0] || "C"}
                        </div>

                        <div className={styles.jobInfo}>
                          <Link
                            to={`/jobs/${app.job_id}`}
                            className={styles.jobTitle}
                          >
                            {app.job?.title}
                            <ArrowUpRight size={13} />
                          </Link>

                          <div className={styles.jobMeta}>
                            <span>
                              <Building2 size={12} />
                              {app.job?.employer?.company_name}
                            </span>
                            {app.job?.location && (
                              <span>· {app.job.location}</span>
                            )}
                          </div>

                          <div className={styles.appliedDate}>
                            <Calendar size={12} />
                            Applied{" "}
                            {new Date(app.applied_at).toLocaleDateString()}
                          </div>
                        </div>

                        <div className={styles.cardRight}>
                          <div
                            className={styles.statusBadge}
                            style={{ background: conf.bg, color: conf.color }}
                          >
                            <Icon size={13} />
                            {conf.label}
                          </div>

                          <div className={styles.cardActions}>
                            <button
                              className={styles.actionLink}
                              onClick={() =>
                                handleAI(
                                  `Improve chances for ${app.job?.title}`,
                                )
                              }
                            >
                              <Sparkles size={13} /> AI Tips
                            </button>

                            {!["rejected", "hired", "withdrawn"].includes(
                              app.status,
                            ) && (
                              <button
                                className={styles.withdrawBtn}
                                onClick={() => handleWithdraw(app.id)}
                                disabled={withdrawingId === app.id}
                              >
                                {withdrawingId === app.id ? "..." : "Withdraw"}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* ✅ Pagination UI */}
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={(p) => {
              if (p >= 1 && p <= totalPages) setPage(p);
            }}
          />
        </>
      )}
    </div>
  );
}
