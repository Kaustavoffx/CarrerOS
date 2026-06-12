import { NextResponse } from "next/server";

export const runtime = "edge";

function sse(payload: Record<string, unknown>): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { targetGoal } = body as { targetGoal: string };

    if (!targetGoal) {
      return NextResponse.json({ error: "Missing targetGoal" }, { status: 400 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (payload: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(sse(payload)));
        };

        const agents = [
          { id: "career", name: "Career Agent", delay: 1000 },
          { id: "learning", name: "Learning Agent", delay: 1500 },
          { id: "scholarship", name: "Scholarship Agent", delay: 1200 },
          { id: "mentor", name: "Mentor Agent", delay: 1400 },
          { id: "support", name: "Support Agent", delay: 1100 }
        ];

        // 1. Initial State
        send({ type: "INIT", message: `Initializing Swarm for target: ${targetGoal}` });

        // 2. Sequential Agent Execution
        for (const agent of agents) {
          send({ type: "AGENT_START", agentId: agent.id });
          await new Promise(resolve => setTimeout(resolve, agent.delay));

          let output = "";
          switch(agent.id) {
            case "career":
              output = `Identified top 3 entry-level roles for ${targetGoal}. High market demand expected over the next 24 months.`;
              break;
            case "learning":
              output = `Missing core proficiencies: Cloud Architecture and Advanced System Design. Recommended fast-track curriculum.`;
              break;
            case "scholarship":
              output = `Found 2 applicable technology grants matching target profile. Total estimated funding capacity: $4,500.`;
              break;
            case "mentor":
              output = `Matched with 3 active Senior Engineers offering weekly 1:1 project reviews.`;
              break;
            case "support":
              output = `Located local peer-coding hubs and emergency housing stipends if required during bootcamp phase.`;
              break;
          }

          send({ type: "AGENT_DONE", agentId: agent.id, output });
        }

        // 3. Synthesis Phase
        send({ type: "SYNTHESIS_START" });
        await new Promise(resolve => setTimeout(resolve, 2000));

        const actionPlan = [
          `Enroll in the recommended Cloud Architecture fast-track curriculum.`,
          `Submit applications for the 2 identified technology grants before month-end.`,
          `Schedule introductory 1:1 call with a matched Senior Engineer.`,
          `Join the local peer-coding hub for weekend collaborative sessions.`
        ];

        send({ type: "FINAL_PLAN", actionPlan });
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
    return NextResponse.json({ error: "Agent Swarm Failed" }, { status: 500 });
  }
}
