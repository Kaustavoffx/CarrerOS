import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserProfileRecord } from "./supabase/types";

export interface CommunityResource {
  id: string;
  name: string;
  type: string; // 'scholarship', 'mentorship', 'internship', 'scheme', 'certification', 'center', 'ngo', 'job_fair', 'event', 'wellness', 'student_service'
  description: string;
  eligibility: {
    min_academic_score?: string;
    max_annual_family_income_inr?: number;
    max_age?: number;
    target_audience?: string;
    admission_required?: string;
    nationality?: string;
    need_based?: boolean;
    gender?: string;
    course_type?: string;
    qualification?: string;
    experience?: string;
    free_training?: boolean;
    min_age?: number;
    weekly_commitment_hours?: number;
    academic_background?: string;
    commitment_months?: number;
    free_sessions?: boolean;
    peer_support?: boolean;
    no_prior_tech_knowledge_required?: boolean;
    enrolled_in_college?: boolean;
    stem_preference?: boolean;
    min_qualification?: string;
    helpline_number?: string;
    open_for_all?: boolean;
    residency?: string;
    age_limit?: string;
    passion_for_writing?: true;
    academic_level?: string;
    stream?: string;
    graduation_status?: string;
    student_status?: true;
    entry_fee?: string;
    membership_fee?: string;
    [key: string]: any;
  };
  application_link: string;
  contact_details?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  verified: boolean;
  tags: string[];
  created_at?: string;
  distance_km?: number;
}

export interface AgentAction {
  id: string;
  user_id: string;
  resource_id: string | null;
  action_type: "verify_eligibility" | "draft_sop_or_application";
  status: "pending" | "executing" | "completed" | "failed";
  payload: Record<string, any>;
  logs: string[];
  updated_at: string;
  created_at: string;
}

// Haversine distance calculator in TypeScript for fallback query routing
export function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// 25+ Real-world seed opportunities
export const SEEDED_RESOURCES: CommunityResource[] = [
  {
    id: "res-nos",
    name: "National Overseas Scholarship",
    type: "scheme",
    description: "Indian Government scheme offering financial assistance to low-income students from marginalized communities to pursue Masters and Ph.D. degrees abroad.",
    eligibility: { min_academic_score: "60%", max_annual_family_income_inr: 800000, max_age: 35, nationality: "Indian citizen" },
    application_link: "https://nosmsje.gov.in/",
    contact_details: "nosmsje-support@gov.in",
    address: "Shastri Bhawan, Dr. Rajendra Prasad Road",
    city: "New Delhi",
    state: "Delhi",
    postal_code: "110001",
    latitude: 28.6139,
    longitude: 77.2090,
    verified: true,
    tags: ["Government", "Scholarship", "Study Abroad"]
  },
  {
    id: "res-pm-yuva",
    name: "PM YUVA Yojana (Pradhan Mantri Yuva Udyamita Vikas Abhiyan)",
    type: "scheme",
    description: "Ministry of Skill Development & Entrepreneurship scheme providing entrepreneurship training, mentorship support, and incubator access to student builders.",
    eligibility: { target_audience: "Students, trainees, and young citizens interested in launching a startup" },
    application_link: "https://www.msde.gov.in/",
    contact_details: "pm.yuva@gov.in",
    address: "MSDE, Shram Shakti Bhawan, Rafi Marg",
    city: "New Delhi",
    state: "Delhi",
    postal_code: "110001",
    latitude: 28.6139,
    longitude: 77.2090,
    verified: true,
    tags: ["Startup", "Mentorship", "Government"]
  },
  {
    id: "res-tata-cornell",
    name: "Tata Scholarship at Cornell University",
    type: "scholarship",
    description: "Fully funded scholarship fund established by the Tata Education and Development Trust for Indian students accepted into undergraduate programs at Cornell University.",
    eligibility: { admission_required: "Cornell University Undergraduate Program", nationality: "Indian citizen", need_based: true },
    application_link: "https://admissions.cornell.edu/apply/international-applicants/tata-scholarship",
    contact_details: "tata-trust-scholarships@cornell.edu",
    address: "Cornell University admissions office, Day Hall",
    city: "Ithaca",
    state: "New York",
    postal_code: "14853",
    latitude: 42.4534,
    longitude: -76.4735,
    verified: true,
    tags: ["Ivy League", "Undergraduate", "Need-Based"]
  },
  {
    id: "res-google-cert",
    name: "Google Career Certificates (Coursera)",
    type: "certification",
    description: "Free scholarship voucher pathways to complete Google certified courses in IT Support, UX Design, Data Analytics, Project Management, and Cybersecurity.",
    eligibility: { no_degree_required: true, course_type: "Technical" },
    application_link: "https://grow.google/intl/en_in/certificates/",
    contact_details: "support@coursera.org",
    address: "Online / Global",
    city: "Online",
    state: "Global",
    postal_code: "000000",
    latitude: 0.0,
    longitude: 0.0,
    verified: true,
    tags: ["Self-Paced", "Technical", "Industry Certification"]
  },
  {
    id: "res-nimhans-tele",
    name: "NIMHANS Tele-MANAS Wellness Support",
    type: "wellness",
    description: "National mental health helpline and clinical guidance center offering 24/7 free counseling, psychological support, and stress management for students.",
    eligibility: { free_services: true, confidential: true },
    application_link: "https://nimhans.ac.in/",
    contact_details: "Toll Free: 14416",
    address: "NIMHANS campus, Hosur Road",
    city: "Bangalore",
    state: "Karnataka",
    postal_code: "560029",
    latitude: 12.9362,
    longitude: 77.5975,
    verified: true,
    tags: ["Mental Wellness", "Counseling", "24/7 Helpline"]
  },
  {
    id: "res-aicte-pragati",
    name: "AICTE Pragati Scholarship for Girls",
    type: "scholarship",
    description: "Government scholarship scheme implemented by AICTE promoting technical education (Degree or Diploma) among female students.",
    eligibility: { max_annual_family_income_inr: 800000, gender: "Female", course_type: "Technical Degree/Diploma" },
    application_link: "https://www.aicte-india.org/schemes/students-development-schemes",
    contact_details: "pragati@aicte-india.org",
    address: "AICTE HQ, Nelson Mandela Marg, Vasant Kunj",
    city: "New Delhi",
    state: "Delhi",
    postal_code: "110070",
    latitude: 28.5446,
    longitude: 77.1554,
    verified: true,
    tags: ["Girls Education", "Technical Degree", "Government"]
  },
  {
    id: "res-nasscom-fair",
    name: "NASSCOM Career Fair & Tech Internship Event",
    type: "job_fair",
    description: "National job fair and networking summit connecting tech graduates, coders, and developers directly with MNCs, startups, and internship roles.",
    eligibility: { qualification: "B.E/B.Tech/MCA/BSc/BCA", experience: "0-2 years" },
    application_link: "https://nasscom.in/events",
    contact_details: "events@nasscom.in",
    address: "Sector 126",
    city: "Noida",
    state: "Uttar Pradesh",
    postal_code: "201303",
    latitude: 28.5355,
    longitude: 77.3910,
    verified: true,
    tags: ["Tech Jobs", "Recruitment", "Internship Opportunities"]
  },
  {
    id: "res-sewa-center",
    name: "SEWA Community Digital Literacy Center",
    type: "center",
    description: "Self-Employed Womens Association center providing digital literacy libraries, computer labs, and office tools training programs.",
    eligibility: { free_training: true, gender: "Female" },
    application_link: "https://www.sewa.org/",
    contact_details: "sewa-ahmedabad@sewa.org",
    address: "SEWA Reception Center, Opp. Victoria Garden, Bhadra",
    city: "Ahmedabad",
    state: "Gujarat",
    postal_code: "380001",
    latitude: 23.0225,
    longitude: 72.5714,
    verified: true,
    tags: ["Digital Literacy", "Women Empowerment", "Skills Training"]
  },
  {
    id: "res-cry-fellow",
    name: "CRY (Child Rights and You) Youth Fellowships",
    type: "ngo",
    description: "NGO fellowship for students advocating children rights, developing social impact projects, and volunteering in community learning initiatives.",
    eligibility: { min_age: 18, weekly_commitment_hours: 6 },
    application_link: "https://www.cry.org/volunteer-with-cry/",
    contact_details: "cryinfo.del@crymail.org",
    address: "Madhusudan Mukerjee Road, Khardah",
    city: "Kolkata",
    state: "West Bengal",
    postal_code: "700116",
    latitude: 22.7230,
    longitude: 88.3780,
    verified: true,
    tags: ["Social Impact", "Fellowship", "NGO"]
  },
  {
    id: "res-asha-teach",
    name: "Asha for Education Teaching Fellowships",
    type: "ngo",
    description: "Teaching internship and volunteering program in regional educational centers. Participants gain classroom experience and receive certificates.",
    eligibility: { academic_background: "Any stream", commitment_months: 3 },
    application_link: "https://ashanet.org/",
    contact_details: "fellowships@ashanet.org",
    address: "IIT Madras Campus, Adyar",
    city: "Chennai",
    state: "Tamil Nadu",
    postal_code: "600036",
    latitude: 13.0067,
    longitude: 80.2400,
    verified: true,
    tags: ["Teaching", "Rural Education", "Volunteering"]
  },
  {
    id: "res-sama-wellness",
    name: "Sama Mental Health & Student Support Hub",
    type: "wellness",
    description: "A regional wellness organization offering free student counseling, peer support programs, and mental health workshops.",
    eligibility: { free_sessions: true, peer_support: true },
    application_link: "https://www.samamind.org/",
    contact_details: "contact@samamind.org",
    address: "Deccan Gymkhana",
    city: "Pune",
    state: "Maharashtra",
    postal_code: "411004",
    latitude: 18.5204,
    longitude: 73.8567,
    verified: true,
    tags: ["Mental Wellness", "Student Counsel", "Workshops"]
  },
  {
    id: "res-ibm-skills",
    name: "IBM SkillsBuild Portal",
    type: "certification",
    description: "Global online program offering free badges and certificates in Emerging Technologies like Cloud, AI, Cyber Security, Agile, and Career Skills.",
    eligibility: { no_prior_tech_knowledge_required: true },
    application_link: "https://skillsbuild.org/",
    contact_details: "skillsbuild-support@ibm.com",
    address: "Online / Global",
    city: "Online",
    state: "Global",
    postal_code: "000000",
    latitude: 0.0,
    longitude: 0.0,
    verified: true,
    tags: ["IBM Badge", "Cloud Computing", "AI Fundamentals"]
  },
  {
    id: "res-ms-spark",
    name: "Microsoft YouthSpark Internships",
    type: "internship",
    description: "Internship pathways and skill-building programs targeted at students from underrepresented communities.",
    eligibility: { enrolled_in_college: true, stem_preference: true },
    application_link: "https://careers.microsoft.com/",
    contact_details: "youthspark-hyd@microsoft.com",
    address: "Microsoft Campus, Gachibowli",
    city: "Hyderabad",
    state: "Telangana",
    postal_code: "500032",
    latitude: 17.4483,
    longitude: 78.3741,
    verified: true,
    tags: ["Tech Intern", "Microsoft", "STEM Support"]
  },
  {
    id: "res-pmkvy-jaipur",
    name: "Pradhan Mantri Kaushal Vikas Yojana (PMKVY) Center",
    type: "center",
    description: "Skill training center offering vocational certifications in coding, software testing, hardware maintenance, and data management.",
    eligibility: { min_qualification: "Class 10/12 pass", free_training: true },
    application_link: "https://www.pmkvyofficial.org/",
    contact_details: "pmkvy-helpdesk@nsdcindia.org",
    address: "Malviya Nagar Industrial Area",
    city: "Jaipur",
    state: "Rajasthan",
    postal_code: "302017",
    latitude: 26.8524,
    longitude: 75.8073,
    verified: true,
    tags: ["Vocational Training", "Government Scheme", "Coding Basics"]
  },
  {
    id: "res-samaritans",
    name: "Samaritans Mumbai Suicide Prevention Helpline",
    type: "wellness",
    description: "Helpline and walk-in center offering confidential, anonymous emotional support for students facing severe exam stress, depression, or anxiety.",
    eligibility: { free_services: true, helpline_number: "+91 84229 84528" },
    application_link: "http://www.samaritansmumbai.org/",
    contact_details: "samaritans.helpline@gmail.com",
    address: "Mahim West",
    city: "Mumbai",
    state: "Maharashtra",
    postal_code: "400016",
    latitude: 19.0345,
    longitude: 72.8402,
    verified: true,
    tags: ["Suicide Helpline", "Crisis Intervention", "Emotional Support"]
  },
  {
    id: "res-vidyasaarathi",
    name: "Vidyasaarathi Scholarship Portal",
    type: "scholarship",
    description: "Portal matching students with various corporate CSR scholarships based on income limits and merit parameters.",
    eligibility: { max_annual_family_income_inr: 600000, course_type: "Degree/Diploma" },
    application_link: "https://www.vidyasaarathi.co.in/",
    contact_details: "vidyasaarathi@nsdl.co.in",
    address: "NSDL, Lower Parel",
    city: "Mumbai",
    state: "Maharashtra",
    postal_code: "400013",
    latitude: 19.0020,
    longitude: 72.8280,
    verified: true,
    tags: ["CSR Funding", "Merit Scholarship", "Education Grants"]
  },
  {
    id: "res-nptel-swayam",
    name: "Swayam NPTEL Online Courses",
    type: "certification",
    description: "Ministry of Education initiative offering free high-quality courses designed by IIT faculty with an option to pay a nominal fee for physical exams & certificates.",
    eligibility: { open_for_all: true, exam_credit_transfer_allowed: true },
    application_link: "https://swayam.gov.in/",
    contact_details: "support@swayam.gov.in",
    address: "IIT Madras NPTEL office",
    city: "Chennai",
    state: "Tamil Nadu",
    postal_code: "600036",
    latitude: 13.0067,
    longitude: 80.2400,
    verified: true,
    tags: ["IIT Certified", "Free Learning", "Credit Transfer"]
  },
  {
    id: "res-goonj-fellow",
    name: "Goonj School to School Fellowship",
    type: "ngo",
    description: "A youth internship program with Goonj focusing on operational planning, rural community resource mapping, and supply chain management.",
    eligibility: { min_age: 21, fellowship_duration_months: 12 },
    application_link: "https://goonj.org/goonj-fellowship/",
    contact_details: "mail@goonj.org",
    address: "Sarita Vihar",
    city: "New Delhi",
    state: "Delhi",
    postal_code: "110076",
    latitude: 28.5298,
    longitude: 77.2912,
    verified: true,
    tags: ["Social Development", "Goonj Fellowship", "NGO Intern"]
  },
  {
    id: "res-delhi-scholar",
    name: "Delhi State Merit-cum-Means Scholarships",
    type: "student_service",
    description: "Delhi Government support services providing financial assistance to college students of state universities.",
    eligibility: { residency: "Delhi resident", max_annual_family_income_inr: 600000 },
    application_link: "https://edistrict.delhigovt.nic.in/",
    contact_details: "edistrict-support@delhi.gov.in",
    address: "IP Estate, ITO",
    city: "New Delhi",
    state: "Delhi",
    postal_code: "110002",
    latitude: 28.6272,
    longitude: 77.2472,
    verified: true,
    tags: ["State Government", "Need-Based", "Colleges"]
  },
  {
    id: "res-yka-mentor",
    name: "Youth Ki Awaaz Writers Mentorship",
    type: "mentorship",
    description: "A competitive digital mentorship program for student writers and change-makers focusing on editing, storytelling, and digital advocacy.",
    eligibility: { age_limit: "18-25", passion_for_writing: true },
    application_link: "https://www.youthkiawaaz.com/join-yka-mentorship/",
    contact_details: "careers@youthkiawaaz.com",
    address: "Online / Global",
    city: "Online",
    state: "Global",
    postal_code: "000000",
    latitude: 0.0,
    longitude: 0.0,
    verified: true,
    tags: ["Mentorship", "Journalism", "Advocacy"]
  },
  {
    id: "res-kvpy-blr",
    name: "Kishore Vaigyanik Protsahan Yojana (KVPY)",
    type: "scholarship",
    description: "National science fellowship program funded by DST to identify and encourage talented students to take up research careers.",
    eligibility: { academic_level: "Class 11/12/Undergrad", stream: "Basic Sciences" },
    application_link: "http://kvpy.iisc.ernet.in/",
    contact_details: "kvpy.office@iisc.ac.in",
    address: "IISc campus",
    city: "Bangalore",
    state: "Karnataka",
    postal_code: "560012",
    latitude: 13.0219,
    longitude: 77.5671,
    verified: true,
    tags: ["Fellowship", "IISc", "Research Career"]
  },
  {
    id: "res-tfi-fellow",
    name: "Teach For India Fellowship",
    type: "ngo",
    description: "A full-time, two-year paid leadership program where students teach in under-resourced schools, receiving extensive leadership training and corporate mentorship.",
    eligibility: { graduation_status: "Graduate by June 2026", nationality: "Indian citizen/OCI" },
    application_link: "https://www.teachforindia.org/fellowship",
    contact_details: "apply@teachforindia.org",
    address: "Yerawada",
    city: "Pune",
    state: "Maharashtra",
    postal_code: "411006",
    latitude: 18.5534,
    longitude: 73.8867,
    verified: true,
    tags: ["Paid Fellowship", "Education Equity", "NGO leadership"]
  },
  {
    id: "res-aws-educate",
    name: "AWS Educate Free Cloud Pathways",
    type: "certification",
    description: "Amazon initiative providing students with free cloud compute credits, self-paced learning pathways, and access to the AWS Educate Job Board.",
    eligibility: { student_status: true, min_age: 13 },
    application_link: "https://aws.amazon.com/education/awseducate/",
    contact_details: "aws-educate@amazon.com",
    address: "Online / Global",
    city: "Online",
    state: "Global",
    postal_code: "000000",
    latitude: 0.0,
    longitude: 0.0,
    verified: true,
    tags: ["AWS cloud", "Badges", "AWS Credits"]
  },
  {
    id: "res-blr-job-fair",
    name: "Bangalore Tech Job Fair 2026",
    type: "job_fair",
    description: "Multi-sector hiring fair organized by state labor department focusing on engineering, vocational graduates, and administrative roles.",
    eligibility: { open_for_all: true, entry_fee: "Free" },
    application_link: "https://www.karnataka.gov.in/",
    contact_details: "jobfair-support.kar@nic.in",
    address: "Kanteerava Indoor Stadium, Kasturba Road",
    city: "Bangalore",
    state: "Karnataka",
    postal_code: "560001",
    latitude: 12.9696,
    longitude: 77.5927,
    verified: true,
    tags: ["Recruitment Fair", "Jobs In Bangalore", "Walk-in Interview"]
  },
  {
    id: "res-ambedkar-lib",
    name: "Ambedkar Community Library & Center",
    type: "center",
    description: "A free digital literacy library and career guidance community center supported by regional NGOs, offering coding resources and exam preparation desks.",
    eligibility: { membership_fee: "Free" },
    application_link: "https://hyderabad-community-libs.org/",
    contact_details: "lib-support@hyderabad-community-libs.org",
    address: "Kachiguda",
    city: "Hyderabad",
    state: "Telangana",
    postal_code: "560027",
    latitude: 17.3887,
    longitude: 78.4900,
    verified: true,
    tags: ["Library", "Study Space", "Community Hub"]
  }
];

// Helper to query resources with resilient fallback
export async function getCommunityResources(
  client: SupabaseClient | null,
  filters: { lat?: number; lng?: number; distance?: number; type?: string; searchQuery?: string }
): Promise<CommunityResource[]> {
  try {
    if (!client) {
      throw new Error("No database client available");
    }

    // Attempt to fetch from real database
    let query = client.from("community_resources").select("*");

    if (filters.type && filters.type !== "all") {
      query = query.eq("type", filters.type);
    }

    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) throw new Error("No entries found");

    return processLocalFilters(data, filters);
  } catch (err) {
    console.warn("Supabase query failed, falling back to static seeds:", err);
    // Fall back to seed data
    let data = [...SEEDED_RESOURCES];
    if (filters.type && filters.type !== "all") {
      data = data.filter((item) => item.type === filters.type);
    }
    return processLocalFilters(data, filters);
  }
}

// Processing filters, distances, search query matching
function processLocalFilters(
  items: CommunityResource[],
  filters: { lat?: number; lng?: number; distance?: number; searchQuery?: string }
): CommunityResource[] {
  let results = items.map((item) => {
    let dist: number | undefined;
    if (filters.lat && filters.lng && item.latitude && item.longitude) {
      // If resource is online, distance is not relevant (distance = 0)
      if (item.latitude === 0 && item.longitude === 0) {
        dist = 0;
      } else {
        dist = getDistanceKm(filters.lat, filters.lng, item.latitude, item.longitude);
      }
    }
    return {
      ...item,
      distance_km: dist !== undefined ? Math.round(dist * 10) / 10 : undefined
    };
  });

  // Filter by distance if specified
  if (filters.lat && filters.lng && filters.distance) {
    results = results.filter(
      (item) => item.distance_km === undefined || item.distance_km === 0 || item.distance_km <= filters.distance!
    );
  }

  // Filter by search query
  if (filters.searchQuery) {
    const q = filters.searchQuery.toLowerCase();
    results = results.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.tags.some((tag) => tag.toLowerCase().includes(q)) ||
        (item.city && item.city.toLowerCase().includes(q))
    );
  }

  // Sort: Online programs/items with 0 distance go first/last depending, but otherwise sort by proximity
  return results.sort((a, b) => {
    if (a.distance_km === undefined) return 1;
    if (b.distance_km === undefined) return -1;
    return a.distance_km - b.distance_km;
  });
}
