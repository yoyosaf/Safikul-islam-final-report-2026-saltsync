export interface Employee {
  name: string;
  eid: string;
}

export interface EmployeeReport {
  id?: string;
  date: string;
  name: string;
  employee_id: string;
  shift: string;
  issues: number;
  physical_support: number;
  regular_issues: number;
  processing: number;
  solved: number;
  special_task: string;
  report_content: string;
  ts: number;
}

export interface TLReport {
  id?: string;
  date: string;
  tl_name: string;
  shift: string;
  issues: number;
  solved: number;
  processing: number;
  physical_total: number;
  physical_complete: number;
  physical_shift: number;
  physical_cancel: number;
  processing_persons: string;
  report_content: string;
  ts: number;
}

export interface AppSettings {
  notification: string;
  adminPass: string;
  ping: number;
}
