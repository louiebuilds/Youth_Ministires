import type { ReactNode } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { CreateDocumentTemplateForm } from "@/features/forms/components/document-template-forms";
import { DocumentSubmissionWorkspace } from "@/features/forms/components/document-submission-workspace";
import { CustomFormsWorkspace } from "@/features/forms/components/custom-forms-workspace";
import { MedicalFormsWorkspace } from "@/features/forms/components/medical-forms-workspace";

import { getAuthenticatedAccount } from "@/features/auth/services/session-service";
import { hasCapability } from "@/features/auth/types/authorization";

import {
  listAvailableDocumentVersions,
  listDocumentSubmissions,
} from "@/features/forms/services/document-submission-service";

import {
  listDocumentTemplates,
  listDocumentTemplateVersions,
} from "@/features/forms/services/document-template-service";

import {
  listCustomFormAssignments,
  listCustomFormSubmissions,
  listCustomFormTemplates,
  listMyCustomForms,
} from "@/features/forms/services/custom-form-service";

import { listCustomFormAssignmentTargets } from "@/features/forms/services/custom-form-assignment-target-service";

import {
  getCurrentMedicalAccess,
  listCurrentMedicalFormStatus,
} from "@/features/forms/services/medical-permission-service";

type FormsView =
  | "forms"
  | "medical"
  | "assignments"
  | "responses"
  | "my-forms";

type FormTool =
  | "none"
  | "template"
  | "version"
  | "field"
  | "assignment";

function getView(
  value: string | string[] | undefined,
  documentsAccess: boolean,
  customManager: boolean,
  customSubmit: boolean,
): FormsView {
  const requested =
    typeof value === "string" ? value : "forms";

  if (
    requested === "medical" &&
    documentsAccess
  ) {
    return "medical";
  }

  if (
    requested === "assignments" &&
    customManager
  ) {
    return "assignments";
  }

  if (
    requested === "responses" &&
    customManager
  ) {
    return "responses";
  }

  if (
    requested === "my-forms" &&
    customSubmit
  ) {
    return "my-forms";
  }

  if (customManager) {
    return "forms";
  }

  if (customSubmit) {
    return "my-forms";
  }

  return "medical";
}

function getTool(
  value: string | string[] | undefined,
): FormTool {
  if (typeof value !== "string") {
    return "none";
  }

  if (
    value === "template" ||
    value === "version" ||
    value === "field" ||
    value === "assignment"
  ) {
    return value;
  }

  return "none";
}

function WorkspaceLink({
  active,
  href,
  children,
}: {
  active: boolean;
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      className={
        active
          ? "inline-flex min-h-12 items-center border-b-2 border-sky-700 px-4 font-semibold text-sky-800"
          : "inline-flex min-h-12 items-center border-b-2 border-transparent px-4 font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
      }
      href={href}
    >
      {children}
    </Link>
  );
}

export default async function PermissionFormsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<
    Record<
      string,
      string | string[] | undefined
    >
  >;
}>) {
  const account =
    await getAuthenticatedAccount();

  if (!account) {
    redirect("/login");
  }

  const documentsManager =
    account.role ===
      "platform_administrator" ||
    account.role === "youth_pastor";

  const parentView =
    account.role === "parent";

  const medicalAccess =
    await getCurrentMedicalAccess();

  const documentsAccess =
    documentsManager ||
    medicalAccess.canView ||
    account.role === "parent";

  const customManager = hasCapability(
    account.role,
    "custom_forms.manage",
  );

  const customSubmit = hasCapability(
    account.role,
    "custom_forms.submit",
  );

  const formsAccess =
    documentsAccess ||
    customManager ||
    customSubmit;

  if (!formsAccess) {
    notFound();
  }

  const params = await searchParams;

  const view = getView(
    params.view,
    documentsAccess,
    customManager,
    customSubmit,
  );

  const tool = getTool(params.tool);

  const [
    templates,
    options,
    submissions,
    customTemplates,
    customAssignments,
    myCustomForms,
    customSubmissions,
    assignmentTargets,
  ] = await Promise.all([
    documentsManager
      ? listDocumentTemplates()
      : Promise.resolve([]),

    (documentsManager ||
      account.role === "parent")
      ? listAvailableDocumentVersions()
      : Promise.resolve([]),

    documentsAccess
      ? listDocumentSubmissions()
      : Promise.resolve([]),

    customManager
      ? listCustomFormTemplates()
      : Promise.resolve([]),

    customManager
      ? listCustomFormAssignments()
      : Promise.resolve([]),

    customSubmit
      ? listMyCustomForms()
      : Promise.resolve([]),

    customManager
      ? listCustomFormSubmissions()
      : Promise.resolve([]),

    customManager
      ? listCustomFormAssignmentTargets()
      : Promise.resolve({
          events: [],
          students: [],
          households: [],
          volunteers: [],
        }),
  ]);

  const medicalStatuses =
    medicalAccess.canView
      ? await listCurrentMedicalFormStatus()
      : [];

  const medicalVersions =
    documentsManager
      ? (
          await Promise.all(
            templates
              .filter(
                (template) =>
                  template.documentKind ===
                  "medical_release",
              )
              .map(async (template) =>
                (
                  await listDocumentTemplateVersions(
                    template.templateId,
                  )
                ).map((version) => ({
                  ...version,
                  templateName:
                    template.name,
                })),
              ),
          )
        ).flat()
      : [];

  return (
    <div className="space-y-8">
      <header>
        <div className="max-w-4xl">
          <p className="text-sm font-semibold text-sky-700">
            Forms &amp; Registrations
          </p>

          <h1 className="mt-1 text-3xl font-bold text-slate-950">
            Forms
          </h1>

          <p className="mt-2 text-slate-600">
            {parentView
              ? "Complete and view forms and documents for your linked family."
              : "Create and manage ministry forms, waiver documents, assignments, and submitted responses."}
          </p>
        </div>

        <nav
          aria-label="Forms workspaces"
          className="mt-8 flex flex-wrap border-b border-slate-200"
        >
          {customManager ? (
            <WorkspaceLink
              active={view === "forms"}
              href="/permission-forms?view=forms"
            >
              Forms
            </WorkspaceLink>
          ) : null}

          {documentsAccess ? (
            <WorkspaceLink
              active={view === "medical"}
              href="/permission-forms?view=medical"
            >
              Medical &amp; Waivers
            </WorkspaceLink>
          ) : null}

          {customManager ? (
            <WorkspaceLink
              active={
                view === "assignments"
              }
              href="/permission-forms?view=assignments"
            >
              Assignments
            </WorkspaceLink>
          ) : null}

          {customManager ? (
            <WorkspaceLink
              active={
                view === "responses"
              }
              href="/permission-forms?view=responses"
            >
              Responses
            </WorkspaceLink>
          ) : null}

          {customSubmit ? (
            <WorkspaceLink
              active={view === "my-forms"}
              href="/permission-forms?view=my-forms"
            >
              My Forms
            </WorkspaceLink>
          ) : null}
        </nav>
      </header>

      {view === "medical" &&
      documentsAccess ? (
        <section className="space-y-5">
          <div>
            <h2 className="text-2xl font-bold text-slate-950">
              Medical &amp; Waiver Documents
            </h2>

            <p className="mt-1 text-slate-600">
              {parentView
                ? "Complete, upload, and view waivers, permission forms, and medical releases for your linked children."
                : "Manage waivers, permission forms, medical releases, and completed documents."}
            </p>
          </div>

          {documentsManager ? (
            <div
              className="rounded-xl border border-slate-200 bg-white p-5"
              id="document-templates"
            >
              <details>
                <summary className="cursor-pointer font-bold text-slate-950">
                  Document templates
                </summary>

                <div className="mt-5 space-y-6 border-t border-slate-200 pt-5">
                  <div>
                    <h3 className="mb-4 text-lg font-bold">
                      New document template
                    </h3>

                    <CreateDocumentTemplateForm />
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-bold">
                      Template history
                    </h3>

                    {templates.length ? (
                      <div className="overflow-hidden rounded-xl border border-slate-200">
                        <div className="hidden gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 md:grid md:grid-cols-[minmax(0,2fr)_10rem_8rem_5rem]">
                          <span>
                            Template
                          </span>

                          <span>
                            Type
                          </span>

                          <span>
                            Status
                          </span>

                          <span className="sr-only">
                            Open
                          </span>
                        </div>

                        <div className="divide-y divide-slate-200">
                          {templates.map(
                            (template) => (
                              <Link
                                className="grid gap-2 px-4 py-4 transition hover:bg-sky-50 md:grid-cols-[minmax(0,2fr)_10rem_8rem_5rem] md:items-center md:gap-4"
                                href={`/permission-forms/${template.templateId}`}
                                key={
                                  template.templateId
                                }
                              >
                                <div>
                                  <span className="font-bold text-slate-950">
                                    {
                                      template.name
                                    }
                                  </span>

                                  {template.description ? (
                                    <p className="mt-1 text-sm text-slate-600">
                                      {
                                        template.description
                                      }
                                    </p>
                                  ) : null}
                                </div>

                                <span className="text-sm text-slate-600">
                                  {template.documentKind ===
                                  "medical_release"
                                    ? "Medical release"
                                    : "Waiver / Permission Form"}
                                </span>

                                <span className="text-sm font-semibold capitalize text-sky-800">
                                  {
                                    template.status
                                  }
                                </span>

                                <span className="text-sm font-semibold text-sky-800 md:text-right">
                                  Open
                                </span>
                              </Link>
                            ),
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="rounded-lg border border-slate-200 bg-slate-50 p-5 text-slate-600">
                        No document templates
                        have been created.
                      </p>
                    )}
                  </div>
                </div>
              </details>
            </div>
          ) : null}

          {medicalAccess.canView ? (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <details>
                <summary className="cursor-pointer font-bold text-slate-950">
                  Current medical release
                </summary>

                <div className="mt-5 border-t border-slate-200 pt-5">
                  <MedicalFormsWorkspace
                    manager={
                      documentsManager
                    }
                    statuses={
                      medicalStatuses
                    }
                    versions={
                      medicalVersions
                    }
                  />
                </div>
              </details>
            </div>
          ) : null}

          <div
            className="rounded-xl border border-slate-200 bg-white p-5"
            id="completed-documents"
          >
            <details>
              <summary className="cursor-pointer font-bold text-slate-950">
                Completed documents
              </summary>

              <div className="mt-5 border-t border-slate-200 pt-5">
                <DocumentSubmissionWorkspace
                  medicalAuthorizationRole={account.role}
                  manager={
                    documentsManager
                  }
                  options={options}
                  submissions={
                    submissions
                  }
                />
              </div>
            </details>
          </div>
        </section>
      ) : null}

      {view !== "medical" ? (
        <CustomFormsWorkspace
          key={`${view}-${tool}`}
          assignmentTargets={
            assignmentTargets
          }
          assignments={
            customAssignments
          }
          initialTool={tool}
          initialView={view}
          manager={customManager}
          myForms={myCustomForms}
          showNavigation={false}
          showToolButtons={
            view === "forms"
          }
          submissions={
            customSubmissions
          }
          templates={customTemplates}
        />
      ) : null}
    </div>
  );
}
