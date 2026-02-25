"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Shield, Github, User, CheckCircle, Loader2 } from "lucide-react";

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
        setAwsKeyId(res.data.aws_access_key_id);
        setAwsRegion(res.data.aws_region || "us-east-1");
        setGithubRepo(res.data.github_repo || "");
      }
    } catch (err) {
      console.error("Load connections error:", err);
    } finally {
      setConnLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    setSaved(false);
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

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <main className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-slate-400 mt-1">Manage your account and connections</p>
        </div>

        {/* Account Info */}
        <Card className="bg-slate-900 border-slate-800 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <User className="h-5 w-5 text-blue-400" />
            <h2 className="font-semibold text-lg">Account</h2>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center py-2 border-b border-slate-800">
              <span className="text-slate-400 text-sm">Email</span>
              <span className="text-white text-sm">{user.email}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-400 text-sm">User ID</span>
              <span className="text-slate-500 text-xs font-mono">{user.user_id}</span>
            </div>
          </div>
        </Card>

        {/* Connections Form */}
        <form onSubmit={handleSave} className="space-y-6">
          {/* AWS */}
          <Card className="bg-slate-900 border-slate-800 p-6">
            <div className="flex items-center gap-3 mb-5">
              <Shield className="h-5 w-5 text-orange-400" />
              <h2 className="font-semibold text-lg">AWS Credentials</h2>
            </div>
            {connLoading ? (
              <div className="flex items-center gap-2 text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading saved credentials...</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label className="text-slate-300">Access Key ID</Label>
                  <Input
                    value={awsKeyId}
                    onChange={(e) => setAwsKeyId(e.target.value)}
                    placeholder="AKIAIOSFODNN7EXAMPLE"
                    className="mt-1.5 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Secret Access Key</Label>
                  <Input
                    type="password"
                    value={awsSecret}
                    onChange={(e) => setAwsSecret(e.target.value)}
                    placeholder="Leave blank to keep existing"
                    className="mt-1.5 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                  />
                  <p className="text-slate-500 text-xs mt-1">Leave blank to keep your existing secret key</p>
                </div>
                <div>
                  <Label className="text-slate-300">Region</Label>
                  <Input
                    value={awsRegion}
                    onChange={(e) => setAwsRegion(e.target.value)}
                    placeholder="us-east-1"
                    className="mt-1.5 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                  />
                </div>
              </div>
            )}
          </Card>

          {/* GitHub */}
          <Card className="bg-slate-900 border-slate-800 p-6">
            <div className="flex items-center gap-3 mb-5">
              <Github className="h-5 w-5 text-white" />
              <h2 className="font-semibold text-lg">GitHub Connection</h2>
            </div>
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Personal Access Token</Label>
                <Input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="Leave blank to keep existing"
                  className="mt-1.5 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                />
                <p className="text-slate-500 text-xs mt-1">Leave blank to keep your existing token</p>
              </div>
              <div>
                <Label className="text-slate-300">Repository</Label>
                <Input
                  value={githubRepo}
                  onChange={(e) => setGithubRepo(e.target.value)}
                  placeholder="username/repo-name"
                  className="mt-1.5 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                />
              </div>
            </div>
          </Card>

          {error && (
            <div className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          {saved && (
            <div className="text-green-400 text-sm bg-green-950 border border-green-800 rounded-lg px-4 py-3 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Settings saved successfully!
            </div>
          )}

          <Button
            type="submit"
            disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : "Save Settings"}
          </Button>
        </form>

        {/* Danger Zone */}
        <Card className="bg-slate-900 border-red-900 p-6 mt-6">
          <h2 className="font-semibold text-lg text-red-400 mb-4">Danger Zone</h2>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-white text-sm font-medium">Sign out</p>
              <p className="text-slate-400 text-xs mt-0.5">Sign out of your account</p>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="border-red-800 text-red-400 hover:bg-red-950"
            >
              Sign Out
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}