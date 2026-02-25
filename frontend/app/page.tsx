import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Shield, Zap, GitPullRequest, BarChart3 } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Navbar */}
      <nav className="border-b border-slate-800 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-blue-400" />
          <span className="font-bold text-lg">Cloud Patch Intelligence</span>
        </div>
        <div className="flex gap-3">
          <Link href="/login">
            <Button variant="ghost" className="text-slate-300 hover:text-white">
              Login
            </Button>
          </Link>
          <Link href="/register">
            <Button className="bg-blue-600 hover:bg-blue-700">
              Get Started
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-24 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-blue-950 text-blue-300 px-4 py-1.5 rounded-full text-sm mb-6 border border-blue-800">
          <Zap className="h-3 w-3" />
          Fully Autonomous — Detection to Merged PR
        </div>
        <h1 className="text-5xl font-bold mb-6 leading-tight">
          Fix Cloud Misconfigurations{" "}
          <span className="text-blue-400">Automatically</span>
        </h1>
        <p className="text-slate-400 text-xl mb-10 max-w-2xl mx-auto">
          CPI scans your AWS infrastructure, analyzes misconfigurations using AI,
          generates Terraform patches, and opens GitHub Pull Requests — all without
          human intervention.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/register">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-lg px-8">
              Start Free Scan
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="text-lg px-8 border-slate-700 text-slate-300 hover:text-white">
              Sign In
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-16 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: <Shield className="h-8 w-8 text-blue-400" />,
              title: "1. Scan AWS",
              desc: "Connects to your AWS account and scans S3, IAM, EC2, RDS, VPC, and CloudTrail for misconfigurations.",
            },
            {
              icon: <Zap className="h-8 w-8 text-yellow-400" />,
              title: "2. AI Analysis",
              desc: "Gemini LLM analyzes each issue, explains the risk in plain English, and maps it to compliance standards.",
            },
            {
              icon: <GitPullRequest className="h-8 w-8 text-green-400" />,
              title: "3. Generate Fix",
              desc: "Automatically generates a production-ready Terraform patch with inline comments for every issue.",
            },
            {
              icon: <BarChart3 className="h-8 w-8 text-purple-400" />,
              title: "4. Open PR",
              desc: "Opens a labeled GitHub Pull Request with the fix. You just review and merge.",
            },
          ].map((f, i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <div className="mb-4">{f.icon}</div>
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-slate-400 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="px-6 py-16 bg-slate-900 border-t border-slate-800">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-8 text-center">
          {[
            { value: "80%", label: "of cloud breaches caused by misconfigurations" },
            { value: "$4.45M", label: "average cost of a cloud data breach" },
            { value: "<2 min", label: "from detection to open PR" },
          ].map((s, i) => (
            <div key={i}>
              <div className="text-4xl font-bold text-blue-400 mb-2">{s.value}</div>
              <div className="text-slate-400 text-sm">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 px-6 py-8 text-center text-slate-500 text-sm">
        Cloud Patch Intelligence — Built with FastAPI, Next.js, and Google Gemini
      </footer>
    </div>
  );
}