"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import { scoreAPI, scanAPI, prsAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Scan, GitPullRequest, AlertTriangle, CheckCircle, Clock } from "lucide-react";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [score, setScore] = useState<number | null>(null);
  const [scans, setScans] = useState<any[]>([]);
  const [prs, setPRs] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      const [scoreRes, scansRes, prsRes] = await Promise.all([
        scoreAPI.getLatest(),
        scanAPI.history(),
        prsAPI.getAll(),
      ]);
      setScore(scoreRes.data.score ?? 100);
      setScans(scansRes.data.slice(0, 5));
      setPRs(prsRes.data.slice(0, 5));
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setDataLoading(false);
    }
  };

  const getScoreColor = (s: number) => {
    if (s >= 80) return "text-green-400";
    if (s >= 50) return "text-yellow-400";
    return "text-red-400";
  };

  const getStatusBadge = (status: string) => {
    const map: any = {
      completed: <Badge className="bg-green-900 text-green-300">Completed</Badge>,
      running: <Badge className="bg-blue-900 text-blue-300">Running</Badge>,
      failed: <Badge className="bg-red-900 text-red-300">Failed</Badge>,
      pending: <Badge className="bg-slate-700 text-slate-300">Pending</Badge>,
    };
    return map[status] || <Badge>{status}</Badge>;
  };

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-slate-400 mt-1">Your cloud security overview</p>
          </div>
          <Link href="/scan">
            <Button className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2">
              <Scan className="h-4 w-4" />
              Run New Scan
            </Button>
          </Link>
        </div>

        {/* Score + Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-slate-900 border-slate-800 p-6 flex flex-col items-center justify-center md:col-span-1">
            <Shield className="h-8 w-8 text-blue-400 mb-2" />
            <div className={`text-5xl font-bold ${getScoreColor(score ?? 100)}`}>
              {dataLoading ? "..." : score ?? 100}
            </div>
            <div className="text-slate-400 text-sm mt-1">Security Score</div>
          </Card>

          <Card className="bg-slate-900 border-slate-800 p-6">
            <div className="flex items-center gap-3 mb-2">
              <Scan className="h-5 w-5 text-blue-400" />
              <span className="text-slate-400 text-sm">Total Scans</span>
            </div>
            <div className="text-3xl font-bold">{dataLoading ? "..." : scans.length}</div>
          </Card>

          <Card className="bg-slate-900 border-slate-800 p-6">
            <div className="flex items-center gap-3 mb-2">
              <GitPullRequest className="h-5 w-5 text-green-400" />
              <span className="text-slate-400 text-sm">PRs Opened</span>
            </div>
            <div className="text-3xl font-bold">{dataLoading ? "..." : prs.length}</div>
          </Card>

          <Card className="bg-slate-900 border-slate-800 p-6">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="h-5 w-5 text-purple-400" />
              <span className="text-slate-400 text-sm">PRs Merged</span>
            </div>
            <div className="text-3xl font-bold">
              {dataLoading ? "..." : prs.filter((p) => p.status === "merged").length}
            </div>
          </Card>
        </div>

        {/* Recent Scans */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-slate-900 border-slate-800 p-6">
            <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-slate-400" />
              Recent Scans
            </h2>
            {dataLoading ? (
              <p className="text-slate-400 text-sm">Loading...</p>
            ) : scans.length === 0 ? (
              <div className="text-center py-8">
                <AlertTriangle className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">No scans yet</p>
                <Link href="/scan">
                  <Button size="sm" className="mt-3 bg-blue-600 hover:bg-blue-700">
                    Run First Scan
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {scans.map((scan) => (
                  <div key={scan.id} className="flex justify-between items-center py-2 border-b border-slate-800 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{scan.total_issues} issues found</p>
                      <p className="text-xs text-slate-500">
                        {new Date(scan.started_at).toLocaleDateString()}
                      </p>
                    </div>
                    {getStatusBadge(scan.status)}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Recent PRs */}
          <Card className="bg-slate-900 border-slate-800 p-6">
            <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <GitPullRequest className="h-5 w-5 text-slate-400" />
              Recent Pull Requests
            </h2>
            {dataLoading ? (
              <p className="text-slate-400 text-sm">Loading...</p>
            ) : prs.length === 0 ? (
              <div className="text-center py-8">
                <GitPullRequest className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">No PRs opened yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {prs.map((pr) => (
                  <div key={pr.id} className="flex justify-between items-center py-2 border-b border-slate-800 last:border-0">
                    <div className="flex-1 mr-4">
                      <p className="text-sm font-medium truncate">{pr.pr_title}</p>
                      <a href={pr.pr_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:underline">
                        View PR #{pr.pr_number}
                      </a>
                    </div>
                    <Badge className={
                      pr.status === "merged" ? "bg-purple-900 text-purple-300" :
                      pr.status === "open" ? "bg-green-900 text-green-300" :
                      "bg-slate-700 text-slate-300"
                    }>
                      {pr.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}