"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Shield, Scan, GitPullRequest, Settings,
  ArrowRight, X, CheckCircle, LayoutDashboard
} from "lucide-react";

const steps = [
  {
    id: "welcome",
    title: "Welcome to Cloud Patch Intelligence! 🎉",
    description: "Your AI-powered cloud security platform. Let's take a quick tour to get you started in under 2 minutes.",
    icon: <Shield className="h-8 w-8 text-indigo-600" />,
    bg: "bg-indigo-50",
    action: "Start Tour",
    tip: null,
  },
  {
    id: "dashboard",
    title: "Your Security Dashboard",
    description: "This is your command center. See your real-time security score, scan history, and all pull requests opened by CPI at a glance.",
    icon: <LayoutDashboard className="h-8 w-8 text-indigo-600" />,
    bg: "bg-indigo-50",
    action: "Next",
    tip: "💡 Your security score starts at 100 and decreases based on findings severity.",
    highlight: "/dashboard",
  },
  {
    id: "settings",
    title: "Connect Your Accounts First",
    description: "Before scanning, go to Settings and add your AWS credentials and GitHub token. CPI needs these to scan your infrastructure and open PRs.",
    icon: <Settings className="h-8 w-8 text-orange-600" />,
    bg: "bg-orange-50",
    action: "Next",
    tip: "💡 Your credentials are encrypted and never shared. CPI only reads your AWS config.",
    highlight: "/settings",
    cta: { label: "Go to Settings", href: "/settings" },
  },
  {
    id: "scan",
    title: "Run Your First Scan",
    description: "Head to the Scan page, enter your credentials, and click 'Start Autonomous Scan'. CPI will scan 50+ AWS checks and generate fixes automatically.",
    icon: <Scan className="h-8 w-8 text-purple-600" />,
    bg: "bg-purple-50",
    action: "Next",
    tip: "💡 A full scan takes about 2-3 minutes depending on your AWS resources.",
    highlight: "/scan",
    cta: { label: "Go to Scan", href: "/scan" },
  },
  {
    id: "results",
    title: "Review Findings & PRs",
    description: "After scanning, view detailed findings in Scan Results and track all auto-generated GitHub PRs in the PR Tracker. Just review and merge!",
    icon: <GitPullRequest className="h-8 w-8 text-green-600" />,
    bg: "bg-green-50",
    action: "Finish Tour",
    tip: "💡 Each PR contains a Terraform fix with full explanation. Just merge it to secure your cloud.",
    highlight: "/prs",
  },
];

export default function OnboardingTour() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const done = localStorage.getItem("cpi_tour_done");
    if (!done) {
      setTimeout(() => setVisible(true), 800);
    }
  }, []);

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      handleClose();
    }
  };

  const handleClose = () => {
    localStorage.setItem("cpi_tour_done", "true");
    setVisible(false);
  };

  const handleCTA = (href: string) => {
    handleClose();
    router.push(href);
  };

  const current = steps[step];

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            key={step}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4 pointer-events-none"
          >
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md pointer-events-auto overflow-hidden">
              {/* Progress bar */}
              <div className="h-1 bg-slate-100">
                <motion.div
                  className="h-full bg-indigo-gradient"
                  animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>

              <div className="p-8">
                {/* Close */}
                <div className="flex justify-between items-start mb-6">
                  <div className={`w-16 h-16 rounded-2xl ${current.bg} flex items-center justify-center`}>
                    {current.icon}
                  </div>
                  <button onClick={handleClose}
                    className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                    <X className="h-4 w-4 text-slate-500" />
                  </button>
                </div>

                {/* Step indicators */}
                <div className="flex gap-1.5 mb-5">
                  {steps.map((_, i) => (
                    <div key={i} className={`h-1.5 rounded-full transition-all ${
                      i === step ? "bg-indigo-500 w-6" :
                      i < step ? "bg-indigo-300 w-3" :
                      "bg-slate-200 w-3"
                    }`} />
                  ))}
                </div>

                <h2 className="text-xl font-display font-bold text-slate-900 mb-3">
                  {current.title}
                </h2>
                <p className="text-slate-500 text-sm leading-relaxed mb-5">
                  {current.description}
                </p>

                {current.tip && (
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 text-sm text-indigo-700 mb-5">
                    {current.tip}
                  </div>
                )}

                <div className="flex gap-3">
                  {(current as any).cta && (
                    <button
                      onClick={() => handleCTA((current as any).cta.href)}
                      className="flex-1 border border-indigo-200 text-indigo-600 font-semibold text-sm py-2.5 rounded-xl hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
                    >
                      {(current as any).cta.label}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button onClick={handleNext}
                    className={`btn-premium text-white font-semibold text-sm py-2.5 rounded-xl flex items-center justify-center gap-2 ${(current as any).cta ? "flex-1" : "w-full"}`}
                  >
                    {step === steps.length - 1 ? (
                      <><CheckCircle className="h-4 w-4" /> {current.action}</>
                    ) : (
                      <>{current.action} <ArrowRight className="h-4 w-4" /></>
                    )}
                  </button>
                </div>

                <button onClick={handleClose}
                  className="w-full text-center text-slate-400 text-xs mt-3 hover:text-slate-600 transition-colors">
                  Skip tour
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}