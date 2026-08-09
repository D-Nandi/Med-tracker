# MediTrack — Developer Handoff Document
**Project:** MediTrack — Patient Health Companion Platform  
**Stack:** HTML5 + CSS3 + Vanilla JS (ES6 Modules) + Firebase  
**Prepared for:** Antigravity Team  

---

## ✅ COMPLETED FILES (Ready to Use — Do Not Rewrite)

### Core Styles
| File | Status | Description |
|------|--------|-------------|
| `public/css/main.css` | ✅ Complete | Full design system — tokens, buttons, cards, forms, modals, toasts, dashboard layout, sidebar, responsive breakpoints |
| `public/css/landing.css` | ✅ Complete | Landing page styles — navbar, hero, features, benefits, testimonials, FAQ, contact, footer |

### Firebase Layer
| File | Status | Description |
|------|--------|-------------|
| `public/js/firebase/config.js` | ✅ Complete | Firebase config template (dev fills in keys) |
| `public/js/firebase/init.js` | ✅ Complete | Firebase app initialization — Auth, Firestore, Storage, FCM |
| `public/js/firebase/auth.js` | ✅ Complete | signUp, signIn, signOut, resetPassword, onAuthChange helpers |
| `public/js/firebase/firestore.js` | ✅ Complete | All Firestore CRUD — users, prescriptions, medicines, reports, appointments, notifications |
| `public/js/firebase/storage.js` | ✅ Complete | File upload/download/delete for Firebase Storage with progress |

### Reusable Components
| File | Status | Description |
|------|--------|-------------|
| `public/js/components/toast.js` | ✅ Complete | Toast notification system (success/error/warning/info) |
| `public/js/components/modal.js` | ✅ Complete | Modal dialogs + confirm dialog |
| `public/js/components/auth-guard.js` | ✅ Complete | Route protection + role-based redirect |
| `public/js/components/sidebar.js` | ✅ Complete | Sidebar renderer + topbar + mobile menu toggle for all 3 roles |

### Pages — HTML Structure
| File | Status | Description |
|------|--------|-------------|
| `public/index.html` | ✅ Complete | Full landing page HTML (all sections) |
| `public/pages/login.html` | ✅ Complete | Login page (patient/doctor/admin tabs) |
| `public/pages/signup.html` | ✅ Complete | Patient registration form |
| `public/pages/forgot-password.html` | ✅ Complete | Password reset page |
| `public/pages/patient/dashboard.html` | ✅ Complete | Patient dashboard shell |
| `public/pages/patient/prescriptions.html` | ✅ Complete | Prescriptions list HTML |
| `public/pages/patient/medicines.html` | ✅ Complete | Medicine schedule HTML |
| `public/pages/patient/reports.html` | ✅ Complete | Medical reports vault HTML |
| `public/pages/patient/appointments.html` | ✅ Partial | Appointments HTML (needs JS logic file) |
| `public/pages/patient/timeline.html` | ✅ Partial | Timeline HTML (needs JS logic file) |
| `public/pages/patient/settings.html` | ✅ Partial | Settings HTML (needs JS logic file) |

### Page Logic (JS)
| File | Status | Description |
|------|--------|-------------|
| `public/js/pages/patient-dashboard.js` | ✅ Complete | Stats loading, recent prescriptions, upcoming appointments, medicines today |

---

## 🔧 REMAINING WORK — Priority Order

### PRIORITY 1 — Auth Pages JS (1–2 hours)
These HTML pages exist but need their JS logic files:

**`public/js/pages/login.js`**
- Tab switching (patient/doctor/admin)
- Firebase `signInWithEmailAndPassword`
- Role-based redirect after login
- Error handling + toast messages
- "Forgot password" link

**`public/js/pages/signup.js`**
- Form validation
- Firebase `createUserWithEmailAndPassword`
- Save user to Firestore `users` collection with `role: 'patient'`
- Redirect to patient dashboard

**`public/js/pages/forgot-password.js`**
- Firebase `sendPasswordResetEmail`
- Success/error feedback

---

### PRIORITY 2 — Patient Pages JS (3–4 hours)
Each page already has HTML. Just needs the JS logic file.

**`public/js/pages/patient-prescriptions.js`**
- Load prescriptions from Firestore (filtered by `patientId`)
- Render prescription cards with diagnosis + medicine chips
- Click to expand detail modal (full medicine list, doctor notes)
- Search/filter by date or diagnosis

**`public/js/pages/patient-medicines.js`**
- Load medicines from Firestore
- Render medicine cards with name, dosage, frequency, time
- "Mark as Taken" button → update Firestore `status` field
- Filter: Active / Completed / Missed
- Add medicine reminder modal (form)

**`public/js/pages/patient-reports.js`**
- Upload zone — drag & drop + click to upload
- Firebase Storage upload with progress bar
- Save report metadata to Firestore `reports` collection
- Render report cards (PDF icon or image thumbnail)
- Download + Delete buttons
- File type validation (PDF, JPG, PNG, JPEG only)

**`public/js/pages/patient-appointments.js`**
- Load appointments from Firestore (filtered by `patientId`)
- Filter: Upcoming / Completed / All
- Render appointment cards with date box, doctor name, status badge
- Days remaining countdown

**`public/js/pages/patient-timeline.js`**
- Load prescriptions + reports + appointments combined
- Sort by date (newest first)
- Render timeline with colored dots per type
- Group by month

**`public/js/pages/patient-settings.js`**
- Load current user data from Firestore
- Update name/phone form → save to Firestore
- Change password form → Firebase `updatePassword`
- Notification preferences toggle

---

### PRIORITY 3 — Doctor Portal (3–4 hours)
These pages + JS files need to be created from scratch.

**`public/pages/doctor/dashboard.html` + `doctor-dashboard.js`**
- Stats: total patients, prescriptions today, upcoming appointments
- Recent patient list
- Quick action: New Prescription button

**`public/pages/doctor/patients.html` + `doctor-patients.js`**
- Search patients by name/email
- Patient list table with: name, last visit, active prescriptions count
- Click patient → view patient detail modal (full history)

**`public/pages/doctor/prescriptions.html` + `doctor-prescriptions.js`**
- New Prescription form:
  - Patient search/select
  - Diagnosis text
  - Add medicines dynamically (name, dosage, frequency, duration)
  - Instructions textarea
  - Save → creates `prescriptions` + `medicines` docs in Firestore
- List of prescriptions written by this doctor

**`public/pages/doctor/appointments.html` + `doctor-appointments.js`**
- Schedule follow-up form (patient, date, notes)
- List of scheduled appointments
- Update status (completed/cancelled)

---

### PRIORITY 4 — Admin Portal (2–3 hours)
These pages + JS files need to be created from scratch.

**`public/pages/admin/dashboard.html` + `admin-dashboard.js`**
- Stats cards: Total Patients, Total Doctors, Total Prescriptions, Upcoming Appointments
- Recent activity table
- Charts (optional): prescriptions per week, reports per month

**`public/pages/admin/doctors.html` + `admin-doctors.js`**
- Doctor list table (name, email, specialization, patient count)
- Add Doctor button → form modal → creates user in Firestore with `role: 'doctor'`
- Deactivate/remove doctor

**`public/pages/admin/patients.html` + `admin-patients.js`**
- All patients table with search
- View patient detail

**`public/pages/admin/reports.html` + `admin-reports.js`**
- System-wide reports view
- Appointment summary table

---

### PRIORITY 5 — Firebase Config Files (1 hour)

**`firestore.rules`**
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth.uid == uid;
      allow read: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    match /prescriptions/{id} {
      allow read: if request.auth != null && (
        resource.data.patientId == request.auth.uid ||
        resource.data.doctorId == request.auth.uid ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'
      );
      allow write: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['doctor', 'admin'];
    }
    match /medicines/{id} {
      allow read, write: if request.auth != null;
    }
    match /reports/{id} {
      allow read, write: if request.auth != null && resource.data.patientId == request.auth.uid;
      allow read: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['doctor', 'admin'];
    }
    match /appointments/{id} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['doctor', 'admin'];
    }
    match /notifications/{id} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
    }
  }
}
```

**`storage.rules`**
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /reports/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null &&
        firestore.get(/databases/(default)/documents/users/$(request.auth.uid)).data.role in ['doctor', 'admin'];
    }
  }
}
```

**`firebase.json`** (hosting config)
```json
{
  "hosting": {
    "public": "public",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  },
  "firestore": { "rules": "firestore.rules" },
  "storage": { "rules": "storage.rules" }
}
```

---

### PRIORITY 6 — Notification System (1–2 hours)

**`public/firebase-messaging-sw.js`** (Service Worker — in `/public` root)
- Handle background FCM messages
- Show browser notifications

**`public/js/firebase/messaging.js`**
- Request notification permission
- Get FCM token → save to user's Firestore doc
- Handle foreground messages → show toast

---

### PRIORITY 7 — Polish & QA (1–2 hours)
- Loading skeleton screens on all data-heavy pages
- Empty states (no prescriptions yet, no reports yet, etc.)
- Global search wiring (currently renders the input, no logic)
- 404 page
- Test on mobile (375px) — sidebar toggle, cards wrap correctly
- Accessibility audit — focus states, ARIA labels

---

## 🔑 Setup Instructions for Developer

### 1. Create Firebase Project
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create new project → name it `meditrack`
3. Enable **Authentication** → Email/Password provider
4. Enable **Firestore** → Start in production mode
5. Enable **Storage** → Start in production mode
6. Enable **Hosting**

### 2. Add Firebase Config
Copy your project credentials into:
```
public/js/firebase/config.js
```
Replace all `YOUR_*` placeholders.

### 3. Deploy
```bash
npm install -g firebase-tools
firebase login
firebase init   # select Hosting, Firestore, Storage
firebase deploy
```

---

## 📁 Final Project Structure (Complete)
```
meditrack/
├── firebase.json              ← TO BUILD
├── firestore.rules            ← TO BUILD
├── storage.rules              ← TO BUILD
├── firebase-messaging-sw.js   ← TO BUILD
├── README.md                  ← TO BUILD
└── public/
    ├── index.html             ✅ Done
    ├── css/
    │   ├── main.css           ✅ Done
    │   └── landing.css        ✅ Done
    ├── js/
    │   ├── firebase/
    │   │   ├── config.js      ✅ Done
    │   │   ├── init.js        ✅ Done
    │   │   ├── auth.js        ✅ Done
    │   │   ├── firestore.js   ✅ Done
    │   │   ├── storage.js     ✅ Done
    │   │   └── messaging.js   ← TO BUILD
    │   ├── components/
    │   │   ├── toast.js       ✅ Done
    │   │   ├── modal.js       ✅ Done
    │   │   ├── auth-guard.js  ✅ Done
    │   │   └── sidebar.js     ✅ Done
    │   └── pages/
    │       ├── login.js               ← TO BUILD
    │       ├── signup.js              ← TO BUILD
    │       ├── forgot-password.js     ← TO BUILD
    │       ├── patient-dashboard.js   ✅ Done
    │       ├── patient-prescriptions.js ← TO BUILD
    │       ├── patient-medicines.js   ← TO BUILD
    │       ├── patient-reports.js     ← TO BUILD
    │       ├── patient-appointments.js ← TO BUILD
    │       ├── patient-timeline.js    ← TO BUILD
    │       ├── patient-settings.js    ← TO BUILD
    │       ├── doctor-dashboard.js    ← TO BUILD
    │       ├── doctor-patients.js     ← TO BUILD
    │       ├── doctor-prescriptions.js ← TO BUILD
    │       ├── doctor-appointments.js ← TO BUILD
    │       ├── admin-dashboard.js     ← TO BUILD
    │       ├── admin-doctors.js       ← TO BUILD
    │       ├── admin-patients.js      ← TO BUILD
    │       └── admin-reports.js       ← TO BUILD
    └── pages/
        ├── login.html                 ✅ Done
        ├── signup.html                ✅ Done
        ├── forgot-password.html       ✅ Done
        ├── patient/
        │   ├── dashboard.html         ✅ Done
        │   ├── prescriptions.html     ✅ Done
        │   ├── medicines.html         ✅ Done
        │   ├── reports.html           ✅ Done
        │   ├── appointments.html      ✅ Done (needs JS)
        │   ├── timeline.html          ✅ Done (needs JS)
        │   └── settings.html          ✅ Done (needs JS)
        ├── doctor/
        │   ├── dashboard.html         ← TO BUILD
        │   ├── patients.html          ← TO BUILD
        │   ├── prescriptions.html     ← TO BUILD
        │   └── appointments.html      ← TO BUILD
        └── admin/
            ├── dashboard.html         ← TO BUILD
            ├── doctors.html           ← TO BUILD
            ├── patients.html          ← TO BUILD
            └── reports.html           ← TO BUILD
```

---

## ⏱ Time Estimate for Antigravity

| Section | Est. Time |
|---------|-----------|
| Auth JS (login/signup/reset) | 1–2 hrs |
| Patient page JS (6 files) | 3–4 hrs |
| Doctor portal (4 pages + JS) | 3–4 hrs |
| Admin portal (4 pages + JS) | 2–3 hrs |
| Firebase rules + config files | 1 hr |
| Notification system (FCM) | 1–2 hrs |
| Polish, QA, empty states | 1–2 hrs |
| **Total** | **~12–17 hours** |

---

## Design System Reference (for Antigravity)

**Primary Color:** `#0891B2` (cyan-600)  
**Accent/Green:** `#059669` (emerald-600)  
**Font:** Figtree (headings) + Noto Sans (body) — Google Fonts  
**Border Radius:** 10px (md), 16px (lg), 24px (xl)  
**Shadows:** use `var(--shadow-sm/md/lg/xl)` — never custom  
**All spacing in multiples of 4px**  
**Touch targets minimum 44px height**  
**No emojis as icons — use SVG (already in sidebar.js `svgIcon()` helper)**  

All CSS variables are in `main.css` `:root {}` — use them everywhere, never hardcode colors.
