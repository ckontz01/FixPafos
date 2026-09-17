export const departments = {
  technical: {
    name: "Pafos Municipality · Technical Services",
    remit:
      "Municipal roads, potholes, pavements, accessibility, public infrastructure and municipal street lighting. Major highways may need referral to Public Works.",
    url: "https://pafos.org.cy/en/contact/",
  },
  sewerage: {
    name: "EOA Pafos · Sewerage & Drainage",
    remit:
      "Public sewer blockages, sewage leaks, wastewater and stormwater network faults.",
    url: "https://eoap.org.cy/en/sewer-blockage-complaints/",
  },
  water: {
    name: "EOA Pafos · Water Supply",
    remit:
      "Public water supply leaks, interrupted supply and water network faults.",
    url: "https://eoap.org.cy/en/sewer-blockage-complaints/",
  },
  cleaning: {
    name: "Pafos Municipality · Cleaning Service",
    remit:
      "Missed bin collections, litter, illegal dumping and street cleaning.",
    url: "https://pafos.org.cy/en/contact/",
  },
  green: {
    name: "Pafos Municipality · Green Service",
    remit: "Municipal parks, trees, overgrown vegetation and green spaces.",
    url: "https://pafos.org.cy/en/contact/",
  },
  traffic: {
    name: "Pafos Municipality · Traffic Service",
    remit:
      "Municipal parking and local traffic complaints. Road construction goes to Technical Services.",
    url: "https://pafos.org.cy/en/contact/",
  },
  health: {
    name: "Pafos Municipality · Health Service",
    remit:
      "Public hygiene, pests and sanitation complaints other than public sewer faults.",
    url: "https://pafos.org.cy/en/contact/",
  },
  review: {
    name: "Pafos Municipality · General enquiries",
    remit:
      "Unclear, mixed, private-property or outside-jurisdiction issues requiring human routing. No claim of confirmed responsibility.",
    url: "https://pafos.org.cy/en/contact/",
  },
} as const;
export type DepartmentId = keyof typeof departments;
export function departmentFor(id: string) {
  return departments[id as DepartmentId] ?? departments.review;
}
