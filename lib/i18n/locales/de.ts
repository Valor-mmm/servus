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
  "action.back": "Zurück",

  // ── Navigation ─────────────────────────────────────────────────────────────
  "nav.items": "Gegenstände",
  "nav.categories": "Kategorien",
  "nav.rooms": "Räume",

  // ── Categories ────────────────────────────────────────────────────────────
  "categories.title": "Kategorien",
  "categories.add": "Kategorie hinzufügen",
  "categories.name_label": "Name",
  "categories.name_placeholder": "z. B. Bücher",
  "categories.empty": "Noch keine Kategorien vorhanden.",
  "categories.error.duplicate": "Diese Kategorie existiert bereits.",
  "categories.error.in_use":
    "Kategorie wird noch verwendet und kann nicht gelöscht werden.",
  "categories.delete_confirm": 'Kategorie "{name}" wirklich löschen?',

  // ── Rooms ─────────────────────────────────────────────────────────────────
  "rooms.title": "Räume",
  "rooms.add": "Raum hinzufügen",
  "rooms.name_label": "Name",
  "rooms.name_placeholder": "z. B. Küche",
  "rooms.empty": "Noch keine Räume vorhanden.",
  "rooms.error.duplicate": "Dieser Raum existiert bereits.",
  "rooms.error.in_use":
    "Raum wird noch verwendet und kann nicht gelöscht werden.",
  "rooms.delete_confirm": 'Raum "{name}" wirklich löschen?',

  // ── Items ─────────────────────────────────────────────────────────────────
  "items.title": "Gegenstände",
  "items.add": "Gegenstand hinzufügen",
  "items.empty": "Noch keine Gegenstände vorhanden.",
  "items.search_placeholder": "Suchen …",
  "items.filter_category": "Kategorie",
  "items.filter_room": "Raum",
  "items.filter_all": "Alle",
  "items.name_label": "Name",
  "items.name_placeholder": "z. B. Sofa",
  "items.category_label": "Kategorie",
  "items.room_label": "Raum (optional)",
  "items.value_label": "Geschätzter Wert (€, optional)",
  "items.no_room": "Kein Raum",
  "items.new_title": "Neuer Gegenstand",
  "items.edit_title": "Gegenstand bearbeiten",
  "items.detail_title": "Gegenstand",
  "items.error.name_required": "Name ist erforderlich.",
  "items.error.category_required": "Bitte eine Kategorie auswählen.",
  "items.delete_confirm": 'Gegenstand "{name}" wirklich löschen?',
  "items.created_at": "Erstellt",
  "items.updated_at": "Zuletzt geändert",
  "items.estimated_value": "Geschätzter Wert",
} as const;

export default de;
