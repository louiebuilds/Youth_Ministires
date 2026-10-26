"use client";

import { useActionState, useState } from "react";
import { addPrivateChatAdultsAction } from "../actions/chat-room-actions";
import type { ChatFamilyCandidate, ChatMemberCandidate } from "../types/chat";

export function PrivateChatAdultPicker({ roomId, candidates, families }: Readonly<{
  roomId: string;
  candidates: ChatMemberCandidate[];
  families?: ChatFamilyCandidate[];
}>) {
  const [mode, setMode] = useState("individual");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [selectedFamilies, setSelectedFamilies] = useState<string[]>([]);
  const [state, action, pending] = useActionState(addPrivateChatAdultsAction, { success: false });
  const available = candidates.filter(c => !c.isMember);
  const reviewed = available.filter(c => selected.includes(c.profileId));
  function toggle(id: string) {
    setSelected(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]);
  }
  return (
    <form action={action} className="mt-5 space-y-4">
      <input type="hidden" name="roomId" value={roomId} />
      {reviewed.map(c => <input key={c.profileId} type="hidden" name="profileIds" value={c.profileId} />)}
      {selectedFamilies.map(id => <input key={id} type="hidden" name="familyIds" value={id} />)}
      <fieldset disabled={pending} className="min-w-0 space-y-3">
        <legend className="font-bold">Add members</legend>
        <label className="block text-sm font-semibold">Selection method
          <select value={mode} onChange={e => setMode(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border px-3">
            <option value="individual">Add Individual Adults</option>
            <option value="family">Add Family Adults</option>
          </select>
        </label>
        <label className="block text-sm font-semibold">Search {mode === "family" ? "families" : "adults"}
          <input type="search" value={search} onChange={e => setSearch(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border px-3" />
        </label>
        <div className="max-h-72 space-y-2 overflow-y-auto">
          {mode === "individual" ? available.filter(c => c.displayName.toLowerCase().includes(search.toLowerCase())).map(c => (
            <label key={c.profileId} className="flex min-h-11 items-center gap-3 rounded-lg border p-3">
              <input type="checkbox" checked={selected.includes(c.profileId)} onChange={() => toggle(c.profileId)} />
              <span>{c.displayName} · {c.primaryRole.replaceAll("_", " ")}</span>
            </label>
          )) : families === undefined ? <p role="alert">Family selection is temporarily unavailable. You can still select individual adults.</p> : families.filter(f => f.familyName.toLowerCase().includes(search.toLowerCase())).map(f => (
            <div key={f.familyId} className="rounded-lg border p-3">
              <p className="font-semibold">{f.familyName}</p>
              {f.adults.length ? <ul className="text-sm">{f.adults.map(c => <li key={c.profileId}>{c.displayName}{c.isMember ? " · Already a member" : ""}</li>)}</ul> : <p className="text-sm">No eligible adults are available.</p>}
              <button type="button" disabled={!f.adults.some(c => !c.isMember)} className="min-h-11 text-sm font-semibold text-sky-800 disabled:opacity-60" onClick={() => {
                setSelected(current => [...new Set([...current, ...f.adults.filter(c => !c.isMember).map(c => c.profileId)])]);
                setSelectedFamilies(current => [...new Set([...current, f.familyId])]);
              }}>Select family adults</button>
            </div>
          ))}
        </div>
        {mode === "family" && families?.length === 0 ? <p>No families are available within your authorized family access.</p> : null}
        {mode === "individual" && !available.length ? <p>No additional eligible adults are available.</p> : null}
        <div className="rounded-lg bg-slate-50 p-3">
          <h3 className="font-semibold">Review selected adults ({reviewed.length})</h3>
          <p className="text-sm text-slate-600">Uncheck any adult to exclude them. Family selection adds only the adults confirmed here.</p>
          {reviewed.map(c => <label key={c.profileId} className="flex min-h-11 items-center gap-3"><input type="checkbox" checked onChange={() => toggle(c.profileId)} />{c.displayName}</label>)}
        </div>
        <button disabled={pending || !reviewed.length || reviewed.length > 100} className="min-h-11 rounded-lg border border-sky-700 px-4 font-semibold text-sky-800 disabled:opacity-60">{pending ? "Adding…" : "Add selected adults"}</button>
      </fieldset>
      {state.message ? <p role={state.success ? "status" : "alert"} className={state.success ? "text-emerald-700" : "text-red-700"}>{state.message}</p> : null}
    </form>
  );
}
