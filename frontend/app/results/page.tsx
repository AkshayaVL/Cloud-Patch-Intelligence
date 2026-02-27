"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import { resultsAPI } from "@/lib/api";
import {
  Shield, ChevronDown, ChevronUp, ExternalLink,
  AlertTriangle, CheckCircle, Code2, Info, FileText
} from "lucide-react";

const severityConfig: any = {
  CRITICAL: { bg: "bg-red-50", border: "border-red-200", badge: "bg-red-100 text-red-700 border-red-300", dot: "bg-red-500", text: "text-red-700" },
  HIGH: { bg: "bg-orange-50", border: "border-orange-200", badge: "bg-orange-100 text-orange-700 border-orange-300", dot: "bg-orange-500", text: "text-orange-700" },
  MEDIUM: { bg: "bg-yellow-50", border: "border-yellow-200", badge: "bg-yellow-100 text-yellow-700 border-yellow-300", dot: "bg-yellow-500", text: "text-yellow-700" },
  LOW: { bg: "bg-slate-50", border: "border-slate-200", badge: "bg-slate-100 text-slate-600 border-slate-300", dot: "bg-slate-400", text: "text-slate-600" },
};

function FindingCard({ finding, index }: { finding: any; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = severityConfig[finding.severity] || severityConfig.LOW;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`bg-white rounded-2xl border ${cfg.border} shadow-card overflow-hidden`}
    >
      {/* Header */}
      <div className="p-5 cursor-pointer hover:bg-slate-50/50 transition-colors"
        onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`w-2 h-2 rounded-full ${cfg.dot} mt-2 shrink-0`} />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${cfg.badge}`}>
                  {finding.severity}
                </span>
                <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  {finding.check_id}
                </span>
              </div>
              <h3 className="font-display font-bold text-slate-900 text-sm">{finding.check_title}</h3>
              <p className="text-xs text-slate-500 mt-0.5 font-mono">{finding.resource_id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {finding.pr_url && (
              <a href={finding.pr_url} target="_blank" rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="flex items-center gap-1.5 text-xs text-indigo-600 font-semibold bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors">
                <ExternalLink className="h-3 w-3" />
                View PR
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
            transition={{ duration: 0.25 }}
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
  const [filter, setFilter] = useState("ALL");
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading]);

  useEffect(() => {
    if (user) loadFindings();
  }, [user]);

  const loadFindings = async () => {
    try {
      const res = await resultsAPI.getAll();
      setFindings(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setDataLoading(false);
    }
  };

  const filters = ["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"];
  const filtered = filter === "ALL" ? findings : findings.filter(f => f.severity === filter);
  const counts: any = { ALL: findings.length };
  ["CRITICAL", "HIGH", "MEDIUM", "LOW"].forEach(s => {
    counts[s] = findings.filter(f => f.severity === s).length;
  });

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-8">

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center mb-8"
        >
          <div>
            <h1 className="text-2xl font-display font-bold text-slate-900">Scan Results</h1>
            <p className="text-slate-500 text-sm mt-1">All misconfigurations found across your scans</p>
          </div>
          <button onClick={() => router.push("/scan")}
            className="btn-premium text-white text-sm font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Run New Scan
          </button>
        </motion.div>

        {/* Filter tabs */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="flex flex-wrap gap-2 mb-6"
        >
          {filters.map(f => {
            const cfgMap: any = {
              CRITICAL: "bg-red-500",
              HIGH: "bg-orange-500",
              MEDIUM: "bg-yellow-500",
              LOW: "bg-slate-400",
              ALL: "bg-indigo-500"
            };
            return (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                  filter === f
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-indigo-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
                }`}>
                {f} ({counts[f] ?? 0})
              </button>
            );
          })}
        </motion.div>

        {/* Content */}
        {dataLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-20 shimmer rounded-2xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-20 bg-white rounded-2xl border border-slate-100 shadow-card"
          >
            <div className="w-16 h-16 rounded-2xl bg-green-50 border border-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <h3 className="font-display font-bold text-slate-900 text-lg mb-2">
              {filter === "ALL" ? "No findings yet" : `No ${filter} findings`}
            </h3>
            <p className="text-slate-500 text-sm mb-5">
              {filter === "ALL" ? "Run your first scan to see results here." : "No issues found at this severity level."}
            </p>
            {filter === "ALL" && (
              <button onClick={() => router.push("/scan")}
                className="btn-premium text-white text-sm font-semibold px-5 py-2.5 rounded-xl">
                Run First Scan
              </button>
            )}
          </motion.div>
        ) : (
          <div className="space-y-3">
            {filtered.map((finding, i) => (
              <FindingCard key={finding.id} finding={finding} index={i} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}