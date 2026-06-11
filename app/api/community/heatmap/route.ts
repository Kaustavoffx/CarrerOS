import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getCommunityResources } from "@/lib/community-db";

export async function GET(_request: Request) {
  try {
    const supabase = await getSupabaseServerClient().catch(() => null);
    const resources = await getCommunityResources(supabase, {});

    // Target districts we want to evaluate
    const targets = ["Bangalore", "New Delhi", "Mumbai", "Kolkata", "Jaipur", "Pune", "Ahmedabad"];
    
    // Group and count densities
    const groupedData: Record<string, Record<string, number>> = {};
    
    targets.forEach((city) => {
      groupedData[city] = {
        scholarship: 0,
        internship: 0,
        mentorship: 0,
        center: 0
      };
    });

    resources.forEach((res) => {
      const city = res.city || "Online";
      if (targets.includes(city)) {
        if (res.type === "scholarship") {
          groupedData[city].scholarship += 1;
        } else if (res.type === "internship") {
          groupedData[city].internship += 1;
        } else if (res.type === "mentorship") {
          groupedData[city].mentorship += 1;
        } else if (res.type === "center" || res.type === "certification") {
          groupedData[city].center += 1;
        }
      }
    });

    const apiKey = process.env.OPENAI_API_KEY;
    let report = "";

    if (!apiKey) {
      // Local programmatic fallback report generator
      report = `
# Community Support Help Gap Analysis Report

## Executive Summary
This report presents an audit of the geographical distribution of career support resources across seven major target districts. By analyzing availability across four high-impact categories—Scholarships, Internships, Mentorships, and Training Centers—we have identified critical resource shortages that hinder local professional development and limit student equity.

---

## Severe Regional Gaps Identified

Based on density audits, the following districts suffer from severe shortages (0 active resources):
`;

      const shortages: string[] = [];
      targets.forEach((city) => {
        const counts = groupedData[city];
        if (counts.scholarship === 0) shortages.push(`- **${city}**: Severe **Scholarship** shortage (0 active listings)`);
        if (counts.internship === 0) shortages.push(`- **${city}**: Severe **Internship** shortage (0 active listings)`);
        if (counts.mentorship === 0) shortages.push(`- **${city}**: Severe **Mentorship** shortage (0 active listings)`);
        if (counts.center === 0) shortages.push(`- **${city}**: Severe **Training Center** shortage (0 active listings)`);
      });

      report += shortages.length > 0 
        ? shortages.join("\n") 
        : "- No severe resource shortages detected in target districts.";

      report += `

---

## Low Density Resource Risks

The following districts have marginal resource coverage (only 1-2 active resources):
`;

      const lowDensities: string[] = [];
      targets.forEach((city) => {
        const counts = groupedData[city];
        if (counts.scholarship > 0 && counts.scholarship <= 2) lowDensities.push(`- **${city}**: Low density in **Scholarships** (${counts.scholarship} active)`);
        if (counts.internship > 0 && counts.internship <= 2) lowDensities.push(`- **${city}**: Low density in **Internships** (${counts.internship} active)`);
        if (counts.mentorship > 0 && counts.mentorship <= 2) lowDensities.push(`- **${city}**: Low density in **Mentorships** (${counts.mentorship} active)`);
        if (counts.center > 0 && counts.center <= 2) lowDensities.push(`- **${city}**: Low density in **Training Centers** (${counts.center} active)`);
      });

      report += lowDensities.length > 0 
        ? lowDensities.join("\n") 
        : "- No low-density resource risks identified.";

      report += `

---

## Actionable Structural Recommendations

To bridge these community-level gaps, we propose three key structural initiatives:
1. **CSR Budget Allocation Routing**: Route corporate social responsibility (CSR) budgets directly to finance scholarship portal vouchers and internship programs in **Jaipur** and **Kolkata** where technical internships are sparse.
2. **Hybrid Mentorship Hubs**: Deploy digital mentorship networks leveraging alumni nodes to bridge the gap in districts lacking local face-to-face mentorship circles.
3. **Establish Community Skill Centers**: Form partnerships with local NGOs (like SEWA or Goonj) to build physical digital libraries and coding centers in cities showing low vocational training density.
`;
      report = report.trim();
    } else {
      // Fetch AI matching report from OpenAI GPT
      try {
        const systemPrompt = `You are a Senior Social Impact Analyst and AI Policy Nodal Director for CareerOS.
Analyze the provided regional support resource counts per district and write a detailed, professional Help Gap Report in Markdown format.
Include an Executive Summary, a section detailing Severe Shortages (0 listings), a section on Low Density Risks (1-2 listings), and outline 3 concrete, actionable initiatives to route funding or open centers.
Do not wrap your output in code blocks, return direct markdown.`;

        const userPrompt = `
Here is the aggregated support resource density database per district/city:
${JSON.stringify(groupedData, null, 2)}
`;

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ],
            temperature: 0.3
          })
        });

        if (response.ok) {
          const data = await response.json();
          report = data.choices?.[0]?.message?.content || "Failed to generate report from LLM.";
        } else {
          throw new Error("AI Completion failed");
        }
      } catch (err) {
        console.error("AI Heatmap Report failed, falling back:", err);
        return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
      }
    }

    return NextResponse.json({
      groupedData,
      report
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Failed to compile heatmap data";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }

}
