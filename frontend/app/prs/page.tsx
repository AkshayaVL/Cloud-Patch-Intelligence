"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import { prsAPI } from "@/lib/api";
import {
  GitPullRequest, GitMerge, XCircle, ExternalLink,
  Lock, Network, Router, Globe, Server, Shield
} from "lucide-react";

const severityBadge: any = {
  CRITICAL: "bg-red-100 text-red-700 border-red-200",
  HIGH:     "bg-orange-100 text-orange-700 border-orange-200",
  MEDIUM:   "bg-yellow-100 text-yellow-700 border-yellow-200",
  LOW:      "bg-slate-100 text-slate-600 border-slate-200",
};

// Detect category from PR title or branch name
function detectPRCategory(pr: any): string {
  const title  = (pr.pr_title   || "").toLowerCase();
  const branch = (pr.branch_name || "").toLowerCase();
  const text   = title + " " + branch;

  if (text.includes("security group") || text.includes("sg"))           return "Security Groups";
  if (text.includes("subnet"))                                           return "Subnets";
  if (text.includes("route table") || text.includes("route"))           return "Route Tables";
  if (text.includes("vpc"))                                              return "VPC";
  if (text.includes("ec2") || text.includes("instance") || text.includes("ebs")) return "EC2";
  return "Other";
}

const CATEGORY_META: Record<string, { icon: any; badge: string; iconColor: string }> = {
  "Security Groups": { icon: Lock,    badge: "bg-indigo-50 border-indigo-200 text-indigo-700", iconColor: "text-indigo-600" },
  "Subnets":         { icon: Network, badge: "bg-blue-50 border-blue-200 text-blue-700",       iconColor: "text-blue-600"   },
  "Route Tables":    { icon: Router,  badge: "bg-violet-50 border-violet-200 text-violet-700", iconColor: "text-violet-600" },
  "VPC":             { icon: Globe,   badge: "bg-cyan-50 border-cyan-200 text-cyan-700",       iconColor: "text-cyan-600"   },
  "EC2":             { icon: Server,  badge: "bg-teal-50 border-teal-200 text-teal-700",       iconColor: "text-teal-600"   },
  "Other":           { icon: Shield,  badge: "bg-slate-100 border-slate-200 text-slate-600",   iconColor: "text-slate-500"  },
};

const STATUS_FILTERS  = ["ALL", "open", "merged", "closed"];
const CATEGORY_FILTERS = ["All", "Security Groups", "Subnets", "Route Tables", "VPC", "EC2"];

function CategoryBadge({ category }: { category: string }) {
  const cfg  = CATEGORY_META[category] || CATEGORY_META["Other"];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.badge}`}>
      <Icon className="h-3 w-3" />
      {category}
    </span>
  );
}

export default function PRsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [prs,            setPRs]           = useState<any[]>([]);
  const [statusFilter,   setStatusFilter]  = useState("ALL");
  const [categoryFilter, setCategoryFilter]= useState("All");
  const [dataLoading,    setDataLoading]   = useState(true);

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

  // Attach category to each PR
  const prsWithCategory = prs.map(p => ({ ...p, _category: detectPRCategory(p) }));

  // Status counts (across all)
  const stats = {
    open:   prs.filter(p => p.status === "open").length,
    merged: prs.filter(p => p.status === "merged").length,
    closed: prs.filter(p => p.status === "closed").length,
  };

  // Category counts (across all)
  const categoryCounts: Record<string, number> = { All: prs.length };
  CATEGORY_FILTERS.slice(1).forEach(c => {
    categoryCounts[c] = prsWithCategory.filter(p => p._category === c).length;
  });

  // Apply filters
  const afterCategory = categoryFilter === "All"
    ? prsWithCategory
    : prsWithCategory.filter(p => p._category === categoryFilter);

  const filtered = statusFilter === "ALL"
    ? afterCategory
    : afterCategory.filter(p => p.status === statusFilter);

  // Status counts scoped to current category filter
  const scopedStatusCounts: any = { ALL: afterCategory.length };
  ["open", "merged", "closed"].forEach(s => {
    scopedStatusCounts[s] = afterCategory.filter(p => p.status === s).length;
  });

  const getStatusIcon = (status: string) => {
    if (status === "merged") return <GitMerge      className="h-4 w-4 text-purple-600" />;
    if (status === "closed") return <XCircle       className="h-4 w-4 text-red-500"    />;
    return                          <GitPullRequest className="h-4 w-4 text-green-600" />;
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

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-2xl font-display font-bold text-slate-900">PR Tracker</h1>
          <p className="text-slate-500 text-sm mt-1">All GitHub Pull Requests opened by CPI</p>
        </motion.div>

        {/* Status Stats */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-4 mb-6"
        >
          {[
            { label: "Open",   value: stats.open,   icon: <GitPullRequest className="h-5 w-5 text-green-600"  />, bg: "bg-green-50 border-green-100",  text: "text-green-600"  },
            { label: "Merged", value: stats.merged, icon: <GitMerge       className="h-5 w-5 text-purple-600" />, bg: "bg-purple-50 border-purple-100", text: "text-purple-600" },
            { label: "Closed", value: stats.closed, icon: <XCircle        className="h-5 w-5 text-red-500"    />, bg: "bg-red-50 border-red-100",       text: "text-red-600"    },
          ].map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              className="bg-white rounded-2xl border shadow-card p-5 flex items-center gap-4"
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

        {/* Category Stats Bar */}
        {!dataLoading && prs.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="grid grid-cols-5 gap-3 mb-6"
          >
            {CATEGORY_FILTERS.slice(1).map(cat => {
              const cfg  = CATEGORY_META[cat];
              const Icon = cfg.icon;
              const count   = categoryCounts[cat] ?? 0;
              const isActive = categoryFilter === cat;
              return (
                <button key={cat} onClick={() => setCategoryFilter(isActive ? "All" : cat)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    isActive
                      ? "bg-white border-indigo-300 shadow-md shadow-indigo-100"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg border flex items-center justify-center mb-2 ${cfg.badge}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="text-lg font-bold text-slate-900">{count}</div>
                  <div className="text-xs text-slate-500 leading-tight">{cat}</div>
                </button>
              );
            })}
          </motion.div>
        )}

        {/* Category Filter Pills */}
        <div className="flex flex-wrap gap-2 mb-3">
          {CATEGORY_FILTERS.map(cat => (
            <button key={cat} onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                categoryFilter === cat
                  ? "bg-slate-800 text-white border-slate-800"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
              }`}>
              {cat} ({categoryCounts[cat] ?? 0})
            </button>
          ))}
        </div>

        {/* Status Filter Pills */}
        <div className="flex flex-wrap gap-2 mb-6">
          {STATUS_FILTERS.map(f => (
            <button key={f} onClick={() => setStatusFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all capitalize ${
                statusFilter === f
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
              }`}>
              {f} ({scopedStatusCounts[f] ?? 0})
            </button>
          ))}
        </div>

        {/* PR List */}
        {dataLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-20 animate-pulse bg-slate-200 rounded-2xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-100 shadow-card">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <GitPullRequest className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="font-display font-bold text-slate-900 mb-2">
              {prs.length === 0 ? "No PRs yet" : "No PRs match this filter"}
            </h3>
            <p className="text-slate-500 text-sm mb-5">
              {prs.length === 0 ? "Run a scan to automatically generate fix PRs." : "Try adjusting the category or status filters."}
            </p>
            {prs.length === 0 && (
              <button onClick={() => router.push("/scan")}
                className="btn-premium text-white text-sm font-semibold px-5 py-2.5 rounded-xl">
                Run Scan
              </button>
            )}
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
                      <h3 className="font-semibold text-slate-900 text-sm mb-1.5 truncate">{pr.pr_title}</h3>
                      <div className="flex items-center flex-wrap gap-2">
                        {pr.severity && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${severityBadge[pr.severity] || severityBadge.LOW}`}>
                            {pr.severity}
                          </span>
                        )}
                        <CategoryBadge category={pr._category} />
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