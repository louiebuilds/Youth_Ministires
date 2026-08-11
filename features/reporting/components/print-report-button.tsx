"use client";
export function PrintReportButton(){return <button className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 print:hidden" onClick={()=>window.print()} type="button">Print report</button>;}
