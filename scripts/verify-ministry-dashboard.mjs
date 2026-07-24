import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const dashboardPage = await readFile(
  new URL("../app/(platform)/dashboard/page.tsx", import.meta.url),
  "utf8",
);
const dashboardComponent = await readFile(
  new URL(
    "../features/dashboard/components/ministry-dashboard.tsx",
    import.meta.url,
  ),
  "utf8",
);
const syntheticData = await readFile(
  new URL(
    "../features/dashboard/data/synthetic-ministry-dashboard.ts",
    import.meta.url,
  ),
  "utf8",
);

const requiredDashboardAreas = [
  "Ministry summary",
  "Upcoming events",
  "Volunteer status",
  "Prayer requests",
  "Birthdays",
  "Announcements",
  "Quick actions",
];

for (const area of requiredDashboardAreas) {
  assert.match(
    dashboardComponent,
    new RegExp(area, "u"),
    `Dashboard is missing the required "${area}" area.`,
  );
}

assert.match(
  dashboardComponent,
  /Synthetic preview data/u,
  "Dashboard must clearly identify synthetic preview data.",
);
assert.match(
  dashboardPage,
  /account\.role === "parent"/u,
  "Dashboard route must select the family view for parent accounts.",
);
assert.match(
  dashboardComponent,
  /data\.audience === "family"/u,
  "Dashboard component must preserve the family/ministry presentation boundary.",
);
assert.match(
  syntheticData,
  /syntheticFamilyDashboard/u,
  "Dashboard fixture must include a separate synthetic family view.",
);
assert.match(
  dashboardComponent,
  /Confidential request content is never exposed here/u,
  "Dashboard must preserve the prayer-request confidentiality notice.",
);
assert.match(
  dashboardPage,
  /requireCapability\("dashboard\.view"\)/u,
  "Dashboard route must enforce the dashboard.view capability.",
);
assert.doesNotMatch(
  `${dashboardPage}\n${dashboardComponent}`,
  /supabase|createClient|from\(/iu,
  "Dashboard presentation must not access Supabase directly.",
);

const syntheticMarkers = [
  "Example Midweek Gathering",
  "Sample Service Project",
  "Demo Summer Retreat",
  "Jordan S.",
  "Taylor R.",
  "Morgan L.",
];

for (const marker of syntheticMarkers) {
  assert.match(
    syntheticData,
    new RegExp(marker.replace(".", "\\."), "u"),
    `Synthetic fixture is missing "${marker}".`,
  );
}

const birthdayDisplayNames = [
  ...syntheticData.matchAll(/displayName: "([^"]+)"/gu),
].map((match) => match[1]);

assert.ok(
  birthdayDisplayNames.length > 0,
  "Synthetic fixture must include birthday display names.",
);

for (const displayName of birthdayDisplayNames) {
  assert.match(
    displayName,
    /^[A-Z][a-z]+ [A-Z]\.$/u,
    `Birthday display name "${displayName}" must use first name and last initial.`,
  );
}

console.log("Ministry Dashboard verification passed.");
