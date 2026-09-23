import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { CreateDocumentTemplateForm } from "@/features/forms/components/document-template-forms";
import { DocumentSubmissionWorkspace } from "@/features/forms/components/document-submission-workspace";
import { listAvailableDocumentVersions, listDocumentSubmissions } from "@/features/forms/services/document-submission-service";
import { listDocumentTemplates, listDocumentTemplateVersions } from "@/features/forms/services/document-template-service";
import { getAuthenticatedAccount } from "@/features/auth/services/session-service";
import { hasCapability } from "@/features/auth/types/authorization";
import { CustomFormsWorkspace } from "@/features/forms/components/custom-forms-workspace";
import { listCustomFormAssignments, listCustomFormSubmissions, listCustomFormTemplates, listMyCustomForms } from "@/features/forms/services/custom-form-service";
import { listCustomFormAssignmentTargets } from "@/features/forms/services/custom-form-assignment-target-service";
import { MedicalFormsWorkspace } from "@/features/forms/components/medical-forms-workspace";
import { listCurrentMedicalFormStatus } from "@/features/forms/services/medical-permission-service";

export default async function PermissionFormsPage() {
  const account=await getAuthenticatedAccount();
  if(!account)redirect("/login");
  const medicalManager=account.role==="platform_administrator"||account.role==="youth_pastor";
  const documentsManager=medicalManager;
  const documentsAccess=documentsManager||account.role==="parent";
  const customManager=hasCapability(account.role,"custom_forms.manage");
  const customSubmit=hasCapability(account.role,"custom_forms.submit");
  const formsAccess=documentsAccess||customManager||customSubmit;
  if(!formsAccess)notFound();
  const [templates,options,submissions,customTemplates,customAssignments,myCustomForms,customSubmissions,assignmentTargets]=await Promise.all([
    documentsManager?listDocumentTemplates():Promise.resolve([]),
    documentsAccess?listAvailableDocumentVersions():Promise.resolve([]),documentsAccess?listDocumentSubmissions():Promise.resolve([]),
    customManager?listCustomFormTemplates():Promise.resolve([]),customManager?listCustomFormAssignments():Promise.resolve([]),customSubmit?listMyCustomForms():Promise.resolve([]),customManager?listCustomFormSubmissions():Promise.resolve([]),
    customManager?listCustomFormAssignmentTargets():Promise.resolve({events:[],students:[],households:[],volunteers:[]}),
  ]);
  const medicalStatuses=medicalManager?await listCurrentMedicalFormStatus():[];
  const medicalVersions=medicalManager?(await Promise.all(templates.filter((template)=>template.documentKind==="medical_release").map(async(template)=>(await listDocumentTemplateVersions(template.templateId)).map((version)=>({...version,templateName:template.name}))))).flat():[];

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold text-sky-700">Forms &amp; Registrations</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-950">Forms workspace</h1>
        <p className="mt-2 text-slate-600">
          Manage assigned operational forms separately from permission and medical documentation.
        </p>
      </header>

      {documentsManager?<><section className="rounded-xl border bg-white p-5">
        <h2 className="mb-4 text-xl font-bold">Create a template</h2>
        <CreateDocumentTemplateForm />
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold">Template history</h2>
        {templates.map((template) => (
          <Link
            className="block rounded-xl border bg-white p-5 shadow-sm transition hover:border-sky-300"
            href={`/permission-forms/${template.templateId}`}
            key={template.templateId}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold">{template.name}</h3>
                <p className="text-sm text-slate-600">
                  {template.documentKind === "medical_release" ? "Medical release" : "Permission slip"}
                  {template.description ? ` · ${template.description}` : ""}
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold capitalize">
                {template.status}
              </span>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              {template.versionCount} version{template.versionCount === 1 ? "" : "s"}
              {template.latestVersionNumber ? ` · Latest v${template.latestVersionNumber}` : ""}
            </p>
          </Link>
        ))}
        {!templates.length ? (
          <p className="rounded-xl border bg-white p-6 text-slate-600">No document templates have been created.</p>
        ) : null}
      </section></>:null}
      {medicalManager?<MedicalFormsWorkspace statuses={medicalStatuses} versions={medicalVersions}/>:null}
      {documentsAccess?<DocumentSubmissionWorkspace manager={documentsManager} options={options} submissions={submissions}/>:null}
      <CustomFormsWorkspace manager={customManager} templates={customTemplates} assignments={customAssignments} myForms={myCustomForms} submissions={customSubmissions} assignmentTargets={assignmentTargets}/>
    </div>
  );
}
