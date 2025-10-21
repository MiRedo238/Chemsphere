# React + Vite
## Chemsphere Project Overview

Chemsphere is a chemical inventory and equipment management web application built with React and Vite. It integrates with Supabase for backend data storage and authentication. The project provides a modern, user-friendly interface for managing chemicals, equipment, users, and audit logs in laboratory or industrial environments.

### Main Features
- **Chemical Management**: Add, view, update, and track chemicals, including expiration monitoring and usage logging.
- **Equipment Management**: Add, view, and manage equipment records.
- **User Management**: Administer user accounts and roles.
- **Audit Logs**: Track actions and changes for accountability.
- **Usage Logs**: Record chemical usage events.
- **Authentication**: Secure login and access control using Supabase.
- **Dashboard**: Overview of inventory status and quick access to key actions.
- **Autocomplete & Search**: Quickly find chemicals and equipment.
- **CSV Export**: Export inventory and logs for reporting.
- **Responsive UI**: Sidebar navigation, modals, and cards for a smooth user experience.

### Project Structure
- `src/components/` — UI components for chemicals, equipment, logs, dashboard, and user management.
- `src/backend/api/` — API logic for chemicals, equipment, users, audit logs, and usage logs.
- `src/services/` — Service layer for interacting with backend APIs and Supabase.
- `src/contexts/` — React context providers for authentication and layout.
- `src/utils/` — Utility functions and data helpers.
- `src/lib/supabase/` — Supabase client setup.
- `supabase/migrations/` — Database migration scripts.
- `public/ghs/` — GHS hazard pictograms for chemical labeling.

---

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
