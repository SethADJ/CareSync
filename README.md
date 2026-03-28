Markdown
# CareSync 📱🏥

CareSync is a **mobile-first healthcare management platform** designed to improve patient treatment adherence and reduce defaulter rates. It enables healthcare providers to track patients across multiple programs (HIV, TB, EPI, ANC), send automated reminders, and generate actionable adherence insights through comprehensive analytics.

## ✨ Key Features

- **Adherence Tracking**: Monitor patient medication refill pickup rates and calculate adherence scores with real-time status indicators.
- **Reduce Defaulter Rates**: Identify at-risk patients and track defaulter tracing activities to improve patient retention.
- **Automated Reminders**: Notify caregivers of upcoming refill dates, clinic visits, and treatment reviews via push notifications.
- **Multi-Program Support**: Manage patients across HIV Care, TB Care, EPI, and ANC programs within a single platform.
- **Comprehensive Analytics**: Generate detailed reports, adherence insights, and trend analysis with interactive charts and data export (PDF/Excel).
- **Patient Profiles**: Detailed patient records with treatment history, regimen information, and adherence metrics.
- **Offline-First**: Built with IndexedDB for reliable offline functionality and automatic data synchronization.
- **Mobile-Optimized**: Responsive interface designed for healthcare workers in resource-limited settings using Tailwind CSS and Shadcn UI.
- **Type-Safe Architecture**: Robust development experience powered by TypeScript.

## 🛠️ Tech Stack

- **Framework**: [React 18](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database**: IndexedDB (with offline-first architecture)
- **Mobile Runtime**: [Apache Capacitor](https://capacitorjs.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [Shadcn UI](https://ui.shadcn.com/)
- **Notifications**: Local notifications with Capacitor
- **Charts & Visualization**: [Recharts](https://recharts.org/)
- **Data Export**: PDF (jsPDF) & Excel (xlsx)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Testing**: [Vitest](https://vitest.dev/)

## 🎯 Supported Programs

CareSync manages patients across four key healthcare programs:

- **HIV Care**: Track antiretroviral therapy adherence with regimen-specific monitoring (1st & 2nd line treatments)
- **TB Care**: Monitor TB treatment adherence across different TB types (Pulmonary, Extra-pulmonary, MDR-TB)
- **EPI (Immunization)**: Track vaccination schedules and completion rates
- **ANC (Antenatal Care)**: Monitor pregnant women's clinic attendance and treatment adherence

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18.0 or higher)
- [Git](https://git-scm.com/)
- For Android builds: [Android Studio](https://developer.android.com/studio) & JDK

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/SethADJ/CareSync.git
   cd CareSync
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   ```

5. **Build for Android (Capacitor):**
   ```bash
   npm run build
   npx cap sync android
   npx cap build android
   ```

### Available Scripts

```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run build:dev        # Build in development mode
npm run lint             # Run ESLint
npm run test             # Run unit tests
npm run test:watch       # Run tests in watch mode
npm run preview          # Preview production build locally
```
## 📁 Project Structure

```
src/
├── components/         # Reusable UI components & patient profiles
│   ├── HIVPatientProfile.tsx
│   ├── TBPatientProfile.tsx
│   ├── AddPatientDialog.tsx
│   └── ui/             # Shadcn UI components
├── pages/              # Application views/routes
│   ├── Dashboard.tsx    # Main patient dashboard
│   ├── ReportPage.tsx   # Analytics & reporting
│   ├── TrackingLogPage.tsx # Defaulter tracing logs
│   ├── ReminderPage.tsx # Reminder management
│   ├── BackupPage.tsx   # Data backup
│   ├── LoginPage.tsx & SignupPage.tsx
│   └── ...
├── hooks/              # Custom React hooks
│   ├── usePatients.ts  # Patient data management
│   ├── useLogs.ts      # Tracing logs
│   ├── useBackupReminder.ts
│   └── useLicense.ts   # License validation
├── db/                 # IndexedDB database setup
├── utils/              # Utility functions
│   ├── program-logic.ts # Program-specific logic
│   ├── backup.ts
│   └── excel-import.ts
└── App.tsx             # Root component
```

## 💡 How CareSync Improves Adherence

1. **Real-Time Tracking**: Monitor patient adherence scores at a glance with color-coded indicators (Excellent ≥95%, Good ≥80%, Poor <80%)
2. **Proactive Interventions**: Automated reminders notify healthcare workers of upcoming refill dates before patients default
3. **Tracing & Follow-up**: Detailed logging system for tracking defaulter outreach efforts
4. **Data-Driven Insights**: Generate adherence reports and trends to identify high-risk patients and program gaps
5. **Offline Capability**: Healthcare workers can access patient data and update adherence in areas without internet connectivity

## 🔒 Data & Security

- **Local-First**: Patient data is stored with IndexedDB for privacy and offline accessibility
- **Backup & Sync**: Built-in backup functionality ensures no data loss
- **License Management**: Optional license activation for deployment control

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📧 Support & Feedback

For issues, feature requests, or feedback, please open an issue on GitHub.

---

**Developed with ❤️ by Seth Adjaapiah Berkoh**

*Improving patient care through better adherence tracking.*