import assert from "node:assert/strict";

import {
  createChildInputFromFormData,
  createChildSchema,
  createIndependentStudentInputFromFormData,
  createIndependentStudentSchema,
  studentValidationMessage,
// Node's type-stripping test runner requires the source extension at runtime.
// @ts-expect-error -- production compilation resolves the same module via @/ aliases.
} from "../features/members/schemas/child-management-schema.ts";

const householdId = "10000000-0000-4000-8000-000000000001";
const guardianPersonId = "10000000-0000-4000-8000-000000000002";

function independentForm() {
  const formData = new FormData();
  formData.set("firstName", "Synthetic");
  formData.set("lastName", "Student");
  formData.set("birthDate", "2012-01-01");
  formData.set("grade", "8");
  formData.set("status", "prospective");
  return formData;
}

function householdForm() {
  const formData = independentForm();
  formData.set("status", "active");
  formData.set("householdId", householdId);
  formData.set("guardianPersonId", guardianPersonId);
  return formData;
}

const independent = createIndependentStudentSchema.safeParse(
  createIndependentStudentInputFromFormData(independentForm()),
);
assert.equal(independent.success, true, "independent form accepts omitted preferred name");
if (independent.success) assert.equal(independent.data.preferredName, null);

const household = createChildSchema.safeParse(
  createChildInputFromFormData(householdForm()),
);
assert.equal(household.success, true, "household form accepts omitted optional summaries");
if (household.success) {
  assert.equal(household.data.preferredName, null);
  assert.equal(household.data.medicalSummary, null);
  assert.equal(household.data.allergySummary, null);
  assert.equal(household.data.dietarySummary, null);
}

const missingName = independentForm();
missingName.delete("firstName");
const invalidName = createIndependentStudentSchema.safeParse(
  createIndependentStudentInputFromFormData(missingName),
);
assert.equal(invalidName.success, false);
if (!invalidName.success) {
  assert.equal(studentValidationMessage(invalidName.error), "Enter a valid first name.");
  console.log("required-field issue:", invalidName.error.issues[0]?.path.join("."));
}

const invalidGuardian = householdForm();
invalidGuardian.delete("guardianPersonId");
const missingGuardian = createChildSchema.safeParse(
  createChildInputFromFormData(invalidGuardian),
);
assert.equal(missingGuardian.success, false);
if (!missingGuardian.success) {
  assert.equal(
    studentValidationMessage(missingGuardian.error),
    "Enter a valid initial legal guardian.",
  );
  console.log("guardian-field issue:", missingGuardian.error.issues[0]?.path.join("."));
}

console.log("student creation form verification passed");
