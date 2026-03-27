"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import {
  Shield, Github, Zap, CheckCircle, Circle,
  Loader2, Terminal, ArrowRight, ExternalLink,
  AlertTriangle, Trophy, Settings,
  Lock, Network, Router, Globe, Server
} from "lucide-react";
import confetti from "canvas-confetti";

const steps = [
  { id: "connecting",  label: "Connecting to AWS",    icon: Shield      },
  { id: "scanning",    label: "Scanning Resources",   icon: Zap         },
  { id: "analyzing",   label: "Analyzing with AI",    icon: Zap         },
  { id: "patching",    label: "Generating Patches",   icon: Terminal    },
  { id: "pr_creation", label: "Opening GitHub PRs",   icon: Github      },
  { id: "scoring",     label: "Calculating Score",    icon: Trophy      },
  { id: "completed",   label: "Completed",            icon: CheckCircle },
];

const severityColors: any = {
  CRITICAL: "bg-red-100 text-red-700 border-red-200",
  HIGH:     "bg-orange-100 text-orange-700 border-orange-200",
  MEDIUM:   "bg-yellow-100 text-yellow-700 border-yellow-200",
  LOW:      "bg-slate-100 text-slate-600 border-slate-200",
};

// Categories shown during scan progress
const SCAN_CATEGORIES = [
  { id: "security_groups", label: "Security Groups", icon: Lock,    color: "text-indigo-600", bg: "bg-indigo-50 border-indigo-100" },
  { id: "subnets",         label: "Subnets",         icon: Network, color: "text-blue-600",   bg: "bg-blue-50 border-blue-100"     },
  { id: "route_tables",    label: "Route Tables",    icon: Router,  color: "text-violet-600", bg: "bg-violet-50 border-violet-100" },
  { id: "vpc",             label: "VPC",             icon: Globe,   color: "text-cyan-600",   bg: "bg-cyan-50 border-cyan-100"     },
  { id: "ec2",             label: "EC2",             icon: Server,  color: "text-teal-600",   bg: "bg-teal-50 border-teal-100"     },
];

// Detect which category a log message mentions
function detectLogCategory(msg: string): string | null {
  const m = msg.toLowerCase();
  if (m.includes("security group") || m.includes("sg"))    return "security_groups";
  if (m.includes("subnet"))                                 return "subnets";
  if (m.includes("route table") || m.includes("route"))    return "route_tables";
  if (m.includes("vpc"))                                    return "vpc";
  if (m.includes("ec2") || m.includes("instance") || m.includes("ebs")) return "ec2";
  return null;
}

export default function ScanPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [awsKey,            setAwsKey]            = useState("");
  const [awsSecret,         setAwsSecret]         = useState("");
  const [awsRegion,         setAwsRegion]         = useState("us-east-1");
  const [githubToken,       setGithubToken]       = useState("");
  const [githubRepo,        setGithubRepo]        = useState("");
  const [credentialsLoaded, setCredentialsLoaded] = useState(false);
  const [credentialsLoading,setCredentialsLoading]= useState(true);

  const [scanning,        setScanning]        = useState(false);
  const [currentStep,     setCurrentStep]     = useState(-1);
  const [completedSteps,  setCompletedSteps]  = useState<Set<number>>(new Set());
  const [logs,            setLogs]            = useState<string[]>([]);
  const [error,           setError]           = useState("");
  const [result,          setResult]          = useState<any>(null);
  const [progress,        setProgress]        = useState(0);

  // Category scan tracking
  const [scannedCategories,  setScannedCategories]  = useState<Set<string>>(new Set());
  const [scanningCategory,   setScanningCategory]   = useState<string | null>(null);
  const [categoryFindings,   setCategoryFindings]   = useState<Record<string, number>>({});

  const logsEndRef = useRef<HTMLDivElement>(null);
  const wsRef      = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading]);

  useEffect(() => {
    if (user) loadSavedCredentials();
  }, [user]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const loadSavedCredentials = async () => {
    try {
      const res = await api.get("/connections/get");
      if (res.data && res.data.aws_access_key_id) {
        setAwsKey(res.data.aws_access_key_id || "");
        setAwsSecret(res.data.aws_secret_access_key || "");
        setAwsRegion(res.data.aws_region || "us-east-1");
        setGithubToken(res.data.github_token || "");
        setGithubRepo(res.data.github_repo || "");
        setCredentialsLoaded(true);
      }
    } catch (err) {
      console.error("Failed to load saved credentials", err);
    } finally {
      setCredentialsLoading(false);
    }
  };

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${time}] ${msg}`]);

    // Update category tracking from log content
    const cat = detectLogCategory(msg);
    if (cat) {
      setScanningCategory(cat);
      // If message suggests completion of a category
      if (msg.toLowerCase().includes("found") || msg.toLowerCase().includes("check") || msg.toLowerCase().includes("scan")) {
        setScannedCategories(prev => { const next = new Set(prev); next.add(cat); return next; });
        setScanningCategory(null);
        // Try to parse finding count from log e.g. "Found 3 issues in EC2"
        const match = msg.match(/(\d+)\s*(issue|finding|misconfig)/i);
        if (match) {
          setCategoryFindings(prev => ({
            ...prev,
            [cat]: (prev[cat] || 0) + parseInt(match[1]),
          }));
        }
      }
    }
  };

  const getStepIndex = (stepId: string) => steps.findIndex(s => s.id === stepId);

  const handleScan = async () => {
    if (!awsKey || !awsSecret || !githubToken || !githubRepo) {
      setError("Please fill in all required fields. AWS Secret and GitHub Token are required each time for security.");
      return;
    }
    setError("");
    setScanning(true);
    setLogs([]);
    setResult(null);
    setCurrentStep(0);
    setCompletedSteps(new Set());
    setProgress(0);
    setScannedCategories(new Set());
    setScanningCategory(null);
    setCategoryFindings({});

    const token = localStorage.getItem("cpi_token");
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";
    const ws = new WebSocket(`${wsUrl}/ws/scan`);
    wsRef.current = ws;

    ws.onopen = () => {
      addLog("WebSocket connected. Starting scan...");
      ws.send(JSON.stringify({
        token,
        aws_access_key_id:     awsKey,
        aws_secret_access_key: awsSecret,
        aws_region:            awsRegion,
        github_token:          githubToken,
        github_repo:           githubRepo,
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const stepIdx = getStepIndex(data.step);

      if (data.step === "error") {
        setError(data.message);
        setScanning(false);
        addLog(`Error: ${data.message}`);
        return;
      }

      if (data.step === "completed") {
        setCurrentStep(steps.length - 1);
        setCompletedSteps(new Set(steps.map((_, i) => i)));
        setProgress(100);
        setResult(data.data);
        setScanning(false);
        // Mark all categories as scanned on completion
        setScannedCategories(new Set(SCAN_CATEGORIES.map(c => c.id)));
        setScanningCategory(null);
        addLog("Scan completed successfully");
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ["#6366f1", "#8b5cf6", "#06b6d4", "#22c55e"],
        });
        return;
      }

      // When scanning step starts, begin showing category progress
      if (data.step === "scanning") {
        setScanningCategory("security_groups");
      }

      if (stepIdx >= 0) {
        setCurrentStep(stepIdx);
        setCompletedSteps(prev => {
          const next = new Set(prev);
          for (let i = 0; i < stepIdx; i++) next.add(i);
          return next;
        });
        setProgress(Math.round((stepIdx / (steps.length - 1)) * 95));
      }

      addLog(data.message || `Step: ${data.step}`);
    };

    ws.onerror = () => {
      setError("WebSocket connection failed. Please check backend is running.");
      setScanning(false);
    };

    ws.onclose = () => {
      setScanning(false);
    };
  };

  if (loading || !user) return null;

  // Are we in the scanning step?
  const isInScanStep = scanning && (currentStep === 1);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-8">

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-display font-bold text-slate-900 mb-1">Run Security Scan</h1>
          <p className="text-slate-500 text-sm mb-2">Connect your AWS account and GitHub repo to start the autonomous scan.</p>

          {!credentialsLoading && credentialsLoaded && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-xs font-medium px-3 py-1.5 rounded-lg mb-6"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              Credentials loaded from Settings — just enter your secrets below
            </motion.div>
          )}

          {!credentialsLoading && !credentialsLoaded && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium px-3 py-1.5 rounded-lg mb-6 cursor-pointer hover:bg-amber-100 transition-colors"
              onClick={() => router.push("/settings")}
            >
              <Settings className="h-3.5 w-3.5" />
              Save credentials in Settings to auto-fill this form next time →
            </motion.div>
          )}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left — Credentials */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-6 mb-5">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center">
                    <Shield className="h-4 w-4 text-orange-600" />
                  </div>
                  <h2 className="font-display font-bold text-slate-900">AWS Credentials</h2>
                </div>
                {credentialsLoaded && (
                  <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-lg border border-green-100">✓ Auto-filled</span>
                )}
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-slate-600 text-sm font-medium mb-1.5 block">Access Key ID <span className="text-red-400">*</span></Label>
                  <Input value={awsKey} onChange={e => setAwsKey(e.target.value)}
                    placeholder="AKIAIOSFODNN7EXAMPLE"
                    className="h-10 border-slate-200 rounded-xl focus:border-indigo-400 focus:ring-indigo-400 text-sm" />
                </div>
                <div>
                  <Label className="text-slate-600 text-sm font-medium mb-1.5 block">
                    Secret Access Key <span className="text-red-400">*</span>
                    <span className="text-slate-400 font-normal ml-1">(enter each time for security)</span>
                  </Label>
                  <Input type="password" value={awsSecret} onChange={e => setAwsSecret(e.target.value)}
                    placeholder="••••••••••••••••••••••••"
                    className="h-10 border-slate-200 rounded-xl focus:border-indigo-400 focus:ring-indigo-400 text-sm" />
                </div>
                <div>
                  <Label className="text-slate-600 text-sm font-medium mb-1.5 block">Region</Label>
                  <Input value={awsRegion} onChange={e => setAwsRegion(e.target.value)}
                    placeholder="us-east-1"
                    className="h-10 border-slate-200 rounded-xl focus:border-indigo-400 focus:ring-indigo-400 text-sm" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-6 mb-5">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
                    <Github className="h-4 w-4 text-white" />
                  </div>
                  <h2 className="font-display font-bold text-slate-900">GitHub Connection</h2>
                </div>
                {credentialsLoaded && githubRepo && (
                  <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-lg border border-green-100">✓ Auto-filled</span>
                )}
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-slate-600 text-sm font-medium mb-1.5 block">
                    Personal Access Token <span className="text-red-400">*</span>
                    <span className="text-slate-400 font-normal ml-1">(enter each time for security)</span>
                  </Label>
                  <Input type="password" value={githubToken} onChange={e => setGithubToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    className="h-10 border-slate-200 rounded-xl focus:border-indigo-400 focus:ring-indigo-400 text-sm" />
                </div>
                <div>
                  <Label className="text-slate-600 text-sm font-medium mb-1.5 block">Repository <span className="text-red-400">*</span></Label>
                  <Input value={githubRepo} onChange={e => setGithubRepo(e.target.value)}
                    placeholder="username/repo-name"
                    className="h-10 border-slate-200 rounded-xl focus:border-indigo-400 focus:ring-indigo-400 text-sm" />
                </div>
              </div>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4 flex items-center gap-2"
              >
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {error}
              </motion.div>
            )}

            <button onClick={handleScan} disabled={scanning}
              className="btn-premium w-full text-white font-semibold h-12 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed text-sm"
            >
              {scanning ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Scanning in progress...</>
              ) : (
                <><Zap className="h-4 w-4" />Start Autonomous Scan<ArrowRight className="h-4 w-4" /></>
              )}
            </button>
          </motion.div>

          {/* Right — Progress */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>

            {/* Agent Steps */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-6 mb-5">
              <div className="flex justify-between items-center mb-5">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-indigo-500" />
                  <h2 className="font-display font-bold text-slate-900">Agent Progress</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-xs">{progress}%</span>
                  {scanning && <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />}
                </div>
              </div>

              <div className="h-1.5 bg-slate-100 rounded-full mb-6 overflow-hidden">
                <motion.div
                  className="h-full bg-indigo-gradient rounded-full"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>

              <div className="space-y-1">
                {steps.map((step, i) => {
                  const isDone   = completedSteps.has(i);
                  const isActive = currentStep === i && scanning;
                  return (
                    <div key={step.id}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                        isActive ? "bg-indigo-50 border border-indigo-100" :
                        isDone   ? "bg-green-50/50" : ""
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                        isDone   ? "bg-green-500" :
                        isActive ? "bg-indigo-500" : "bg-slate-100"
                      }`}>
                        {isDone   ? <CheckCircle className="h-4 w-4 text-white" /> :
                         isActive ? <Loader2 className="h-3.5 w-3.5 text-white animate-spin" /> :
                                    <Circle className="h-3.5 w-3.5 text-slate-400" />}
                      </div>
                      <span className={`text-sm font-medium ${
                        isDone   ? "text-green-700" :
                        isActive ? "text-indigo-700" : "text-slate-400"
                      }`}>
                        {step.label}
                      </span>
                      {isActive && <span className="ml-auto text-xs text-indigo-500 animate-pulse">Running...</span>}
                      {isDone   && <span className="ml-auto text-xs text-green-500">Done</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Category Scan Progress — visible during scan */}
            <AnimatePresence>
              {(isInScanStep || scannedCategories.size > 0) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white rounded-2xl border border-slate-100 shadow-card p-5 mb-5"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="h-4 w-4 text-indigo-500" />
                    <span className="text-sm font-bold text-slate-900">Scanning AWS Resources</span>
                    {scanning && (
                      <span className="ml-auto flex items-center gap-1 text-xs text-indigo-500">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                        Live
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {SCAN_CATEGORIES.map(cat => {
                      const Icon      = cat.icon;
                      const isDone    = scannedCategories.has(cat.id);
                      const isActive  = scanningCategory === cat.id;
                      const count     = categoryFindings[cat.id];
                      return (
                        <div key={cat.id}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                            isDone   ? "bg-green-50 border-green-100" :
                            isActive ? `${cat.bg} border-opacity-100` :
                            "bg-slate-50 border-slate-100"
                          }`}
                        >
                          <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${
                            isDone   ? "bg-green-100 border-green-200" :
                            isActive ? cat.bg : "bg-white border-slate-200"
                          }`}>
                            {isDone ? (
                              <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                            ) : isActive ? (
                              <Loader2 className={`h-3.5 w-3.5 ${cat.color} animate-spin`} />
                            ) : (
                              <Icon className="h-3.5 w-3.5 text-slate-300" />
                            )}
                          </div>
                          <span className={`text-sm font-medium flex-1 ${
                            isDone   ? "text-green-700" :
                            isActive ? cat.color : "text-slate-400"
                          }`}>
                            {cat.label}
                          </span>
                          {isDone && count !== undefined && (
                            <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                              {count} found
                            </span>
                          )}
                          {isDone && count === undefined && (
                            <span className="text-xs text-green-500">✓ Done</span>
                          )}
                          {isActive && (
                            <span className="text-xs text-indigo-500 animate-pulse">Scanning...</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Live Logs */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-5 mb-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex gap-1.5">
                  <div className="terminal-dot bg-red-400" />
                  <div className="terminal-dot bg-yellow-400" />
                  <div className="terminal-dot bg-green-400" />
                </div>
                <span className="text-xs text-slate-500 font-medium ml-1">Live Logs</span>
                {scanning && (
                  <div className="ml-auto flex items-center gap-1.5 text-xs text-indigo-500">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                    Live
                  </div>
                )}
              </div>
              <div className="bg-slate-950 rounded-xl p-4 h-32 overflow-y-auto font-mono text-xs">
                {logs.length === 0 ? (
                  <p className="text-slate-500">Waiting to start scan...</p>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className={`mb-0.5 ${
                      log.includes("Error")     ? "text-red-400"    :
                      log.includes("completed") || log.includes("✓") ? "text-green-400" :
                      log.includes("PR opened") ? "text-purple-400" :
                      log.includes("subnet") || log.includes("Subnet")         ? "text-blue-400"   :
                      log.includes("route") || log.includes("Route")           ? "text-violet-400" :
                      log.includes("vpc") || log.includes("VPC")               ? "text-cyan-400"   :
                      log.includes("ec2") || log.includes("EC2")               ? "text-teal-400"   :
                      log.includes("security group") || log.includes("Security Group") ? "text-indigo-400" :
                      "text-slate-300"
                    }`}>
                      {log}
                    </div>
                  ))
                )}
                <div ref={logsEndRef} />
              </div>
            </div>

            {/* Result */}
            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="bg-white rounded-2xl border border-green-200 shadow-card p-6"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 text-white" />
                    </div>
                    <h3 className="font-display font-bold text-slate-900">Scan Complete!</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-center">
                      <div className="text-3xl font-display font-bold text-indigo-600">{result.security_score ?? 100}</div>
                      <div className="text-xs text-slate-500">Security Score</div>
                    </div>
                    <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 text-center">
                      <div className="text-3xl font-display font-bold text-purple-600">{result.prs_opened ?? 0}</div>
                      <div className="text-xs text-slate-500">PRs Opened</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {result.findings_by_severity && Object.entries(result.findings_by_severity).map(([sev, count]: any) => (
                      count > 0 && (
                        <span key={sev} className={`px-2.5 py-1 rounded-full text-xs font-bold border ${severityColors[sev]}`}>
                          {count} {sev}
                        </span>
                      )
                    ))}
                  </div>

                  <button onClick={() => router.push("/results")}
                    className="btn-premium w-full text-white font-semibold h-10 rounded-xl flex items-center justify-center gap-2 text-sm"
                  >
                    View Results
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </main>
    </div>
  );
}