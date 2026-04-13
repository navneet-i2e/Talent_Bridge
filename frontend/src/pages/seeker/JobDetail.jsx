import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { jobsAPI, applicationsAPI } from "../../lib/api";
import { Badge, Button, Spinner, Modal } from "../../components/ui/UI";
import { markSaved, markUnsaved } from "../../store/slices/jobsSlice";
import {
  openChat,
  createSession,
  setActiveSession,
} from "../../store/slices/chatSlice";
import toast from "react-hot-toast";
import styles from "./JobDetail.module.css";
import ReactMarkdown from "react-markdown";
import {
  MapPin,
  Clock,
  DollarSign,
  Bookmark,
  BookmarkCheck,
  Building2,
  Globe,
  Calendar,
  Users,
  ArrowLeft,
  Sparkles,
  Send,
  FileText,
  CheckCircle,
} from "lucide-react";
import ATSScoreCard from "../../components/ats/ATSScorecard";

export default function JobDetailPage() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);
  const { savedIds } = useSelector((s) => s.jobs);
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");

  useEffect(() => {
    jobsAPI
      .get(id)
      .then((r) => setJob(r.data))
      .catch(() => toast.error("Job not found"))
      .finally(() => setLoading(false));
    if (user?.role === "seeker") {
      applicationsAPI
        .myApplications()
        .then((r) => {
          if (r.data.find((a) => a.job_id === parseInt(id))) setApplied(true);
        })
        .catch(() => {});
    }
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (savedIds.includes(job.id)) {
        await jobsAPI.unsave(job.id);
        dispatch(markUnsaved(job.id));
        toast.success("Removed");
      } else {
        await jobsAPI.save(job.id);
        dispatch(markSaved(job.id));
        toast.success("Saved!");
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error");
    }
    setSaving(false);
  };

  const handleApply = async () => {
    setApplying(true);
    try {
      await applicationsAPI.apply({
        job_id: job.id,
        cover_letter: coverLetter || undefined,
      });
      setApplied(true);
      setShowModal(false);
      toast.success("Application submitted!");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed");
    }
    setApplying(false);
  };

  const handleAI = async (prompt) => {
    const res = await dispatch(createSession({ title: prompt.slice(0, 60) }));
    if (res.payload) {
      dispatch(setActiveSession(res.payload.id));
      dispatch(openChat());
    }
  };

  if (loading)
    return (
      <div className={styles.loading}>
        <Spinner size="lg" />
      </div>
    );
  if (!job)
    return (
      <div className={styles.loading}>
        <p>Job not found.</p>
      </div>
    );

  return (
    <div className={styles.page}>
      <button className={styles.backBtn} onClick={() => navigate(-1)}>
        <ArrowLeft size={16} /> Back
      </button>
      <div className={styles.layout}>
        <div className={styles.main}>
          <motion.div
            className={styles.headerCard}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className={styles.headerTop}>
              <div className={styles.companyLogo}>
                {job.employer?.logo_url ? (
                  <img src={job.employer.logo_url} alt="" />
                ) : (
                  <span>{job.employer?.company_name?.[0] || "C"}</span>
                )}
              </div>
              <div className={styles.headerInfo}>
                <h1>{job.title}</h1>
                <div className={styles.companyLine}>
                  <Building2 size={14} />
                  <span>{job.employer?.company_name}</span>
                  {job.employer?.company_website && (
                    <a
                      href={job.employer.company_website}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.webLink}
                    >
                      <Globe size={12} /> Website
                    </a>
                  )}
                </div>
              </div>
            </div>
            <div className={styles.metaRow}>
              <span className={styles.metaChip}>
                <MapPin size={12} />
                {job.location || "Remote"}
              </span>
              <span className={styles.metaChip}>
                <Clock size={12} />
                {job.job_type?.replace("_", " ")}
              </span>
              {job.salary_min && (
                <span className={styles.metaChip}>
                  <DollarSign size={12} />${(job.salary_min / 1000).toFixed(0)}
                  K–${(job.salary_max / 1000).toFixed(0)}K/yr
                </span>
              )}
              <span className={styles.metaChip}>
                <Users size={12} />
                {job.experience_level}
              </span>
            </div>
            {job.required_skills?.length > 0 && (
              <div className={styles.skillRow}>
                {job.required_skills.map((s) => (
                  <Badge key={s.id} variant="primary">
                    {s.name}
                  </Badge>
                ))}
              </div>
            )}
            {user?.role === "seeker" && (
              <div className={styles.ctaRow}>
                {applied ? (
                  <div className={styles.appliedBadge}>
                    <CheckCircle size={16} /> Applied
                  </div>
                ) : (
                  <Button size="lg" onClick={() => setShowModal(true)}>
                    <Send size={15} /> Apply Now
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={handleSave}
                  loading={saving}
                >
                  {savedIds.includes(job.id) ? (
                    <>
                      <BookmarkCheck size={15} /> Saved
                    </>
                  ) : (
                    <>
                      <Bookmark size={15} /> Save
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  className={styles.hideOnMobile}
                  onClick={() =>
                    handleAI(
                      `Evaluate if I am a good fit for: ${job.title} at ${job.employer?.company_name}`,
                    )
                  }
                >
                  <Sparkles size={15} /> AI Analysis
                </Button>
              </div>
            )}
          </motion.div>

          {[
            ["Job Description", job.description],
            ["Responsibilities", job.responsibilities],
            ["Qualifications", job.qualifications],
          ]
            .filter(([, c]) => c)
            .map(([title, content], i) => (
              <motion.div
                key={title}
                className={styles.section}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 + i * 0.06 }}
              >
                <h2>{title}</h2>
                <div className="prose">
                  <ReactMarkdown>{content}</ReactMarkdown>
                </div>
              </motion.div>
            ))}
        </div>

        <div className={styles.sidebar}>
          {user?.role === "seeker" && <ATSScoreCard jobId={job.id} />}
          <div className={styles.aiCard}>
            <div className={styles.aiCardHead}>
              <Sparkles size={15} /> AI Career Tools
            </div>
            {[
              [
                "Am I a good fit?",
                `Analyze if I am a good fit for: ${job.title} at ${job.employer?.company_name}`,
              ],
              [
                "Write cover letter",
                `Write a tailored cover letter for: ${job.title} at ${job.employer?.company_name}`,
              ],
              [
                "Interview prep",
                `Prepare me for interview for: ${job.title}. Give me likely questions and tips.`,
              ],
              [
                "Skill gap analysis",
                `What skills am I missing for: ${job.title}? Required: ${job.required_skills?.map((s) => s.name).join(", ")}`,
              ],
              [
                "Salary negotiation",
                `Salary negotiation tips for ${job.title}, range $${job.salary_min}–$${job.salary_max}`,
              ],
            ].map(([label, prompt]) => (
              <button
                key={label}
                className={styles.aiTool}
                onClick={() => handleAI(prompt)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className={styles.companyCard}>
            <h3>About {job.employer?.company_name}</h3>
            {job.employer?.description && (
              <p className={styles.companyDesc}>{job.employer.description}</p>
            )}
            <div className={styles.companyMeta}>
              {[
                ["Industry", job.employer?.industry],
                [
                  "Size",
                  job.employer?.company_size &&
                    `${job.employer.company_size} employees`,
                ],
                ["HQ", job.employer?.headquarters],
                ["Founded", job.employer?.founded_year],
              ]
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k}>
                    <span>{k}</span>
                    <strong>{v}</strong>
                  </div>
                ))}
            </div>
          </div>
          <div className={styles.statsCard}>
            <div>
              <span>Posted</span>
              <strong>
                {new Date(job.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </strong>
            </div>
            <div>
              <span>Views</span>
              <strong>{job.views_count}</strong>
            </div>
            <div>
              <span>Status</span>
              <Badge variant={job.status === "active" ? "success" : "default"}>
                {job.status}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={`Apply to ${job.title}`}
        subtitle={job.employer?.company_name}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleApply} loading={applying}>
              <Send size={14} /> Submit
            </Button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              background: "var(--accent-light)",
              borderRadius: "var(--radius-md)",
              fontSize: "0.82rem",
              color: "var(--navy-700)",
            }}
          >
            <FileText size={15} /> Your uploaded resume will be submitted
            automatically.
          </div>
          <div>
            <label
              style={{
                fontSize: "0.8125rem",
                fontWeight: 500,
                color: "var(--text-secondary)",
                display: "block",
                marginBottom: 6,
              }}
            >
              Cover Letter{" "}
              <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>
                (optional)
              </span>
            </label>
            <textarea
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              placeholder="Write a cover letter or use AI to generate one…"
              rows={6}
              style={{
                width: "100%",
                border: "1.5px solid var(--border-color)",
                borderRadius: "var(--radius-md)",
                padding: "12px 14px",
                fontSize: "0.875rem",
                fontFamily: "var(--font-body)",
                resize: "vertical",
                outline: "none",
              }}
            />
          </div>
          <button
            onClick={() => {
              setShowModal(false);
              handleAI(
                `Write a tailored cover letter for: ${job.title} at ${job.employer?.company_name}`,
              );
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "7px 14px",
              background: "var(--accent-light)",
              border: "1px solid rgba(30,64,128,0.2)",
              borderRadius: "var(--radius-md)",
              color: "var(--navy-700)",
              fontSize: "0.8125rem",
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "var(--font-body)",
              width: "fit-content",
            }}
          >
            <Sparkles size={13} /> Generate with AI
          </button>
        </div>
      </Modal>
    </div>
  );
}

//where to add this <ATSScoreCard jobId={job.id} />
