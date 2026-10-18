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
const dashboardHomeTop = await readFile(
  new URL(
    "../features/dashboard/components/dashboard-home-top.tsx",
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
];

for (const area of requiredDashboardAreas) {
  assert.match(
    dashboardComponent,
    new RegExp(area, "u"),
    `Dashboard is missing the required "${area}" area.`,
  );
}

assert.match(
  dashboardHomeTop,
  /Quick actions/u,
  "The first-screen experience must place Quick actions near the top.",
);
assert.match(
  dashboardHomeTop,
  /New announcement/u,
  "The dashboard must prominently spotlight an unread announcement.",
);
assert.match(
  dashboardHomeTop,
  /Good morning|Good afternoon|Good evening/u,
  "The dashboard must use a welcoming time-aware greeting.",
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
  `${dashboardPage}\n${dashboardComponent}\n${dashboardHomeTop}`,
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
