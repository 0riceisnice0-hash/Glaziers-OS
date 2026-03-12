# GlazierOS

**All-in-one glazing business management — replacing WindowCAD, AdminBase, and similar industry tools.**

[![GitHub Pages](https://img.shields.io/badge/demo-GitHub%20Pages-blue)](https://0riceisnice0-hash.github.io/Glaziers-OS/)

---

## What Is GlazierOS?

GlazierOS is a complete business management system designed for glazing companies in the UK. It consolidates everything a glazing business needs into a single web application:

| Module | Description |
|--------|-------------|
| **Quotes & Leads** | Create, track and manage customer quotes with a full lead pipeline (New → Quoted → Follow-up → Won/Lost) |
| **Diary / Calendar** | Schedule fitter visits, installations and site surveys with a drag-and-drop calendar |
| **Team Management** | Manage fitters, assign skills and track availability by branch |
| **Finance** | Invoices, expenses, payment tracking and VAT at 20% (UK-ready) |
| **Reports & Analytics** | Conversion rates, revenue, job status breakdowns |
| **Branches** | Multi-branch / multi-location support |
| **3D Configurator** | Interactive Three.js 3D window and door builder |
| **Audit Logs** | Full activity trail for compliance and review |
| **Settings** | Custom pricing rules, form fields, per-m² pricing |

---

## Live Demo (GitHub Pages)

No server required — the demo runs entirely in your browser using `localStorage`.

👉 **[https://0riceisnice0-hash.github.io/Glaziers-OS/](https://0riceisnice0-hash.github.io/Glaziers-OS/)**

> **Note:** All data is stored in your browser's `localStorage`. It persists between page refreshes but is local to your browser. Clearing your browser data will reset it to the default demo data.

### Demo Data Included
- 3 UK branches (London, Manchester, Birmingham)
- 5 fitters with skills and branch assignments
- 6 sample jobs/quotes with realistic UK customer details
- 2 invoices, 3 expenses, 3 diary events
- 8 audit log entries

---

## How to Use on GitHub Pages

1. **Fork or clone** this repository
2. Go to **Settings → Pages** in your repo
3. Set the source to **Deploy from a branch → main → / (root)**
4. Your app will be live at `https://<username>.github.io/<repo-name>/`

That's it — no build step, no server, no database needed.

---

## Running Locally

Just open `index.html` in a browser:

```bash
# Option 1 — Python simple server (recommended, avoids CORS on some browsers)
python3 -m http.server 8080
# then visit http://localhost:8080

# Option 2 — Node.js serve
npx serve .

# Option 3 — Just open the file directly
open index.html
```

---

## Architecture

### Static Mode (GitHub Pages)
```
index.html
└── assets/js/DataStore.js         ← localStorage abstraction (replaces WordPress REST API)
└── assets/js/dashboard/           ← jQuery panel modules
    ├── dashboard-app.js            ← App shell, sidebar, tab navigation
    ├── quotes-v2.js                ← Quotes & leads management
    ├── diary-v2*.js                ← Diary/calendar (6 modules)
    ├── team.js                     ← Team/fitter management
    ├── finance.js / finance-init.js← Invoices, expenses, payments
    ├── reports.js                  ← Analytics & reports
    ├── audit-logs.js               ← Activity log
    ├── branches.js                 ← Branch management
    ├── quote-detail.js             ← Detailed quote/job editor + 3D preview
    └── settings.js                 ← App configuration
└── assets/js/builders/            ← Three.js 3D configurators
    ├── TestWindow.js
    └── TestDoor.js
└── assets/css/                    ← All stylesheets
```

### WordPress Plugin Mode (Production)
The PHP source (`glazieros-app.php`, `includes/`) remains intact. To run GlazierOS as a WordPress plugin:
1. Copy the entire repository into `wp-content/plugins/glazieros/`
2. Activate in WordPress admin
3. All data will be stored in MySQL via WordPress Custom Post Types and custom tables

---

## Data Storage

| Mode | Storage | Multi-user? | Persistent? |
|------|---------|------------|-------------|
| GitHub Pages / Static | Browser `localStorage` | ❌ Single browser only | ✅ Until browser data cleared |
| WordPress Plugin | MySQL database | ✅ Yes | ✅ Server-side |

To add a real backend without WordPress, consider:
- **[Supabase](https://supabase.com)** — free PostgreSQL + REST API + auth
- **[Firebase](https://firebase.google.com)** — free Firestore + auth

Swap out `assets/js/DataStore.js` with one that calls the remote API and you're done.

---

## Technology Stack

- **Frontend:** jQuery 3.7.1, jQuery UI 1.13.2, Three.js r128
- **Styling:** Custom CSS (glass morphism / gradient UI)
- **3D:** Three.js (window & door configurators)
- **Storage (static):** Browser `localStorage`
- **Backend (WordPress mode):** PHP 8+, WordPress 6+, MySQL

---

## Roadmap

- [ ] Supabase / Firebase backend integration
- [ ] Mobile-responsive layout
- [ ] PDF invoice generation (jsPDF client-side)
- [ ] Customer portal (public quote request form)
- [ ] Email notifications
- [ ] Multi-user access control

---

## License

MIT — see [LICENSE](LICENSE) for details.
