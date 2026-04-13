import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import { fetchJobs } from "../../store/slices/jobsSlice";
import { applicationsAPI } from "../../lib/api";
import {
  Badge,
  Button,
  SkeletonJobCard,
  SkeletonCard,
} from "../../components/ui/UI";
import {
  openChat,
  createSession,
  setActiveSession,
} from "../../store/slices/chatSlice";
import styles from "./Dashboard.module.css";
import {
  Briefcase,
  FileText,
  BookmarkCheck,
  Target,
  ArrowRight,
  Sparkles,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  MapPin,
} from "lucide-react";
import RecommendedJobs from "../../components/jobs/RecommendedJobs";

const STATUS_META = {
  applied: { label: "Applied", variant: "primary", icon: Clock },
  under_review: {
    label: "Under Review",
    variant: "warning",
    icon: AlertCircle,
  },
  shortlisted: { label: "Shortlisted", variant: "success", icon: CheckCircle },
  interview_scheduled: { label: "Interview", variant: "purple", icon: Target },
  rejected: { label: "Rejected", variant: "danger", icon: XCircle },
  hired: { label: "Hired 🎉", variant: "success", icon: CheckCircle },
  withdrawn: { label: "Withdrawn", variant: "default", icon: XCircle },
};

export default function SeekerDashboard() {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const { list: jobs, loading: jobsLoading } = useSelector((s) => s.jobs);
  const { seeker } = useSelector((s) => s.profile);

  const [apps, setApps] = useState([]);
  const [appsLoading, setAppsLoading] = useState(true);

  useEffect(() => {
    dispatch(fetchJobs({ page: 1, page_size: 6 }));
   applicationsAPI
  .myApplications()
  .then((r) => {
    const data = r.data;

    if (Array.isArray(data)) {
      setApps(data);
    } else if (Array.isArray(data?.data)) {
      setApps(data.data);
    } else {
      setApps([]);
    }
  })
  .catch((err) => {
    console.error("Applications error:", err);
    setApps([]);
  })
  .finally(() => setAppsLoading(false));
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  };

  const handleAI = async (prompt) => {
    const res = await dispatch(createSession({ title: prompt.slice(0, 55) }));
    if (res.payload) {
      dispatch(setActiveSession(res.payload.id));
      dispatch(openChat());
    }
  };

  const name =
    seeker?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "there";

  return (
    <div className={styles.page}>
      {/* Hero */}
      <motion.div
        className={styles.hero}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className={styles.heroText}>
          <h1>
            {greeting()}, {name} 👋
          </h1>
          <p>Here's your job search overview today.</p>
        </div>
        <Button
          variant="gold"
          size="md"
          onClick={() =>
            handleAI(
              "Build me a personalized job search strategy based on my profile",
            )
          }
        >
          <Sparkles size={15} /> AI Strategy
        </Button>
      </motion.div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        {[
          {
            icon: FileText,
            label: "Applications",
            value: apps.length,
            color: "#3b82f6",
          },
          {
            icon: AlertCircle,
            label: "Under Review",
            value: apps.filter((a) => a.status === "under_review").length,
            color: "#f59e0b",
          },
          {
            icon: CheckCircle,
            label: "Shortlisted",
            value: apps.filter((a) => a.status === "shortlisted").length,
            color: "#10b981",
          },
          {
            icon: Target,
            label: "Interviews",
            value: apps.filter((a) => a.status === "interview_scheduled")
              .length,
            color: "#8b5cf6",
          },
        ].map(({ icon: Icon, label, value, color }, i) => (
          <motion.div
            key={label}
            className={styles.statCard}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
          >
            <div
              className={styles.statIcon}
              style={{ background: `${color}18`, color }}
            >
              <Icon size={20} />
            </div>
            <div>
              <div className={styles.statValue}>
                {appsLoading ? (
                  <span
                    className="skeleton"
                    style={{
                      width: 28,
                      height: 28,
                      display: "block",
                      borderRadius: 6,
                    }}
                  />
                ) : (
                  value
                )}
              </div>
              <div className={styles.statLabel}>{label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className={styles.twoCol}>
        {/* Recent applications */}
        <section>
          <div className={styles.sectionHead}>
            <h2>Recent Applications</h2>
            <Link to="/applications" className={styles.viewAll}>
              View all <ArrowRight size={13} />
            </Link>
          </div>
          <div className={styles.appList}>
            {appsLoading ? (
              Array(3)
                .fill(0)
                .map((_, i) => <SkeletonCard key={i} lines={2} />)
            ) : apps.length === 0 ? (
              <div className={styles.emptyNote}>
                <Briefcase size={20} />
                <span>
                  No applications yet. <Link to="/jobs">Browse jobs →</Link>
                </span>
              </div>
            ) : (
              apps.slice(0, 5).map((app, i) => {
                const meta = STATUS_META[app.status] || STATUS_META.applied;
                return (
                  <motion.div
                    key={app.id}
                    className={styles.appCard}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <div className={styles.appCompanyAvatar}>
                      {app.job?.employer?.company_name?.[0] || "C"}
                    </div>
                    <div className={styles.appInfo}>
                      <div className={styles.appTitle}>{app.job?.title}</div>
                      <div className={styles.appCompany}>
                        {app.job?.employer?.company_name}
                      </div>
                    </div>
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                  </motion.div>
                );
              })
            )}
          </div>
        </section>

        {/* AI Quick actions */}
        <section>
          <div className={styles.sectionHead}>
            <h2>AI Quick Actions</h2>
          </div>
          <div className={styles.aiGrid}>
            {[
              {
                icon: "📄",
                label: "ATS Resume Score",
                prompt:
                  "Analyze my resume for ATS compatibility with a detailed score and improvements",
              },
              {
                icon: "🎯",
                label: "Job Match",
                prompt:
                  "Based on my profile, what jobs should I apply to and why?",
              },
              {
                icon: "💬",
                label: "Mock Interview",
                prompt:
                  "Start a mock interview session for a software engineering role",
              },
              {
                icon: "💰",
                label: "Salary Insights",
                prompt:
                  "What is the current market salary for my role and experience level?",
              },
              {
                icon: "📧",
                label: "Find Recruiters",
                prompt:
                  "Help me find recruiter contact details at top tech companies",
              },
              {
                icon: "🧠",
                label: "Skill Gap",
                prompt:
                  "What skills am I missing to qualify for senior-level roles?",
              },
            ].map(({ icon, label, prompt }, i) => (
              <motion.button
                key={label}
                className={styles.aiAction}
                onClick={() => handleAI(prompt)}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.04 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
              >
                <span className={styles.aiIcon}>{icon}</span>
                <span>{label}</span>
                <ArrowRight size={13} className={styles.aiArrow} />
              </motion.button>
            ))}
          </div>
          <RecommendedJobs />
        </section>
      </div>

      {/* Latest jobs */}
      <section>
        <div className={styles.sectionHead}>
          <h2>Latest Jobs</h2>
          <Link to="/jobs" className={styles.viewAll}>
            Browse all <ArrowRight size={13} />
          </Link>
        </div>
        <div className={styles.jobsGrid}>
          {jobsLoading
            ? Array(6)
                .fill(0)
                .map((_, i) => <SkeletonJobCard key={i} />)
            : jobs.slice(0, 6).map((job, i) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link to={`/jobs/${job.id}`} className={styles.jobCard}>
                    <div className={styles.jobCardTop}>
                      <div className={styles.jobAvatar}>
                        {job.employer?.company_name?.[0] || "C"}
                      </div>
                      <Badge variant={job.is_remote ? "success" : "default"}>
                        {job.is_remote ? "Remote" : job.location || "On-site"}
                      </Badge>
                    </div>
                    <div className={styles.jobTitle}>{job.title}</div>
                    <div className={styles.jobCompany}>
                      {job.employer?.company_name}
                    </div>
                    <div className={styles.jobMeta}>
                      <span>
                        <MapPin size={11} />
                        {job.location || "Remote"}
                      </span>
                      {job.salary_min && (
                        <span>· ${(job.salary_min / 1000).toFixed(0)}K+</span>
                      )}
                    </div>
                    <div className={styles.jobTags}>
                      {job.required_skills?.slice(0, 3).map((s) => (
                        <Badge key={s.id} variant="default">
                          {s.name}
                        </Badge>
                      ))}
                    </div>
                  </Link>
                </motion.div>
              ))}
        </div>
      </section>
    </div>
  );
}
