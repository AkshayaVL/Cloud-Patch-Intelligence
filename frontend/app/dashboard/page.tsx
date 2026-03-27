"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, Variants } from "framer-motion";
import { useAuth } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import OnboardingTour from "@/components/OnboardingTour";
import TourButton from "@/components/TourButton";
import { scoreAPI, scanAPI, prsAPI, resultsAPI, api } from "@/lib/api";
import {
  Shield,
  Scan,
  GitPullRequest,
  CheckCircle,
  Clock,
  TrendingUp,
  AlertTriangle,
  Activity,
  ChevronRight,
  Lock,
  Network,
  Router,
  Globe,
  Server,
  ArrowUp,
  ArrowDown,
  Minus,
  GitMerge,
  Plus,
} from "lucide-react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};
const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const [comparison, setComparison] = useState<any>(null);

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.ceil(value / 30);
    const timer = setInterval(() => {
      start += step;
      if (start >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else setDisplay(start);
    }, 30);
    return () => clearInterval(timer);
  }, [value]);
  return <>{display}</>;
}

function ScoreRing({ score }: { score: number }) {
  const r = 52;
  const circumference = 2 * Math.PI * r;
  const progress = ((100 - score) / 100) * circumference;
  const color = score >= 80 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative w-36 h-36 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" width="144" height="144">
        <circle
          cx="72"
          cy="72"
          r={r}
          fill="none"
          stroke="#e0e7ff"
          strokeWidth="10"
        />
        <circle
          cx="72"
          cy="72"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={progress}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1.5s ease" }}
        />
      </svg>
      <div className="text-center z-10">
        <div className="text-4xl font-display font-extrabold text-slate-900">
          <AnimatedNumber value={score} />
        </div>
        <div className="text-xs text-slate-500 font-medium">/ 100</div>
      </div>
    </div>
  );
}

// Same detectCategory logic as results page
function detectCategory(finding: any): string {
  const id = (finding.check_id || "").toUpperCase();
  const title = (finding.check_title || "").toUpperCase();
  const resource = (finding.resource_id || "").toUpperCase();

  if (
    id.includes("SG") ||
    title.includes("SECURITY GROUP") ||
    resource.includes("SECURITY_GROUP") ||
    resource.includes("SG-")
  )
    return "Security Groups";
  if (
    title.includes("SUBNET") ||
    id.includes("SUBNET") ||
    resource.includes("SUBNET")
  )
    return "Subnets";
  if (
    title.includes("ROUTE") ||
    id.includes("ROUTE") ||
    resource.includes("ROUTE_TABLE")
  )
    return "Route Tables";
  if (
    title.includes("VPC") ||
    id.includes("VPC") ||
    resource.includes("AWS_VPC.")
  )
    return "VPC";
  if (
    title.includes("EC2") ||
    title.includes("INSTANCE") ||
    title.includes("EBS") ||
    title.includes("IMDS") ||
    resource.includes("AWS_INSTANCE")
  )
    return "EC2";

  const num = parseInt(id.replace(/[^0-9]/g, "")) || 0;
  if ([25, 26, 27, 28, 29].includes(num)) return "Security Groups";
  if ([130, 131, 132].includes(num)) return "Subnets";
  if ([175, 176, 177].includes(num)) return "Route Tables";
  if ([111, 112, 148, 173].includes(num)) return "VPC";
  if ([8, 9, 79, 135, 189].includes(num)) return "EC2";

  return "Other";
}

const CATEGORY_META = [
  {
    label: "Security Groups",
    icon: Lock,
    badge: "bg-indigo-50 border-indigo-100",
    iconColor: "text-indigo-600",
    bar: "bg-indigo-500",
  },
  {
    label: "Subnets",
    icon: Network,
    badge: "bg-blue-50 border-blue-100",
    iconColor: "text-blue-600",
    bar: "bg-blue-500",
  },
  {
    label: "Route Tables",
    icon: Router,
    badge: "bg-violet-50 border-violet-100",
    iconColor: "text-violet-600",
    bar: "bg-violet-500",
  },
  {
    label: "VPC",
    icon: Globe,
    badge: "bg-cyan-50 border-cyan-100",
    iconColor: "text-cyan-600",
    bar: "bg-cyan-500",
  },
  {
    label: "EC2",
    icon: Server,
    badge: "bg-teal-50 border-teal-100",
    iconColor: "text-teal-600",
    bar: "bg-teal-500",
  },
];

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [score, setScore] = useState<number>(100);
  const [scoreHistory, setScoreHistory] = useState<any[]>([]);
  const [scans, setScans] = useState<any[]>([]);
  const [prs, setPRs] = useState<any[]>([]);
  const [findings, setFindings] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading]);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [scoreRes, scoreHistRes, scansRes, prsRes, findingsRes] =
        await Promise.all([
          scoreAPI.getLatest(),
          scoreAPI.getHistory(),
          scanAPI.history(),
          prsAPI.getAll(),
          resultsAPI.getAll(),
        ]);
      try {
        const compRes = await api.get("/results/compare");
        setComparison(compRes.data);
      } catch (e) {
        console.log("Comparison not available yet");
      }
      setScore(scoreRes.data.score ?? 100);
      setScoreHistory(
        scoreHistRes.data
          .slice(0, 10)
          .reverse()
          .map((s: any) => ({
            date: new Date(s.calculated_at).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
            }),
            score: s.score,
          }))
      );
      setScans(scansRes.data.slice(0, 5));
      setPRs(prsRes.data.slice(0, 5));
      setFindings(findingsRes.data);
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setDataLoading(false);
    }
  };

  // Category breakdown counts
  const categoryCounts = CATEGORY_META.map((cat) => ({
    ...cat,
    count: findings.filter((f) => detectCategory(f) === cat.label).length,
  }));
  const totalFindings = findings.length;

  // Latest scan severity summary
  const latestScan = scans[0];
  const severitySummary = latestScan
    ? [
        {
          label: "Critical",
          value: latestScan.critical_count ?? 0,
          color: "bg-red-500",
          text: "text-red-700",
          bg: "bg-red-50",
        },
        {
          label: "High",
          value: latestScan.high_count ?? 0,
          color: "bg-orange-500",
          text: "text-orange-700",
          bg: "bg-orange-50",
        },
        {
          label: "Medium",
          value: latestScan.medium_count ?? 0,
          color: "bg-yellow-500",
          text: "text-yellow-700",
          bg: "bg-yellow-50",
        },
        {
          label: "Low",
          value: latestScan.low_count ?? 0,
          color: "bg-slate-400",
          text: "text-slate-600",
          bg: "bg-slate-50",
        },
      ]
    : [];

  const getScoreLabel = (s: number) =>
    s >= 80 ? "Good" : s >= 50 ? "Fair" : "Poor";
  const getScoreColor = (s: number) =>
    s >= 80 ? "text-green-600" : s >= 50 ? "text-yellow-600" : "text-red-600";
  const getScoreBg = (s: number) =>
    s >= 80
      ? "bg-green-50 border-green-200"
      : s >= 50
      ? "bg-yellow-50 border-yellow-200"
      : "bg-red-50 border-red-200";

  const getStatusBadge = (status: string) => {
    const map: any = {
      completed: (
        <span className="px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-xs font-semibold border border-green-200">
          Completed
        </span>
      ),
      running: (
        <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
          Running
        </span>
      ),
      failed: (
        <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-xs font-semibold border border-red-200">
          Failed
        </span>
      ),
    };
    return (
      map[status] || (
        <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
          {status}
        </span>
      )
    );
  };

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <OnboardingTour />
      <TourButton />
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="flex justify-between items-center mb-8"
        >
          <motion.div variants={fadeUp}>
            <h1 className="text-2xl font-display font-bold text-slate-900">
              Good{" "}
              {new Date().getHours() < 12
                ? "morning"
                : new Date().getHours() < 18
                ? "afternoon"
                : "evening"}{" "}
              👋
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Here's your cloud security overview
            </p>
          </motion.div>
          <motion.div variants={fadeUp}>
            <Link href="/scan" id="tour-run-scan">
              <button className="btn-premium text-white font-semibold px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm">
                <Scan className="h-4 w-4" />
                Run New Scan
              </button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Top row — Score + Stats */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-6"
        >
          {/* Score card */}
          <motion.div
            variants={fadeUp}
            id="tour-score"
            className="col-span-1 bg-white rounded-2xl border border-slate-100 shadow-card p-6 flex flex-col items-center justify-center"
          >
            {dataLoading ? (
              <div className="w-36 h-36 shimmer rounded-full" />
            ) : (
              <ScoreRing score={score} />
            )}
            <div className="mt-3 text-center">
              <div className="font-display font-bold text-slate-900 text-sm">
                Security Score
              </div>
              {!dataLoading && (
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full border mt-1 inline-block ${getScoreBg(
                    score
                  )} ${getScoreColor(score)}`}
                >
                  {getScoreLabel(score)}
                </span>
              )}
            </div>
          </motion.div>

          {/* Stats */}
          {[
            {
              label: "Total Scans",
              value: scans.length,
              icon: <Activity className="h-5 w-5 text-indigo-600" />,
              bg: "bg-indigo-50",
              border: "border-indigo-100",
            },
            {
              label: "PRs Opened",
              value: prs.length,
              icon: <GitPullRequest className="h-5 w-5 text-purple-600" />,
              bg: "bg-purple-50",
              border: "border-purple-100",
            },
            {
              label: "PRs Merged",
              value: prs.filter((p) => p.status === "merged").length,
              icon: <CheckCircle className="h-5 w-5 text-green-600" />,
              bg: "bg-green-50",
              border: "border-green-100",
            },
          ].map((stat, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              id={i === 0 ? "tour-stats" : undefined}
              className="bg-white rounded-2xl border border-slate-100 shadow-card p-6 flex flex-col justify-between"
            >
              <div
                className={`w-10 h-10 rounded-xl ${stat.bg} border ${stat.border} flex items-center justify-center mb-4`}
              >
                {stat.icon}
              </div>
              <div>
                <div className="text-3xl font-display font-bold text-slate-900">
                  {dataLoading ? (
                    <div className="h-8 w-12 shimmer rounded" />
                  ) : (
                    <AnimatedNumber value={stat.value} />
                  )}
                </div>
                <div className="text-slate-500 text-sm mt-1">{stat.label}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Category Breakdown + Latest Scan Severity */}
        {!dataLoading && findings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6"
          >
            {/* Category Breakdown */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-indigo-500" />
                  <h2 className="font-display font-bold text-slate-900">
                    Findings by Category
                  </h2>
                </div>
                <Link
                  href="/results"
                  className="text-indigo-600 text-xs font-semibold hover:underline flex items-center gap-1"
                >
                  View all <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="space-y-3">
                {categoryCounts.map((cat) => {
                  const Icon = cat.icon;
                  const pct =
                    totalFindings > 0
                      ? Math.round((cat.count / totalFindings) * 100)
                      : 0;
                  return (
                    <div key={cat.label}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-6 h-6 rounded-md border ${cat.badge} flex items-center justify-center`}
                          >
                            <Icon className={`h-3 w-3 ${cat.iconColor}`} />
                          </div>
                          <span className="text-sm font-medium text-slate-700">
                            {cat.label}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-slate-900">
                          {cat.count}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${cat.bar} transition-all duration-700`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Latest Scan Severity Summary */}
            {latestScan && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-slate-400" />
                    <h2 className="font-display font-bold text-slate-900">
                      Latest Scan Summary
                    </h2>
                  </div>
                  <span className="text-xs text-slate-400">
                    {new Date(latestScan.started_at).toLocaleDateString(
                      "en-GB",
                      { day: "2-digit", month: "short", year: "numeric" }
                    )}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {severitySummary.map((s) => (
                    <div
                      key={s.label}
                      className={`${s.bg} rounded-xl p-4 text-center`}
                    >
                      <div
                        className={`text-2xl font-display font-bold ${s.text}`}
                      >
                        {s.value}
                      </div>
                      <div className="text-xs text-slate-500 font-medium mt-0.5">
                        {s.label}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <span className="text-sm text-slate-500">Total issues</span>
                  <span className="text-sm font-bold text-slate-900">
                    {latestScan.total_issues ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm text-slate-500">Status</span>
                  {getStatusBadge(latestScan.status)}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Score History Chart */}
        {scoreHistory.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-card p-6 mb-6"
          >
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp className="h-5 w-5 text-indigo-500" />
              <h2 className="font-display font-bold text-slate-900">
                Security Score History
              </h2>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={scoreHistory}>
                <defs>
                  <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                  }}
                  labelStyle={{ color: "#64748b", fontSize: 12 }}
                  itemStyle={{ color: "#6366f1", fontWeight: 600 }}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  fill="url(#scoreGrad)"
                  dot={{ fill: "#6366f1", r: 4, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Scan Comparison */}
        {comparison?.enough_data && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-card p-6 mb-6"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-indigo-500" />
                <h2 className="font-display font-bold text-slate-900">
                  Scan Comparison
                </h2>
                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                  Latest vs Previous
                </span>
              </div>
            </div>

            {/* Score comparison */}
            <div className="grid grid-cols-3 gap-4 mb-5">
              {/* Previous */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                <div className="text-xs text-slate-500 mb-2 font-medium">
                  Previous Scan
                </div>
                <div className="text-3xl font-display font-bold text-slate-600">
                  {comparison.previous.score}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {new Date(comparison.previous.date).toLocaleDateString(
                    "en-GB",
                    { day: "2-digit", month: "short" }
                  )}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {comparison.previous.total} findings
                </div>
              </div>

              {/* Delta */}
              <div
                className={`rounded-xl p-4 text-center flex flex-col items-center justify-center border ${
                  comparison.diff.score_change > 0
                    ? "bg-green-50 border-green-200"
                    : comparison.diff.score_change < 0
                    ? "bg-red-50 border-red-200"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <div
                  className={`flex items-center gap-1 text-3xl font-display font-bold ${
                    comparison.diff.score_change > 0
                      ? "text-green-600"
                      : comparison.diff.score_change < 0
                      ? "text-red-600"
                      : "text-slate-500"
                  }`}
                >
                  {comparison.diff.score_change > 0 ? (
                    <ArrowUp className="h-6 w-6" />
                  ) : comparison.diff.score_change < 0 ? (
                    <ArrowDown className="h-6 w-6" />
                  ) : (
                    <Minus className="h-6 w-6" />
                  )}
                  {Math.abs(comparison.diff.score_change)}
                </div>
                <div
                  className={`text-xs font-semibold mt-1 ${
                    comparison.diff.score_change > 0
                      ? "text-green-600"
                      : comparison.diff.score_change < 0
                      ? "text-red-600"
                      : "text-slate-500"
                  }`}
                >
                  {comparison.diff.score_change > 0
                    ? "Improved"
                    : comparison.diff.score_change < 0
                    ? "Worsened"
                    : "No Change"}
                </div>
              </div>

              {/* Current */}
              <div
                className={`rounded-xl p-4 text-center border ${
                  comparison.current.score >= 80
                    ? "bg-green-50 border-green-200"
                    : comparison.current.score >= 50
                    ? "bg-yellow-50 border-yellow-200"
                    : "bg-red-50 border-red-200"
                }`}
              >
                <div className="text-xs text-slate-500 mb-2 font-medium">
                  Current Scan
                </div>
                <div
                  className={`text-3xl font-display font-bold ${
                    comparison.current.score >= 80
                      ? "text-green-600"
                      : comparison.current.score >= 50
                      ? "text-yellow-600"
                      : "text-red-600"
                  }`}
                >
                  {comparison.current.score}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {new Date(comparison.current.date).toLocaleDateString(
                    "en-GB",
                    { day: "2-digit", month: "short" }
                  )}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {comparison.current.total} findings
                </div>
              </div>
            </div>

            {/* New vs Resolved */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Plus className="h-3.5 w-3.5 text-red-600" />
                  <span className="text-xs font-semibold text-red-700">
                    New Findings
                  </span>
                </div>
                <div className="text-2xl font-display font-bold text-red-600">
                  {comparison.diff.new_count}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  appeared since last scan
                </div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <GitMerge className="h-3.5 w-3.5 text-green-600" />
                  <span className="text-xs font-semibold text-green-700">
                    Resolved
                  </span>
                </div>
                <div className="text-2xl font-display font-bold text-green-600">
                  {comparison.diff.resolved_count}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  fixed since last scan
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Minus className="h-3.5 w-3.5 text-slate-500" />
                  <span className="text-xs font-semibold text-slate-600">
                    Persisted
                  </span>
                </div>
                <div className="text-2xl font-display font-bold text-slate-600">
                  {comparison.diff.persisted_count}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  still unresolved
                </div>
              </div>
            </div>

            {/* New findings preview */}
            {comparison.diff.new_findings.length > 0 && (
              <div className="border border-red-100 rounded-xl p-3 bg-red-50/50">
                <p className="text-xs font-semibold text-red-700 mb-2 flex items-center gap-1">
                  <Plus className="h-3 w-3" /> New since last scan
                </p>
                <div className="space-y-1">
                  {comparison.diff.new_findings.map((f: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-xs text-slate-600"
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          f.severity === "CRITICAL"
                            ? "bg-red-500"
                            : f.severity === "HIGH"
                            ? "bg-orange-500"
                            : f.severity === "MEDIUM"
                            ? "bg-yellow-500"
                            : "bg-slate-400"
                        }`}
                      />
                      <span className="font-medium text-slate-700">
                        {f.severity}
                      </span>
                      <span className="truncate">{f.check_title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resolved findings preview */}
            {comparison.diff.resolved_findings.length > 0 && (
              <div className="border border-green-100 rounded-xl p-3 bg-green-50/50 mt-2">
                <p className="text-xs font-semibold text-green-700 mb-2 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" /> Resolved since last scan
                </p>
                <div className="space-y-1">
                  {comparison.diff.resolved_findings.map(
                    (f: any, i: number) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 text-xs text-slate-600"
                      >
                        <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
                        <span className="truncate line-through text-slate-400">
                          {f.check_title}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Recent Scans + PRs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Recent Scans */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-card p-6"
            id="tour-recent-scans"
          >
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-slate-400" />
                <h2 className="font-display font-bold text-slate-900">
                  Recent Scans
                </h2>
              </div>
              <Link
                href="/results"
                className="text-indigo-600 text-xs font-semibold hover:underline flex items-center gap-1"
              >
                View all <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            {dataLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 shimmer rounded-xl" />
                ))}
              </div>
            ) : scans.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                  <AlertTriangle className="h-6 w-6 text-slate-400" />
                </div>
                <p className="text-slate-500 text-sm mb-3">No scans yet</p>
                <Link href="/scan">
                  <button className="btn-premium text-white text-xs font-semibold px-4 py-2 rounded-xl">
                    Run First Scan
                  </button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {scans.map((scan) => (
                  <div
                    key={scan.id}
                    className="flex justify-between items-center p-3 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {scan.total_issues ?? 0} issues found
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(scan.started_at).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    {getStatusBadge(scan.status)}
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Recent PRs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-card p-6"
            id="tour-recent-prs"
          >
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-2">
                <GitPullRequest className="h-5 w-5 text-slate-400" />
                <h2 className="font-display font-bold text-slate-900">
                  Recent Pull Requests
                </h2>
              </div>
              <Link
                href="/prs"
                className="text-indigo-600 text-xs font-semibold hover:underline flex items-center gap-1"
              >
                View all <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            {dataLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 shimmer rounded-xl" />
                ))}
              </div>
            ) : prs.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                  <GitPullRequest className="h-6 w-6 text-slate-400" />
                </div>
                <p className="text-slate-500 text-sm">No PRs opened yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {prs.map((pr) => (
                  <div
                    key={pr.id}
                    className="flex justify-between items-center p-3 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {pr.pr_title}
                      </p>
                      <a
                        href={pr.pr_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-indigo-500 hover:underline"
                      >
                        View PR #{pr.pr_number}
                      </a>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold border shrink-0 ${
                        pr.status === "merged"
                          ? "bg-purple-50 text-purple-700 border-purple-200"
                          : pr.status === "open"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}
                    >
                      {pr.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
