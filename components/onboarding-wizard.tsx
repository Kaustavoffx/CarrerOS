"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  GraduationCap,
  Plus,
  Search,
  Sparkles,
  Target,
  X,
  User,
  Briefcase,
  MapPin,
  ChevronDown,
  Award,
  Clock,
  Sliders,
  Check,
  HelpCircle,
  Activity,
  FileText,
  Layout,
  MessageSquare,
  Brain,
  BookOpen,
  Heart,
  Globe,
  Flame
} from "lucide-react";
import { MagneticButton } from "./magnetic-button";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { seedWorkspace, updateProfile } from "@/lib/app-data";
import type { ExperienceLevel } from "@/lib/supabase/types";

type OnboardingWizardProps = {
  userId: string;
  email?: string | null;
  displayName?: string | null;
};

type LearningStyle = "Visual" | "Hands-on" | "Structured" | "Mentored" | "Reading";
type LearningPace = "Steady" | "Fast" | "Immersive";
type FeedbackCadence = "Daily" | "Weekly" | "Biweekly";
type TimelineBucket = "0-3 months" | "3-6 months" | "6-12 months" | "12+ months";
type GoalType = "First role" | "Promotion" | "Career switch" | "Portfolio reset" | "Freelance";
type WorkMode = "Remote" | "Hybrid" | "On-site" | "Flexible";
type CompanySizePreference = "Startup" | "Scaleup" | "Enterprise" | "Agency";

type OnboardingDraft = {
  fullName: string;
  currentTitle: string;
  location: string;
  experienceLevel: ExperienceLevel;
  workMode: WorkMode;
  companyTypes: CompanySizePreference[];
  languages: string[];
  highestEducation: string;
  fieldOfStudy: string;
  institution: string;
  graduationYear: string;
  certifications: string[];
  targetRole: string;
  goalType: GoalType;
  industries: string[];
  whyNow: string;
  timelineBucket: TimelineBucket;
  targetDate: string;
  weeklyHours: number;
  urgency: number;
  skills: string[];
  skillProficiencies: Record<string, number>; // rating 1-5
  skillSearch: string;
  learningStyle: LearningStyle;
  learningPace: LearningPace;
  preferredContent: string[];
  feedbackCadence: FeedbackCadence;
  strengths: string;
  blockers: string;
  motivation: string;
  constraints: string;
  budget: string;
  timeAvailability: string;
  weaknesses: string;
  obstacles: string;
};

type Summary = {
  goal: string;
  timeline: string;
  currentSkills: string[];
  readinessEstimate: number;
  readinessLabel: string;
  learningStyle: LearningStyle;
  contextPacket: string;
};

const storageVersion = 2; // Updated version for new draft format
const storagePrefix = "careeros:onboarding-draft";
const stepTitles = [
  "Personal Profile",
  "Education Profile",
  "Career Goal",
  "Timeline & Target Date",
  "Current Skills",
  "Learning Preferences",
  "AI Intelligence Questions"
];

const educationOptions = [
  "High school",
  "Associate degree",
  "Bachelor's degree",
  "Master's degree",
  "PhD",
  "Bootcamp",
  "Self-taught"
];
const goalTypes: GoalType[] = ["First role", "Promotion", "Career switch", "Portfolio reset", "Freelance"];
const workModes: WorkMode[] = ["Remote", "Hybrid", "On-site", "Flexible"];
const experienceOptions: { value: ExperienceLevel; label: string; desc: string }[] = [
  { value: "Student", label: "Student", desc: "Currently studying full-time" },
  { value: "Junior", label: "Junior", desc: "Early career (0-2 years)" },
  { value: "Mid", label: "Mid-Level", desc: "Builder with experience (2-5 years)" },
  { value: "Senior", label: "Senior", desc: "Experienced leader (5+ years)" },
  { value: "Switcher", label: "Switcher", desc: "Transitioning career tracks" }
];
const companyTypeOptions: CompanySizePreference[] = ["Startup", "Scaleup", "Enterprise", "Agency"];
const industryOptions = [
  "SaaS",
  "Fintech",
  "Healthtech",
  "AI & ML",
  "Consumer apps",
  "Developer tools",
  "E-commerce",
  "Design systems",
  "Edtech",
  "Cybersecurity"
];
const languageOptions = ["English", "Spanish", "German", "French", "Mandarin", "Japanese", "Hindi"];
const timelineOptions: TimelineBucket[] = ["0-3 months", "3-6 months", "6-12 months", "12+ months"];
const learningStylesInfo: { value: LearningStyle; label: string; desc: string }[] = [
  { value: "Hands-on", label: "Hands-On", desc: "Engage in practical projects, write actual code, sandbox labs." },
  { value: "Visual", label: "Visual", desc: "Video walkthroughs, concept diagrams, process charts." },
  { value: "Structured", label: "Structured", desc: "Comprehensive step-by-step documentation, books." },
  { value: "Mentored", label: "Mentored", desc: "1-on-1 code reviews, direct critiques, active guidance." },
  { value: "Reading", label: "Deep Reading", desc: "Articles, engineering whitepapers, API reference docs." }
];
const learningPaces: LearningPace[] = ["Steady", "Fast", "Immersive"];
const feedbackCadences: FeedbackCadence[] = ["Daily", "Weekly", "Biweekly"];
const contentOptions = ["Projects", "Videos", "Articles", "Live feedback", "Challenges", "Templates", "Flashcards"];

const skillCatalog = [
  "React",
  "Next.js",
  "TypeScript",
  "JavaScript",
  "Tailwind CSS",
  "Node.js",
  "Supabase",
  "PostgreSQL",
  "Figma",
  "Design systems",
  "Accessibility",
  "Testing",
  "Playwright",
  "Framer Motion",
  "API design",
  "System design",
  "Python",
  "SQL",
  "Git",
  "Communication",
  "Product thinking",
  "Portfolio writing",
  "Problem solving",
  "Prompt engineering",
  "Data analysis",
  "UX research",
  "GraphQL",
  "Docker"
];

function createInitialDraft(displayName?: string | null, email?: string | null): OnboardingDraft {
  return {
    fullName: displayName ?? email?.split("@")[0]?.replace(/[._-]/g, " ") ?? "",
    currentTitle: "",
    location: "",
    experienceLevel: "Junior",
    workMode: "Flexible",
    companyTypes: ["Startup"],
    languages: ["English"],
    highestEducation: "Bachelor's degree",
    fieldOfStudy: "",
    institution: "",
    graduationYear: "",
    certifications: [],
    targetRole: "",
    goalType: "First role",
    industries: ["SaaS"],
    whyNow: "",
    timelineBucket: "3-6 months",
    targetDate: "",
    weeklyHours: 12,
    urgency: 6,
    skills: [],
    skillProficiencies: {},
    skillSearch: "",
    learningStyle: "Hands-on",
    learningPace: "Steady",
    preferredContent: ["Projects"],
    feedbackCadence: "Weekly",
    strengths: "",
    blockers: "",
    motivation: "",
    constraints: "",
    budget: "",
    timeAvailability: "Flexible hours",
    weaknesses: "",
    obstacles: ""
  };
}


function toggleValue<T extends string>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatDateLabel(value: string) {
  if (!value) {
    return "No target date";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function buildReadinessEstimate(draft: OnboardingDraft) {
  const experienceScore: Record<ExperienceLevel, number> = {
    Student: 8,
    Junior: 14,
    Mid: 22,
    Senior: 28,
    Switcher: 12
  };

  const educationScore = {
    "High school": 4,
    "Associate degree": 7,
    "Bachelor's degree": 10,
    "Master's degree": 12,
    PhD: 13,
    Bootcamp: 8,
    "Self-taught": 9
  }[draft.highestEducation] ?? 6;

  // Richer skill score based on ratings
  let skillPoints = 0;
  draft.skills.forEach((skill) => {
    const prof = draft.skillProficiencies[skill] ?? 3;
    skillPoints += prof * 0.9; // Expert gets more weight
  });
  const skillsScore = clamp(Math.round(skillPoints), 0, 24);
  const commitmentScore = clamp(Math.round((draft.weeklyHours / 30) * 18), 0, 18);
  const clarityScore = clamp(
    [draft.targetRole, draft.whyNow, draft.strengths, draft.motivation].filter((item) => item.trim().length > 0).length * 4.5,
    0,
    18
  );
  const learningScore = {
    Visual: 7,
    "Hands-on": 9,
    Structured: 8,
    Mentored: 8,
    Reading: 5
  }[draft.learningStyle];

  const urgencyScore = draft.targetDate ? 6 : 0;
  const raw = 25 + experienceScore[draft.experienceLevel] + educationScore + skillsScore + commitmentScore + clarityScore + learningScore + urgencyScore;
  return clamp(Math.round(raw), 0, 100);
}

function readinessLabel(score: number) {
  if (score >= 85) return "Expert Momentum";
  if (score >= 70) return "Solid Foundation";
  if (score >= 50) return "Active Progression";
  return "Initial Diagnostic Stage";
}

function buildContextPacket(draft: OnboardingDraft, score: number) {
  const skillsText = draft.skills.length
    ? draft.skills.map((s) => `${s} (Rating: ${draft.skillProficiencies[s] ?? 3}/5)`).join(", ")
    : "None selected";
  
  return [
    `Profile: ${draft.fullName || "Anonymous User"} | ${draft.currentTitle || "Not set"} | Timezone: ${draft.location || "Not set"} | Level: ${draft.experienceLevel}`,
    `Company size preference: ${draft.companyTypes.join(", ") || "None"} | Professional Languages: ${draft.languages.join(", ")}`,
    `Education: ${draft.highestEducation} in ${draft.fieldOfStudy || "Not specified"} at ${draft.institution || "Not specified"}${draft.graduationYear ? `, completed ${draft.graduationYear}` : ""}`,
    `Certifications: ${draft.certifications.length ? draft.certifications.join(", ") : "None specified"}`,
    `Goal: ${draft.goalType} toward "${draft.targetRole || "Target role unspecified"}" in industries: ${draft.industries.join(", ")}.`,
    `Timeline: Target Date: ${formatDateLabel(draft.targetDate) || "Unset"}, Bucket: ${draft.timelineBucket}, hours: ${draft.weeklyHours}h/week, Urgency index: ${draft.urgency}/10 | Budget: ${draft.budget || "Not set"} | Availability: ${draft.timeAvailability || "Not set"}.`,
    `Skills & Ratings: ${skillsText}`,
    `Learning Rhythm: Style: ${draft.learningStyle}, Pace: ${draft.learningPace}, Cadence: ${draft.feedbackCadence}, Content preferred: ${draft.preferredContent.join(", ")}.`,
    `Diagnostic responses: Strengths=${draft.strengths || "n/a"}; Weaknesses=${draft.weaknesses || "n/a"}; Obstacles=${draft.obstacles || "n/a"}; Blockers=${draft.blockers || "n/a"}; Core Motivation=${draft.motivation || "n/a"}; Technical constraints=${draft.constraints || "n/a"}.`,
    `Assessment Score: ${score}/100 - Category: ${readinessLabel(score)}.`
  ].join("\n");
}

function buildSummary(draft: OnboardingDraft): Summary {
  const readinessEstimate = buildReadinessEstimate(draft);
  const timeline = `${draft.timelineBucket}${draft.targetDate ? ` · ${formatDateLabel(draft.targetDate)}` : ""} · ${draft.weeklyHours}h/week`;

  return {
    goal: `${draft.goalType} · ${draft.targetRole || "Target role not set"}`,
    timeline,
    currentSkills: draft.skills,
    readinessEstimate,
    readinessLabel: readinessLabel(readinessEstimate),
    learningStyle: draft.learningStyle,
    contextPacket: buildContextPacket(draft, readinessEstimate)
  };
}

function validateStep(step: number, draft: OnboardingDraft) {
  const errors: Record<string, string> = {};

  if (step === 0) {
    if (!draft.fullName.trim()) errors.fullName = "Please enter your full name";
    if (!draft.currentTitle.trim()) errors.currentTitle = "Enter your current title or current focus";
    if (!draft.location.trim()) errors.location = "Specify your current location or timezone";
    if (!draft.languages.length) errors.languages = "Select at least one professional language";
  }

  if (step === 1) {
    if (!draft.fieldOfStudy.trim()) errors.fieldOfStudy = "Enter your major or field of focus";
    if (!draft.institution.trim()) errors.institution = "Enter your school, bootcamp, or learning route";
    if (!draft.graduationYear.trim()) {
      errors.graduationYear = "Completion year is required";
    } else if (!/^\d{4}$/.test(draft.graduationYear.trim())) {
      errors.graduationYear = "Enter a valid 4-digit year";
    }
  }

  if (step === 2) {
    if (!draft.targetRole.trim()) errors.targetRole = "Define the role you are striving for";
    if (!draft.industries.length) errors.industries = "Pick at least one target industry";
    if (draft.whyNow.trim().length < 20) {
      errors.whyNow = `Write at least ${20 - draft.whyNow.trim().length} more characters to unlock AI assessment`;
    }
  }

  if (step === 3) {
    if (!draft.targetDate.trim()) errors.targetDate = "Please choose a milestone target date";
    if (Number.isNaN(draft.weeklyHours) || draft.weeklyHours <= 0) errors.weeklyHours = "Provide commitment hours";
    if (!draft.budget.trim()) errors.budget = "Please define your career investment budget bounds";
  }

  if (step === 4) {
    if (draft.skills.length < 5) {
      errors.skills = `Select at least ${5 - draft.skills.length} more skills to establish a base context`;
    }
  }

  if (step === 5) {
    if (!draft.preferredContent.length) errors.preferredContent = "Pick at least one learning medium";
  }

  if (step === 6) {
    if (draft.strengths.trim().length < 15) {
      errors.strengths = `Provide details on your strengths (need ${15 - draft.strengths.trim().length} more characters)`;
    }
    if (draft.blockers.trim().length < 10) {
      errors.blockers = `Outline current gaps or challenges (need ${10 - draft.blockers.trim().length} more characters)`;
    }
    if (draft.weaknesses.trim().length < 10) {
      errors.weaknesses = `Detail your main weaknesses (need ${10 - draft.weaknesses.trim().length} more characters)`;
    }
    if (draft.obstacles.trim().length < 10) {
      errors.obstacles = `Detail your main obstacles (need ${10 - draft.obstacles.trim().length} more characters)`;
    }
    if (draft.motivation.trim().length < 10) {
      errors.motivation = `Explain your core driving force (need ${10 - draft.motivation.trim().length} more characters)`;
    }
    if (draft.constraints.trim().length < 10) {
      errors.constraints = `List practical boundaries or write 'None currently' (need ${10 - draft.constraints.trim().length} more characters)`;
    }
  }

  return errors;
}

function SectionShell({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="liquid-panel rounded-[24px] p-6 sm:p-8">
      <div className="mb-6 relative z-10">
        <h2 className="heading-section bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">{title}</h2>
        <p className="body mt-2 text-slate-400">{description}</p>
      </div>
      <div className="relative z-10">
        {children}
      </div>
    </section>
  );
}

function ChipButton({
  active,
  children,
  onClick,
  size = "md"
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
  size?: "md" | "sm";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border font-semibold transition-all duration-200 cursor-pointer ${
        size === "sm" ? "px-3.5 py-1.5 text-xs" : "px-5 py-2.5 text-sm"
      } ${
        active
          ? "border-cyan-400/40 bg-[#082f49] text-cyan-200 shadow-[0_4px_12px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.12),0_0_15px_rgba(34,211,238,0.15)]"
          : "border-[#202028] bg-[#0c0c0e] text-slate-300 hover:border-[#30303c] hover:bg-[#141418] shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_4px_8px_rgba(0,0,0,0.4)]"
      } active:scale-95`}
    >
      {children}
    </button>
  );
}



export function OnboardingWizard({ userId, email, displayName }: OnboardingWizardProps) {
  const router = useRouter();
  const storageKey = `${storagePrefix}:${userId}`;
  const [draft, setDraft] = useState<OnboardingDraft>(() => createInitialDraft(displayName, email));
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hydrated, setHydrated] = useState(false);
  const [restored, setRestored] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<string>("Initializing Assessment...");
  const [submitting, setSubmitting] = useState(false);

  // Custom UI components states
  const [eduDropdownOpen, setEduDropdownOpen] = useState(false);
  const [newCert, setNewCert] = useState("");

  useEffect(() => {
    setHydrated(true);

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;

      const parsed = JSON.parse(raw) as { version?: number; step?: number; draft?: Partial<OnboardingDraft> };
      const draftToRestore = parsed.draft;
      // Allow draft restoration across versions, filling in defaults for new fields
      if (!draftToRestore) return;

      setDraft((current) => ({
        ...current,
        ...draftToRestore,
        skills: Array.isArray(draftToRestore.skills) ? draftToRestore.skills : current.skills,
        skillProficiencies: draftToRestore.skillProficiencies ?? current.skillProficiencies,
        languages: Array.isArray(draftToRestore.languages) ? draftToRestore.languages : current.languages,
        companyTypes: Array.isArray(draftToRestore.companyTypes) ? draftToRestore.companyTypes : current.companyTypes,
        certifications: Array.isArray(draftToRestore.certifications) ? draftToRestore.certifications : current.certifications,
        industries: Array.isArray(draftToRestore.industries) ? draftToRestore.industries : current.industries,
        preferredContent: Array.isArray(draftToRestore.preferredContent) ? draftToRestore.preferredContent : current.preferredContent
      }));
      if (typeof parsed.step === "number") {
        setStep(clamp(parsed.step, 0, 6));
      }
      setRestored(true);
      setStatus("Resumed your high-fidelity assessment draft.");
    } catch {
      // Ignore invalid drafts.
    }
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;

    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          version: storageVersion,
          step,
          draft,
          updatedAt: new Date().toISOString()
        })
      );
      setLastSaved(new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date()));
    } catch {
      // Local storage unavailable.
    }
  }, [draft, hydrated, step, storageKey]);

  const summary = useMemo(() => buildSummary(draft), [draft]);
  const stepErrors = useMemo(() => validateStep(step, draft), [draft, step]);

  function setDraftField<K extends keyof OnboardingDraft>(key: K, value: OnboardingDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key as string];
      return next;
    });
  }

  function addSkill(value: string) {
    const next = value.trim();
    if (!next) return;

    setDraft((current) => {
      if (current.skills.includes(next)) return current;
      return {
        ...current,
        skills: [...current.skills, next],
        skillProficiencies: { ...current.skillProficiencies, [next]: 3 }, // Default to Competent
        skillSearch: ""
      };
    });
    setErrors((current) => {
      if (!current.skills) return current;
      const nextErrors = { ...current };
      delete nextErrors.skills;
      return nextErrors;
    });
  }

  function removeSkill(value: string) {
    setDraft((current) => {
      const nextProf = { ...current.skillProficiencies };
      delete nextProf[value];
      return {
        ...current,
        skills: current.skills.filter((item) => item !== value),
        skillProficiencies: nextProf
      };
    });
  }

  function setSkillProficiency(skill: string, rating: number) {
    setDraft((current) => ({
      ...current,
      skillProficiencies: { ...current.skillProficiencies, [skill]: rating }
    }));
  }

  function addCertification() {
    const cert = newCert.trim();
    if (!cert) return;
    if (draft.certifications.includes(cert)) {
      setNewCert("");
      return;
    }
    setDraftField("certifications", [...draft.certifications, cert]);
    setNewCert("");
  }

  function removeCertification(cert: string) {
    setDraftField("certifications", draft.certifications.filter((item) => item !== cert));
  }

  function handleQuickDate(months: number) {
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    const dateStr = date.toISOString().split("T")[0];
    setDraftField("targetDate", dateStr);
  }

  const toast = {
    error(message: string) {
      setStatus(message);
    }
  };

  async function handleSubmit() {
    const allErrors = validateStep(0, draft);
    Object.assign(
      allErrors,
      validateStep(1, draft),
      validateStep(2, draft),
      validateStep(3, draft),
      validateStep(4, draft),
      validateStep(5, draft),
      validateStep(6, draft)
    );
    
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      const firstInvalidStep = [0, 1, 2, 3, 4, 5, 6].find((index) => Object.keys(validateStep(index, draft)).length > 0) ?? 0;
      setDirection(firstInvalidStep > step ? 1 : -1);
      setStep(firstInvalidStep);
      setStatus("Please address key assessment markers highlighted in red.");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      toast.error("Please establish backend config parameters to sync assessment profiles.");
      return;
    }

    setSubmitting(true);
    setStatus("AI Core analyzing assessment data. Generating roadmap state...");

    try {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (!user) {
        throw new Error("User not authenticated");
      }

      const goal = draft.targetRole.trim() || `${draft.goalType} path`;

      const profilePatch = {
        full_name: draft.fullName.trim() || displayName || email || null,
        goal,
        experience_level: draft.experienceLevel,
        readiness_score: summary.readinessEstimate,
        onboarding_complete: true
      };

      await seedWorkspace(supabase, user.id, draft.fullName.trim() || displayName || email || "Career Architect", goal, draft.experienceLevel, undefined, summary.readinessEstimate);
      await updateProfile(supabase, user.id, profilePatch);

      window.localStorage.removeItem(storageKey);
      router.replace("/dashboard");
    } catch (error) {
      console.error("SUBMIT ERROR", error);
      setStatus(error instanceof Error ? error.message : "Diagnostic sync failed. Retrying...");
    } finally {
      setSubmitting(false);
    }
  }

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 120 : -120,
      opacity: 0,
      filter: "blur(6px)"
    }),
    center: {
      x: 0,
      opacity: 1,
      filter: "blur(0px)"
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -120 : 120,
      opacity: 0,
      filter: "blur(6px)"
    })
  };

  const currentStepHasErrors = Object.keys(stepErrors).length > 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.85fr)]">
      {/* LEFT COLUMN: ONBOARDING STEP FLOW */}
      <div className="space-y-6">
        
        {/* PROGRESS INDICATOR CARD */}
        <div className="liquid-panel space-y-5 rounded-[24px] p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4 relative z-10">
            <div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400"></span>
                </span>
                <p className="caption text-cyan-400">AI Assessment Portal</p>
              </div>
              <h1 className="heading-hero mt-3 text-white">CareerOS Diagnostic Wizard</h1>
              <p className="body-large mt-3 max-w-2xl text-slate-400">
                Unlock targeted roadmaps by supplying rich details. Each milestone triggers direct AI parameters.
              </p>
            </div>
            <div className="rounded-full border border-cyan-400/25 bg-[#082f49] px-4 py-2 text-sm text-cyan-200 font-semibold shadow-[0_4px_12px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.08)]">
              Assessment Phase {step + 1} of 7
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-7 relative z-10">
            {stepTitles.map((title, index) => {
              const isActive = index === step;
              const isCompleted = index < step;
              return (
                <button
                  key={title}
                  type="button"
                  onClick={() => {
                    // Only allow back navigation or forward if previous steps have no errors
                    if (index < step) {
                      setDirection(-1);
                      setStep(index);
                    } else if (index > step) {
                      // Validate intermediate steps
                      let canNavigate = true;
                      for (let i = step; i < index; i++) {
                        if (Object.keys(validateStep(i, draft)).length > 0) {
                          canNavigate = false;
                          setStep(i);
                          setErrors(validateStep(i, draft));
                          setStatus(`Please fix required fields on ${stepTitles[i]}.`);
                          break;
                        }
                      }
                      if (canNavigate) {
                        setDirection(1);
                        setStep(index);
                        setStatus(null);
                      }
                    }
                  }}
                  className={`group relative rounded-xl border text-left px-3 py-3 text-xs transition-all duration-300 ${
                    isActive
                      ? "border-cyan-400/40 bg-[#082f49]/80 text-cyan-100 shadow-[0_4px_12px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.12),0_0_12px_rgba(34,211,238,0.1)]"
                      : isCompleted
                      ? "border-emerald-500/25 bg-[#022c22] text-emerald-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                      : "border-[#141418] bg-[#0c0c0e] text-slate-500 hover:border-[#202028] hover:bg-[#141418] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="caption font-bold">STEP 0{index + 1}</span>
                    {isCompleted && <Check className="h-3 w-3 text-emerald-400" />}
                  </div>
                  <p className="mt-1 font-semibold leading-tight line-clamp-1">{title}</p>
                </button>
              );
            })}
          </div>

          {/* Glowing continuous Progress bar */}
          <div className="h-2 overflow-hidden rounded-full bg-[#040405] relative border border-[#141418] shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)] z-10">
            <div
              className="absolute inset-y-0 left-0 bg-[#22d3ee] transition-all duration-500 shadow-[0_0_12px_rgba(34,211,238,0.6)]"
              style={{ width: `${((step + 1) / 7) * 100}%` }}
            />
          </div>
        </div>

        {/* STEP CONTENT SECTION WITH MULTI-DIRECTION TRANSITION */}
        <div className="overflow-hidden rounded-[24px]">
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* STEP 1: PERSONAL PROFILE */}
              {step === 0 && (
                <SectionShell
                  title="Personal Profile & Career Identity"
                  description="Give the AI engine identity metrics to align pacing, tone, and overall target company sizing."
                >
                  <div className="grid gap-6 md:grid-cols-2">
                    
                    {/* Full Name */}
                    <div className="space-y-2 md:col-span-1">
                      <span className="caption uppercase tracking-[0.2em] text-slate-400 font-medium flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-cyan-400" /> Full Name
                      </span>
                      <motion.div
                        animate={errors.fullName ? { x: [-5, 5, -5, 5, 0] } : {}}
                        className={`carved-input flex items-center gap-3 rounded-2xl px-4 py-3.5 focus-within:border-cyan-400/60 focus-within:shadow-[inset_0_2px_4px_rgba(0,0,0,0.95),0_0_15px_rgba(34,211,238,0.25)] transition-all duration-300 ${
                          errors.fullName ? "border-rose-500/40 bg-rose-500/10" : ""
                        }`}
                      >
                        <input
                          value={draft.fullName}
                          onChange={(e) => setDraftField("fullName", e.target.value)}
                          placeholder="What should CareerOS call you?"
                          className="w-full bg-transparent text-white outline-none placeholder:text-slate-500"
                        />
                      </motion.div>
                      {errors.fullName && <p className="text-xs text-rose-400 font-medium flex items-center gap-1"><HelpCircle className="h-3 w-3" /> {errors.fullName}</p>}
                    </div>

                    {/* Current Title */}
                    <div className="space-y-2 md:col-span-1">
                      <span className="caption uppercase tracking-[0.25em] text-slate-400 font-semibold flex items-center gap-1.5">
                        <Briefcase className="h-3.5 w-3.5 text-cyan-400" /> Current Title / Focus
                      </span>
                      <motion.div
                        animate={errors.currentTitle ? { x: [-5, 5, -5, 5, 0] } : {}}
                        className={`carved-input flex items-center gap-3 rounded-2xl px-4 py-3.5 focus-within:border-cyan-400/60 focus-within:shadow-[inset_0_2px_4px_rgba(0,0,0,0.95),0_0_15px_rgba(34,211,238,0.25)] transition-all duration-300 ${
                          errors.currentTitle ? "border-rose-500/40 bg-rose-500/10" : ""
                        }`}
                      >
                        <input
                          value={draft.currentTitle}
                          onChange={(e) => setDraftField("currentTitle", e.target.value)}
                          placeholder="e.g. Student, Freelance designer, Career switcher..."
                          className="w-full bg-transparent text-white outline-none placeholder:text-slate-500"
                        />
                      </motion.div>
                      {errors.currentTitle && <p className="text-xs text-rose-400 font-medium flex items-center gap-1"><HelpCircle className="h-3 w-3" /> {errors.currentTitle}</p>}
                    </div>

                    {/* Location */}
                    <div className="space-y-2 md:col-span-1">
                      <span className="caption uppercase tracking-[0.25em] text-slate-400 font-semibold flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-cyan-400" /> Location / Timezone
                      </span>
                      <motion.div
                        animate={errors.location ? { x: [-5, 5, -5, 5, 0] } : {}}
                        className={`carved-input flex items-center gap-3 rounded-2xl px-4 py-3.5 focus-within:border-cyan-400/60 focus-within:shadow-[inset_0_2px_4px_rgba(0,0,0,0.95),0_0_15px_rgba(34,211,238,0.25)] transition-all duration-300 ${
                          errors.location ? "border-rose-500/40 bg-rose-500/10" : ""
                        }`}
                      >
                        <input
                          value={draft.location}
                          onChange={(e) => setDraftField("location", e.target.value)}
                          placeholder="e.g. Berlin, Germany (GMT+2)"
                          className="w-full bg-transparent text-white outline-none placeholder:text-slate-500"
                        />
                      </motion.div>
                      {errors.location && <p className="text-xs text-rose-400 font-medium flex items-center gap-1"><HelpCircle className="h-3 w-3" /> {errors.location}</p>}
                    </div>

                    {/* Work Mode Preference */}
                    <div className="space-y-2 md:col-span-1">
                      <span className="caption uppercase tracking-[0.25em] text-slate-400 font-semibold flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 text-cyan-400" /> Ideal Work Environment
                      </span>
                      <div className="flex flex-wrap gap-2.5">
                        {workModes.map((option) => (
                          <ChipButton
                            key={option}
                            active={draft.workMode === option}
                            onClick={() => setDraftField("workMode", option)}
                          >
                            {option}
                          </ChipButton>
                        ))}
                      </div>
                    </div>

                    {/* Target Company Sizing Preferences (Multi-Select) */}
                    <div className="space-y-2 md:col-span-2">
                      <span className="caption uppercase tracking-[0.25em] text-slate-400 font-semibold flex items-center gap-1.5">
                        <Sliders className="h-3.5 w-3.5 text-cyan-400" /> Preferred Company Scale (Select Multiple)
                      </span>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {companyTypeOptions.map((type) => {
                          const active = draft.companyTypes.includes(type);
                          return (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setDraftField("companyTypes", toggleValue(draft.companyTypes, type))}
                              className={`flex flex-col rounded-2xl border p-4 text-left transition-all duration-300 cursor-pointer ${
                                active
                                  ? "border-cyan-400/40 bg-[#082f49]/80 text-white shadow-[0_4px_12px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.12),0_0_15px_rgba(34,211,238,0.15)]"
                                  : "border-[#202028] bg-[#0c0c0e] text-slate-400 hover:border-[#30303c] hover:bg-[#141418] shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_4px_8px_rgba(0,0,0,0.4)]"
                              } active:scale-[0.98]`}
                            >
                              <span className="small font-bold text-white">{type}</span>
                              <span className="mt-1 caption opacity-75">
                                {type === "Startup" && "Fast autonomy"}
                                {type === "Scaleup" && "High growth"}
                                {type === "Enterprise" && "Robust systems"}
                                {type === "Agency" && "Varied client portfolio"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Experience Level */}
                    <div className="space-y-2 md:col-span-2">
                      <span className="caption uppercase tracking-[0.25em] text-slate-400 font-semibold">
                        Overall Seniority Stage
                      </span>
                      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                        {experienceOptions.map(({ value, label, desc }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setDraftField("experienceLevel", value)}
                            className={`flex flex-col items-start rounded-2xl border p-4 text-left transition-all duration-300 cursor-pointer ${
                              draft.experienceLevel === value
                                ? "border-cyan-400/40 bg-[#082f49]/80 text-cyan-100 shadow-[0_4px_12px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.12),0_0_15px_rgba(34,211,238,0.15)]"
                                  : "border-[#202028] bg-[#0c0c0e] text-slate-400 hover:border-[#30303c] hover:bg-[#141418] shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_4px_8px_rgba(0,0,0,0.4)]"
                            } active:scale-[0.98]`}
                          >
                            <span className="small font-bold text-white">{label}</span>
                            <span className="mt-1 caption text-slate-400">{desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Language Selection */}
                    <div className="space-y-2 md:col-span-2">
                      <span className="caption text-slate-400 flex items-center gap-1.5">
                        Professional Languages (Select at least one)
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {languageOptions.map((lang) => {
                          const isSelected = draft.languages.includes(lang);
                          return (
                            <ChipButton
                              key={lang}
                              active={isSelected}
                              onClick={() => setDraftField("languages", toggleValue(draft.languages, lang))}
                              size="sm"
                            >
                              {lang}
                            </ChipButton>
                          );
                        })}
                      </div>
                      {errors.languages && <p className="text-xs text-rose-400 font-medium flex items-center gap-1"><HelpCircle className="h-3 w-3" /> {errors.languages}</p>}
                    </div>

                  </div>
                </SectionShell>
              )}

              {/* STEP 2: EDUCATION PROFILE */}
              {step === 1 && (
                <SectionShell
                  title="Education & Training Profile"
                  description="Help the system understand your foundational learning paths and credentials to contextualize the initial assessment depth."
                >
                  <div className="grid gap-6 md:grid-cols-2">

                    {/* Custom Education Dropdown */}
                    <div className="space-y-2 md:col-span-1 relative">
                      <span className="caption text-slate-400">Highest Education Level</span>
                      <button
                        type="button"
                        onClick={() => setEduDropdownOpen(!eduDropdownOpen)}
                        className="tactile-btn w-full flex items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-left text-white outline-none"
                      >
                        <span className="font-semibold">{draft.highestEducation}</span>
                        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-300 ${eduDropdownOpen ? "rotate-180" : ""}`} />
                      </button>

                      <AnimatePresence>
                        {eduDropdownOpen && (
                          <motion.ul
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 8 }}
                            transition={{ duration: 0.2 }}
                            className="absolute z-50 w-full mt-2 rounded-2xl border border-[#141418] bg-[#0c0c0e] p-2 shadow-[0_30px_90px_rgba(0,0,0,0.95)] max-h-60 overflow-y-auto"
                          >
                            {educationOptions.map((option) => (
                              <li key={option}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDraftField("highestEducation", option);
                                    setEduDropdownOpen(false);
                                  }}
                                  className={`w-full flex items-center justify-between rounded-xl px-4 py-2.5 text-left text-sm transition ${
                                    draft.highestEducation === option
                                      ? "bg-[#082f49]/80 text-cyan-200 font-semibold"
                                      : "text-slate-300 hover:bg-[#141418]"
                                  }`}
                                >
                                  {option}
                                  {draft.highestEducation === option && <Check className="h-4 w-4 text-cyan-400" />}
                                </button>
                              </li>
                            ))}
                          </motion.ul>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Field of Study */}
                    <div className="space-y-2 md:col-span-1">
                      <span className="caption uppercase tracking-[0.25em] text-slate-400 font-semibold">Major / Focus Area</span>
                      <motion.div
                        animate={errors.fieldOfStudy ? { x: [-5, 5, -5, 5, 0] } : {}}
                        className={`carved-input flex items-center gap-3 rounded-2xl px-4 py-3.5 focus-within:border-cyan-400/60 focus-within:shadow-[inset_0_2px_4px_rgba(0,0,0,0.95),0_0_15px_rgba(34,211,238,0.25)] transition-all duration-300 ${
                          errors.fieldOfStudy ? "border-rose-500/40 bg-rose-500/10" : ""
                        }`}
                      >
                        <input
                          value={draft.fieldOfStudy}
                          onChange={(e) => setDraftField("fieldOfStudy", e.target.value)}
                          placeholder="e.g. Software Engineering, UX Design, Psychology..."
                          className="w-full bg-transparent text-white outline-none placeholder:text-slate-500"
                        />
                      </motion.div>
                      {errors.fieldOfStudy && <p className="text-xs text-rose-400 font-medium flex items-center gap-1"><HelpCircle className="h-3 w-3" /> {errors.fieldOfStudy}</p>}

                      {/* Quick Field Suggestions */}
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {["Computer Science", "Information Tech", "Human-Computer Interaction", "Business Design", "Digital Media", "Self-Curated"].map((sug) => (
                          <button
                            key={sug}
                            type="button"
                            onClick={() => setDraftField("fieldOfStudy", sug)}
                            className="tactile-btn text-[10px] rounded-full px-2.5 py-1 text-slate-400"
                          >
                            {sug}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* School / Institution */}
                    <div className="space-y-2 md:col-span-1">
                      <span className="caption uppercase tracking-[0.25em] text-slate-400 font-semibold flex items-center gap-1.5">
                        <GraduationCap className="h-3.5 w-3.5 text-cyan-400" /> Institution / Provider
                      </span>
                      <motion.div
                        animate={errors.institution ? { x: [-5, 5, -5, 5, 0] } : {}}
                        className={`carved-input flex items-center gap-3 rounded-2xl px-4 py-3.5 focus-within:border-cyan-400/60 focus-within:shadow-[inset_0_2px_4px_rgba(0,0,0,0.95),0_0_15px_rgba(34,211,238,0.25)] transition-all duration-300 ${
                          errors.institution ? "border-rose-500/40 bg-rose-500/10" : ""
                        }`}
                      >
                        <input
                          value={draft.institution}
                          onChange={(e) => setDraftField("institution", e.target.value)}
                          placeholder="e.g. Stanford University, Ironhack Bootcamp, Self-Directed"
                          className="w-full bg-transparent text-white outline-none placeholder:text-slate-500"
                        />
                      </motion.div>
                      {errors.institution && <p className="text-xs text-rose-400 font-medium flex items-center gap-1"><HelpCircle className="h-3 w-3" /> {errors.institution}</p>}
                    </div>

                    {/* Graduation Year */}
                    <div className="space-y-2 md:col-span-1">
                      <span className="caption uppercase tracking-[0.25em] text-slate-400 font-semibold flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5 text-cyan-400" /> Year of Completion
                      </span>
                      <motion.div
                        animate={errors.graduationYear ? { x: [-5, 5, -5, 5, 0] } : {}}
                        className={`carved-input flex items-center gap-3 rounded-2xl px-4 py-3.5 focus-within:border-cyan-400/60 focus-within:shadow-[inset_0_2px_4px_rgba(0,0,0,0.95),0_0_15px_rgba(34,211,238,0.25)] transition-all duration-300 ${
                          errors.graduationYear ? "border-rose-500/40 bg-rose-500/10" : ""
                        }`}
                      >
                        <input
                          value={draft.graduationYear}
                          onChange={(e) => setDraftField("graduationYear", e.target.value)}
                          placeholder="e.g. 2026"
                          inputMode="numeric"
                          className="w-full bg-transparent text-white outline-none placeholder:text-slate-500"
                        />
                      </motion.div>
                      {errors.graduationYear && <p className="text-xs text-rose-400 font-medium flex items-center gap-1"><HelpCircle className="h-3 w-3" /> {errors.graduationYear}</p>}
                    </div>

                    {/* Certifications / Professional Credentials (Rich Input Chips) */}
                    <div className="space-y-2 md:col-span-2">
                      <span className="caption uppercase tracking-[0.25em] text-slate-400 font-semibold flex items-center gap-1.5">
                        <Award className="h-3.5 w-3.5 text-cyan-400" /> Certifications & Achievements (Optional)
                      </span>
                      
                      <div className="flex gap-2">
                        <input
                          value={newCert}
                          onChange={(e) => setNewCert(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addCertification();
                            }
                          }}
                          placeholder="Add e.g. AWS Cloud Practitioner, Meta Front-End Cert and press Add/Enter"
                          className="carved-input w-full rounded-2xl py-3 px-4 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/60 focus:shadow-[inset_0_2px_4px_rgba(0,0,0,0.95),0_0_15px_rgba(34,211,238,0.25)] transition-all"
                        />
                        <button
                          type="button"
                          onClick={addCertification}
                          className="tactile-btn px-5 rounded-2xl bg-white text-black font-semibold text-sm hover:bg-slate-100 shrink-0"
                        >
                          Add
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-3">
                        {draft.certifications.length ? (
                          draft.certifications.map((cert) => (
                            <div
                              key={cert}
                              className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/25 bg-[#082f49] pl-3.5 pr-2 py-1.5 text-xs text-cyan-200 font-semibold shadow-[0_2px_6px_rgba(0,0,0,0.6)] transition"
                            >
                              <span>{cert}</span>
                              <button
                                type="button"
                                onClick={() => removeCertification(cert)}
                                className="rounded-full p-0.5 hover:bg-white/10 text-slate-400 hover:text-white transition"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))
                        ) : (
                          <span className="text-xs text-slate-500 italic">No certifications added yet. Press enter to add multiple.</span>
                        )}
                      </div>
                    </div>

                  </div>
                </SectionShell>
              )}

              {/* STEP 3: CAREER GOAL */}
              {step === 2 && (
                <SectionShell
                  title="Target Career Milestone"
                  description="Identify exactly where you want to go so CareerOS can calibrate optimal progression lanes and industry alignments."
                >
                  <div className="grid gap-6">

                    {/* Target Role */}
                    <div className="space-y-2">
                      <span className="caption uppercase tracking-[0.25em] text-slate-400 font-semibold flex items-center gap-1.5">
                        <Target className="h-3.5 w-3.5 text-cyan-400" /> Target Professional Role
                      </span>
                      <motion.div
                        animate={errors.targetRole ? { x: [-5, 5, -5, 5, 0] } : {}}
                        className={`carved-input flex items-center gap-3 rounded-2xl px-4 py-3.5 focus-within:border-cyan-400/60 focus-within:shadow-[inset_0_2px_4px_rgba(0,0,0,0.95),0_0_15px_rgba(34,211,238,0.25)] transition-all duration-300 ${
                          errors.targetRole ? "border-rose-500/40 bg-rose-500/10" : ""
                        }`}
                      >
                        <input
                          value={draft.targetRole}
                          onChange={(e) => setDraftField("targetRole", e.target.value)}
                          placeholder="e.g. Senior Frontend Architect, Lead Product Designer, Machine Learning Engineer..."
                          className="w-full bg-transparent text-white outline-none placeholder:text-slate-500"
                        />
                      </motion.div>
                      {errors.targetRole && <p className="text-xs text-rose-400 font-medium flex items-center gap-1"><HelpCircle className="h-3 w-3" /> {errors.targetRole}</p>}
                    </div>

                    {/* Goal Type Selection */}
                    <div className="space-y-2">
                      <span className="caption uppercase tracking-[0.25em] text-slate-400 font-semibold">Primary Objective Category</span>
                      <div className="flex flex-wrap gap-2.5">
                        {goalTypes.map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => setDraftField("goalType", option)}
                            className={`flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition-all duration-200 cursor-pointer ${
                              draft.goalType === option
                                ? "border-cyan-400/40 bg-[#082f49] text-cyan-200 shadow-[0_4px_12px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.12),0_0_15px_rgba(34,211,238,0.15)]"
                                : "border-[#202028] bg-[#0c0c0e] text-slate-300 hover:border-[#30303c] hover:bg-[#141418] shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_4px_8px_rgba(0,0,0,0.4)]"
                            } active:scale-95`}
                          >
                            {draft.goalType === option && <Check className="h-4 w-4 text-cyan-400 animate-scale-up" />}
                            <span>{option}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Target Industries */}
                    <div className="space-y-2">
                      <span className="caption uppercase tracking-[0.25em] text-slate-400 font-semibold">Target Verticals / Industries (Select Multiple)</span>
                      <div className="flex flex-wrap gap-2">
                        {industryOptions.map((vertical) => {
                          const selected = draft.industries.includes(vertical);
                          return (
                            <button
                              key={vertical}
                              type="button"
                              onClick={() => setDraftField("industries", toggleValue(draft.industries, vertical))}
                              className={`rounded-xl border px-3 py-2 text-xs font-bold transition-all duration-200 cursor-pointer ${
                                selected
                                  ? "border-cyan-400/40 bg-[#082f49] text-cyan-200 shadow-[0_4px_12px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.12),0_0_10px_rgba(34,211,238,0.1)]"
                                  : "border-[#202028] bg-[#0c0c0e] text-slate-400 hover:border-[#30303c] hover:bg-[#141418] shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_4px_8px_rgba(0,0,0,0.4)]"
                              } active:scale-95`}
                            >
                              <span className="flex items-center gap-1">
                                {selected && <Check className="h-3 w-3 text-cyan-400" />}
                                {vertical}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      {errors.industries && <p className="text-xs text-rose-400 font-medium flex items-center gap-1"><HelpCircle className="h-3 w-3" /> {errors.industries}</p>}
                    </div>

                    {/* Why Now? Description (with min length indicator) */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="caption uppercase tracking-[0.25em] text-slate-400 font-semibold">Why Now? What Catalyzed This Pivot?</span>
                        <div className="flex items-center gap-2 text-xs">
                          <span className={`font-semibold ${draft.whyNow.trim().length >= 20 ? "text-emerald-400" : "text-amber-400"}`}>
                            {draft.whyNow.trim().length} / 20 chars min
                          </span>
                        </div>
                      </div>
                      <motion.div
                        animate={errors.whyNow ? { x: [-5, 5, -5, 5, 0] } : {}}
                        className={`carved-input rounded-2xl p-1 focus-within:border-cyan-400/60 focus-within:shadow-[inset_0_2px_4px_rgba(0,0,0,0.95),0_0_15px_rgba(34,211,238,0.25)] transition-all duration-300 ${
                          errors.whyNow ? "border-rose-500/40 bg-rose-500/10" : ""
                        }`}
                      >
                        <textarea
                          value={draft.whyNow}
                          onChange={(e) => setDraftField("whyNow", e.target.value)}
                          rows={4}
                          placeholder="Outline what prompted this pivot. e.g. 'I spent 3 years in standard agency work and feel limited by static builds. I want to shift into product development...'"
                          className="w-full bg-transparent px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 resize-none"
                        />
                      </motion.div>
                      {errors.whyNow && <p className="text-xs text-rose-400 font-medium flex items-center gap-1"><HelpCircle className="h-3 w-3" /> {errors.whyNow}</p>}
                    </div>

                  </div>
                </SectionShell>
              )}

              {/* STEP 4: TIMELINE & TARGET DATE */}
              {step === 3 && (
                <SectionShell
                  title="Execution Window & commitment"
                  description="Determine exact target markers. Calibrating this step ensures realistic roadmap pacing without building fatigue."
                >
                  <div className="grid gap-6 md:grid-cols-2">

                    {/* Timeline Bucket */}
                    <div className="space-y-2 md:col-span-2">
                      <span className="caption uppercase tracking-[0.25em] text-slate-400 font-semibold flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-cyan-400" /> High-Level Duration Bucket
                      </span>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {timelineOptions.map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => setDraftField("timelineBucket", option)}
                            className={`rounded-2xl border p-4 text-left transition-all duration-300 cursor-pointer ${
                              draft.timelineBucket === option
                                ? "border-cyan-400/40 bg-[#082f49] shadow-[0_4px_12px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.12),0_0_15px_rgba(34,211,238,0.15)] text-cyan-100 font-medium"
                                : "border-[#202028] bg-[#0c0c0e] text-slate-400 hover:border-[#30303c] hover:bg-[#141418] shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_4px_8px_rgba(0,0,0,0.4)]"
                            }`}
                          >
                            <span>{option}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Target Date Custom Picker with Quick Selectors */}
                    <div className="space-y-2 md:col-span-1">
                      <span className="caption uppercase tracking-[0.2em] text-slate-400 font-medium">Precise Target Milestone Date</span>
                      
                      <motion.div
                        animate={errors.targetDate ? { x: [-5, 5, -5, 5, 0] } : {}}
                        className={`carved-input flex items-center gap-3 rounded-2xl px-4 py-3.5 focus-within:border-cyan-400/60 focus-within:shadow-[inset_0_2px_4px_rgba(0,0,0,0.95),0_0_15px_rgba(34,211,238,0.25)] transition-all duration-300 ${
                          errors.targetDate ? "border-rose-500/40 bg-rose-500/10" : ""
                        }`}
                      >
                        <input
                          type="date"
                          value={draft.targetDate}
                          onChange={(e) => setDraftField("targetDate", e.target.value)}
                          className="w-full bg-transparent text-white outline-none focus:outline-none dark:[color-scheme:dark]"
                        />
                      </motion.div>
                      {errors.targetDate && <p className="text-xs text-rose-400 font-medium flex items-center gap-1"><HelpCircle className="h-3 w-3" /> {errors.targetDate}</p>}

                      {/* Quick Dates Helper Buttons */}
                      <div className="flex flex-wrap gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => handleQuickDate(3)}
                          className="tactile-btn text-[10px] rounded-full px-3 py-1.5 text-slate-300 transition"
                        >
                          +3 Months
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickDate(6)}
                          className="tactile-btn text-[10px] rounded-full px-3 py-1.5 text-slate-300 transition"
                        >
                          +6 Months
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickDate(12)}
                          className="tactile-btn text-[10px] rounded-full px-3 py-1.5 text-slate-300 transition"
                        >
                          +1 Year
                        </button>
                      </div>
                    </div>

                    {/* Weekly Commitment Slider */}
                    <div className="space-y-2 md:col-span-1">
                      <span className="caption uppercase tracking-[0.2em] text-slate-400 font-medium">Weekly Study / Focus commitment</span>
                      <div className="rounded-2xl border border-[#141417] bg-[#0c0c0e] p-5 relative overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                        
                        {/* Glow track effect */}
                        <div className="absolute inset-x-0 bottom-0 h-1.5 bg-cyan-400 opacity-20 pointer-events-none" />

                        <input
                          type="range"
                          min={2}
                          max={35}
                          value={draft.weeklyHours}
                          onChange={(e) => setDraftField("weeklyHours", Number(e.target.value))}
                          className="w-full accent-cyan-400 bg-[#040405] rounded-lg cursor-pointer border border-[#141417] transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]"
                        />
                        <div className="mt-3.5 flex items-center justify-between text-xs text-slate-400 font-medium">
                          <span>2 hours</span>
                          <span className="text-white font-medium bg-[#082f49] border border-cyan-400/25 px-2 py-0.5 rounded-md shadow-[0_4px_8px_rgba(0,0,0,0.4),0_0_10px_rgba(34,211,238,0.1)]">
                            {draft.weeklyHours} hrs / week
                          </span>
                          <span>35 hours</span>
                        </div>

                        {/* Pace assessment contextual helper text */}
                        <p className="mt-4 text-[11px] leading-relaxed text-slate-400 border-t border-white/5 pt-3">
                          {draft.weeklyHours < 10 && "Steady Pace · Designed to coexist with demanding full-time professional constraints."}
                          {draft.weeklyHours >= 10 && draft.weeklyHours < 20 && "Focused Pace · Strong progression rate. Optimal for self-paced builders."}
                          {draft.weeklyHours >= 20 && "Immersive Pace · Career-focused boot camp velocity. Expect massive weekly development loops."}
                        </p>
                      </div>
                    </div>

                    {/* Career Budget Bounds */}
                    <div className="space-y-2 md:col-span-1">
                      <span className="caption uppercase tracking-[0.2em] text-slate-400 font-medium">Career Study Budget / Expected Investment</span>
                      <motion.div
                        animate={errors.budget ? { x: [-5, 5, -5, 5, 0] } : {}}
                        className={`carved-input flex items-center gap-3 rounded-2xl px-4 py-3.5 focus-within:border-cyan-400/60 focus-within:shadow-[inset_0_2px_4px_rgba(0,0,0,0.95),0_0_15px_rgba(34,211,238,0.25)] transition-all duration-300 ${
                          errors.budget ? "border-rose-500/40 bg-rose-500/10" : ""
                        }`}
                      >
                        <input
                          value={draft.budget}
                          onChange={(e) => setDraftField("budget", e.target.value)}
                          placeholder="e.g. Under $100/mo, Flexible, Self-funded..."
                          className="w-full bg-transparent text-white outline-none placeholder:text-slate-500"
                        />
                      </motion.div>
                      {errors.budget && <p className="text-xs text-rose-400 font-medium flex items-center gap-1"><HelpCircle className="h-3 w-3" /> {errors.budget}</p>}
                    </div>

                    {/* Time Availability Options */}
                    <div className="space-y-2 md:col-span-1">
                      <span className="caption uppercase tracking-[0.25em] text-slate-400 font-semibold">Time Availability Pattern</span>
                      <div className="flex flex-wrap gap-2.5">
                        {["Evenings only", "Weekends only", "Flexible hours", "Full time availability"].map((avail) => (
                          <button
                            key={avail}
                            type="button"
                            onClick={() => setDraftField("timeAvailability", avail)}
                            className={`rounded-full px-4 py-2 border transition-all cursor-pointer ${
                              draft.timeAvailability === avail
                                ? "border-cyan-400/40 bg-[#082f49] text-cyan-100 shadow-[0_4px_12px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.12),0_0_10px_rgba(34,211,238,0.1)]"
                                : "border-[#202028] bg-[#0c0c0e] text-slate-300 hover:border-[#30303c] hover:bg-[#141418] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                            } text-xs active:scale-95`}
                          >
                            {avail}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Urgency Matrix */}
                    <div className="space-y-2 md:col-span-2">
                      <span className="caption uppercase tracking-[0.25em] text-slate-400 font-semibold">Urgency Index (1 to 10)</span>
                      <div className="rounded-2xl border border-[#141417] bg-[#0c0c0e] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                        <input
                          type="range"
                          min={1}
                          max={10}
                          value={draft.urgency}
                          onChange={(e) => setDraftField("urgency", Number(e.target.value))}
                          className="w-full accent-cyan-400 bg-[#040405] rounded-lg cursor-pointer border border-[#141417] shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]"
                        />
                        <div className="mt-3.5 flex items-center justify-between text-xs text-slate-400 font-medium">
                          <span>Steady Growth (1)</span>
                          <span className="text-white font-bold bg-[#082f49] border border-cyan-400/25 px-2 py-0.5 rounded-md shadow-[0_4px_8px_rgba(0,0,0,0.4)]">
                            Urgency index: {draft.urgency}/10
                          </span>
                          <span>Critical Pivot (10)</span>
                        </div>
                      </div>
                    </div>

                  </div>
                </SectionShell>
              )}

              {/* STEP 5: CURRENT SKILLS */}
              {step === 4 && (
                <SectionShell
                  title="Skills Profile & Rating Matrix"
                  description="Pinpoint your current capabilities. CareerOS maps these base scores directly to recommendations so you never start from zero."
                >
                  <div className="space-y-6">

                    {/* Search and Auto-Complete Panel */}
                    <div className="space-y-2 relative">
                      <span className="caption uppercase tracking-[0.25em] text-slate-400 font-semibold">Search or Add Specific Technical Competencies</span>
                      
                      <div className="relative flex items-center">
                        <Search className="absolute left-4 h-4 w-4 text-slate-500 pointer-events-none" />
                        <input
                          value={draft.skillSearch}
                          onChange={(e) => setDraftField("skillSearch", e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addSkill(draft.skillSearch);
                            }
                          }}
                          placeholder="Type a skill (e.g. Next.js, Figma, SQL) and press Enter to select..."
                          className="carved-input w-full py-3.5 pl-12 pr-4 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/60 focus:shadow-[inset_0_2px_4px_rgba(0,0,0,0.95),0_0_15px_rgba(34,211,238,0.25)] transition-all duration-300"
                        />
                      </div>

                      {/* Dropdown Floating Search results */}
                      {draft.skillSearch.trim().length > 0 && (
                        <div className="absolute z-50 w-full mt-2 rounded-2xl border border-[#141418] bg-[#0c0c0e] p-2 shadow-[0_30px_90px_rgba(0,0,0,0.95)] max-h-48 overflow-y-auto">
                          {skillCatalog
                            .filter((item) => item.toLowerCase().includes(draft.skillSearch.toLowerCase()))
                            .filter((item) => !draft.skills.includes(item))
                            .map((matchingSkill) => (
                              <button
                                key={matchingSkill}
                                type="button"
                                onClick={() => addSkill(matchingSkill)}
                                className="w-full text-left rounded-xl px-4 py-2.5 text-sm text-slate-300 hover:bg-[#082f49]/80 hover:text-white transition"
                              >
                                {matchingSkill}
                              </button>
                            ))}
                          {skillCatalog.filter((item) => item.toLowerCase().includes(draft.skillSearch.toLowerCase())).length === 0 && (
                            <button
                              type="button"
                              onClick={() => addSkill(draft.skillSearch)}
                              className="w-full text-left rounded-xl px-4 py-2.5 text-sm text-cyan-200 hover:bg-[#082f49]/80 transition"
                            >
                              Add Custom: &quot;{draft.skillSearch}&quot;
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* SELECTED SKILLS GRID WITH 5-DOT PROFICIENCY RATINGS */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="caption uppercase tracking-[0.25em] text-slate-400 font-semibold">Your Selected Competencies (Min 5 Required)</span>
                        <span className={`text-xs font-semibold ${draft.skills.length >= 5 ? "text-emerald-400" : "text-amber-400"}`}>
                          {draft.skills.length} / 5 selected
                        </span>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3">
                        {draft.skills.length ? (
                          draft.skills.map((skill) => {
                            const prof = draft.skillProficiencies[skill] ?? 3;
                            return (
                              <div
                                key={skill}
                                className="flex flex-col justify-between rounded-2xl border border-[#202028] bg-[#0c0c0e] p-4 shadow-[0_4px_12px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.03)] transition-all duration-300 hover:border-cyan-400/40 hover:bg-[#141418]"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <span className="font-semibold text-sm text-white line-clamp-1">{skill}</span>
                                  <button
                                    type="button"
                                    onClick={() => removeSkill(skill)}
                                    className="rounded-full p-1 hover:bg-white/10 text-slate-400 hover:text-white transition shrink-0"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>

                                <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                    {prof === 1 && "Novice"}
                                    {prof === 2 && "Advanced"}
                                    {prof === 3 && "Competent"}
                                    {prof === 4 && "Proficient"}
                                    {prof === 5 && "Expert"}
                                  </span>

                                  {/* 5 Rating Dots */}
                                  <div className="flex items-center gap-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <button
                                        key={star}
                                        type="button"
                                        onClick={() => setSkillProficiency(skill, star)}
                                        className={`h-2.5 w-2.5 rounded-full transition-all duration-200 cursor-pointer ${
                                          star <= prof
                                            ? "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"
                                            : "bg-[#202028] hover:bg-[#30303c]"
                                        }`}
                                      />
                                    ))}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="col-span-full rounded-2xl border border-dashed border-[#202028] bg-[#040405] p-6 text-center text-slate-500 italic text-sm shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]">
                            No competencies selected. Search above or select suggestions below to populate.
                          </div>
                        )}
                      </div>
                      {errors.skills && <p className="text-xs text-rose-400 font-medium flex items-center gap-1"><HelpCircle className="h-3 w-3" /> {errors.skills}</p>}
                    </div>

                    {/* SUGGESTED SKILLS MATRIX (Categorized) */}
                    <div className="space-y-3 pt-3 border-t border-white/5">
                      <span className="caption uppercase tracking-[0.25em] text-slate-400 font-semibold">Suggested Skill Sets</span>
                      
                      <div className="space-y-4">
                        {/* Categorized suggestions list */}
                        {[
                          { category: "Frontend Core", items: ["React", "TypeScript", "Tailwind CSS", "Next.js", "JavaScript", "Framer Motion", "Accessibility"] },
                          { category: "Backend & Systems", items: ["Node.js", "Supabase", "PostgreSQL", "SQL", "Docker", "API design", "System design"] },
                          { category: "Design & UX Strategy", items: ["Figma", "Design systems", "UX research", "Product thinking", "Communication"] }
                        ].map((cat) => (
                          <div key={cat.category} className="space-y-2">
                            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{cat.category}</h4>
                            <div className="flex flex-wrap gap-2">
                              {cat.items
                                .filter((item) => !draft.skills.includes(item))
                                .map((item) => (
                                  <button
                                    key={item}
                                    type="button"
                                    onClick={() => addSkill(item)}
                                    className="tactile-btn inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs text-slate-300 transition"
                                  >
                                    <Plus className="h-3 w-3 text-cyan-400" />
                                    <span>{item}</span>
                                  </button>
                                ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                </SectionShell>
              )}

              {/* STEP 6: LEARNING PREFERENCES */}
              {step === 5 && (
                <SectionShell
                  title="Cognitive Match & Learning style"
                  description="Align roadmap output formats with how you naturally process core technical information."
                >
                  <div className="grid gap-6">

                    {/* Learning Style Cards (2 columns, descriptions & icons) */}
                    <div className="space-y-2">
                      <span className="caption uppercase tracking-[0.25em] text-slate-400 font-semibold flex items-center gap-1.5">
                        <Brain className="h-3.5 w-3.5 text-cyan-400" /> Primary Learning Style Mode
                      </span>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {learningStylesInfo.map(({ value, label, desc }) => {
                          const isActive = draft.learningStyle === value;
                          return (
                            <button
                              key={value}
                              type="button"
                              onClick={() => setDraftField("learningStyle", value)}
                              className={`flex flex-col items-start rounded-2xl border p-5 text-left transition-all duration-300 cursor-pointer ${
                                isActive
                                  ? "border-cyan-400/40 bg-[#082f49]/80 text-cyan-100 shadow-[0_4px_12px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.12),0_0_20px_rgba(34,211,238,0.15)]"
                                  : "border-[#202028] bg-[#0c0c0e] text-slate-400 hover:border-[#30303c] hover:bg-[#141418] shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_4px_8px_rgba(0,0,0,0.4)]"
                              } active:scale-[0.98]`}
                            >
                              <div className="flex items-center gap-2">
                                <span className={`rounded-lg p-1.5 transition ${isActive ? "bg-cyan-400/20 text-cyan-300" : "bg-[#141418] text-slate-400 border border-[#202028]"}`}>
                                  {value === "Hands-on" && <Sliders className="h-4 w-4" />}
                                  {value === "Visual" && <Layout className="h-4 w-4" />}
                                  {value === "Structured" && <BookOpen className="h-4 w-4" />}
                                  {value === "Mentored" && <MessageSquare className="h-4 w-4" />}
                                  {value === "Reading" && <FileText className="h-4 w-4" />}
                                </span>
                                <span className="font-bold text-sm text-white">{label}</span>
                              </div>
                              <span className="mt-3.5 text-xs text-slate-400 leading-normal">{desc}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Learning Pace */}
                    <div className="space-y-2">
                      <span className="caption uppercase tracking-[0.25em] text-slate-400 font-semibold">Absorption Pace</span>
                      <div className="flex flex-wrap gap-2.5">
                        {learningPaces.map((pace) => (
                          <ChipButton
                            key={pace}
                            active={draft.learningPace === pace}
                            onClick={() => setDraftField("learningPace", pace)}
                          >
                            {pace}
                          </ChipButton>
                        ))}
                      </div>
                    </div>

                    {/* Preferred content formats */}
                    <div className="space-y-2">
                      <span className="caption uppercase tracking-[0.25em] text-slate-400 font-semibold">Preferred content delivery mediums</span>
                      <div className="flex flex-wrap gap-2">
                        {contentOptions.map((medium) => {
                          const isSelected = draft.preferredContent.includes(medium);
                          return (
                            <ChipButton
                              key={medium}
                              active={isSelected}
                              onClick={() => setDraftField("preferredContent", toggleValue(draft.preferredContent, medium))}
                              size="sm"
                            >
                              {medium}
                            </ChipButton>
                          );
                        })}
                      </div>
                      {errors.preferredContent && <p className="text-xs text-rose-400 font-medium flex items-center gap-1"><HelpCircle className="h-3 w-3" /> {errors.preferredContent}</p>}
                    </div>

                    {/* Feedback loops */}
                    <div className="space-y-2">
                      <span className="caption uppercase tracking-[0.25em] text-slate-400 font-semibold">Ideal Review Cadence</span>
                      <div className="flex flex-wrap gap-2.5">
                        {feedbackCadences.map((cadence) => (
                          <ChipButton
                            key={cadence}
                            active={draft.feedbackCadence === cadence}
                            onClick={() => setDraftField("feedbackCadence", cadence)}
                          >
                            {cadence}
                          </ChipButton>
                        ))}
                      </div>
                    </div>

                  </div>
                </SectionShell>
              )}

              {/* STEP 7: AI INTELLIGENCE QUESTIONS */}
              {step === 6 && (
                <SectionShell
                  title="AI Intelligence Assessment questions"
                  description="Feed exact text blocks to the career positioning agent. Take time here; these form the raw core for deep roadmap strategy."
                >
                  <div className="grid gap-6">

                    {/* Strengths */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="caption uppercase tracking-[0.25em] text-slate-400 font-semibold flex items-center gap-1.5">
                          <Heart className="h-3.5 w-3.5 text-cyan-400 animate-pulse" /> Core Talents & Hard Skills Strengths
                        </span>
                        <span className={`text-xs ${draft.strengths.trim().length >= 15 ? "text-emerald-400" : "text-amber-400"}`}>
                          {draft.strengths.trim().length} / 15 chars min
                        </span>
                      </div>
                      <motion.div
                        animate={errors.strengths ? { x: [-5, 5, -5, 5, 0] } : {}}
                        className={`carved-input rounded-2xl p-1 focus-within:border-cyan-400/60 focus-within:shadow-[inset_0_2px_4px_rgba(0,0,0,0.95),0_0_15px_rgba(34,211,238,0.25)] transition-all duration-300 ${
                          errors.strengths ? "border-rose-500/40 bg-rose-500/10" : ""
                        }`}
                      >
                        <textarea
                          value={draft.strengths}
                          onChange={(e) => setDraftField("strengths", e.target.value)}
                          rows={3}
                          placeholder="What capabilities are you most confident in? (e.g. 'Highly logical system thinking, swift debugging skills in JavaScript, and detail-oriented interface designs')"
                          className="w-full bg-transparent px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 resize-none"
                        />
                      </motion.div>
                      
                      {errors.strengths && <p className="text-xs text-rose-400 font-medium flex items-center gap-1"><HelpCircle className="h-3 w-3" /> {errors.strengths}</p>}
                    </div>

                    {/* Blockers */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="caption uppercase tracking-[0.25em] text-slate-400 font-semibold flex items-center gap-1.5">
                          <Sliders className="h-3.5 w-3.5 text-cyan-400" /> Active Obstacles & Skills Gaps
                        </span>
                        <span className={`text-xs ${draft.blockers.trim().length >= 10 ? "text-emerald-400" : "text-amber-400"}`}>
                          {draft.blockers.trim().length} / 10 chars min
                        </span>
                      </div>
                      <motion.div
                        animate={errors.blockers ? { x: [-5, 5, -5, 5, 0] } : {}}
                        className={`carved-input rounded-2xl p-1 focus-within:border-cyan-400/60 focus-within:shadow-[inset_0_2px_4px_rgba(0,0,0,0.95),0_0_15px_rgba(34,211,238,0.25)] transition-all duration-300 ${
                          errors.blockers ? "border-rose-500/40 bg-rose-500/10" : ""
                        }`}
                      >
                        <textarea
                          value={draft.blockers}
                          onChange={(e) => setDraftField("blockers", e.target.value)}
                          rows={3}
                          placeholder="What makes this goal difficult? (e.g. 'Struggling with advanced SQL design, missing clean testing habits with Playwright, low visual system portfolio work.')"
                          className="w-full bg-transparent px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 resize-none"
                        />
                      </motion.div>
                      {errors.blockers && <p className="text-xs text-rose-400 font-medium flex items-center gap-1"><HelpCircle className="h-3 w-3" /> {errors.blockers}</p>}
                    </div>

                    {/* Weaknesses */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="caption uppercase tracking-[0.25em] text-slate-400 font-semibold flex items-center gap-1.5">
                          <Sliders className="h-3.5 w-3.5 text-cyan-400" /> Key Tech or Soft Weaknesses / Gaps
                        </span>
                        <span className={`text-xs ${draft.weaknesses.trim().length >= 10 ? "text-emerald-400" : "text-amber-400"}`}>
                          {draft.weaknesses.trim().length} / 10 chars min
                        </span>
                      </div>
                      <motion.div
                        animate={errors.weaknesses ? { x: [-5, 5, -5, 5, 0] } : {}}
                        className={`carved-input rounded-2xl p-1 focus-within:border-cyan-400/60 focus-within:shadow-[inset_0_2px_4px_rgba(0,0,0,0.95),0_0_15px_rgba(34,211,238,0.25)] transition-all duration-300 ${
                          errors.weaknesses ? "border-rose-500/40 bg-rose-500/10" : ""
                        }`}
                      >
                        <textarea
                          value={draft.weaknesses}
                          onChange={(e) => setDraftField("weaknesses", e.target.value)}
                          rows={3}
                          placeholder="Detail self-identified gaps (e.g. 'Difficulty with algorithm designs, slow public speaking comfort, miss clean testing specs')"
                          className="w-full bg-transparent px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 resize-none"
                        />
                      </motion.div>
                      {errors.weaknesses && <p className="text-xs text-rose-400 font-medium flex items-center gap-1"><HelpCircle className="h-3 w-3" /> {errors.weaknesses}</p>}
                    </div>

                    {/* Career Obstacles */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="caption uppercase tracking-[0.25em] text-slate-400 font-semibold flex items-center gap-1.5">
                          <Activity className="h-3.5 w-3.5 text-cyan-400" /> Career Obstacles & Roadblocks
                        </span>
                        <span className={`text-xs ${draft.obstacles.trim().length >= 10 ? "text-emerald-400" : "text-amber-400"}`}>
                          {draft.obstacles.trim().length} / 10 chars min
                        </span>
                      </div>
                      <motion.div
                        animate={errors.obstacles ? { x: [-5, 5, -5, 5, 0] } : {}}
                        className={`carved-input rounded-2xl p-1 focus-within:border-cyan-400/60 focus-within:shadow-[inset_0_2px_4px_rgba(0,0,0,0.95),0_0_15px_rgba(34,211,238,0.25)] transition-all duration-300 ${
                          errors.obstacles ? "border-rose-500/40 bg-rose-500/10" : ""
                        }`}
                      >
                        <textarea
                          value={draft.obstacles}
                          onChange={(e) => setDraftField("obstacles", e.target.value)}
                          rows={3}
                          placeholder="Detail roadblocks (e.g. 'Lack of professional connection channels, visa boundaries, pivot transition lag')"
                          className="w-full bg-transparent px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 resize-none"
                        />
                      </motion.div>
                      {errors.obstacles && <p className="text-xs text-rose-400 font-medium flex items-center gap-1"><HelpCircle className="h-3 w-3" /> {errors.obstacles}</p>}
                    </div>

                    {/* Motivation */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="caption uppercase tracking-[0.25em] text-slate-400 font-semibold flex items-center gap-1.5">
                          <Flame className="h-3.5 w-3.5 text-cyan-400 animate-bounce" /> Primary Pivot Driving Force
                        </span>
                        <span className={`text-xs ${draft.motivation.trim().length >= 10 ? "text-emerald-400" : "text-amber-400"}`}>
                          {draft.motivation.trim().length} / 10 chars min
                        </span>
                      </div>
                      <motion.div
                        animate={errors.motivation ? { x: [-5, 5, -5, 5, 0] } : {}}
                        className={`carved-input rounded-2xl p-1 focus-within:border-cyan-400/60 focus-within:shadow-[inset_0_2px_4px_rgba(0,0,0,0.95),0_0_15px_rgba(34,211,238,0.25)] transition-all duration-300 ${
                          errors.motivation ? "border-rose-500/40 bg-rose-500/10" : ""
                        }`}
                      >
                        <textarea
                          value={draft.motivation}
                          onChange={(e) => setDraftField("motivation", e.target.value)}
                          rows={3}
                          placeholder="What specific outcome validates this process? (e.g. 'Securing a junior engineer position within a product startup, raising salary expectations, establishing product agency.')"
                          className="w-full bg-transparent px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 resize-none"
                        />
                      </motion.div>
                      {errors.motivation && <p className="text-xs text-rose-400 font-medium flex items-center gap-1"><HelpCircle className="h-3 w-3" /> {errors.motivation}</p>}
                    </div>

                    {/* Constraints */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="caption uppercase tracking-[0.25em] text-slate-400 font-semibold flex items-center gap-1.5">
                          <Activity className="h-3.5 w-3.5 text-cyan-400" /> Key Limits or Hard Boundaries
                        </span>
                        <span className={`text-xs ${draft.constraints.trim().length >= 10 ? "text-emerald-400" : "text-amber-400"}`}>
                          {draft.constraints.trim().length} / 10 chars min
                        </span>
                      </div>
                      <motion.div
                        animate={errors.constraints ? { x: [-5, 5, -5, 5, 0] } : {}}
                        className={`carved-input rounded-2xl p-1 focus-within:border-cyan-400/60 focus-within:shadow-[inset_0_2px_4px_rgba(0,0,0,0.95),0_0_15px_rgba(34,211,238,0.25)] transition-all duration-300 ${
                          errors.constraints ? "border-rose-500/40 bg-rose-500/10" : ""
                        }`}
                      >
                        <textarea
                          value={draft.constraints}
                          onChange={(e) => setDraftField("constraints", e.target.value)}
                          rows={3}
                          placeholder="List any restrictions (schedule, visa, family obligations) or write 'None currently'"
                          className="w-full bg-transparent px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 resize-none"
                        />
                      </motion.div>
                      {errors.constraints && <p className="text-xs text-rose-400 font-medium flex items-center gap-1"><HelpCircle className="h-3 w-3" /> {errors.constraints}</p>}
                    </div>

                  </div>
                </SectionShell>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* PERSISTENCE AND NAVIGATION CONTROL LAYER */}
        <div className="liquid-panel flex flex-wrap items-center justify-between gap-4 rounded-[24px] p-4">
          <div className="space-y-1 text-sm text-slate-400 font-medium relative z-10">
            <p className="flex items-center gap-1.5 text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
              {restored ? "Resumed from autosaved draft." : "Progress autosaved locally."}
            </p>
            <p className="text-xs opacity-75">Local Cache Updated: {lastSaved}</p>
          </div>

          <div className="flex flex-wrap gap-3 relative z-10">
            
            {/* Back Button */}
            <button
              type="button"
              onClick={() => {
                setDirection(-1);
                setStep((current) => Math.max(0, current - 1));
                setStatus(null);
              }}
              disabled={step === 0}
              className="tactile-btn inline-flex items-center gap-2 rounded-full px-6 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            {/* Next or Complete Assessment button */}
            {step < 6 ? (
              <MagneticButton
                type="button"
                onClick={() => {
                  const nextErrors = validateStep(step, draft);
                  setErrors(nextErrors);
                  if (Object.keys(nextErrors).length === 0) {
                    setDirection(1);
                    setStep((current) => Math.min(6, current + 1));
                    setStatus(null);
                  } else {
                    setStatus("Please fill in required fields to unlock the next assessment phase.");
                  }
                }}
                className={`tactile-btn inline-flex items-center gap-2 rounded-full px-6 py-2 text-sm font-bold ${
                  currentStepHasErrors
                    ? "bg-[#16161c] text-slate-500 cursor-not-allowed opacity-50"
                    : "bg-white text-black hover:bg-slate-100"
                }`}
                disabled={currentStepHasErrors}
              >
                Next Step
                <ArrowRight className="h-4 w-4" />
              </MagneticButton>
            ) : (
              <MagneticButton
                type="button"
                onClick={() => {
                  console.log("FINISH BUTTON CLICKED");
                  void handleSubmit();
                }}
                disabled={submitting}
                className="tactile-btn tactile-btn-primary inline-flex items-center gap-2 rounded-full px-6 py-2 text-sm font-bold text-black shadow-[0_4px_12px_rgba(34,211,238,0.25)] hover:shadow-[0_6px_18px_rgba(34,211,238,0.4)] disabled:opacity-40"
              >
                {submitting ? (
                  <span className="loading-spinner mr-2" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Finish AI Assessment
                <Sparkles className="h-4 w-4 animate-spin-slow ml-2" />
              </MagneticButton>
            )}
          </div>
        </div>

        {status && (
          <div className="rounded-2xl border border-cyan-400/25 bg-[#082f49] p-4 text-sm text-cyan-200 font-semibold shadow-[0_4px_12px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.08)]">
            {status}
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: REAL-TIME ASSESSMENT DIAGNOSTICS & SUMMARY */}
      <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
        
        {/* PREMIUM ASSESSMENT PANEL */}
        <div className="liquid-panel rounded-[24px] p-6 sm:p-8">
          
          <div className="flex items-center justify-between gap-3 pb-5 border-b border-white/5 relative z-10">
            <div>
              <p className="caption uppercase tracking-[0.3em] text-cyan-400 font-bold">Assessment Summary</p>
              <h3 className="heading-dashboard mt-1.5 text-white">Roadmap Parameters</h3>
            </div>
            <div className="rounded-full border border-cyan-400/25 bg-[#082f49] px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-cyan-200 shadow-[0_4px_12px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.08)]">
              Real-time Output
            </div>
          </div>

          <div className="mt-6 space-y-5 relative z-10">
            
            {/* Goal Output card */}
            <div className="liquid-card rounded-2xl p-4.5 hover:bg-[#141418]">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
                <Target className="h-4 w-4 text-cyan-400" />
                Target Career Path
              </div>
              <p className="mt-3 text-base font-bold text-white leading-tight">
                {draft.targetRole ? `${draft.goalType} · ${draft.targetRole}` : "Specify target role..."}
              </p>
              {draft.industries.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {draft.industries.map((ind) => (
                    <span key={ind} className="text-[10px] text-cyan-300 font-semibold bg-cyan-400/10 px-2 py-0.5 rounded">
                      {ind}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Timeline Output card */}
            <div className="liquid-card rounded-2xl p-4.5 hover:bg-[#141418]">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
                <CalendarDays className="h-4 w-4 text-cyan-400" />
                Timeline Horizon
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-200">
                {summary.timeline || "Complete Timeline fields..."}
              </p>
              <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-400">
                <span>Urgency Index: {draft.urgency}/10</span>
                <span>•</span>
                <span>WorkMode: {draft.workMode}</span>
              </div>
            </div>

            {/* Skills & Ratings Output card */}
            <div className="liquid-card rounded-2xl p-4.5 hover:bg-[#141418]">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
                <GraduationCap className="h-4 w-4 text-cyan-400" />
                Competency Base ({draft.skills.length} Selected)
              </div>
              
              <div className="mt-3 flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1">
                {draft.skills.length ? (
                  draft.skills.map((skill) => {
                    const prof = draft.skillProficiencies[skill] ?? 3;
                    return (
                      <div
                        key={skill}
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/5 bg-black/20 px-2.5 py-1 text-xs text-slate-300"
                      >
                        <span>{skill}</span>
                        <span className="text-[9px] font-bold text-cyan-400">({prof}★)</span>
                      </div>
                    );
                  })
                ) : (
                  <span className="text-xs text-slate-500 italic">No competencies selected yet...</span>
                )}
              </div>
            </div>

            {/* GLOWING SVG CIRCULAR READINESS DIAL */}
            <div className="liquid-card rounded-2xl p-5 hover:bg-[#141418]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Readiness Score</p>
                  <p className="mt-1.5 heading-dashboard text-white">{summary.readinessEstimate}/100</p>
                  <span className="mt-2.5 inline-block rounded-full bg-cyan-400/10 border border-cyan-400/20 px-3 py-1 text-[10px] font-bold text-cyan-300">
                    {summary.readinessLabel}
                  </span>
                </div>

                {/* Circular readiness dial */}
                <div className="relative h-20 w-20 shrink-0">
                  <svg className="h-full w-full -rotate-90">
                    {/* Background Circle */}
                    <circle
                      cx="40"
                      cy="40"
                      r="34"
                      className="stroke-[#141417] fill-none"
                      strokeWidth="6"
                    />
                    {/* Glowing Progress Circle */}
                    <motion.circle
                      cx="40"
                      cy="40"
                      r="34"
                      className="stroke-cyan-400 fill-none"
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray="213.6"
                      initial={{ strokeDashoffset: 213.6 }}
                      animate={{ strokeDashoffset: 213.6 - (213.6 * summary.readinessEstimate) / 100 }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      style={{
                        filter: "drop-shadow(0 0 4px rgba(34, 211, 238, 0.6))"
                      }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white/90">
                    {summary.readinessEstimate}%
                  </div>
                </div>
              </div>

              {/* Dynamic matching metric status bars (Radar Matcher) */}
              <div className="mt-5 space-y-2 border-t border-white/5 pt-4">
                {[
                  { label: "Technical Competency Matrix", val: clamp(draft.skills.length * 15, 10, 100) },
                  { label: "Commitment & Horizon Speed", val: clamp(Math.round((draft.weeklyHours / 30) * 100), 10, 100) },
                  { label: "Objective & Pivot Clarity", val: clamp([draft.targetRole, draft.whyNow, draft.strengths].filter(s => s.trim().length > 0).length * 33, 10, 100) }
                ].map((bar) => (
                  <div key={bar.label} className="space-y-1">
                    <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                      <span>{bar.label}</span>
                      <span className="text-white">{bar.val}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#040405] overflow-hidden border border-[#141418] shadow-[inset_0_1px_1px_rgba(0,0,0,0.8)]">
                      <motion.div
                        className="h-full bg-cyan-400"
                        initial={{ width: 0 }}
                        animate={{ width: `${bar.val}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Learning Style match card */}
            <div className="liquid-card rounded-2xl p-4 hover:bg-[#141418]">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Cognitive Profile</p>
              <div className="mt-3 flex items-center gap-2 text-white font-bold text-sm">
                <Brain className="h-4.5 w-4.5 text-cyan-400 shrink-0" />
                <span>{summary.learningStyle} Method</span>
              </div>
              <p className="mt-2 text-xs leading-normal text-slate-400">
                AI Roadmap engine compiles learning vectors based on {summary.learningStyle} structure, matching Pace: {draft.learningPace} at cadence {draft.feedbackCadence}.
              </p>
            </div>
          </div>
        </div>

        {/* RAW DIAGNOSTIC SIGNAL FEEDBACK TERMINAL */}
        <div className="liquid-panel rounded-[24px] p-6 sm:p-8">
          <div className="flex items-center gap-2 relative z-10">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">AI Diagnostic Data Feed</p>
          </div>
          <p className="mt-2 text-xs text-slate-500 relative z-10">Live signal packets compiled for OpenAI Roadmap Generation context:</p>
          <pre className="mt-4 max-h-[16rem] overflow-auto whitespace-pre-wrap rounded-2xl border border-[#141417] bg-[#040405] p-4 text-[11px] leading-relaxed text-slate-400 font-mono scrollbar-thin shadow-[inset_0_2px_4px_rgba(0,0,0,0.95)] relative z-10">
            {summary.contextPacket}
          </pre>
        </div>

      </div>
    </div>
  );
}
