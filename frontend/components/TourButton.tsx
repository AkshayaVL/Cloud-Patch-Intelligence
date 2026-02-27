"use client";

import { startTour } from "@/lib/tour";
import { Map } from "lucide-react";

export default function TourButton() {
  return (
    <button
      onClick={startTour}
      className="fixed bottom-6 right-6 z-40 btn-premium text-white text-sm font-semibold px-4 py-3 rounded-2xl flex items-center gap-2 shadow-indigo-lg"
    >
      <Map className="h-4 w-4" />
      Take Tour
    </button>
  );
}