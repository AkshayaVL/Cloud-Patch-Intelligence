"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Shield, Zap, GitPullRequest, BarChart3,
  ArrowRight, CheckCircle, Play, ChevronRight,
  Lock, Cloud, Code2, AlertTriangle
} from "lucide-react";

import { Variants } from "framer-motion";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};
const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        let start = 0;
        const step = target / 50;
        const timer = setInterval(() => {
          start += step;
          if (start >= target) { setCount(target); clearInterval(timer); }
          else setCount(Math.floor(start));
        }, 30);
      }
    });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return <div ref={ref}>{count}{suffix}</div>;
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans overflow-x-hidden">

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-indigo-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-gradient flex items-center justify-center">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <span className="font-display font-700 text-slate-900 text-lg">Cloud Patch Intelligence</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            {["Features", "How It Works", "Stats"].map((item) => (
              <a key={item} href={`#${item.toLowerCase().replace(" ", "-")}`}
                className="text-slate-600 hover:text-indigo-600 text-sm font-medium transition-colors">
                {item}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <button className="text-slate-700 hover:text-indigo-600 text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-50 transition-all">
                Sign In
              </button>
            </Link>
            <Link href="/register">
              <button className="btn-premium text-white text-sm font-semibold px-5 py-2.5 rounded-xl">
                Get Started Free
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 bg-hero-pattern relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-indigo-100 rounded-full blur-3xl opacity-50 animate-float" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-purple-100 rounded-full blur-3xl opacity-40 animate-float" style={{ animationDelay: "1.5s" }} />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.div variants={fadeUp}>
              <span className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full text-sm font-semibold border border-indigo-200 mb-6">
                <Zap className="h-3.5 w-3.5" />
                Fully Autonomous — Detection to Merged PR in &lt;2 mins
              </span>
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-6xl md:text-7xl font-display font-extrabold text-slate-900 mb-6 leading-tight">
              Fix Cloud Security{" "}
              <span className="gradient-text">Automatically</span>
            </motion.h1>

            <motion.p variants={fadeUp} className="text-xl text-slate-500 mb-10 max-w-3xl mx-auto leading-relaxed">
              CPI scans your AWS infrastructure, analyzes every misconfiguration using Google Gemini AI,
              generates production-ready Terraform patches, and opens GitHub Pull Requests —
              all without human intervention.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <button className="btn-premium text-white font-semibold px-8 py-4 rounded-2xl text-lg flex items-center gap-2 group">
                  Start Free Scan
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
              <Link href="/login">
                <button className="bg-white text-slate-700 font-semibold px-8 py-4 rounded-2xl text-lg border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 transition-all shadow-sm flex items-center gap-2">
                  <Play className="h-4 w-4" />
                  See Demo
                </button>
              </Link>
            </motion.div>
          </motion.div>
        </div>

        {/* Hero mockup */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="max-w-4xl mx-auto mt-16 relative"
        >
          <div className="bg-white rounded-2xl shadow-indigo-xl border border-indigo-100 overflow-hidden">
            {/* Window chrome */}
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
              <div className="flex-1 mx-4">
                <div className="bg-white rounded-md px-3 py-1 text-xs text-slate-400 border border-slate-200 w-48">
                  app.cloudpatch.ai/scan
                </div>
              </div>
            </div>
            {/* Mock scan UI */}
            <div className="p-6 bg-gradient-to-br from-indigo-50/50 to-white">
              <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                  {[
                    { label: "Connecting to AWS", done: true },
                    { label: "Scanning 47 resources", done: true },
                    { label: "AI analyzing findings", done: true, active: false },
                    { label: "Generating Terraform patches", done: false, active: true },
                    { label: "Opening GitHub PRs", done: false },
                  ].map((step, i) => (
                    <div key={i} className={`flex items-center gap-3 p-3 rounded-xl text-sm ${step.active ? "bg-indigo-50 border border-indigo-200" : ""}`}>
                      {step.done ? (
                        <CheckCircle className="h-4 w-4 text-indigo-500 shrink-0" />
                      ) : step.active ? (
                        <div className="h-4 w-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin shrink-0" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-slate-200 shrink-0" />
                      )}
                      <span className={step.done ? "text-slate-600" : step.active ? "text-indigo-700 font-medium" : "text-slate-400"}>
                        {step.label}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="w-48 space-y-3">
                  <div className="bg-white rounded-xl border border-slate-100 p-3 text-center shadow-sm">
                    <div className="text-2xl font-bold text-indigo-600">87</div>
                    <div className="text-xs text-slate-500">Security Score</div>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-100 p-3 text-center shadow-sm">
                    <div className="text-2xl font-bold text-green-500">12</div>
                    <div className="text-xs text-slate-500">PRs Opened</div>
                  </div>
                  <div className="bg-indigo-600 rounded-xl p-3 text-center">
                    <div className="text-xs text-indigo-200 mb-1">Severity Found</div>
                    <div className="flex justify-center gap-1">
                      <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded">2 CRIT</span>
                      <span className="bg-orange-400 text-white text-xs px-1.5 py-0.5 rounded">5 HIGH</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Stats */}
      <section id="stats" className="py-16 bg-indigo-600">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center"
          >
            {[
              { value: 80, suffix: "%", label: "of cloud breaches caused by misconfigurations" },
              { value: 445, suffix: "M+", label: "average cost of a cloud data breach" },
              { value: 2, suffix: " min", label: "from detection to open GitHub PR" },
            ].map((stat, i) => (
              <motion.div key={i} variants={fadeUp}>
                <div className="text-5xl font-display font-extrabold text-white mb-2">
                  <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-indigo-200 text-sm">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            className="text-center mb-16"
          >
            <motion.p variants={fadeUp} className="text-indigo-600 font-semibold text-sm uppercase tracking-wider mb-3">
              How It Works
            </motion.p>
            <motion.h2 variants={fadeUp} className="text-4xl font-display font-bold text-slate-900 mb-4">
              From Detection to Fix in 4 Steps
            </motion.h2>
            <motion.p variants={fadeUp} className="text-slate-500 text-lg max-w-2xl mx-auto">
              CPI automates the entire security remediation pipeline so your team can focus on building.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {[
              {
                icon: <Cloud className="h-7 w-7 text-indigo-600" />,
                step: "01",
                title: "Scan AWS",
                desc: "Connects to your AWS account and scans S3, IAM, EC2, RDS, VPC, and CloudTrail for misconfigurations.",
                color: "bg-indigo-50 border-indigo-100",
              },
              {
                icon: <Zap className="h-7 w-7 text-purple-600" />,
                step: "02",
                title: "AI Analysis",
                desc: "Google Gemini LLM analyzes each issue, explains the risk in plain English, and maps it to compliance standards.",
                color: "bg-purple-50 border-purple-100",
              },
              {
                icon: <Code2 className="h-7 w-7 text-cyan-600" />,
                step: "03",
                title: "Generate Fix",
                desc: "Automatically generates a production-ready Terraform patch with inline comments for every issue found.",
                color: "bg-cyan-50 border-cyan-100",
              },
              {
                icon: <GitPullRequest className="h-7 w-7 text-green-600" />,
                step: "04",
                title: "Open PR",
                desc: "Opens a labeled GitHub Pull Request with severity tags. Your team just reviews and merges.",
                color: "bg-green-50 border-green-100",
              },
            ].map((item, i) => (
              <motion.div key={i} variants={fadeUp}
                className={`card-hover p-6 rounded-2xl border ${item.color} relative overflow-hidden`}
              >
                <div className="text-6xl font-display font-extrabold text-slate-100 absolute top-2 right-4 select-none">
                  {item.step}
                </div>
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center mb-4 border border-slate-100">
                    {item.icon}
                  </div>
                  <h3 className="font-display font-bold text-slate-900 text-lg mb-2">{item.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            className="text-center mb-16"
          >
            <motion.p variants={fadeUp} className="text-indigo-600 font-semibold text-sm uppercase tracking-wider mb-3">Features</motion.p>
            <motion.h2 variants={fadeUp} className="text-4xl font-display font-bold text-slate-900 mb-4">
              Everything You Need
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {[
              { icon: <Shield className="h-6 w-6 text-indigo-600" />, title: "Multi-Service Scanning", desc: "Covers S3, IAM, EC2, RDS, VPC, CloudTrail and more across all AWS regions." },
              { icon: <Zap className="h-6 w-6 text-purple-600" />, title: "Gemini AI Analysis", desc: "Each finding is analyzed by Google Gemini with risk scoring, plain English explanations, and compliance mapping." },
              { icon: <Code2 className="h-6 w-6 text-cyan-600" />, title: "Terraform Patches", desc: "Production-ready infrastructure code generated automatically with inline security comments." },
              { icon: <GitPullRequest className="h-6 w-6 text-green-600" />, title: "Auto GitHub PRs", desc: "Labeled pull requests opened automatically with full context, severity tags, and fix descriptions." },
              { icon: <BarChart3 className="h-6 w-6 text-orange-600" />, title: "Security Scoring", desc: "Real-time security score tracked over time with historical trend charts and improvement metrics." },
              { icon: <Lock className="h-6 w-6 text-red-600" />, title: "Compliance Mapping", desc: "Every finding mapped to CIS, NIST, SOC2, and ISO27001 compliance frameworks automatically." },
            ].map((f, i) => (
              <motion.div key={i} variants={fadeUp}
                className="card-hover bg-white rounded-2xl p-6 border border-slate-100 shadow-card"
              >
                <div className="w-11 h-11 rounded-xl bg-slate-50 flex items-center justify-center mb-4">
                  {f.icon}
                </div>
                <h3 className="font-display font-bold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.div variants={fadeUp}
              className="w-16 h-16 rounded-2xl bg-indigo-gradient flex items-center justify-center mx-auto mb-6 animate-pulse-ring"
            >
              <Shield className="h-8 w-8 text-white" />
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-4xl font-display font-bold text-slate-900 mb-4">
              Ready to Secure Your Cloud?
            </motion.h2>
            <motion.p variants={fadeUp} className="text-slate-500 text-lg mb-8">
              Join and start fixing misconfigurations automatically today.
            </motion.p>
            <motion.div variants={fadeUp} className="flex gap-4 justify-center">
              <Link href="/register">
                <button className="btn-premium text-white font-semibold px-8 py-4 rounded-2xl text-lg flex items-center gap-2 group">
                  Get Started Free
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-indigo-gradient flex items-center justify-center">
              <Shield className="h-3 w-3 text-white" />
            </div>
            <span className="text-slate-600 text-sm font-medium">Cloud Patch Intelligence</span>
          </div>
          <p className="text-slate-400 text-sm">Built with FastAPI, Next.js, and Google Gemini</p>
        </div>
      </footer>
    </div>
  );
}