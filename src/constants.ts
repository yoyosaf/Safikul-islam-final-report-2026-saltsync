import { Employee } from "./types";

export const FIXED_ISSUES: Record<string, string[]> = {
  'QC Issue': ['qc'],
  'Slow Issues': ['slow', 'slow internet', 'speed issue', 'slow speed'],
  'Direct Call': ['direct call'],
  'QC Call': ['qc call'],
  'Solved': ['solved', 'done', 'fixed'],
  'Billing Issues': ['billing', 'bill', 'payment', 'invoice'],
  'No Internet': ['no internet', 'internet down', 'offline'],
  'Disconnect Issue': ['disconnect', 'disconnected'],
  'Loss': ['loss', 'packet loss'],
  'Pack Change': ['pack update', 'pack upgrade', 'pack downgrade', 'package change'],
  'Power Check': ['power', 'power check'],
  'Shifting': ['shifting', 'relocation'],
  'Site Browsing Issue': ['site issue', 'website problem', 'browsing issue'],
  'Gaming Issue': ['game', 'gaming', 'ping', 'latency'],
  'General Task': ['general'],
  'Reconnection': ['reconnect', 'reconnection'],
  'New Line': ['new line', 'new connection'],
  'Public IP Need': ['public ip'],
  'FTP Issue': ['ftp'],
  'Info': ['info', 'information']
};

export const DEFAULT_EMPS: Employee[] = [
  { name: "Sujan Tarafdar", eid: "Salt-S-063" },
  { name: "Md Safikul Islam", eid: "Salt-S-076" },
  { name: "Sajid Hossain", eid: "Salt-S-077" },
  { name: "Md. Shamsur Rahman", eid: "Salt-S-049" },
  { name: "Md. Muhaimin Nabi", eid: "Salt-S-094" },
  { name: "Rony Bine", eid: "Salt-S-096" },
  { name: "MD Shakib", eid: "Salt-S-080" },
  { name: "GM Sakib", eid: "Salt-S-087" }
];

export const TL_NAMES = ["Safikul Islam", "S.M Faisal"];

export const SHIFTS = ["Day", "Evening", "Night"];

export const TL_SHIFTS = [
  "Day (9:00AM to 6:30PM)",
  "All Day (9:00AM to 9:00AM)",
  "Evening",
  "Night"
];
