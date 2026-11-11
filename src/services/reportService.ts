import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  doc, 
  getDoc, 
  deleteDoc,
  serverTimestamp,
  onSnapshot,
  setDoc,
  writeBatch
} from 'firebase/firestore';
import {
  ref,
  push,
  set,
  get,
  remove,
  update,
  onValue
} from 'firebase/database';
import { db, rtdb, auth } from '../firebase';
import { EmployeeReport, TLReport, Employee, AppSettings } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Database Sync Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Deterministic key generator for employee records
export function getEmployeeKey(emp: { eid?: string; name?: string }): string {
  const identifier = (emp.eid && emp.eid.trim()) || (emp.name && emp.name.trim()) || 'unknown';
  return identifier.toLowerCase().replace(/[^a-z0-9]/g, '-');
}

export const reportService = {
  // ==========================================
  // EMPLOYEE REPORTS
  // ==========================================

  // Save report concurrently to both RTDB and Firestore with a shared ID
  async saveEmployeeReport(report: Omit<EmployeeReport, 'id'>): Promise<{ id: string; rtdb: boolean; firestore: boolean }> {
    const timestamp = Date.now();
    
    // Shared deterministic ID between RTDB & Firestore to ensure 100% correlation
    const reportId = rtdb 
      ? (push(ref(rtdb, 'emp_reports')).key || `emp_${timestamp}_${Math.random().toString(36).substring(2, 9)}`)
      : `emp_${timestamp}_${Math.random().toString(36).substring(2, 9)}`;

    const fullReport: EmployeeReport = {
      ...report,
      id: reportId,
      ts: timestamp
    };

    // Run RTDB and Firestore writes concurrently
    const rtdbPromise = rtdb 
      ? set(ref(rtdb, `emp_reports/${reportId}`), fullReport) 
      : Promise.resolve();

    const firestorePromise = setDoc(doc(db, 'emp_reports', reportId), {
      ...fullReport,
      createdAt: serverTimestamp()
    });

    const [rtdbRes, firestoreRes] = await Promise.allSettled([rtdbPromise, firestorePromise]);

    const rtdbSuccess = rtdb ? rtdbRes.status === 'fulfilled' : false;
    const firestoreSuccess = firestoreRes.status === 'fulfilled';

    if (!rtdbSuccess && !firestoreSuccess) {
      const err = firestoreRes.status === 'rejected' 
        ? (firestoreRes as PromiseRejectedResult).reason?.message 
        : 'Failed to save report to database.';
      handleFirestoreError(new Error(err), OperationType.CREATE, 'emp_reports');
    }

    return { id: reportId, rtdb: rtdbSuccess, firestore: firestoreSuccess };
  },

  // Parallel fetch and O(1) Set deduplication
  async getEmployeeReports(empName?: string): Promise<EmployeeReport[]> {
    const reportsMap = new Map<string, EmployeeReport>();
    const seenSignatures = new Set<string>();

    // Concurrently query RTDB and Firestore
    const [rtdbResult, firestoreResult] = await Promise.allSettled([
      rtdb ? get(ref(rtdb, 'emp_reports')) : Promise.resolve(null),
      (async () => {
        const reportsRef = collection(db, 'emp_reports');
        let q = query(reportsRef, orderBy('ts', 'desc'));
        if (empName) {
          q = query(reportsRef, where('name', '==', empName), orderBy('ts', 'desc'));
        }
        return getDocs(q);
      })()
    ]);

    // 1. Process RTDB results
    if (rtdbResult.status === 'fulfilled' && rtdbResult.value && rtdbResult.value.exists()) {
      const data = rtdbResult.value.val();
      for (const [key, val] of Object.entries(data)) {
        const item = val as any;
        if (item && (!empName || item.name === empName)) {
          const fullItem: EmployeeReport = { id: key, ...item };
          reportsMap.set(key, fullItem);
          const sig = `${fullItem.date || ''}_${fullItem.name || ''}_${fullItem.shift || ''}_${fullItem.issues || ''}`;
          seenSignatures.add(sig);
        }
      }
    }

    // 2. Process Firestore results with O(1) deduplication
    if (firestoreResult.status === 'fulfilled' && firestoreResult.value) {
      firestoreResult.value.docs.forEach(docSnap => {
        const item = { id: docSnap.id, ...docSnap.data() } as EmployeeReport;
        if (reportsMap.has(docSnap.id)) {
          return; // Exact match by shared ID
        }
        const sig = `${item.date || ''}_${item.name || ''}_${item.shift || ''}_${item.issues || ''}`;
        if (!seenSignatures.has(sig)) {
          reportsMap.set(docSnap.id, item);
          seenSignatures.add(sig);
        }
      });
    }

    return Array.from(reportsMap.values()).sort((a, b) => (b.ts || 0) - (a.ts || 0));
  },

  // ==========================================
  // TL REPORTS
  // ==========================================

  // Save TL report concurrently to both RTDB and Firestore with shared ID
  async saveTLReport(report: Omit<TLReport, 'id'>): Promise<{ id: string; rtdb: boolean; firestore: boolean }> {
    const timestamp = Date.now();

    const reportId = rtdb 
      ? (push(ref(rtdb, 'tl_reports')).key || `tl_${timestamp}_${Math.random().toString(36).substring(2, 9)}`)
      : `tl_${timestamp}_${Math.random().toString(36).substring(2, 9)}`;

    const fullReport: TLReport = {
      ...report,
      id: reportId,
      ts: timestamp
    };

    const rtdbPromise = rtdb 
      ? set(ref(rtdb, `tl_reports/${reportId}`), fullReport) 
      : Promise.resolve();

    const firestorePromise = setDoc(doc(db, 'tl_reports', reportId), {
      ...fullReport,
      createdAt: serverTimestamp()
    });

    const [rtdbRes, firestoreRes] = await Promise.allSettled([rtdbPromise, firestorePromise]);

    const rtdbSuccess = rtdb ? rtdbRes.status === 'fulfilled' : false;
    const firestoreSuccess = firestoreRes.status === 'fulfilled';

    if (!rtdbSuccess && !firestoreSuccess) {
      const err = firestoreRes.status === 'rejected' 
        ? (firestoreRes as PromiseRejectedResult).reason?.message 
        : 'Failed to save TL report to database.';
      handleFirestoreError(new Error(err), OperationType.CREATE, 'tl_reports');
    }

    return { id: reportId, rtdb: rtdbSuccess, firestore: firestoreSuccess };
  },

  // Parallel fetch and O(1) deduplication for TL Reports
  async getTLReports(): Promise<TLReport[]> {
    const reportsMap = new Map<string, TLReport>();
    const seenSignatures = new Set<string>();

    const [rtdbResult, firestoreResult] = await Promise.allSettled([
      rtdb ? get(ref(rtdb, 'tl_reports')) : Promise.resolve(null),
      getDocs(query(collection(db, 'tl_reports'), orderBy('ts', 'desc')))
    ]);

    if (rtdbResult.status === 'fulfilled' && rtdbResult.value && rtdbResult.value.exists()) {
      const data = rtdbResult.value.val();
      for (const [key, val] of Object.entries(data)) {
        const item = val as any;
        if (item) {
          const fullItem: TLReport = { id: key, ...item };
          reportsMap.set(key, fullItem);
          const sig = `${fullItem.date || ''}_${fullItem.tl_name || ''}_${fullItem.shift || ''}`;
          seenSignatures.add(sig);
        }
      }
    }

    if (firestoreResult.status === 'fulfilled' && firestoreResult.value) {
      firestoreResult.value.docs.forEach(docSnap => {
        const item = { id: docSnap.id, ...docSnap.data() } as TLReport;
        if (reportsMap.has(docSnap.id)) return;
        const sig = `${item.date || ''}_${item.tl_name || ''}_${item.shift || ''}`;
        if (!seenSignatures.has(sig)) {
          reportsMap.set(docSnap.id, item);
          seenSignatures.add(sig);
        }
      });
    }

    return Array.from(reportsMap.values()).sort((a, b) => (b.ts || 0) - (a.ts || 0));
  },

  // ==========================================
  // DIRECT & BATCH DELETE OPERATIONS
  // ==========================================

  // Fast direct deletion without full scans
  async deleteReport(type: 'emp' | 'tl', id: string): Promise<{ success: boolean; rtdbDeleted: boolean; firestoreDeleted: boolean }> {
    if (!id) throw new Error('Report ID is required for deletion');
    const path = type === 'emp' ? 'emp_reports' : 'tl_reports';

    const rtdbPromise = rtdb ? remove(ref(rtdb, `${path}/${id}`)) : Promise.resolve();
    const firestorePromise = deleteDoc(doc(db, path, id));

    const [rtdbRes, firestoreRes] = await Promise.allSettled([rtdbPromise, firestorePromise]);

    const rtdbDeleted = rtdb ? rtdbRes.status === 'fulfilled' : false;
    const firestoreDeleted = firestoreRes.status === 'fulfilled';

    if (!rtdbDeleted && !firestoreDeleted) {
      const err = firestoreRes.status === 'rejected' 
        ? (firestoreRes as PromiseRejectedResult).reason?.message 
        : 'Failed to delete report from database';
      throw new Error(err || 'Failed to delete record');
    }

    return { success: true, rtdbDeleted, firestoreDeleted };
  },

  // Instant atomic bulk deletion: RTDB multi-path update + Firestore writeBatch
  async deleteReportsBatch(type: 'emp' | 'tl', ids: string[]): Promise<{ deleted: number; failed: number }> {
    if (!ids || ids.length === 0) return { deleted: 0, failed: 0 };
    const path = type === 'emp' ? 'emp_reports' : 'tl_reports';

    // 1. RTDB: One single network request deletes all IDs via multi-path nulls
    const rtdbPromise = (async () => {
      if (!rtdb) return;
      const updates: Record<string, null> = {};
      for (const id of ids) {
        updates[`${path}/${id}`] = null;
      }
      await update(ref(rtdb), updates);
    })();

    // 2. Firestore: Atomic writeBatch in chunks of 450 (Firestore max is 500)
    const firestorePromise = (async () => {
      const chunkSize = 450;
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        for (const id of chunk) {
          batch.delete(doc(db, path, id));
        }
        await batch.commit();
      }
    })();

    const results = await Promise.allSettled([rtdbPromise, firestorePromise]);
    const anySuccess = results.some(r => r.status === 'fulfilled');

    if (!anySuccess) {
      throw new Error('Failed to delete reports in batch from both databases.');
    }

    return { deleted: ids.length, failed: 0 };
  },

  // Delete all records of a specific category
  async deleteCategory(category: 'emp' | 'tl' | 'employees'): Promise<void> {
    const path = category === 'emp' ? 'emp_reports' : category === 'tl' ? 'tl_reports' : 'employees';

    // 1. RTDB node clear
    const rtdbPromise = rtdb ? remove(ref(rtdb, path)) : Promise.resolve();

    // 2. Firestore batch purge
    const firestorePromise = (async () => {
      const colRef = collection(db, path);
      const snap = await getDocs(colRef);
      const chunkSize = 450;
      for (let i = 0; i < snap.docs.length; i += chunkSize) {
        const chunk = snap.docs.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
    })();

    await Promise.allSettled([rtdbPromise, firestorePromise]);
  },

  // Test Realtime Database connection directly
  async testRTDB(): Promise<{ success: boolean; message: string }> {
    if (!rtdb) {
      return { success: false, message: 'RTDB instance not initialized' };
    }
    try {
      const pingRef = ref(rtdb, '_system/ping');
      await set(pingRef, { timestamp: Date.now(), client: 'Safikul Admin Test' });
      const snap = await get(pingRef);
      if (snap.exists()) {
        return { success: true, message: 'Connected & Read/Write Active!' };
      }
      return { success: false, message: 'Write succeeded but read returned empty.' };
    } catch (error: any) {
      return { 
        success: false, 
        message: error?.message || 'Permission denied or network error. Please check RTDB rules in Firebase Console.' 
      };
    }
  },

  // Clear old Firestore test reports so only new database reports show
  async clearAllOldReports(): Promise<void> {
    try {
      const empDocs = await getDocs(collection(db, 'emp_reports'));
      const tlDocs = await getDocs(collection(db, 'tl_reports'));

      const batch = writeBatch(db);
      empDocs.docs.forEach(d => batch.delete(d.ref));
      tlDocs.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();

      if (rtdb) {
        await Promise.allSettled([
          remove(ref(rtdb, 'emp_reports')),
          remove(ref(rtdb, 'tl_reports'))
        ]);
      }
    } catch (err) {
      console.error('Error clearing old reports:', err);
      throw err;
    }
  },

  async getAllReports() {
    try {
      const [emp, tl] = await Promise.all([
        this.getEmployeeReports(),
        this.getTLReports()
      ]);
      return {
        emp: emp || [],
        tl: tl || []
      };
    } catch (error) {
      console.error('Error fetching all reports:', error);
      return { emp: [], tl: [] };
    }
  },

  // ==========================================
  // EMPLOYEES MANAGEMENT
  // ==========================================

  // Pure read: Never resurrect deleted records or trigger background sync writes on read
  async getEmployees(): Promise<Employee[]> {
    // 1. Check RTDB
    if (rtdb) {
      try {
        const snapshot = await get(ref(rtdb, 'employees'));
        if (snapshot.exists()) {
          const data = snapshot.val();
          let list: Employee[] = [];
          if (Array.isArray(data)) {
            list = data.filter((x): x is Employee => Boolean(x && typeof x === 'object' && x.name && x.eid));
          } else if (typeof data === 'object' && data !== null) {
            list = Object.values(data).filter((x): x is Employee => Boolean(x && typeof x === 'object' && (x as any).name && (x as any).eid)) as Employee[];
          }
          return list;
        }
      } catch (err) {
        console.warn('RTDB getEmployees error:', err);
      }
    }

    // 2. Check Firestore
    try {
      const empsRef = collection(db, 'employees');
      const snapshot = await getDocs(empsRef);
      if (!snapshot.empty) {
        return snapshot.docs
          .map(doc => doc.data() as Employee)
          .filter(x => Boolean(x && x.name && x.eid));
      }
    } catch (err) {
      console.warn('Firestore getEmployees error:', err);
    }

    // Safe fallback: Intentionally empty state remains empty
    return [];
  },

  // Realtime listener for employee updates
  onEmployeesUpdate(callback: (emps: Employee[]) => void): () => void {
    if (!rtdb) return () => {};
    try {
      const empsRef = ref(rtdb, 'employees');
      return onValue(empsRef, (snapshot) => {
        if (!snapshot.exists()) {
          callback([]);
          return;
        }
        const data = snapshot.val();
        let list: Employee[] = [];
        if (Array.isArray(data)) {
          list = data.filter((x): x is Employee => Boolean(x && typeof x === 'object' && x.name && x.eid));
        } else if (typeof data === 'object' && data !== null) {
          list = Object.values(data).filter((x): x is Employee => Boolean(x && typeof x === 'object' && (x as any).name && (x as any).eid)) as Employee[];
        }
        callback(list);
      });
    } catch (err) {
      console.warn('RTDB onEmployeesUpdate error:', err);
      return () => {};
    }
  },

  // Concurrent add to RTDB and Firestore
  async addEmployee(emp: Employee): Promise<{ rtdb: boolean; firestore: boolean }> {
    const key = getEmployeeKey(emp);
    const cleanEmp: Employee = { name: emp.name.trim(), eid: emp.eid.trim() };

    const rtdbPromise = rtdb 
      ? set(ref(rtdb, `employees/${key}`), cleanEmp)
      : Promise.resolve();

    const firestorePromise = setDoc(doc(db, 'employees', key), cleanEmp, { merge: true });

    const [rtdbRes, firestoreRes] = await Promise.allSettled([rtdbPromise, firestorePromise]);

    const rtdbSuccess = rtdb ? rtdbRes.status === 'fulfilled' : false;
    const firestoreSuccess = firestoreRes.status === 'fulfilled';

    if (!rtdbSuccess && !firestoreSuccess) {
      const fsErr = firestoreRes.status === 'rejected' ? (firestoreRes as PromiseRejectedResult).reason?.message : '';
      const rtErr = rtdbRes.status === 'rejected' ? (rtdbRes as PromiseRejectedResult).reason?.message : '';
      const combined = `${fsErr} ${rtErr}`.toLowerCase();
      if (combined.includes('permission') || combined.includes('denied')) {
        throw new Error('Permission Denied: Firebase Realtime Database এ ".write": "auth != null" রুলস দেওয়া আছে কিন্তু আপনি লগইন করেননি। Firebase Console > Realtime Database > Rules-এ গিয়ে { ".read": true, ".write": true } সেট করুন অথবা গুগল লগইন করুন।');
      }
      throw new Error(fsErr || rtErr || 'Failed to save employee. Check Firebase rules.');
    }

    return { rtdb: rtdbSuccess, firestore: firestoreSuccess };
  },

  // Direct in-place update operation (No delete-and-recreate!)
  async updateEmployee(oldEmp: Employee, updatedEmp: Employee): Promise<{ rtdb: boolean; firestore: boolean }> {
    const oldKey = getEmployeeKey(oldEmp);
    const newKey = getEmployeeKey(updatedEmp);
    const cleanEmp: Employee = { 
      name: updatedEmp.name.trim(), 
      eid: updatedEmp.eid.trim() 
    };

    let rtdbPromise: Promise<void> | null = null;
    let firestorePromise: Promise<void> | null = null;

    if (oldKey === newKey) {
      // 1. Same key: update directly in place without deleting
      if (rtdb) {
        rtdbPromise = set(ref(rtdb, `employees/${newKey}`), cleanEmp);
      }
      firestorePromise = setDoc(doc(db, 'employees', newKey), cleanEmp, { merge: true });
    } else {
      // 2. Key/EID changed: atomic multi-path update in RTDB and batch in Firestore
      if (rtdb) {
        rtdbPromise = update(ref(rtdb, 'employees'), {
          [newKey]: cleanEmp,
          [oldKey]: null
        });
      }
      const batch = writeBatch(db);
      batch.set(doc(db, 'employees', newKey), cleanEmp);
      batch.delete(doc(db, 'employees', oldKey));
      firestorePromise = batch.commit();
    }

    const [rtdbRes, firestoreRes] = await Promise.allSettled([
      rtdbPromise || Promise.resolve(),
      firestorePromise
    ]);

    const rtdbSuccess = rtdb ? rtdbRes.status === 'fulfilled' : false;
    const firestoreSuccess = firestoreRes.status === 'fulfilled';

    if (!rtdbSuccess && !firestoreSuccess) {
      const fsErr = firestoreRes.status === 'rejected' ? (firestoreRes as PromiseRejectedResult).reason?.message : '';
      const rtErr = rtdbRes.status === 'rejected' ? (rtdbRes as PromiseRejectedResult).reason?.message : '';
      const combined = `${fsErr} ${rtErr}`.toLowerCase();
      if (combined.includes('permission') || combined.includes('denied')) {
        throw new Error('Permission Denied: Firebase Realtime Database এ ".write": "auth != null" দেওয়া থাকায় রিকোয়েস্ট ব্লক হয়েছে। Firebase Console > Realtime Database > Rules-এ গিয়ে { ".read": true, ".write": true } দিন অথবা লগইন করুন।');
      }
      throw new Error(fsErr || rtErr || 'Failed to update employee in database');
    }

    return { rtdb: rtdbSuccess, firestore: firestoreSuccess };
  },

  // Fast direct employee deletion by known keys (Zero full-node downloads or sequential scans!)
  async removeEmployee(emp: Employee): Promise<{ rtdb: boolean; firestore: boolean }> {
    const key = getEmployeeKey(emp);
    const eidKey = (emp.eid || '').toLowerCase().replace(/[^a-z0-9]/g, '-');
    const nameKey = (emp.name || '').toLowerCase().replace(/[^a-z0-9]/g, '-');

    // 1. RTDB: direct multi-path delete (1 atomic operation)
    let rtdbPromise: Promise<void> | null = null;
    if (rtdb) {
      const updates: Record<string, null> = {};
      if (key) updates[`employees/${key}`] = null;
      if (eidKey && eidKey !== key) updates[`employees/${eidKey}`] = null;
      if (nameKey && nameKey !== key && nameKey !== eidKey) updates[`employees/${nameKey}`] = null;
      rtdbPromise = update(ref(rtdb), updates);
    }

    // 2. Firestore: direct writeBatch delete (1 atomic batch)
    const batch = writeBatch(db);
    if (key) batch.delete(doc(db, 'employees', key));
    if (eidKey && eidKey !== key) batch.delete(doc(db, 'employees', eidKey));
    if (nameKey && nameKey !== key && nameKey !== eidKey) batch.delete(doc(db, 'employees', nameKey));
    if (emp.eid && emp.eid !== key && emp.eid !== eidKey) batch.delete(doc(db, 'employees', emp.eid));
    const firestorePromise = batch.commit();

    const [rtdbRes, firestoreRes] = await Promise.allSettled([
      rtdbPromise || Promise.resolve(),
      firestorePromise
    ]);

    const rtdbSuccess = rtdb ? rtdbRes.status === 'fulfilled' : false;
    const firestoreSuccess = firestoreRes.status === 'fulfilled';

    if (!rtdbSuccess && !firestoreSuccess) {
      const fsErr = firestoreRes.status === 'rejected' ? (firestoreRes as PromiseRejectedResult).reason?.message : '';
      const rtErr = rtdbRes.status === 'rejected' ? (rtdbRes as PromiseRejectedResult).reason?.message : '';
      const combined = `${fsErr} ${rtErr}`.toLowerCase();
      if (combined.includes('permission') || combined.includes('denied')) {
        throw new Error(`Permission Denied: Employee "${emp.name}" ডিলিট করতে পারছে না কারণ Firebase RTDB rules ".write": "auth != null" ব্লকিং করছে। Firebase Console > Realtime Database > Rules-এ গিয়ে { ".read": true, ".write": true } দিন অথবা অ্যাডমিন একাউন্টে লগইন করুন।`);
      }
      throw new Error(`Failed to delete employee "${emp.name}". Please verify Firebase rules.`);
    }

    return { rtdb: rtdbSuccess, firestore: firestoreSuccess };
  },

  // Explicit first-time seed action (only invoked on explicit button click)
  async restoreDefaultEmployees(): Promise<Employee[]> {
    const { DEFAULT_EMPS } = await import('../constants');
    const promises = DEFAULT_EMPS.map(emp => this.addEmployee(emp));
    await Promise.allSettled(promises);
    return DEFAULT_EMPS;
  },

  // Export any dataset as a JSON download file
  exportToJSON(data: any, fileName: string) {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  // ==========================================
  // SETTINGS
  // ==========================================

  async getSettings(): Promise<AppSettings> {
    // 1. Try RTDB
    if (rtdb) {
      try {
        const snapshot = await get(ref(rtdb, 'settings/global'));
        if (snapshot.exists()) {
          return snapshot.val() as AppSettings;
        }
      } catch (err) {
        console.warn('RTDB getSettings error:', err);
      }
    }

    // 2. Try Firestore
    try {
      const settingsRef = doc(db, 'settings', 'global');
      const snapshot = await getDoc(settingsRef);
      if (snapshot.exists()) {
        return snapshot.data() as AppSettings;
      }
    } catch (error) {
      console.warn('Firestore getSettings error:', error);
    }

    return { 
      notification: 'Welcome to Safikulreport! 🎉',
      adminPass: 'admin',
      ping: 0
    };
  },

  async updateSettings(settings: Partial<AppSettings>) {
    // Update RTDB and Firestore concurrently
    const rtdbPromise = rtdb 
      ? (async () => {
          const current = await this.getSettings();
          await set(ref(rtdb, 'settings/global'), { ...current, ...settings });
        })()
      : Promise.resolve();

    const firestorePromise = setDoc(doc(db, 'settings', 'global'), settings, { merge: true });

    await Promise.allSettled([rtdbPromise, firestorePromise]);
  },

  onSettingsUpdate(callback: (settings: AppSettings) => void) {
    let hasReceivedData = false;

    // Listen to Realtime Database
    let unsubRTDB = () => {};
    if (rtdb) {
      try {
        const rtdbSettingsRef = ref(rtdb, 'settings/global');
        unsubRTDB = onValue(rtdbSettingsRef, (snapshot) => {
          if (snapshot.exists()) {
            hasReceivedData = true;
            callback(snapshot.val() as AppSettings);
          }
        });
      } catch (e) {
        console.warn('RTDB onSettingsUpdate error:', e);
      }
    }

    // Listen to Firestore
    const firestoreSettingsRef = doc(db, 'settings', 'global');
    const unsubFirestore = onSnapshot(firestoreSettingsRef, (snapshot) => {
      if (snapshot.exists()) {
        hasReceivedData = true;
        callback(snapshot.data() as AppSettings);
      } else if (!hasReceivedData) {
        callback({ 
          notification: 'Welcome to Safikulreport! 🎉',
          adminPass: 'admin',
          ping: 0
        });
      }
    }, () => {
      if (!hasReceivedData) {
        callback({ 
          notification: 'Welcome to Safikulreport! 🎉',
          adminPass: 'admin',
          ping: 0
        });
      }
    });

    return () => {
      unsubRTDB();
      unsubFirestore();
    };
  }
};
