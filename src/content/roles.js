// ROLES
// A role changes perspective, language, emphasis, framing of decisions, and one piece of
// available context (the note on the desk). It never changes the underlying business.

export const ROLES = {
  gm: {
    id: 'gm',
    label: 'General Manager',
    blurb: 'You run the company day to day.',
    seat: 'You are the General Manager. The whole operation is yours to run.',
    lens: ['operations', 'labor', 'customer', 'finance', 'maintenance', 'people', 'purchasing'],
    note: { from: 'Helen, the owner', text: 'Lender review is Thursday. They will ask about labor cost. Have an answer for me.' },
    meetingName: 'leadership meeting',
    decisionPrompt: 'Your call.',
    reportVoice: 'As General Manager',
  },
  coo: {
    id: 'coo',
    label: 'COO',
    blurb: 'Operations across every site report to you.',
    seat: 'You are the Chief Operating Officer. Every {unit} and every manager runs through you.',
    lens: ['labor', 'operations', 'finance', 'customer', 'maintenance', 'people', 'purchasing'],
    note: { from: 'Helen, CEO', text: 'Board call is Thursday. Labor is going to come up. What is the story?' },
    meetingName: 'leadership meeting',
    decisionPrompt: 'Your call.',
    reportVoice: 'As COO',
  },
  owner: {
    id: 'owner',
    label: 'Owner',
    blurb: 'It is your name on the lease and the loan.',
    seat: 'You own the company. You built it yourself, and your name is on the loan.',
    lens: ['finance', 'customer', 'labor', 'operations', 'people', 'purchasing', 'maintenance'],
    note: { from: 'Paul, your accountant', text: 'Bank covenant check is Thursday. Labor percent is the number they watch.' },
    meetingName: 'leadership meeting',
    decisionPrompt: 'It is your company. What do you do?',
    reportVoice: 'As the owner',
  },
  partner: {
    id: 'partner',
    label: 'Executive Partner',
    blurb: 'You sit on the board for the group that owns it.',
    seat: 'You are the Executive Partner for the group that owns the company. You are in the building two days a week.',
    lens: ['finance', 'labor', 'customer', 'purchasing', 'operations', 'people', 'maintenance'],
    note: { from: 'Arjun, the group CFO', text: 'Quarterly review is Thursday. The labor line here is going to get questions.' },
    meetingName: 'operating review',
    decisionPrompt: 'What do you ask the management team to do?',
    reportVoice: 'As Executive Partner',
  },
  regional: {
    id: 'regional',
    label: 'Regional / Operations Manager',
    blurb: 'Several sites, their managers, and you in the car between them.',
    seat: 'You are the Regional Operations Manager. Every {mgrTitle} reports to you.',
    lens: ['operations', 'labor', 'people', 'customer', 'maintenance', 'finance', 'purchasing'],
    note: { from: 'Helen, COO', text: 'I need your read on labor before Thursday. Keep it short.' },
    meetingName: 'operations meeting',
    decisionPrompt: 'What do you put in motion?',
    reportVoice: 'As Regional Operations Manager',
  },
};

export const ROLE_ORDER = ['gm', 'coo', 'owner', 'partner', 'regional'];
