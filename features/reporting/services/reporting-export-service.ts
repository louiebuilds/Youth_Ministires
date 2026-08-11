import "server-only";
import ExcelJS from "exceljs";
import { getReportingOverview,listAttendanceTrends,listCoverage,listEventReports,listVolunteerActivity,recordReportingExport } from "@/features/reporting/services/reporting-service";
import type { ReportType } from "@/features/reporting/types/reporting";
import { createCsv,neutralizeSpreadsheetValue,REPORT_EXPORT_ROW_LIMIT } from "@/features/reporting/services/reporting-export-utils";

export async function getExportRows(reportType:ReportType,fromDate:string,toDate:string){
  let rows:Record<string,unknown>[];
  if(reportType==="attendance")rows=(await listAttendanceTrends(fromDate,toDate,"week")).map(r=>({period:r.bucketStart,attendance:r.attendanceCount,uniqueYouth:r.uniqueYouth}));
  else if(reportType==="events")rows=(await listEventReports(fromDate,toDate)).map(r=>({...r}));
  else if(reportType==="volunteers")rows=(await listVolunteerActivity(fromDate,toDate)).map(r=>({...r}));
  else if(reportType==="growth"||reportType==="overview"||reportType==="ministry_health")rows=[{...(await getReportingOverview(fromDate,toDate))}];
  else rows=(await listCoverage(fromDate,toDate)).map(r=>({...r}));
  if(rows.length>REPORT_EXPORT_ROW_LIMIT)throw new Error("Export exceeds the 10,000 row limit.");
  return rows;
}

export { createCsv };

export async function createWorkbook(rows:Record<string,unknown>[],title:string){const workbook=new ExcelJS.Workbook();workbook.creator="Youth Ministries Platform";workbook.created=new Date();const sheet=workbook.addWorksheet("Report");const headers=rows.length?Object.keys(rows[0]):["message"];sheet.columns=headers.map(header=>({header,key:header,width:Math.min(40,Math.max(14,header.length+2))}));if(rows.length)sheet.addRows(rows.map(row=>Object.fromEntries(headers.map(h=>[h,neutralizeSpreadsheetValue(row[h])]))));else sheet.addRow({message:"No rows in this reporting range."});sheet.getRow(1).font={bold:true};sheet.views=[{state:"frozen",ySplit:1}];sheet.autoFilter={from:{row:1,column:1},to:{row:1,column:headers.length}};sheet.headerFooter.oddHeader=`&C${title}`;return workbook.xlsx.writeBuffer();}

export async function auditExport(reportType:ReportType,format:"csv"|"xlsx",fromDate:string,toDate:string,rowCount:number){await recordReportingExport(reportType,format,fromDate,toDate,rowCount);}
