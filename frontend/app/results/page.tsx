"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import { resultsAPI, api } from "@/lib/api";
import {
  Shield, ChevronDown, ChevronUp, ExternalLink,
  AlertTriangle, CheckCircle, Code2, Info, FileText,
  Network, Server, Globe, Router, Lock, Clock, GitMerge, GitPullRequest
} from "lucide-react";

const severityConfig: any = {
  CRITICAL: { bg: "bg-red-50", border: "border-red-200", badge: "bg-red-100 text-red-700 border-red-300", dot: "bg-red-500", text: "text-red-700" },
  HIGH:     { bg: "bg-orange-50", border: "border-orange-200", badge: "bg-orange-100 text-orange-700 border-orange-300", dot: "bg-orange-500", text: "text-orange-700" },
  MEDIUM:   { bg: "bg-yellow-50", border: "border-yellow-200", badge: "bg-yellow-100 text-yellow-700 border-yellow-300", dot: "bg-yellow-500", text: "text-yellow-700" },
  LOW:      { bg: "bg-slate-50", border: "border-slate-200", badge: "bg-slate-100 text-slate-600 border-slate-300", dot: "bg-slate-400", text: "text-slate-600" },
};

const remediationConfig: any = {
  fixed:       { label: "Fixed", icon: GitMerge,      bg: "bg-green-50",  border: "border-green-200",  text: "text-green-700",  badge: "bg-green-100 text-green-700 border-green-200" },
  in_progress: { label: "In Progress", icon: GitPullRequest, bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", badge: "bg-blue-100 text-blue-700 border-blue-200" },
  open:        { label: "Open", icon: Clock,           bg: "bg-slate-50",  border: "border-slate-200",  text: "text-slate-600", badge: "bg-slate-100 text-slate-600 border-slate-200" },
};

function detectCategory(finding: any): string {
  const id = (finding.check_id || "").toUpperCase();
  const title = (finding.check_title || "").toUpperCase();
  const resource = (finding.resource_id || "").toUpperCase();

  if (finding.category) return finding.category;
  if (id.includes("SG") || title.includes("SECURITY GROUP") || resource.includes("SECURITY_GROUP")) return "Security Groups";
  if (title.includes("SUBNET") || id.includes("SUBNET") || resource.includes("SUBNET")) return "Subnets";
  if (title.includes("ROUTE") || id.includes("ROUTE") || resource.includes("ROUTE_TABLE")) return "Route Tables";
  if (title.includes("VPC") || id.includes("VPC") || resource.includes("AWS_VPC.")) return "VPC";
  if (title.includes("EC2") || title.includes("INSTANCE") || title.includes("EBS") || title.includes("IMDS") || resource.includes("AWS_INSTANCE")) return "EC2";
  if (title.includes("S3") || resource.includes("S3_BUCKET")) return "S3";
  if (title.includes("IAM") || resource.includes("IAM")) return "IAM";
  if (title.includes("CLOUDTRAIL") || resource.includes("CLOUDTRAIL")) return "CloudTrail";
  if (title.includes("RDS") || resource.includes("DB_INSTANCE")) return "RDS";
  return "Other";
}

function getRemediationStatus(finding: any, prs: any[]): string {
  if (!finding.pr_url && !finding.pr_number) return "open";
  const pr = prs.find(p =>
    p.pr_number === finding.pr_number ||
    p.pr_url === finding.pr_url ||
    p.finding_id === finding.id
  );
  if (!pr) return finding.pr_url ? "in_progress" : "open";
  if (pr.status === "merged") return "fixed";
  if (pr.status === "closed") return "open";
  return "in_progress";
}

const categoryConfig: Record<string, { icon: any; badge: string; dot: string }> = {
  "Security Groups": { icon: Lock,    badge: "bg-indigo-100 text-indigo-700 border-indigo-200", dot: "bg-indigo-500" },
  "Subnets":         { icon: Network, badge: "bg-blue-100 text-blue-700 border-blue-200",       dot: "bg-blue-500"   },
  "Route Tables":    { icon: Router,  badge: "bg-violet-100 text-violet-700 border-violet-200", dot: "bg-violet-500" },
  "VPC":             { icon: Globe,   badge: "bg-cyan-100 text-cyan-700 border-cyan-200",        dot: "bg-cyan-500"   },
  "EC2":             { icon: Server,  badge: "bg-teal-100 text-teal-700 border-teal-200",        dot: "bg-teal-500"   },
  "Other":           { icon: Shield,  badge: "bg-slate-100 text-slate-600 border-slate-200",     dot: "bg-slate-400"  },
};

const CATEGORIES = ["All", "Security Groups", "Subnets", "Route Tables", "VPC", "EC2"];

function CategoryBadge({ category }: { category: string }) {
  const cfg = categoryConfig[category] || categoryConfig["Other"];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.badge}`}>
      <Icon className="h-3 w-3" />
      {category}
    </span>
  );
}

function RemediationBadge({ status }: { status: string }) {
  const cfg = remediationConfig[status] || remediationConfig.open;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${cfg.badge}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function FindingCard({ finding, index, prs }: { finding: any; index: number; prs: any[] }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = severityConfig[finding.severity] || severityConfig.LOW;
  const category = detectCategory(finding);
  const remStatus = getRemediationStatus(finding, prs);
  const remCfg = remediationConfig[remStatus];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
        remStatus === "fixed" ? "border-green-200" : cfg.border
      }`}
    >
      {/* Fixed banner */}
      {remStatus === "fixed" && (
        <div className="bg-green-500 px-5 py-1.5 flex items-center gap-2">
          <GitMerge className="h-3.5 w-3.5 text-white" />
          <span className="text-white text-xs font-semibold">PR Merged — This finding has been remediated</span>
        </div>
      )}
      {remStatus === "in_progress" && (
        <div className="bg-blue-500 px-5 py-1.5 flex items-center gap-2">
          <GitPullRequest className="h-3.5 w-3.5 text-white" />
          <span className="text-white text-xs font-semibold">PR Open — Fix is in review, pending merge</span>
        </div>
      )}

      {/* Header */}
      <div className={`p-5 cursor-pointer hover:bg-slate-50/50 transition-colors ${remStatus === "fixed" ? "opacity-75" : ""}`}
        onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${remStatus === "fixed" ? "bg-green-500" : cfg.dot}`} />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${cfg.badge}`}>
                  {finding.severity}
                </span>
                <CategoryBadge category={category} />
                <RemediationBadge status={remStatus} />
                <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                  {finding.check_id}
                </span>
              </div>
              <h3 className={`font-semibold text-sm leading-snug ${remStatus === "fixed" ? "text-slate-500 line-through decoration-green-400" : "text-slate-900"}`}>
                {finding.check_title}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 font-mono truncate">{finding.resource_id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {finding.pr_url && (
              <a href={finding.pr_url} target="_blank" rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                  remStatus === "fixed"
                    ? "text-green-700 bg-green-50 border-green-200 hover:bg-green-100"
                    : "text-indigo-600 bg-indigo-50 border-indigo-100 hover:bg-indigo-100"
                }`}>
                <ExternalLink className="h-3 w-3" />
                {remStatus === "fixed" ? "View Merged PR" : "View PR"}
              </a>
            )}
            <button className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
              {expanded ? <ChevronUp className="h-4 w-4 text-slate-600" /> : <ChevronDown className="h-4 w-4 text-slate-600" />}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className={`px-5 pb-5 pt-0 border-t ${cfg.border} space-y-4`}>
              {finding.explanation && (
                <div className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="h-4 w-4 text-indigo-500" />
                    <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Explanation</span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{finding.explanation}</p>
                </div>
              )}
              {finding.risk_description && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Risk</span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{finding.risk_description}</p>
                </div>
              )}
              {finding.compliance_references && finding.compliance_references !== "N/A" && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-purple-500" />
                    <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Compliance</span>
                  </div>
                  <p className="text-sm text-slate-600">{finding.compliance_references}</p>
                </div>
              )}
              {finding.terraform_patch && finding.terraform_patch !== "N/A" && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Code2 className="h-4 w-4 text-green-500" />
                    <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Terraform Fix</span>
                  </div>
                  <pre className="bg-slate-950 text-green-400 text-xs p-4 rounded-xl overflow-x-auto font-mono leading-relaxed">
                    {finding.terraform_patch}
                  </pre>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function ResultsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [findings, setFindings] = useState<any[]>([]);
  const [prs, setPrs] = useState<any[]>([]);
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [remFilter, setRemFilter] = useState("ALL");
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading]);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [findingsRes, prsRes] = await Promise.all([
        resultsAPI.getAll(),
        api.get("/prs/")
      ]);
      setFindings(findingsRes.data);
      setPrs(prsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setDataLoading(false);
    }
  };

  const findingsWithMeta = findings.map(f => ({
    ...f,
    _category: detectCategory(f),
    _remStatus: getRemediationStatus(f, prs),
  }));

  // Counts
  const categoryCounts: Record<string, number> = { All: findings.length };
  CATEGORIES.slice(1).forEach(c => {
    categoryCounts[c] = findingsWithMeta.filter(f => f._category === c).length;
  });

  const fixedCount = findingsWithMeta.filter(f => f._remStatus === "fixed").length;
  const inProgressCount = findingsWithMeta.filter(f => f._remStatus === "in_progress").length;
  const openCount = findingsWithMeta.filter(f => f._remStatus === "open").length;
  const fixRate = findings.length > 0 ? Math.round((fixedCount / findings.length) * 100) : 0;

  // Apply filters
  const categoryFiltered = categoryFilter === "All"
    ? findingsWithMeta
    : findingsWithMeta.filter(f => f._category === categoryFilter);

  const remFiltered = remFilter === "ALL"
    ? categoryFiltered
    : categoryFiltered.filter(f => f._remStatus === remFilter);

  const severityCounts: any = { ALL: remFiltered.length };
  ["CRITICAL", "HIGH", "MEDIUM", "LOW"].forEach(s => {
    severityCounts[s] = remFiltered.filter(f => f.severity === s).length;
  });

  const filtered = severityFilter === "ALL"
    ? remFiltered
    : remFiltered.filter(f => f.severity === severityFilter);

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-8">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Scan Results</h1>
            <p className="text-slate-500 text-sm mt-1">All misconfigurations found across your scans</p>
          </div>
          <button onClick={() => router.push("/scan")}
            className="btn-premium text-white text-sm font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Run New Scan
          </button>
        </motion.div>

        {/* Remediation Summary Bar */}
        {!dataLoading && findings.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-800 text-sm">Remediation Status</h2>
              <span className="text-xs text-slate-500">{findings.length} total findings</span>
            </div>

            {/* Progress bar */}
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden mb-3 flex">
              <div className="bg-green-500 h-full transition-all duration-700 rounded-l-full"
                style={{ width: `${(fixedCount / findings.length) * 100}%` }} />
              <div className="bg-blue-400 h-full transition-all duration-700"
                style={{ width: `${(inProgressCount / findings.length) * 100}%` }} />
              <div className="bg-slate-200 h-full transition-all duration-700 rounded-r-full"
                style={{ width: `${(openCount / findings.length) * 100}%` }} />
            </div>

            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "Fixed", count: fixedCount, color: "text-green-600", bg: "bg-green-50 border-green-200", icon: GitMerge, key: "fixed" },
                { label: "In Progress", count: inProgressCount, color: "text-blue-600", bg: "bg-blue-50 border-blue-200", icon: GitPullRequest, key: "in_progress" },
                { label: "Open", count: openCount, color: "text-slate-600", bg: "bg-slate-50 border-slate-200", icon: Clock, key: "open" },
                { label: "Fix Rate", count: `${fixRate}%`, color: fixRate >= 50 ? "text-green-600" : "text-orange-600", bg: "bg-indigo-50 border-indigo-200", icon: CheckCircle, key: "ALL" },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = remFilter === item.key;
                return (
                  <button key={item.key}
                    onClick={() => setRemFilter(isActive ? "ALL" : item.key)}
                    className={`p-3 rounded-xl border text-left transition-all ${item.bg} ${isActive ? "ring-2 ring-indigo-400 ring-offset-1" : "hover:opacity-80"}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon className={`h-3.5 w-3.5 ${item.color}`} />
                      <span className="text-xs text-slate-500">{item.label}</span>
                    </div>
                    <div className={`text-xl font-bold ${item.color}`}>{item.count}</div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Category Stats Bar */}
        {!dataLoading && findings.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="grid grid-cols-5 gap-3 mb-5">
            {CATEGORIES.slice(1).map(cat => {
              const cfg = categoryConfig[cat];
              const Icon = cfg.icon;
              const count = categoryCounts[cat] ?? 0;
              const isActive = categoryFilter === cat;
              return (
                <button key={cat} onClick={() => setCategoryFilter(isActive ? "All" : cat)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    isActive ? "bg-white border-indigo-300 shadow-md shadow-indigo-100" : "bg-white border-slate-200 hover:border-slate-300"
                  }`}>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-2 ${cfg.badge}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="text-lg font-bold text-slate-900">{count}</div>
                  <div className="text-xs text-slate-500 leading-tight">{cat}</div>
                </button>
              );
            })}
          </motion.div>
        )}

        {/* Category + Severity Filter Pills */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="flex flex-wrap gap-2 mb-3">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                categoryFilter === cat ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
              }`}>
              {cat} ({categoryCounts[cat] ?? 0})
            </button>
          ))}
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
          className="flex flex-wrap gap-2 mb-6">
          {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map(f => (
            <button key={f} onClick={() => setSeverityFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                severityFilter === f ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
              }`}>
              {f} ({severityCounts[f] ?? 0})
            </button>
          ))}
        </motion.div>

        {/* Results */}
        {dataLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-20 animate-pulse bg-slate-200 rounded-2xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-green-50 border border-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg mb-2">
              {findings.length === 0 ? "No findings yet" : "No findings match this filter"}
            </h3>
            <p className="text-slate-500 text-sm mb-5">
              {findings.length === 0 ? "Run your first scan to see results here." : "Try adjusting the filters above."}
            </p>
            {findings.length === 0 && (
              <button onClick={() => router.push("/scan")}
                className="btn-premium text-white text-sm font-semibold px-5 py-2.5 rounded-xl">
                Run First Scan
              </button>
            )}
          </motion.div>
        ) : (
          <div className="space-y-3">
            {filtered.map((finding, i) => (
              <FindingCard key={finding.id} finding={finding} index={i} prs={prs} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}