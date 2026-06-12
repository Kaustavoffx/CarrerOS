import { NextResponse } from "next/server";

export const runtime = "edge";

function sse(payload: Record<string, unknown>): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { situation } = body as { situation: string };

    if (!situation) {
      return NextResponse.json({ error: "Missing situation text" }, { status: 400 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (payload: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(sse(payload)));
        };

        // Phase 1: Understanding / Assessment
        send({ type: "ASSESSMENT_START" });
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        let assessment = "";
        let urgency = "High";
        
        const lowerSit = situation.toLowerCase();
        if (lowerSit.includes("job") || lowerSit.includes("fired") || lowerSit.includes("laid off")) {
          assessment = "Detected immediate employment loss. High risk of near-term financial instability. Prioritizing rapid income bridges and expedited upskilling.";
          urgency = "Critical";
        } else if (lowerSit.includes("college") || lowerSit.includes("afford") || lowerSit.includes("tuition")) {
          assessment = "Detected educational financial barrier. Prioritizing immediate scholarship grants, tuition waivers, and high-ROI alternative learning pathways.";
          urgency = "High";
        } else if (lowerSit.includes("stuck") || lowerSit.includes("lost")) {
          assessment = "Detected career stagnation and clarity deficit. Prioritizing mentorship intervention, skills auditing, and lateral transition mapping.";
          urgency = "Medium";
        } else {
          assessment = "Detected urgent need for structured support. Prioritizing rapid resource deployment across financial, educational, and community domains.";
          urgency = "High";
        }

        send({ type: "ASSESSMENT_DONE", assessment, urgency });
        await new Promise(resolve => setTimeout(resolve, 800));

        // Phase 2: Prioritize Urgent Actions (Roadmap)
        send({ type: "ROADMAP_START" });
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        let actions = [];
        if (lowerSit.includes("job")) {
          actions = [
            "File for local unemployment benefits within 48 hours to secure immediate runway.",
            "Activate emergency peer-support network in the 'Tech Transitions' hub.",
            "Update Career Twin profile to flag 'Immediate Availability' to hiring algorithms."
          ];
        } else if (lowerSit.includes("college")) {
          actions = [
            "Apply for the 'OpenTech Emergency Micro-Grant' (deadline in 3 days).",
            "Transition current learning modules to the tuition-free 'Foundations' track.",
            "Schedule a 15-minute sync with Financial Aid AI Agent."
          ];
        } else {
          actions = [
            "Complete the 5-minute Career Clarity psychometric audit.",
            "Schedule an introductory alignment call with a matched mentor.",
            "Join the 'Cross-Industry Pivot' community support circle."
          ];
        }

        send({ type: "ROADMAP_DONE", actions });
        await new Promise(resolve => setTimeout(resolve, 800));

        // Phase 3: Identify Support Resources
        send({ type: "RESOURCES_START" });
        await new Promise(resolve => setTimeout(resolve, 2500));

        const resources = {
          financial: {
            title: lowerSit.includes("college") ? "Tuition Relief Fund" : "Emergency Bridge Stipend",
            description: "Fast-tracked application for verified immediate financial relief.",
            action: "Apply Now",
            match: "98%"
          },
          community: {
            title: "Crisis Support Hub",
            description: "Local peer group offering housing, food, and emotional support networks.",
            action: "Join Hub",
            match: "95%"
          },
          educational: {
            title: "Rapid Upskilling Track",
            description: "High-intensity, zero-cost curriculum to secure immediate gig work.",
            action: "Start Track",
            match: "92%"
          },
          mentorship: {
            title: "Emergency Career Counseling",
            description: "Direct line to senior mentors specializing in crisis management and rapid pivots.",
            action: "Connect",
            match: "99%"
          }
        };

        send({ type: "RESOURCES_DONE", resources });
        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch {
    return NextResponse.json({ error: "Emergency Guidance Failed" }, { status: 500 });
  }
}
