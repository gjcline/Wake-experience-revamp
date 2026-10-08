// THE BUSINESS: CONSTANTS
// The company itself is generated per game (scenario.js). What stays fixed is the shape of
// the morning and the concept map freeform text is read against.

// ---------------------------------------------------------------- freeform concept map
// Freeform text is mapped onto these predetermined concepts. It never drives the simulation.
export const CONCEPTS = {
  labor: ['labor', 'payroll', 'wage', 'overtime', 'hours', 'headcount', 'overstaff'],
  staffing: ['staff', 'hire', 'hiring', 'short', 'understaff', 'turnover', 'people', 'quit', 'resign'],
  scheduling: ['schedul', 'shift', 'coverage', 'afternoon', 'morning', 'template', 'roster', 'rota'],
  demand: ['demand', 'volume', 'traffic', 'busy', 'slow', 'bookings'],
  capacity: ['capacity', 'throughput', 'bottleneck', 'backlog', 'overflow', 'utiliz'],
  customer: ['customer', 'client', 'patient', 'guest', 'member', 'wait', 'review', 'satisf', 'retention', 'repeat', 'returning', 'complain', 'experience', 'service'],
  financial: ['cost', 'margin', 'revenue', 'cash', 'budget', 'price', 'profit', 'expense', 'money'],
  inefficiency: ['efficien', 'productiv', 'idle', 'waste', 'process', 'wrong time', 'misalign'],
  management: ['manager', 'management', 'leadership', 'training', 'accountab', 'new manager'],
  equipment: ['equipment', 'machine', 'broken', 'repair', 'maintenance', 'downtime', 'replace'],
  supplier: ['supplier', 'vendor', 'invoice', 'contract', 'overbill', 'purchas'],
};

export const DAY = { start: 7 * 60 + 48, callAt: 9 * 60 + 25, meetingAt: 10 * 60, lastStart: 9 * 60 + 50 };
