"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Shield, Github, CheckCircle } from "lucide-react";

export default function ConnectPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [awsKeyId, setAwsKeyId] = useState("");
  const [awsSecret, setAwsSecret] = useState("");
  const [awsRegion, setAwsRegion] = useState("us-east-1");
  const [githubToken, setGithubToken] = useState("");
  const [githubRepo, setGithubRepo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/connections/save", {
        aws_access_key_id: awsKeyId,
        aws_secret_access_key: awsSecret,
        aws_region: awsRegion,
        github_token: githubToken,
        github_repo: githubRepo,
      });
      setSuccess(true);
      setTimeout(() => router.push("/dashboard"), 1500);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to save connections.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <main className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Connect Your Accounts</h1>
          <p className="text-slate-400 mt-2">
            Connect your AWS account and GitHub repository to start scanning.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* AWS Section */}
          <Card className="bg-slate-900 border-slate-800 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="h-6 w-6 text-orange-400" />
              <h2 className="text-lg font-semibold">AWS Credentials</h2>
            </div>
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Access Key ID</Label>
                <Input
                  value={awsKeyId}
                  onChange={(e) => setAwsKeyId(e.target.value)}
                  placeholder="AKIAIOSFODNN7EXAMPLE"
                  required
                  className="mt-1.5 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                />
              </div>
              <div>
                <Label className="text-slate-300">Secret Access Key</Label>
                <Input
                  type="password"
                  value={awsSecret}
                  onChange={(e) => setAwsSecret(e.target.value)}
                  placeholder="••••••••••••••••••••"
                  required
                  className="mt-1.5 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                />
              </div>
              <div>
                <Label className="text-slate-300">AWS Region</Label>
                <Input
                  value={awsRegion}
                  onChange={(e) => setAwsRegion(e.target.value)}
                  placeholder="us-east-1"
                  className="mt-1.5 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                />
              </div>
            </div>
            <p className="text-slate-500 text-xs mt-4">
              Use a read-only IAM user with SecurityAudit and ReadOnlyAccess policies.
            </p>
          </Card>

          {/* GitHub Section */}
          <Card className="bg-slate-900 border-slate-800 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Github className="h-6 w-6 text-white" />
              <h2 className="text-lg font-semibold">GitHub Connection</h2>
            </div>
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Personal Access Token</Label>
                <Input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  required
                  className="mt-1.5 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                />
              </div>
              <div>
                <Label className="text-slate-300">Repository Name</Label>
                <Input
                  value={githubRepo}
                  onChange={(e) => setGithubRepo(e.target.value)}
                  placeholder="username/repository-name"
                  required
                  className="mt-1.5 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                />
              </div>
            </div>
            <p className="text-slate-500 text-xs mt-4">
              Token needs repo scope. Format: owner/repo-name
            </p>
          </Card>

          {error && (
            <div className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          {success && (
            <div className="text-green-400 text-sm bg-green-950 border border-green-800 rounded-lg px-4 py-3 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Connections saved! Redirecting to dashboard...
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {loading ? "Saving..." : "Save & Continue"}
          </Button>
        </form>
      </main>
    </div>
  );
}