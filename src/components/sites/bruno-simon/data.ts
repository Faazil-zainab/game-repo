export type SectionId =
  | "home"
  | "options"
  | "controls"
  | "achievements"
  | "circuit"
  | "whispers"
  | "projects"
  | "lab"
  | "behindTheScene";

export type AreaId =
  | "home"
  | "options"
  | "controls"
  | "achievements"
  | "circuit"
  | "whispers"
  | "projects"
  | "lab";

export type AchievementId =
  | "adventure"
  | "developer"
  | "aiExplorer"
  | "traveler"
  | "wifi"
  | "speed"
  | "speedDemon"
  | "secret"
  | "whisperer";

export interface NavItem {
  id: SectionId;
  label: string;
  icon: string;
  preview: string;
}

export const NAV_ITEMS: NavItem[] = [
  { id: "home", label: "Home", icon: "home.svg", preview: "home.webp" },
  { id: "options", label: "Workshop", icon: "gear.svg", preview: "options.webp" },
  { id: "controls", label: "Playground", icon: "controls/gamepad.svg", preview: "controls.webp" },
  { id: "achievements", label: "Monument", icon: "medal.svg", preview: "achievements.webp" },
  { id: "circuit", label: "Circuit", icon: "wheel.svg", preview: "circuit.webp" },
  { id: "whispers", label: "Whispers", icon: "whispers/whisper-fill.svg", preview: "whispers.webp" },
  { id: "projects", label: "Projects", icon: "projects.svg", preview: "" },
  { id: "lab", label: "AI Lab", icon: "lab.svg", preview: "" },
];

export interface AreaDefinition {
  id: AreaId;
  section: SectionId;
  label: string;
  short: string;
  /** Angle in degrees around the island, 0 is south (+z). */
  angle: number;
  radius: number;
  triggerRadius: number;
  /** Measured world-space X/Z placement after the island GLB transform. */
  worldPosition: { x: number; z: number };
}

export const AREAS: AreaDefinition[] = [
  { id: "home", section: "home", label: "Mohamed's Home", short: "Home", angle: 315, radius: 10, triggerRadius: 11, worldPosition: { x: -7, z: 7 } },
  { id: "options", section: "options", label: "Workshop", short: "Workshop", angle: 71, radius: 18, triggerRadius: 10, worldPosition: { x: 17, z: 6 } },
  { id: "controls", section: "controls", label: "Playground", short: "Playground", angle: 127, radius: 10, triggerRadius: 11, worldPosition: { x: 8, z: -6 } },
  { id: "achievements", section: "achievements", label: "Monument", short: "Monument", angle: 180, radius: 28, triggerRadius: 11, worldPosition: { x: 0, z: -28 } },
  { id: "circuit", section: "circuit", label: "Circuit", short: "Circuit", angle: 219, radius: 32, triggerRadius: 12, worldPosition: { x: -20, z: -25 } },
  { id: "whispers", section: "whispers", label: "Whisper Wall", short: "Whispers", angle: 330, radius: 30, triggerRadius: 11, worldPosition: { x: -15, z: 26 } },
  { id: "projects", section: "projects", label: "Projects", short: "Projects", angle: 242, radius: 78, triggerRadius: 12, worldPosition: { x: -69, z: -36 } },
  { id: "lab", section: "lab", label: "AI Lab", short: "AI Lab", angle: 56, radius: 92, triggerRadius: 14, worldPosition: { x: 76, z: 51 } },
];

export interface ControlRow {
  keys: string[];
  action: string;
  /** Joiner used between keys, matching the source's "WASD or ARROWS" wording. */
  separator?: string;
}

export const CONTROLS: { id: string; label: string; rows: ControlRow[] }[] = [
  {
    id: "mouse-keyboard",
    label: "Mouse Keyboard",
    rows: [
      { keys: ["WASD", "ARROWS"], action: "Move around", separator: "or" },
      { keys: ["SHIFT"], action: "Boost" },
      { keys: ["CTRL LEFT", "B"], action: "Brake", separator: "or" },
      { keys: ["SPACE"], action: "Jump" },
      { keys: ["ENTER"], action: "Interact" },
      { keys: ["M"], action: "Map" },
      { keys: ["L"], action: "Mute" },
      { keys: ["T"], action: "Post a whisper" },
      { keys: ["R"], action: "Respawn" },
      { keys: ["NUM KEYS", "NUM PAD"], action: "Activate hydraulics", separator: "or" },
      { keys: ["LEFT CLICK (DRAG)"], action: "Move camera" },
      { keys: ["H"], action: "Honk" },
    ],
  },
  {
    id: "touch",
    label: "Mobile Tablet",
    rows: [
      { keys: ["One finger"], action: "Move the car" },
      { keys: ["Two fingers"], action: "Move camera / zoom" },
      { keys: ["Tap (on the car)"], action: "Jump" },
      { keys: ["Tap ENTER prompt"], action: "Open an area" },
    ],
  },
  {
    id: "gamepad",
    label: "Gamepad",
    rows: [
      { keys: ["RT"], action: "Accelerate" },
      { keys: ["LT"], action: "Backward accelerate" },
      { keys: ["LB / RB"], action: "Hydraulics" },
      { keys: ["Joystick Left"], action: "Turn wheels" },
      { keys: ["A"], action: "Interact / Exit" },
      { keys: ["B"], action: "Boost" },
      { keys: ["Y"], action: "Jump" },
      { keys: ["X"], action: "Brake" },
      { keys: ["Start"], action: "Pause" },
    ],
  },
];

export interface Project {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  features: string[];
  technologies: string[];
  /** "ai" projects also appear inside the AI Lab. */
  category: "ai" | "iot";
  accent: string;
  links: {
    github: string | null;
    demo: string | null;
  };
}

export const PROJECTS: Project[] = [
  {
    id: "irrigation",
    title: "AI-Smart Irrigation",
    subtitle: "Generative AI for Precision Farming",
    description:
      "An AI-powered irrigation system that predicts crop water needs and turns live field data into smart recommendations.",
    features: [
      "Crop water prediction",
      "Generative AI farming insights",
      "Real-time alerts and monitoring",
      "Full-stack dashboard",
      "Sensor-driven recommendations",
    ],
    technologies: ["Python", "FastAPI", "Machine Learning", "Generative AI", "ReactJS"],
    category: "ai",
    accent: "#9bff7a",
    links: {
      github: "https://github.com/Faazil-zainab/AI-Smart-irrigation-sytem-using-GenAI",
      demo: null,
    },
  },
  {
    id: "atras",
    title: "ATRAS",
    subtitle: "AI-Powered Automated Video Generator",
    description:
      "An AI-powered automated video editing system that automates short-form video editing.",
    features: [
      "Automatic silence removal",
      "Scene detection",
      "AI-generated captions",
      "Audio synchronization",
      "Color grading",
      "Editing style learning",
    ],
    technologies: ["Python", "OpenCV", "PyTorch", "Whisper", "Librosa"],
    category: "ai",
    accent: "#4ad9ff",
    links: { github: null, demo: null },
  },
  {
    id: "quezy",
    title: "QUEZY",
    subtitle: "AI-Based Queue System for Healthcare",
    description:
      "A healthcare appointment and queue platform with AI waiting-time prediction and a doctor recommendation chatbot.",
    features: [
      "AI waiting-time prediction",
      "Doctor recommendation chatbot",
      "Queue tracking",
      "Secure login",
      "Appointment booking",
    ],
    technologies: [
      "Python",
      "Flask",
      "FastAPI",
      "Machine Learning",
      "JavaScript",
      "HTML",
      "CSS",
      "Bootstrap",
      "Flutter",
      "Dart",
      "Snowflake",
    ],
    category: "ai",
    accent: "#7c8cff",
    links: { github: "https://github.com/Faazil-zainab/quezy-backend", demo: null },
  },
  {
    id: "codepilot",
    title: "CodePilot AI",
    subtitle: "Local AI Agentic Coding Assistant",
    description:
      "An AI coding assistant that uses local language models to inspect, modify, and validate software projects.",
    features: [
      "Local LLM integration through Ollama",
      "Project inspection",
      "Multi-file editing",
      "Automated validation",
      "Evidence-based error correction",
      "Terminal-based interface",
    ],
    technologies: ["Python", "Ollama", "Qwen", "TypeScript"],
    category: "ai",
    accent: "#8dffb0",
    links: { github: null, demo: null },
  },
  {
    id: "analyst",
    title: "AI Business Analyst Agent",
    subtitle: "Automated Dataset Analysis",
    description:
      "An AI-powered data analysis application that processes CSV and Excel datasets and generates analytical dashboards.",
    features: [
      "Dataset preprocessing",
      "Data cleaning",
      "Automated visualization",
      "Statistical analysis",
      "Dashboard generation",
    ],
    technologies: ["CSV", "Excel", "Data Analysis", "Visualization"],
    category: "ai",
    accent: "#ffb45e",
    links: { github: null, demo: null },
  },
  {
    id: "smart-home",
    title: "Smart Home Automation",
    subtitle: "Arduino-Based Home Control",
    description: "An Arduino-based smart home automation project.",
    features: [
      "Arduino-controlled home devices",
      "Circuit prototyping in Tinkercad",
      "Automated lighting and appliance control",
    ],
    technologies: ["Arduino Uno", "Tinkercad"],
    category: "iot",
    accent: "#ff7aa8",
    links: { github: null, demo: null },
  },
];

export const AI_PROJECTS = PROJECTS.filter((project) => project.category === "ai");

export interface AchievementDefinition {
  id: AchievementId;
  title: string;
  description: string;
  target: number;
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  { id: "adventure", title: "I'm going on an adventure!", description: "Get out of the landing area.", target: 1 },
  { id: "developer", title: "Developer", description: "Discover the Workshop.", target: 1 },
  { id: "aiExplorer", title: "AI Explorer", description: "Discover the AI Lab.", target: 1 },
  {
    id: "traveler",
    title: "Knowledge Seeker",
    description: "Visit every major area on the island.",
    target: AREAS.length,
  },
  {
    id: "wifi",
    title: "Project Collector",
    description: "Explore every project in the Projects area.",
    target: PROJECTS.length,
  },
  { id: "speed", title: "Need for speed", description: "Reach 100 km/h with boost.", target: 1 },
  { id: "speedDemon", title: "Speed Demon", description: "Complete a timed lap on the Circuit.", target: 1 },
  { id: "secret", title: "What's behind the waterfall?", description: "Find the hidden orb.", target: 1 },
  { id: "whisperer", title: "Speak your mind", description: "Post a whisper on the wall.", target: 1 },
];

export const REWARDS = ["red", "orange", "white", "black", "flames", "abyssal"] as const;

export const WHISPER_FLAGS = [
  { code: "fr", label: "France" },
  { code: "us", label: "United States" },
  { code: "gb", label: "United Kingdom" },
  { code: "de", label: "Germany" },
  { code: "jp", label: "Japan" },
  { code: "br", label: "Brazil" },
  { code: "es", label: "Spain" },
  { code: "it", label: "Italy" },
  { code: "kr", label: "South Korea" },
  { code: "ca", label: "Canada" },
  { code: "nl", label: "Netherlands" },
  { code: "pt", label: "Portugal" },
];

export interface Profile {
  name: string;
  role: string;
  tagline: string;
  education: string;
  institution: string;
  location: string;
  email: string;
  phone: string;
  resume: string;
  links: {
    github: string | null;
    linkedin: string | null;
  };
}

export const PROFILE: Profile = {
  name: "Mohamed Faazil",
  role: "AI & Full Stack Developer",
  tagline: "Building intelligent applications and interactive digital experiences.",
  education: "B.Tech – Artificial Intelligence and Data Science",
  institution: "BSA Crescent Institute of Science & Technology, Vandalur",
  location: "Chennai, Tamil Nadu",
  email: "faazil3468@gmail.com",
  phone: "+91 73972 80782",
  resume: "/faazil-resume.pdf",
  links: {
    github: "https://github.com/Faazil-zainab",
    linkedin: "https://www.linkedin.com/in/mohamed-faazil-ab31012ba",
  },
};

export const SKILL_GROUPS: { label: string; items: string[] }[] = [
  {
    label: "Languages & Web",
    items: ["Python", "JavaScript", "TypeScript", "HTML", "CSS", "ReactJS", "Next.js", "Django", "Bootstrap", "Dart"],
  },
  {
    label: "Data & AI",
    items: ["SQL", "PostgreSQL", "Machine Learning", "NLP", "OpenCV", "Generative AI", "Claude", "OpenCode", "Copilot"],
  },
  {
    label: "Cloud & Tools",
    items: [
      "Azure",
      "Dynamics 365",
      "Power Platform",
      "Power BI",
      "Git",
      "GitHub",
      "VS Code",
      "Flutter",
      "Android Studio",
    ],
  },
];

export const EXPERIENCE = {
  company: "In two Cloud Pvt Ltd",
  position: "ERP Administrator Intern",
  duration: "Jun 2025 – Jul 2025",
  location: "Bengaluru",
  items: [
    "Administered Microsoft Dynamics 365 (D365) ERP environments",
    "Assisted with Azure cloud monitoring",
    "Executed SQL queries for data warehousing and validation",
    "Automated business processes with Power Platform",
    "Provided daily technical support",
  ],
} as const;

export const CERTIFICATIONS = [
  "Oracle Cloud Infrastructure (OCI) AI Foundations Associate – Oracle",
  "HTML, CSS, JavaScript & MongoDB Certification",
  "Python Full Stack Certification – SLA Institute, Navalur",
  "TCS iON NQT – 67%",
] as const;

const BASE = "/sites/bruno-simon";

export const asset = (path: string) => `${BASE}/${path}`;
export const ui = (path: string) => `${BASE}/ui/${path}`;
export const flagUrl = (code: string) => ui(`flags/${code}.webp`);
