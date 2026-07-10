# Fitness Coach Prototype

A single-screen fitness coaching dashboard prototype with two equivalent implementations:

- **[`fitness-coach-app.jsx`](fitness-coach-app.jsx)** — React component version (uses `useState`/`useMemo`, Tailwind utility classes).
- **[`fitness-coach-prototip.html`](fitness-coach-prototip.html)** — Standalone HTML/CSS/vanilla JS version. Open it directly in a browser, no build step required.

## Features

Both versions render a mobile-sized app shell with five tabs:

- **Panel** — daily KPIs, calorie ring, and a 12-week weight projection chart
- **Antrenman** (Workout) — weekly training split with editable sets/reps/kg
- **Beslenme** (Nutrition) — meal log with macro targets vs. actuals
- **İlerleme** (Progress) — weekly check-in scores and weight projection
- **Danışan** (Client) — switch between sample clients

Sample data (clients, workouts, meals) is hardcoded for demo purposes.
