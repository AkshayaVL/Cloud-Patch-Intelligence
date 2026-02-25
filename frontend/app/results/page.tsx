"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import { resultsAPI } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle, CheckCircle, Shield,
  ExternalLink, ChevronDown, ChevronUp
} from "lucide-react";

const severityConfig: any = {
  CRITICAL: { color: "bg-red-900 text-red-300", border: "border-red-800" },
  HIGH: { color: "bg-orange-900 text-orange-300", border: "border-orange-800" },
  MEDIUM: { color: "bg-yellow-900 text-yellow-300", border: "border-yellow-800" },
  LOW: { color: "bg-slate-700 text-slate-300", border: "border-slate-600" },
};

function FindingCard({ finding }: { finding: any }) {
  const [expanded, setExpanded] = useState(false);
  const sev = severityConfig[finding.severity] || severityConfig.LOW;

  return (
    <Card className={`bg-slate-900 border ${sev.border} p-5`}>
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Badge className={sev.color}>{finding.severity}</Badge>
            <span className="text-xs text-slate-500 font-mono">{finding.check_id}</span>
          </div>
          <h3 className="font-semibold text-white">{finding.check_title}</h3>
          <p className="text-sm text-slate-400 mt-1">
            {finding.resource_type} — <span className="font-mono text-slate-300">{finding.resource_id}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {finding.pr_url && (
            <a href={finding.pr_url} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="border-slate-700 text-slate-300 hover:text-white flex items-center gap-1 text-xs">
                <ExternalLink className="h-3 w-3" />
                View PR
              </Button>
            </a>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setExpanded(!expanded)}
            className="text-slate-400 hover:text-white"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 space-y-3 border-t border-slate-800 pt-4">
          {finding.explanation && (
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase mb-1">Explanation</p>
              <p className="text-sm text-slate-300">{finding.explanation}</p>
            </div>
          )}
          {finding.risk_description && (
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase mb-1">Risk</p>
              <p className="text-sm text-slate-300">{finding.risk_description}</p>
            </div>
          )}
          {finding.compliance_references && (
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase mb-1">Compliance</p>
              <p className="text-sm text-slate-300">{finding.compliance_references}</p>
            </div>
          )}
          {finding.terraform_patch && (
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase mb-1">Terraform Fix</p>
              <pre className="bg-slate-950 rounded-lg p-4 text-xs text-green-300 overflow-x-auto whitespace-pre-wrap">
                {finding.terraform_patch}
              </pre>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export default function ResultsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [findings, setFindings] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");

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
      console.error("Results load error:", err);
    } finally {
      setDataLoading(false);
    }
  };

  const filtered = filter === "ALL"
    ? findings
    : findings.filter((f) => f.severity === filter);

  const counts = {
    ALL: findings.length,
    CRITICAL: findings.filter((f) => f.severity === "CRITICAL").length,
    HIGH: findings.filter((f) => f.severity === "HIGH").length,
    MEDIUM: findings.filter((f) => f.severity === "MEDIUM").length,
    LOW: findings.filter((f) => f.severity === "LOW").length,
  };

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Scan Results</h1>
            <p className="text-slate-400 mt-1">All misconfigurations found across your scans</p>
          </div>
          <Button
            onClick={() => router.push("/scan")}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Run New Scan
          </Button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((sev) => (
            <Button
              key={sev}
              size="sm"
              variant={filter === sev ? "default" : "outline"}
              onClick={() => setFilter(sev)}
              className={filter === sev
                ? "bg-blue-600 hover:bg-blue-700"
                : "border-slate-700 text-slate-400 hover:text-white"
              }
            >
              {sev} ({counts[sev as keyof typeof counts]})
            </Button>
          ))}
        </div>

        {/* Findings */}
        {dataLoading ? (
          <p className="text-slate-400">Loading findings...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              {findings.length === 0 ? "No scans yet" : "No findings for this filter"}
            </h2>
            <p className="text-slate-400 mb-6">
              {findings.length === 0
                ? "Run your first scan to see results here."
                : "Try selecting a different severity filter."}
            </p>
            {findings.length === 0 && (
              <Button
                onClick={() => router.push("/scan")}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Run First Scan
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((finding) => (
              <FindingCard key={finding.id} finding={finding} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}