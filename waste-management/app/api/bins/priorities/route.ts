import { NextResponse } from "next/server";
import { getBins, getPredictions } from "@/lib/supabase/queries";
import { buildPriorityBins } from "@/lib/services/priority-engine";

// Force dynamic execution for latest data
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const bins = await getBins();
    const predictions = await getPredictions();

    const priorityBins = buildPriorityBins(bins, predictions);

    return NextResponse.json(priorityBins);
  } catch (error) {
    console.error("Error generating priority bins:", error);
    return NextResponse.json(
      { error: "Failed to generate priority scores" },
      { status: 500 }
    );
  }
}
