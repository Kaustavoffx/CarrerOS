import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// 1. Load environment from .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
let env: Record<string, string> = {};
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const parts = line.split("=");
    if (parts.length === 2) {
      env[parts[0].trim()] = parts[1].trim();
    }
  });
}

const supabaseUrl = env["NEXT_PUBLIC_SUPABASE_URL"] ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const sdeDisallowedKeywords = [
  "operations",
  "ops",
  "academia",
  "product design",
  "experience design",
  "ux design",
  "ux",
  "ui design",
  "figma",
  "user research",
  "wireframing",
  "design systems",
  "marketing",
  "management",
  "operations strategy",
  "research papers",
  "academic journals"
];

function isContaminated(roadmap: any): boolean {
  if (roadmap.career_domain !== "Software Engineering") {
    return false;
  }

  const milestones = Array.isArray(roadmap.milestones) ? roadmap.milestones : [];
  const textToCheck = [
    roadmap.title || "",
    roadmap.summary || "",
    ...(Array.isArray(roadmap.learning_outcomes) ? roadmap.learning_outcomes : []),
    ...(Array.isArray(roadmap.project_tasks) ? roadmap.project_tasks : []),
    ...(Array.isArray(roadmap.expected_outcomes) ? roadmap.expected_outcomes : []),
    ...milestones.flatMap((m: any) => [
      m.title || "",
      m.why_it_matters || "",
      ...(Array.isArray(m.completion_criteria) ? m.completion_criteria : []),
      ...(Array.isArray(m.projects) ? m.projects : []),
      ...(Array.isArray(m.project_tasks) ? m.project_tasks : []),
      ...(Array.isArray(m.deliverables) ? m.deliverables : []),
      ...(Array.isArray(m.expected_outcomes) ? m.expected_outcomes : [])
    ])
  ].join(" ").toLowerCase();

  return sdeDisallowedKeywords.some((keyword) => {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(^|\\W)${escaped}(\\W|$)`, "i");
    if (regex.test(textToCheck)) {
      if (keyword === "management") {
        const cleanText = textToCheck
          .replace(/project management/g, "")
          .replace(/management tool/g, "")
          .replace(/state management/g, "")
          .replace(/package management/g, "");
        return regex.test(cleanText);
      }
      return true;
    }
    return false;
  });
}

async function main() {
  if (!supabaseUrl) {
    console.error("Error: Supabase URL is not configured in .env.local.");
    process.exit(1);
  }

  if (!supabaseServiceRoleKey) {
    console.log("=========================================================================");
    console.log("             CAREEROS SUPABASE AUDIT & CLEANUP TOOL                      ");
    console.log("=========================================================================");
    console.log("\nError: SUPABASE_SERVICE_ROLE_KEY is not defined in the environment.");
    console.log("This key is required to bypass Row Level Security (RLS) to run the audit.\n");
    console.log("Please run this script passing the key:");
    console.log("  powershell:");
    console.log("    $env:SUPABASE_SERVICE_ROLE_KEY=\"your-service-role-key\"");
    console.log("    npx tsx bin/audit-db.ts [--cleanup]\n");
    console.log("  bash:");
    console.log("    SUPABASE_SERVICE_ROLE_KEY=\"your-service-role-key\" npx tsx bin/audit-db.ts [--cleanup]\n");
    process.exit(1);
  }

  const cleanupMode = process.argv.includes("--cleanup");
  console.log(`Connecting to: ${supabaseUrl}`);
  console.log(`Running in ${cleanupMode ? "CLEANUP" : "AUDIT ONLY"} mode...\n`);

  const client = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // 1. Fetch all roadmaps
  const { data: roadmaps, error: roadmapError } = await client
    .from("roadmaps")
    .select("id, user_id, title, career_domain, milestones, summary, learning_outcomes, project_tasks, expected_outcomes");

  if (roadmapError) {
    console.error("Failed to fetch roadmaps:", roadmapError);
    process.exit(1);
  }

  console.log(`Successfully fetched ${roadmaps?.length} total roadmaps from database.`);

  const contaminatedRoadmaps = (roadmaps || []).filter(isContaminated);
  const uniqueAffectedUsers = Array.from(new Set(contaminatedRoadmaps.map((r) => r.user_id)));

  console.log("\n==========================================");
  console.log("              AUDIT METRICS               ");
  console.log("==========================================");
  console.log(`Affected Roadmap Count:  ${contaminatedRoadmaps.length}`);
  console.log(`Affected User Count:     ${uniqueAffectedUsers.length}`);
  console.log("==========================================\n");

  if (contaminatedRoadmaps.length === 0) {
    console.log("Congratulations! No contaminated roadmaps were found.");
    process.exit(0);
  }

  if (!cleanupMode) {
    console.log("To perform the automated invalidation and force self-healing regeneration, run with --cleanup:\n");
    console.log("  npx tsx bin/audit-db.ts --cleanup\n");
    
    console.log("Alternatively, run the following SQL script directly in your Supabase SQL Editor:\n");
    console.log("------------------ SQL MIGRATION START ------------------");
    console.log(`
-- 1. Invalidate contaminated Software Engineering roadmaps by clearing their titles
-- This immediately forces loadAppData() self-healing pipeline to trigger migrateLegacyRoadmap()
update public.roadmaps
set title = '', updated_at = now()
where career_domain = 'Software Engineering'
  and (
    title ~* '\\y(operations|research|academia|ux|wireframe|figma|user research)\\y' or
    summary ~* '\\y(operations|research|academia|ux|wireframe|figma|user research)\\y' or
    weekly_schedule::text ~* '\\y(operations|research|academia|ux|wireframe|figma|user research)\\y' or
    learning_outcomes::text ~* '\\y(operations|research|academia|ux|wireframe|figma|user research)\\y' or
    project_tasks::text ~* '\\y(operations|research|academia|ux|wireframe|figma|user research)\\y' or
    expected_outcomes::text ~* '\\y(operations|research|academia|ux|wireframe|figma|user research)\\y' or
    milestones::text ~* '\\y(operations|research|academia|ux|wireframe|figma|user research)\\y' or
    resource_links::text ~* '\\y(operations|research|academia|ux|wireframe|figma|user research)\\y'
  );

-- 2. Empty the JSONB cache inside workspace snapshot state for all affected users
-- This forces the system to sync from the invalidated roadmaps table and rebuild cache
update public.career_workspace_state
set roadmaps = '[]'::jsonb, updated_at = now()
where user_id in (
  select distinct user_id
  from public.roadmaps
  where career_domain = 'Software Engineering'
    and (
      title ~* '\\y(operations|research|academia|ux|wireframe|figma|user research)\\y' or
      summary ~* '\\y(operations|research|academia|ux|wireframe|figma|user research)\\y' or
      weekly_schedule::text ~* '\\y(operations|research|academia|ux|wireframe|figma|user research)\\y' or
      learning_outcomes::text ~* '\\y(operations|research|academia|ux|wireframe|figma|user research)\\y' or
      project_tasks::text ~* '\\y(operations|research|academia|ux|wireframe|figma|user research)\\y' or
      expected_outcomes::text ~* '\\y(operations|research|academia|ux|wireframe|figma|user research)\\y' or
      milestones::text ~* '\\y(operations|research|academia|ux|wireframe|figma|user research)\\y' or
      resource_links::text ~* '\\y(operations|research|academia|ux|wireframe|figma|user research)\\y'
    )
);
`);
    console.log("------------------- SQL MIGRATION END -------------------\n");
  } else {
    console.log("Performing automated cleanup...");

    const roadmapIds = contaminatedRoadmaps.map((r) => r.id);

    // 1. Invalidate contaminated roadmaps in the database
    const { error: updateRoadmapsError } = await client
      .from("roadmaps")
      .update({ title: "", updated_at: new Date().toISOString() })
      .in("id", roadmapIds);

    if (updateRoadmapsError) {
      console.error("Failed to invalidate roadmaps in database:", updateRoadmapsError);
      process.exit(1);
    }

    console.log(`Successfully invalidated ${roadmapIds.length} roadmaps in public.roadmaps table (cleared titles).`);

    // 2. Empty the JSONB workspace cache for affected users
    const { error: updateWorkspaceError } = await client
      .from("career_workspace_state")
      .update({ roadmaps: [], updated_at: new Date().toISOString() })
      .in("user_id", uniqueAffectedUsers);

    if (updateWorkspaceError) {
      console.error("Failed to reset workspace JSONB cache:", updateWorkspaceError);
      process.exit(1);
    }

    console.log(`Successfully reset workspace cache for ${uniqueAffectedUsers.length} users in public.career_workspace_state table.`);
    console.log("\nCleanup successfully completed! Next time these users log in or load the dashboard, their Software Engineering roadmaps will automatically self-heal and regenerate without any cross-domain contamination.");
  }
}

main().catch(console.error);
