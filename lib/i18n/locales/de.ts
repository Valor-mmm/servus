const de = {
  // ── App shell ─────────────────────────────────────────────────────────────
  "app.name": "servus",
  "app.tagline": "Haushaltsmanagement",

  // ── Navigation ────────────────────────────────────────────────────────────
  "nav.home": "Startseite",
  "nav.inventory": "Inventar",
  "nav.boxes": "Umzugskartons",
  "nav.logout": "Abmelden",

  // ── Home page ─────────────────────────────────────────────────────────────
  "home.welcome": "Willkommen bei servus.",
  "home.subtitle": "Dein privates Haushaltssystem.",

  // ── Auth ──────────────────────────────────────────────────────────────────
  "auth.login": "Anmelden",
  "auth.logout": "Abmelden",
  "auth.username": "Benutzername",
  "auth.password": "Passwort",
  "auth.login_error": "Benutzername oder Passwort falsch.",
  "auth.rate_limited": "Zu viele Versuche. Bitte warte {seconds} Sekunden.",
  "auth.locked_out":
    "Konto vorübergehend gesperrt. Bitte warte {seconds} Sekunden.",

  // ── Errors ────────────────────────────────────────────────────────────────
  "error.not_found": "Seite nicht gefunden.",
  "error.unauthorized": "Anmeldung erforderlich.",
  "error.forbidden": "Keine Berechtigung.",
  "error.server": "Serverfehler. Bitte versuche es erneut.",

  // ── Common actions ────────────────────────────────────────────────────────
  "action.save": "Speichern",
  "action.cancel": "Abbrechen",
  "action.delete": "Löschen",
  "action.edit": "Bearbeiten",
  "action.add": "Hinzufügen",
  "action.search": "Suchen",
  "action.filter": "Filtern",
  "action.confirm": "Bestätigen",
} as const;

export default de;
