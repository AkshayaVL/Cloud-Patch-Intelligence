"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import { prsAPI } from "@/lib/api";
import {
  GitPullRequest, GitMerge, XCircle, ExternalLink,
  CheckCircle, Clock, AlertTriangle
} from "lucide-react";

const severityBadge: any = {
  CRITICAL: "bg-red-100 text-red-700 border-red-200",
  HIGH: "bg-orange-100 text-orange-700 border-orange-200",
  MEDIUM: "bg-yellow-100 text-yellow-700 border-yellow-200",
  LOW: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function PRsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [prs, setPRs] = useState<any[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading]);

  useEffect(() => {
    if (user) loadPRs();
  }, [user]);

  const loadPRs = async () => {
    try {
      const res = await prsAPI.getAll();
      setPRs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setDataLoading(false);
    }
  };

  const filters = ["ALL", "open", "merged", "closed"];
  const filtered = filter === "ALL" ? prs : prs.filter(p => p.status === filter);

  const stats = {
    open: prs.filter(p => p.status === "open").length,
    merged: prs.filter(p => p.status === "merged").length,
    closed: prs.filter(p => p.status === "closed").length,
  };

  const getStatusIcon = (status: string) => {
    if (status === "merged") return <GitMerge className="h-4 w-4 text-purple-600" />;
    if (status === "closed") return <XCircle className="h-4 w-4 text-red-500" />;
    return <GitPullRequest className="h-4 w-4 text-green-600" />;
  };

  const getStatusStyle = (status: string) => {
    if (status === "merged") return "bg-purple-50 border-purple-200 text-purple-700";
    if (status === "closed") return "bg-red-50 border-red-200 text-red-700";
    return "bg-green-50 border-green-200 text-green-700";
  };

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-8">

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-2xl font-display font-bold text-slate-900">PR Tracker</h1>
          <p className="text-slate-500 text-sm mt-1">All GitHub Pull Requests opened by CPI</p>
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-4 mb-6"
        >
          {[
            { label: "Open", value: stats.open, icon: <GitPullRequest className="h-5 w-5 text-green-600" />, bg: "bg-green-50 border-green-100", text: "text-green-600" },
            { label: "Merged", value: stats.merged, icon: <GitMerge className="h-5 w-5 text-purple-600" />, bg: "bg-purple-50 border-purple-100", text: "text-purple-600" },
            { label: "Closed", value: stats.closed, icon: <XCircle className="h-5 w-5 text-red-500" />, bg: "bg-red-50 border-red-100", text: "text-red-600" },
          ].map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}
              className={`bg-white rounded-2xl border shadow-card p-5 flex items-center gap-4`}
            >
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${stat.bg}`}>
                {stat.icon}
              </div>
              <div>
                <div className={`text-2xl font-display font-bold ${stat.text}`}>
                  {dataLoading ? "..." : stat.value}
                </div>
                <div className="text-slate-500 text-xs">{stat.label}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {filters.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all capitalize ${
                filter === f
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-indigo-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
              }`}>
              {f} ({f === "ALL" ? prs.length : prs.filter(p => p.status === f).length})
            </button>
          ))}
        </div>

        {/* PR List */}
        {dataLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-20 shimmer rounded-2xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-100 shadow-card">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <GitPullRequest className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="font-display font-bold text-slate-900 mb-2">No PRs yet</h3>
            <p className="text-slate-500 text-sm mb-5">Run a scan to automatically generate fix PRs.</p>
            <button onClick={() => router.push("/scan")}
              className="btn-premium text-white text-sm font-semibold px-5 py-2.5 rounded-xl">
              Run Scan
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((pr, i) => (
              <motion.div key={pr.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bg-white rounded-2xl border border-slate-100 shadow-card p-5 hover:border-indigo-200 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${getStatusStyle(pr.status)}`}>
                      {getStatusIcon(pr.status)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-900 text-sm mb-1 truncate">{pr.pr_title}</h3>
                      <div className="flex items-center flex-wrap gap-2">
                        {pr.severity && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${severityBadge[pr.severity] || severityBadge.LOW}`}>
                            {pr.severity}
                          </span>
                        )}
                        <span className="text-xs text-slate-400 font-mono">
                          {pr.branch_name?.replace("cpi/", "")}
                        </span>
                        <span className="text-xs text-slate-400">
                          {new Date(pr.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${getStatusStyle(pr.status)}`}>
                      {pr.status}
                    </span>
                    {pr.pr_url && (
                      <a href={pr.pr_url} target="_blank" rel="noopener noreferrer"
                        className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 flex items-center justify-center transition-colors">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}