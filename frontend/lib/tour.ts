import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export function startTour() {
  const driverObj = driver({
    showProgress: true,
    animate: true,
    overlayOpacity: 0.55,
    smoothScroll: true,
    allowClose: true,
    overlayColor: "#1e1b4b",
    stagePadding: 8,
    popoverClass: "cpi-tour-popover",
    progressText: "{{current}} of {{total}}",
    nextBtnText: "Next →",
    prevBtnText: "← Back",
    doneBtnText: "🎉 Done",
    steps: [
      {
        element: "#tour-logo",
        popover: {
          title: "👋 Welcome to CPI!",
          description: "Cloud Patch Intelligence automatically scans your AWS infrastructure, generates Terraform fixes, and opens GitHub PRs. Let's take a quick tour!",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#tour-score",
        popover: {
          title: "🛡️ Security Score",
          description: "Your real-time security score out of 100. It decreases based on the severity of misconfigurations found. Goal: keep it above 80!",
          side: "right",
          align: "start",
        },
      },
      {
        element: "#tour-stats",
        popover: {
          title: "📊 Quick Stats",
          description: "See your total scans, pull requests opened, and PRs merged at a glance.",
          side: "bottom",
          align: "center",
        },
      },
      {
        element: "#tour-run-scan",
        popover: {
          title: "⚡ Run a Scan",
          description: "Click this button to start an autonomous security scan. CPI will scan your entire AWS infrastructure automatically!",
          side: "bottom",
          align: "end",
        },
      },
      {
        element: "#tour-recent-scans",
        popover: {
          title: "🕐 Recent Scans",
          description: "Your latest scan history appears here. Each scan shows how many issues were found and the current status.",
          side: "top",
          align: "start",
        },
      },
      {
        element: "#tour-recent-prs",
        popover: {
          title: "🔀 Recent Pull Requests",
          description: "All GitHub PRs automatically opened by CPI appear here. Just review and merge them to fix your cloud security issues!",
          side: "top",
          align: "end",
        },
      },
      {
        element: "#tour-nav-scan",
        popover: {
          title: "🔍 Scan Page",
          description: "Go here to run a new security scan. Enter your AWS credentials and GitHub token, then click Start — CPI does the rest!",
          side: "bottom",
          align: "center",
        },
      },
      {
        element: "#tour-nav-prs",
        popover: {
          title: "📋 PR Tracker",
          description: "Track all GitHub pull requests opened by CPI. Filter by open, merged, or closed status.",
          side: "bottom",
          align: "center",
        },
      },
      {
        element: "#tour-nav-settings",
        popover: {
          title: "⚙️ Settings",
          description: "Add your AWS credentials and GitHub token here before running your first scan.",
          side: "bottom",
          align: "center",
        },
      },
      {
        element: "#tour-user",
        popover: {
          title: "✅ You're all set!",
          description: "Start by going to Settings to add your AWS and GitHub credentials, then run your first scan. CPI will handle everything else automatically!",
          side: "bottom",
          align: "end",
        },
      },
    ],
    onDestroyed: () => {
      localStorage.setItem("cpi_tour_done", "true");
    },
  });

  driverObj.drive();
}