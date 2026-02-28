"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Shield, Github, User, CheckCircle,
  Loader2, LogOut, Key, Globe, AlertTriangle
} from "lucide-react";

export default function SettingsPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  const [awsKeyId, setAwsKeyId] = useState("");
  const [awsSecret, setAwsSecret] = useState("");
  const [awsRegion, setAwsRegion] = useState("us-east-1");
  const [githubToken, setGithubToken] = useState("");
  const [githubRepo, setGithubRepo] = useState("");

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [connLoading, setConnLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading]);

  useEffect(() => {
    if (user) loadConnections();
  }, [user]);

  const loadConnections = async () => {
    try {
      const res = await api.get("/connections/get");
      if (res.data && res.data.aws_access_key_id) {
        setAwsKeyId(res.data.aws_access_key_id || "");
        setAwsSecret(res.data.aws_secret_access_key || "");
        setAwsRegion(res.data.aws_region || "us-east-1");
        setGithubToken(res.data.github_token || "");
        setGithubRepo(res.data.github_repo || "");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setConnLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSaving(true); setSaved(false);
    try {
      await api.post("/connections/save", {
        aws_access_key_id: awsKeyId,
        aws_secret_access_key: awsSecret,
        aws_region: awsRegion,
        github_token: githubToken,
        github_repo: githubRepo,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-2xl mx-auto px-6 py-8">

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-2xl font-display font-bold text-slate-900">Settings</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your account and integrations</p>
        </motion.div>

        {/* Account Card */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-slate-100 shadow-card p-6 mb-5"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
              <User className="h-4 w-4 text-indigo-600" />
            </div>
            <h2 className="font-display font-bold text-slate-900">Account</h2>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between items-center py-3 border-b border-slate-100">
              <span className="text-slate-500 text-sm">Email</span>
              <span className="text-slate-900 text-sm font-medium">{user.email}</span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-slate-500 text-sm">User ID</span>
              <span className="text-slate-400 text-xs font-mono bg-slate-50 px-2 py-1 rounded-lg">{user.user_id?.slice(0, 16)}...</span>
            </div>
          </div>
        </motion.div>

        <form onSubmit={handleSave} className="space-y-5">
          {/* AWS Card */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-card p-6"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center">
                <Shield className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <h2 className="font-display font-bold text-slate-900">AWS Credentials</h2>
                <p className="text-xs text-slate-400">Used for scanning your infrastructure</p>
              </div>
            </div>
            {connLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-10 shimmer rounded-xl" />)}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label className="text-slate-600 text-sm font-medium mb-1.5 block flex items-center gap-1.5">
                    <Key className="h-3.5 w-3.5" /> Access Key ID
                  </Label>
                  <Input value={awsKeyId} onChange={e => setAwsKeyId(e.target.value)}
                    placeholder="AKIAIOSFODNN7EXAMPLE"
                    className="h-10 border-slate-200 rounded-xl focus:border-indigo-400 text-sm" />
                </div>
                <div>
                  <Label className="text-slate-600 text-sm font-medium mb-1.5 block flex items-center gap-1.5">
                    <Key className="h-3.5 w-3.5" /> Secret Access Key
                  </Label>
                  <Input type="password" value={awsSecret} onChange={e => setAwsSecret(e.target.value)}
                    placeholder="••••••••••••••••••••••••"
                    className="h-10 border-slate-200 rounded-xl focus:border-indigo-400 text-sm" />
                </div>
                <div>
                  <Label className="text-slate-600 text-sm font-medium mb-1.5 block flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5" /> Region
                  </Label>
                  <Input value={awsRegion} onChange={e => setAwsRegion(e.target.value)}
                    placeholder="us-east-1"
                    className="h-10 border-slate-200 rounded-xl focus:border-indigo-400 text-sm" />
                </div>
              </div>
            )}
          </motion.div>

          {/* GitHub Card */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-card p-6"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center">
                <Github className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="font-display font-bold text-slate-900">GitHub Connection</h2>
                <p className="text-xs text-slate-400">Used for opening pull requests</p>
              </div>
            </div>
            {connLoading ? (
              <div className="space-y-3">
                {[1, 2].map(i => <div key={i} className="h-10 shimmer rounded-xl" />)}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label className="text-slate-600 text-sm font-medium mb-1.5 block">Personal Access Token</Label>
                  <Input type="password" value={githubToken} onChange={e => setGithubToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    className="h-10 border-slate-200 rounded-xl focus:border-indigo-400 text-sm" />
                </div>
                <div>
                  <Label className="text-slate-600 text-sm font-medium mb-1.5 block">Repository</Label>
                  <Input value={githubRepo} onChange={e => setGithubRepo(e.target.value)}
                    placeholder="username/repo-name"
                    className="h-10 border-slate-200 rounded-xl focus:border-indigo-400 text-sm" />
                </div>
              </div>
            )}
          </motion.div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {saved && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4 shrink-0" />
              Settings saved successfully!
            </motion.div>
          )}

          <button type="submit" disabled={saving}
            className="btn-premium w-full text-white font-semibold h-11 rounded-xl flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {saving ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
            ) : (
              <><CheckCircle className="h-4 w-4" /> Save Settings</>
            )}
          </button>
        </form>

        {/* Danger Zone */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl border border-red-100 shadow-card p-6 mt-5"
        >
          <h2 className="font-display font-bold text-red-600 mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Danger Zone
          </h2>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-slate-900 text-sm font-medium">Sign out of CPI</p>
              <p className="text-slate-400 text-xs mt-0.5">You'll need to sign in again to access your data</p>
            </div>
            <button onClick={() => { logout(); router.push("/"); }}
              className="flex items-center gap-2 text-red-600 font-semibold text-sm px-4 py-2 rounded-xl border border-red-200 hover:bg-red-50 transition-colors">
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}