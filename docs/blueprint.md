# **App Name**: JLS Finance Company

## Core Features:

- Secure Authentication: Role-based login for Admins, Agents, and Customers with JWT-based session management. Supports optional 2FA.
- Customer KYC: Customer KYC registration form with personal info, contact details, camera API for photo capture, and document upload (Aadhaar & PAN). Offline storage via IndexedDB.
- Loan Application: Loan application form for specifying loan type, amount, tenure, interest, and co-borrower/guarantor details. Includes auto-calculation of processing fees and status tracking.
- EMI Calculator: EMI calculator with dynamic sliders/input fields for tenure and rate, displaying monthly EMI, total interest, and total repayable amount.  Shows a full repayment schedule using tables.
- Loan Approval Workflow: Admin panel for loan approval/rejection with comment input.  Shows status timeline and triggers notifications.
- EMI Collection: EMI collection form to record payment amount, date, and method (Cash/UPI/Bank). Generates receipts.
- Reporting and Analytics: Report generation tool to provide reports on daily collections, pending lists, exportable to CSV, Excel, or PDF, with filtering by branch, date, and agent.
- Advanced Search and Filtering: A search feature that indexes customers by Aadhaar, PAN, name, mobile, for fuzzy client-side search.
- Smart Notifications & Alerts: WhatsApp integration using Twilio to deliver key notifications to users, such as confirmation of loan applications.
- Mobile Optimization: Responsive design using Tailwind CSS and device-specific optimizations, including camera API access, offline mode fallback via IndexedDB, and PWA install banners.

## Style Guidelines:

- Primary color: Blue (#2E9AFE) for trust and reliability in financial services.
- Background color: Light blue (#EBF5FF), subtly desaturated, provides a calm, trustworthy feel.
- Accent color: Green (#7CFC00), a brighter analogous color used for key actions to provide positive reinforcement.
- Body and headline font: 'Inter', sans-serif font, for a modern, machined, objective, neutral look that's suitable for both headlines and body text.
- Code font: 'Source Code Pro' for displaying code snippets.
- Use modern, outlined icons to represent different features and actions, ensuring clarity and visual appeal. Consistent style across the platform.
- Implement a mobile-first, responsive design using Tailwind CSS grid and flex utilities, ensuring optimal viewing experience across devices.
- Incorporate subtle transition animations and UI feedback (e.g., button hover effects, loading states) to enhance user engagement.