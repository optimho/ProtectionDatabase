import { query, get, run } from "./db";
import { nanoid } from "nanoid";

export interface ProtectionReport {
  id: string;
  title: string;
  report_number: string;
  description: string;
  revision: string;
  date: string;
  filename: string;
  created_by: string;
  created_at: string;
}

export async function listReports(): Promise<ProtectionReport[]> {
  return query<ProtectionReport>("SELECT * FROM protection_reports ORDER BY date DESC");
}

export async function getReport(id: string): Promise<ProtectionReport | undefined> {
  return get<ProtectionReport>("SELECT * FROM protection_reports WHERE id = ?", [id]);
}

export async function createReport(input: Omit<ProtectionReport, "id" | "created_at">): Promise<ProtectionReport> {
  const id = nanoid();
  await run(
    "INSERT INTO protection_reports (id,title,report_number,description,revision,date,filename,created_by) VALUES (?,?,?,?,?,?,?,?)",
    [id, input.title, input.report_number, input.description, input.revision, input.date, input.filename, input.created_by]
  );
  return (await getReport(id))!;
}

export async function deleteReport(id: string): Promise<void> {
  await run("DELETE FROM protection_reports WHERE id = ?", [id]);
}
