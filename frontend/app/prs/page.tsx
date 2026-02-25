"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import { prsAPI } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GitPullRequest, ExternalLink, CheckCircle, GitMerge, XCircle } from "lucide-react";

export default function PRTrackerPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [prs, setPRs] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");

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
      console.error("PRs load error:", err);
    } finally {
      setDataLoading(false);
    }
  };

  const filtered = filter === "ALL" ? prs : prs.filter((p) => p.status === filter);

  const counts = {
    ALL: prs.length,
    open: prs.filter((p) => p.status === "open").length,
    merged: prs.filter((p) => p.status === "merged").length,
    closed: prs.filter((p) => p.status === "closed").length,
  };

  const getStatusIcon = (status: string) => {
    if (status === "merged") return <GitMerge className="h-4 w-4 text-purple-400" />;
    if (status === "closed") return <XCircle className="h-4 w-4 text-red-400" />;
    return <GitPullRequest className="h-4 w-4 text-green-400" />;
  };

  const getStatusBadge = (status: string) => {
    const map: any = {
      open: "bg-green-900 text-green-300",
      merged: "bg-purple-900 text-purple-300",
      closed: "bg-slate-700 text-slate-300",
    };
    return map[status] || "bg-slate-700 text-slate-300";
  };

  const getSeverityColor = (severity: string) => {
    const map: any = {
      CRITICAL: "bg-red-900 text-red-300",
      HIGH: "bg-orange-900 text-orange-300",
      MEDIUM: "bg-yellow-900 text-yellow-300",
      LOW: "bg-slate-700 text-slate-300",
    };
    return map[severity] || "bg-slate-700 text-slate-300";
  };

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">PR Tracker</h1>
          <p className="text-slate-400 mt-1">All GitHub Pull Requests opened by CPI</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Open", count: counts.open, color: "text-green-400" },
            { label: "Merged", count: counts.merged, color: "text-purple-400" },
            { label: "Closed", count: counts.closed, color: "text-slate-400" },
          ].map((stat) => (
            <Card key={stat.label} className="bg-slate-900 border-slate-800 p-4 text-center">
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.count}</div>
              <div className="text-slate-400 text-sm">{stat.label}</div>
            </Card>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          {["ALL", "open", "merged", "closed"].map((status) => (
            <Button
              key={status}
              size="sm"
              variant={filter === status ? "default" : "outline"}
              onClick={() => setFilter(status)}
              className={filter === status
                ? "bg-blue-600 hover:bg-blue-700"
                : "border-slate-700 text-slate-400 hover:text-white"
              }
            >
              {status.charAt(0).toUpperCase() + status.slice(1)} ({counts[status as keyof typeof counts]})
            </Button>
          ))}
        </div>

        {/* PR List */}
        {dataLoading ? (
          <p className="text-slate-400">Loading PRs...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <GitPullRequest className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No PRs yet</h2>
            <p className="text-slate-400 mb-6">Run a scan to automatically generate fix PRs.</p>
            <Button
              onClick={() => router.push("/scan")}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Run Scan
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((pr) => (
              <Card key={pr.id} className="bg-slate-900 border-slate-800 p-5">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-0.5">{getStatusIcon(pr.status)}</div>
                    <div className="flex-1">
                      <p className="font-medium text-white">{pr.pr_title || `Fix #${pr.pr_number}`}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <Badge className={getStatusBadge(pr.status)}>{pr.status}</Badge>
                        {pr.severity && (
                          <Badge className={getSeverityColor(pr.severity)}>{pr.severity}</Badge>
                        )}
                        <span className="text-xs text-slate-500">
                          {new Date(pr.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {pr.branch_name && (
                        <p className="text-xs text-slate-500 font-mono mt-1">{pr.branch_name}</p>
                      )}
                    </div>
                  </div>
                  <a href={pr.pr_url} target="_blank" rel="noopener noreferrer">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-slate-700 text-slate-300 hover:text-white flex items-center gap-1 shrink-0"
                    >
                      <ExternalLink className="h-3 w-3" />
                      PR #{pr.pr_number}
                    </Button>
                  </a>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}