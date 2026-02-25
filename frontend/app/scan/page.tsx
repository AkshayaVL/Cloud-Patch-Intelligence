"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Scan, CheckCircle, AlertTriangle, Loader2,
  Shield, GitPullRequest, Zap, ChevronRight
} from "lucide-react";

const STEPS = [
  { key: "connecting", label: "Connecting to AWS" },
  { key: "scanning", label: "Scanning Resources" },
  { key: "analyzing", label: "Analyzing with AI" },
  { key: "patching", label: "Generating Patches" },
  { key: "pr_creation", label: "Opening GitHub PRs" },
  { key: "scoring", label: "Calculating Score" },
  { key: "completed", label: "Completed" },
];

export default function ScanPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();

  const [awsKeyId, setAwsKeyId] = useState("");
  const [awsSecret, setAwsSecret] = useState("");
  const [awsRegion, setAwsRegion] = useState("us-east-1");
  const [githubToken, setGithubToken] = useState("");
  const [githubRepo, setGithubRepo] = useState("");

  const [scanning, setScanning] = useState(false);
  const [currentStep, setCurrentStep] = useState("");
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [scanComplete, setScanComplete] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [error, setError] = useState("");

  const wsRef = useRef<WebSocket | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const getStepIndex = (step: string) => {
    return STEPS.findIndex((s) => s.key === step);
  };

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const startScan = () => {
    if (!awsKeyId || !awsSecret || !githubToken || !githubRepo) {
      setError("Please fill in all fields before scanning.");
      return;
    }

    setError("");
    setScanning(true);
    setScanComplete(false);
    setLogs([]);
    setProgress(0);
    setCurrentStep("connecting");

    const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";
    const ws = new WebSocket(`${WS_URL}/ws/scan`);
    wsRef.current = ws;

    ws.onopen = () => {
      addLog("WebSocket connected. Starting scan...");
      ws.send(JSON.stringify({
        token,
        aws_access_key_id: awsKeyId,
        aws_secret_access_key: awsSecret,
        aws_region: awsRegion,
        github_token: githubToken,
        github_repo: githubRepo,
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const { step, message, data: eventData } = data;

      setCurrentStep(step);
      addLog(message);

      const stepIdx = getStepIndex(step);
      if (stepIdx >= 0) {
        setProgress(Math.round(((stepIdx + 1) / STEPS.length) * 100));
      }

      if (step === "completed") {
        setScanComplete(true);
        setScanResult(eventData);
        setScanning(false);
        setProgress(100);
      }

      if (step === "error") {
        setError(message);
        setScanning(false);
      }
    };

    ws.onerror = () => {
      setError("WebSocket connection failed. Make sure the backend is running.");
      setScanning(false);
    };

    ws.onclose = () => {
      if (!scanComplete) {
        setScanning(false);
      }
    };
  };

  const stopScan = () => {
    wsRef.current?.close();
    setScanning(false);
    addLog("Scan cancelled by user.");
  };

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Run Security Scan</h1>
          <p className="text-slate-400 mt-1">
            Connect your AWS account and GitHub repo to start the autonomous scan.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left — Credentials */}
          <div className="space-y-4">
            <Card className="bg-slate-900 border-slate-800 p-6">
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5 text-orange-400" />
                AWS Credentials
              </h2>
              <div className="space-y-3">
                <div>
                  <Label className="text-slate-300 text-sm">Access Key ID</Label>
                  <Input
                    value={awsKeyId}
                    onChange={(e) => setAwsKeyId(e.target.value)}
                    placeholder="AKIAIOSFODNN7EXAMPLE"
                    disabled={scanning}
                    className="mt-1 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-slate-300 text-sm">Secret Access Key</Label>
                  <Input
                    type="password"
                    value={awsSecret}
                    onChange={(e) => setAwsSecret(e.target.value)}
                    placeholder="••••••••••••••••"
                    disabled={scanning}
                    className="mt-1 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-slate-300 text-sm">Region</Label>
                  <Input
                    value={awsRegion}
                    onChange={(e) => setAwsRegion(e.target.value)}
                    placeholder="us-east-1"
                    disabled={scanning}
                    className="mt-1 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 text-sm"
                  />
                </div>
              </div>
            </Card>

            <Card className="bg-slate-900 border-slate-800 p-6">
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <GitPullRequest className="h-5 w-5 text-white" />
                GitHub
              </h2>
              <div className="space-y-3">
                <div>
                  <Label className="text-slate-300 text-sm">Personal Access Token</Label>
                  <Input
                    type="password"
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxx"
                    disabled={scanning}
                    className="mt-1 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-slate-300 text-sm">Repository</Label>
                  <Input
                    value={githubRepo}
                    onChange={(e) => setGithubRepo(e.target.value)}
                    placeholder="username/repo-name"
                    disabled={scanning}
                    className="mt-1 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 text-sm"
                  />
                </div>
              </div>
            </Card>

            {error && (
              <div className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            {!scanning ? (
              <Button
                onClick={startScan}
                className="w-full bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
                size="lg"
              >
                <Scan className="h-5 w-5" />
                Start Autonomous Scan
              </Button>
            ) : (
              <Button
                onClick={stopScan}
                variant="outline"
                className="w-full border-red-700 text-red-400 hover:bg-red-950"
                size="lg"
              >
                Cancel Scan
              </Button>
            )}
          </div>

          {/* Right — Progress */}
          <div className="space-y-4">
            <Card className="bg-slate-900 border-slate-800 p-6">
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-400" />
                Agent Progress
              </h2>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between text-sm text-slate-400 mb-2">
                  <span>{scanning ? "Scanning..." : scanComplete ? "Complete!" : "Ready"}</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              {/* Steps */}
              <div className="space-y-2">
                {STEPS.map((step, idx) => {
                  const currentIdx = getStepIndex(currentStep);
                  const isDone = currentIdx > idx || scanComplete;
                  const isActive = currentStep === step.key && scanning;

                  return (
                    <div
                      key={step.key}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                        isActive ? "bg-blue-950 border border-blue-800" :
                        isDone ? "text-slate-400" : "text-slate-600"
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle className="h-4 w-4 text-green-400 shrink-0" />
                      ) : isActive ? (
                        <Loader2 className="h-4 w-4 text-blue-400 animate-spin shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0" />
                      )}
                      {step.label}
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Logs */}
            <Card className="bg-slate-900 border-slate-800 p-4">
              <h3 className="text-sm font-medium text-slate-400 mb-3">Live Logs</h3>
              <div className="bg-slate-950 rounded-lg p-3 h-48 overflow-y-auto font-mono text-xs text-slate-300 space-y-1">
                {logs.length === 0 ? (
                  <p className="text-slate-600">Logs will appear here when scan starts...</p>
                ) : (
                  logs.map((log, i) => <div key={i}>{log}</div>)
                )}
                <div ref={logsEndRef} />
              </div>
            </Card>

            {/* Scan Results Summary */}
            {scanComplete && scanResult && (
              <Card className="bg-green-950 border-green-800 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <h3 className="font-semibold text-green-300">Scan Complete!</h3>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-slate-900 rounded-lg p-3">
                    <div className="text-slate-400">Security Score</div>
                    <div className="text-2xl font-bold text-green-400">{scanResult.score}/100</div>
                  </div>
                  <div className="bg-slate-900 rounded-lg p-3">
                    <div className="text-slate-400">PRs Opened</div>
                    <div className="text-2xl font-bold text-blue-400">{scanResult.prs_opened}</div>
                  </div>
                </div>
                {scanResult.severity_counts && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {Object.entries(scanResult.severity_counts).map(([sev, count]: any) => (
                      count > 0 && (
                        <Badge key={sev} className={
                          sev === "CRITICAL" ? "bg-red-900 text-red-300" :
                          sev === "HIGH" ? "bg-orange-900 text-orange-300" :
                          sev === "MEDIUM" ? "bg-yellow-900 text-yellow-300" :
                          "bg-slate-700 text-slate-300"
                        }>
                          {count} {sev}
                        </Badge>
                      )
                    ))}
                  </div>
                )}
                <Button
                  className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
                  onClick={() => router.push("/results")}
                >
                  View Results
                </Button>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}