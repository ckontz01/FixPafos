import postgres from "postgres";
import { randomUUID } from "node:crypto";

/**
 * Seed realistic demonstration data for the Pafos board.
 *
 * Every row written here carries `demo: true`, which the `is_demo` generated
 * column exposes to the insights dashboard. That is what lets the interface
 * state plainly that it is showing sample data: demonstration rows are never
 * silently mixed into figures presented as real citizen reports.
 *
 * Locations are real Pafos streets and landmarks inside the reporting area.
 * The set deliberately covers every category and department, all four severity
 * levels, resolved and unresolved reports, duplicate clusters, a recurring
 * problem location, and submissions in Greek, English and Russian, so the
 * dashboard and the board can both be demonstrated without live traffic.
 *
 *   node --env-file=.env.local scripts/seed-demo.mjs
 *   node scripts/seed-demo.mjs --clear     (remove seeded rows only)
 */

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL missing");
const local = /127\.0\.0\.1|localhost|\[::1\]/.test(url);
const sql = postgres(url, { ssl: local ? false : "verify-full", max: 1 });

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const now = Date.now();

const DEPARTMENT_FOR = {
  roads: "technical",
  sewage: "sewerage",
  water: "water",
  waste: "cleaning",
  lighting: "technical",
  parks: "green",
  traffic: "traffic",
  other: "review",
};

const SLA = { critical: 4, high: 48, medium: 240, low: 720 };

/** Reports are spread over the past ~150 days so the time series has shape. */
const reports = [
  // --- A duplicate cluster: one pothole, four independent reporters ---------
  { m: "Μεγάλη λακκούβα στη Λεωφόρο Αποστόλου Παύλου, επικίνδυνη για μηχανές.", a: "Γιώργος", c: "roads", lat: 34.7729, lng: 32.4218, loc: "Λεωφόρος Αποστόλου Παύλου", age: 12, sev: "high", lang: "el", cluster: "pothole-apostolou" },
  { m: "Huge pothole on Apostolou Pavlou near the bus stop. Cars swerve into the other lane.", a: "Marina", c: "roads", lat: 34.77295, lng: 32.42185, loc: "Apostolou Pavlou Avenue", age: 11, sev: "high", lang: "en", cluster: "pothole-apostolou" },
  { m: "Большая яма на проспекте Апостолу Павлу, очень опасно для скутеров.", a: "Дмитрий", c: "roads", lat: 34.77288, lng: 32.42175, loc: "Проспект Апостолу Павлу", age: 10, sev: "high", lang: "ru", cluster: "pothole-apostolou" },
  { m: "Same pothole still not fixed, it has got bigger after the rain.", a: "Andreas", c: "roads", lat: 34.7729, lng: 32.4219, loc: "Apostolou Pavlou Avenue", age: 6, sev: "high", lang: "en", cluster: "pothole-apostolou" },
  // Left as a suggestion rather than a confirmed link, so the moderation queue
  // demonstrates a real pending decision instead of appearing empty.
  { m: "Broken drain cover right next to the pothole on Apostolou Pavlou.", a: "Kyriakos", c: "roads", lat: 34.77297, lng: 32.42193, loc: "Apostolou Pavlou Avenue", age: 3, sev: "medium", lang: "en", cluster: "pothole-apostolou", clusterStatus: "suggested" },

  // --- A recurring drain, reported repeatedly over months -------------------
  { m: "Φραγμένο φρεάτιο ομβρίων στην Οδό Ελλάδος, πλημμυρίζει με κάθε βροχή.", a: "Ελένη", c: "sewage", lat: 34.7745, lng: 32.4265, loc: "Οδός Ελλάδος", age: 140, sev: "medium", lang: "el", resolvedAfter: 96 },
  { m: "The drain on Ellados Street is blocked again after last night's rain.", a: "Chris", c: "sewage", lat: 34.77452, lng: 32.42655, loc: "Οδός Ελλάδος", age: 74, sev: "medium", lang: "en", resolvedAfter: 120 },
  { m: "Ξανά φραγμένο το ίδιο φρεάτιο στην Οδό Ελλάδος. Τρίτη φορά φέτος.", a: "Ελένη", c: "sewage", lat: 34.77448, lng: 32.4266, loc: "Οδός Ελλάδος", age: 9, sev: "high", lang: "el" },

  // --- Critical: burst water main ------------------------------------------
  { m: "Σπασμένος αγωγός νερού στην Οδό Νικοδήμου Μυλωνά, τρέχει νερό στον δρόμο εδώ και ώρες.", a: "Πέτρος", c: "water", lat: 34.7762, lng: 32.4241, loc: "Οδός Νικοδήμου Μυλωνά", age: 2, sev: "critical", lang: "el" },

  // --- Waste ---------------------------------------------------------------
  { m: "Τα σκουπίδια δεν μαζεύτηκαν αυτή την εβδομάδα στην Οδό Παφίας Αφροδίτης.", a: "Σοφία", c: "waste", lat: 34.7688, lng: 32.4157, loc: "Οδός Παφίας Αφροδίτης", age: 21, sev: "medium", lang: "el", resolvedAfter: 60 },
  { m: "Illegal dumping of building rubble behind the football ground.", a: "Nikos", c: "waste", lat: 34.7801, lng: 32.4298, loc: "Pafos Municipal Stadium area", age: 45, sev: "medium", lang: "en", resolvedAfter: 200 },
  { m: "Переполненные мусорные баки возле рынка, запах очень сильный.", a: "Ольга", c: "waste", lat: 34.7716, lng: 32.4272, loc: "Пафос, рынок", age: 4, sev: "medium", lang: "ru" },

  // --- Lighting ------------------------------------------------------------
  { m: "Τρία φανάρια σβηστά στην Οδό Αγίου Αντωνίου, πολύ σκοτεινά το βράδυ.", a: "Κώστας", c: "lighting", lat: 34.7702, lng: 32.4189, loc: "Οδός Αγίου Αντωνίου", age: 33, sev: "medium", lang: "el", resolvedAfter: 310 },
  { m: "Street light flickering all night outside the school on Dionysou.", a: "Helen", c: "lighting", lat: 34.7757, lng: 32.4223, loc: "Dionysou Street", age: 17, sev: "low", lang: "en" },
  { m: "Σβηστός φωτισμός στο πάρκινγκ της παραλίας, νιώθω ανασφάλεια το βράδυ.", a: "Μαρία", c: "lighting", lat: 34.7601, lng: 32.4088, loc: "Παραλία Πάφου", age: 8, sev: "high", lang: "el" },

  // --- Parks ---------------------------------------------------------------
  { m: "Σπασμένη κούνια στην παιδική χαρά της πλατείας Κέννεντυ.", a: "Άννα", c: "parks", lat: 34.7738, lng: 32.4251, loc: "Πλατεία Κέννεντυ", age: 27, sev: "high", lang: "el", resolvedAfter: 140 },
  { m: "Overgrown vegetation blocking the footpath along the coastal walk.", a: "Tom", c: "parks", lat: 34.7583, lng: 32.4109, loc: "Coastal path, Kato Pafos", age: 52, sev: "low", lang: "en", resolvedAfter: 420 },
  { m: "Νεκρό δέντρο στο πάρκο, κλίνει επικίνδυνα προς το μονοπάτι.", a: "Λάμπρος", c: "parks", lat: 34.7771, lng: 32.4302, loc: "Δημοτικός Κήπος", age: 3, sev: "high", lang: "el" },

  // --- Traffic -------------------------------------------------------------
  { m: "Παράνομη στάθμευση μπροστά από το σχολείο κάθε πρωί, τα παιδιά δεν περνούν.", a: "Δήμητρα", c: "traffic", lat: 34.7724, lng: 32.4234, loc: "Οδός Γρίβα Διγενή", age: 38, sev: "high", lang: "el" },
  { m: "The pedestrian crossing markings near the harbour have completely faded.", a: "Paul", c: "traffic", lat: 34.7566, lng: 32.4074, loc: "Pafos Harbour", age: 63, sev: "medium", lang: "en", resolvedAfter: 500 },
  { m: "Знак остановки сбит машиной на перекрёстке, никто не чинит.", a: "Сергей", c: "traffic", lat: 34.7792, lng: 32.4283, loc: "Пафос, перекрёсток Тимиу", age: 15, sev: "high", lang: "ru" },

  // --- Roads (spread) ------------------------------------------------------
  { m: "Το πεζοδρόμιο έχει σπάσει και δεν περνά αναπηρικό καροτσάκι.", a: "Χριστίνα", c: "roads", lat: 34.7683, lng: 32.4203, loc: "Οδός Θεμιστοκλή Δέρβη", age: 88, sev: "high", lang: "el", resolvedAfter: 360 },
  { m: "Loose manhole cover rattles every time a car passes.", a: "Steve", c: "roads", lat: 34.7748, lng: 32.4177, loc: "Leoforos Eleftheriou Venizelou", age: 29, sev: "medium", lang: "en", resolvedAfter: 180 },
  { m: "Χαλασμένο οδόστρωμα μετά τα έργα, δεν αποκαταστάθηκε σωστά.", a: "Βασίλης", c: "roads", lat: 34.7812, lng: 32.4321, loc: "Οδός Μεσόγης", age: 103, sev: "medium", lang: "el", resolvedAfter: 640 },
  { m: "Pavement completely blocked by a parked van, had to walk on the road.", a: "Jane", c: "roads", lat: 34.7695, lng: 32.4246, loc: "Kennedy Square", age: 5, sev: "medium", lang: "en" },

  // --- Sewage / water ------------------------------------------------------
  { m: "Έντονη οσμή λυμάτων στην περιοχή, ειδικά τα βράδια.", a: "Ρένα", c: "sewage", lat: 34.7659, lng: 32.4131, loc: "Κάτω Πάφος", age: 47, sev: "high", lang: "el", resolvedAfter: 260 },
  { m: "Low water pressure in the whole street for three days.", a: "Adam", c: "water", lat: 34.7778, lng: 32.4267, loc: "Odos Achaion", age: 19, sev: "medium", lang: "en", resolvedAfter: 90 },
  { m: "Διαρροή νερού στο πεζοδρόμιο, σχηματίζεται λίμνη.", a: "Θάνος", c: "water", lat: 34.7731, lng: 32.4295, loc: "Οδός Ανθυπολοχαγού Γεωργίου Σάββα", age: 7, sev: "high", lang: "el" },

  // --- Health / other ------------------------------------------------------
  { m: "Αρουραίοι κοντά στους κάδους πίσω από τα καταστήματα.", a: "Νίκη", c: "other", lat: 34.7707, lng: 32.4258, loc: "Οδός Αγοράς", age: 24, sev: "high", lang: "el", dept: "health" },
  { m: "Not sure who is responsible, but the bench by the bus stop is broken.", a: "Leo", c: "other", lat: 34.7719, lng: 32.4211, loc: "Karavella bus station", age: 41, sev: "low", lang: "en", resolvedAfter: 700 },
  { m: "Граффити на стене общественного туалета в парке.", a: "Ирина", c: "other", lat: 34.7764, lng: 32.4288, loc: "Пафос, городской парк", age: 58, sev: "low", lang: "ru", resolvedAfter: 900 },
  { m: "Το παγκάκι στην πλατεία είναι σπασμένο εδώ και μήνες.", a: "Στέλιος", c: "other", lat: 34.7742, lng: 32.4255, loc: "Πλατεία Κέννεντυ", age: 121, sev: "low", lang: "el", resolvedAfter: 1100 },
  { m: "Abandoned shopping trolleys left on the verge for weeks.", a: "Kate", c: "waste", lat: 34.7826, lng: 32.4312, loc: "Mesogi Road", age: 71, sev: "low", lang: "en", resolvedAfter: 800 },
  { m: "Σπασμένο κιγκλίδωμα στη σκάλα προς την παραλία, επικίνδυνο.", a: "Φοίβος", c: "parks", lat: 34.7592, lng: 32.4096, loc: "Σκάλα παραλίας", age: 13, sev: "high", lang: "el" },
  { m: "Bins overflowing every weekend near the tourist area.", a: "Dave", c: "waste", lat: 34.7612, lng: 32.4102, loc: "Tombs of the Kings Road", age: 35, sev: "medium", lang: "en", resolvedAfter: 150 },
  { m: "Το φανάρι στη διασταύρωση δεν λειτουργεί σωστά, μπερδεύει τους οδηγούς.", a: "Ηλίας", c: "traffic", lat: 34.7753, lng: 32.4319, loc: "Διασταύρωση Τάφων των Βασιλέων", age: 1, sev: "critical", lang: "el" },
];

const clusterIds = new Map();

function build(report) {
  const createdAt = now - report.age * DAY;
  const departmentId = report.dept ?? DEPARTMENT_FOR[report.c];
  const id = randomUUID();
  const resolvedAt =
    report.resolvedAfter !== undefined
      ? createdAt + report.resolvedAfter * HOUR
      : null;

  const issue = {
    id,
    author: report.a,
    message: report.m,
    location: { longitude: report.lng, latitude: report.lat, label: report.loc },
    category: report.c,
    reportedCategory: report.c,
    assignment: {
      departmentId,
      confidence: "high",
      // Seeded rows are labelled as seeded, never as a model decision that
      // never happened.
      source: "manual_review",
      category: report.c,
    },
    severity: {
      level: report.sev,
      confidence: "medium",
      factors: report.sev === "critical" ? ["danger", "escalation"] : ["infrastructure"],
      rationale: "Seeded demonstration record.",
      source: "fallback",
      needsReview: false,
      slaHours: SLA[report.sev],
      assessedAt: createdAt,
    },
    createdAt,
    seconds: 0,
    replies: [],
    status: resolvedAt ? "resolved" : "open",
    ...(resolvedAt ? { resolution: { departmentId, at: resolvedAt } } : {}),
    demo: true,
  };

  if (report.cluster) {
    let clusterId = clusterIds.get(report.cluster);
    const primary = !clusterId;
    if (primary) {
      clusterId = randomUUID();
      clusterIds.set(report.cluster, clusterId);
    }
    issue.cluster = {
      clusterId,
      role: primary ? "primary" : "linked",
      status: report.clusterStatus ?? "confirmed",
      confidence: report.clusterStatus === "suggested" ? "medium" : "high",
      score: report.clusterStatus === "suggested" ? 0.58 : 0.92,
      distanceMetres: primary ? 0 : 9,
      reason:
        report.clusterStatus === "suggested"
          ? "Very close to an existing pothole report, but it describes a different defect. Needs a person to decide."
          : "Seeded demonstration cluster: same physical issue.",
      source: "lexical",
      decidedBy: "auto",
      at: createdAt,
    };
  }
  return issue;
}

async function clear() {
  const removed = await sql`
    DELETE FROM pafos_issues WHERE (data->>'demo') IS NOT NULL RETURNING id`;
  console.log(`Removed ${removed.length} seeded demonstration reports.`);
}

async function seed() {
  await clear();
  const issues = reports.map(build);
  for (const issue of issues) {
    await sql`INSERT INTO pafos_issues(id,data,created_at)
              VALUES(${issue.id},${sql.json(issue)},${issue.createdAt})`;
  }

  // A few support votes and replies so the board is not uniformly empty.
  const voters = ["demo-voter-1", "demo-voter-2", "demo-voter-3", "demo-voter-4"];
  for (const [index, issue] of issues.entries()) {
    for (const voter of voters.slice(0, index % 5)) {
      await sql`INSERT INTO pafos_votes(issue_id,voter_id) VALUES(${issue.id},${voter})
                ON CONFLICT DO NOTHING`;
    }
  }
  const withReplies = issues.filter((_, i) => i % 4 === 0).slice(0, 6);
  for (const issue of withReplies) {
    const reply = {
      id: randomUUID(),
      author: "Δημοτική Υπηρεσία",
      message: "Καταγράφηκε και προωθήθηκε στην αρμόδια υπηρεσία.",
      createdAt: issue.createdAt + 6 * HOUR,
      verifiedDepartmentId: issue.assignment.departmentId,
    };
    await sql`INSERT INTO pafos_replies(id,issue_id,data,created_at)
              VALUES(${reply.id},${issue.id},${sql.json(reply)},${reply.createdAt})`;
  }

  const resolvedCount = issues.filter((i) => i.status === "resolved").length;
  console.log(
    `Seeded ${issues.length} demonstration reports (${resolvedCount} resolved, ` +
      `${clusterIds.size} duplicate cluster(s)). Every row is marked demo: true.`,
  );
}

try {
  if (process.argv.includes("--clear")) await clear();
  else await seed();
} finally {
  await sql.end();
}
