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
  "items.quantity_label": "Anzahl",
  "items.qty_dec": "−",
  "items.qty_inc": "+",
  "items.qty_dec_aria": "Anzahl verringern",
  "items.qty_inc_aria": "Anzahl erhöhen",
  "items.error.name_required": "Name ist erforderlich.",
  "items.error.category_required": "Bitte eine Kategorie auswählen.",
  "items.error.quantity_invalid": "Anzahl muss mindestens 1 sein.",
  "items.delete_confirm": 'Gegenstand "{name}" wirklich löschen?',
  "items.created_at": "Erstellt",
  "items.updated_at": "Zuletzt geändert",
  "items.estimated_value": "Geschätzter Wert",
  "items.box_label": "Karton (optional)",
  "items.no_box": "Kein Karton",
  "items.in_box": "In Karton",

  // ── Photos / capture ─────────────────────────────────────────────────────
  "items.placeholderName": "(unbenannt)",
  "items.captureButton": "Foto aufnehmen",
  "items.captureFailed": "Upload fehlgeschlagen. Bitte erneut versuchen.",
  "items.captureFailedPresign":
    "Upload-URL fehlgeschlagen (HTTP {status}). R2-Konfiguration prüfen.",
  "items.captureFailedR2":
    "R2-Upload fehlgeschlagen (HTTP {status}). CORS oder Credentials prüfen.",
  "items.captureFailedCreate":
    "Gegenstand konnte nicht gespeichert werden (HTTP {status}).",
  "items.captureFailedAppend":
    "Foto konnte nicht angehängt werden (HTTP {status}).",
  "items.captureTooLarge":
    "Das Foto ist zu groß. Bitte ein kleineres Bild aufnehmen.",
  "items.captureWrongType":
    "Dieser Dateityp wird nicht unterstützt. Bitte ein JPEG, PNG oder WebP aufnehmen.",
  "items.addPhoto": "Foto hinzufügen",
  "items.removePhoto": "Foto entfernen",
  "items.addAnotherPhoto": "Weiteres Foto",
  "items.captureFinished": "Fertig",
  "items.pending": "Ausstehend",
  "items.needsReview": "Zur Überprüfung",
  "items.pending_title": "Ausstehende Gegenstände",
  "items.pending_empty": "Keine ausstehenden Gegenstände.",
  "items.quick_add_title": "Schnellerfassung",
  "items.recentCount": "neueste Gegenstände",
  "items.loadAll": "Alle Gegenstände laden",
  "nav.quickAdd": "Schnellerfassung",
  "nav.toggleTheme": "Design umschalten",
  "nav.themeRaute": "Hell",
  "nav.themeSternenhimmel": "Dunkel",

  // ── Invites ───────────────────────────────────────────────────────────────
  "invites.title": "Einladungen",
  "invites.empty": "Keine offenen Einladungen.",
  "invites.create": "Neue Einladung erstellen",
  "invites.expiry_label": "Gültigkeitsdauer (Tage)",
  "invites.expiry_default": "7",
  "invites.created_at_label": "Erstellt am",
  "invites.expiry_date_label": "Läuft ab am",
  "invites.revoke": "Widerrufen",
  "invites.revoke_confirm": "Einladung wirklich widerrufen?",
  "invites.code_warning":
    "Bitte kopiere diesen Code jetzt — er wird nicht erneut angezeigt.",
  "invites.code_label": "Einladungslink",
  "invites.qr_label": "QR-Code für Einladungslink",
  "invites.nav": "Einladungen",

  // ── Invite registration ────────────────────────────────────────────────────
  "invite.title": "Einladung",
  "invite.confirm": "Einladung annehmen",
  "invite.confirm_subtitle":
    "Klicke auf den Button, um deinen Zugang zu aktivieren.",
  "invite.error.invalid": "Ungültiger oder abgelaufener Einladungscode.",
  "invite.error.rate_limited":
    "Zu viele Versuche. Bitte warte {seconds} Sekunden.",

  // ── Continuous capture ────────────────────────────────────────────────────
  "capture.activate": "Kamera aktivieren",
  "capture.shutterLabel": "Aufnehmen",
  "capture.confirmLabel": "✓ Fertig",
  "capture.closeLabel": "✕ Schließen",
  "capture.permissionDeniedHint":
    "Kamerazugriff verweigert. Bitte erlaube den Zugriff in den Browser-Einstellungen und versuche es erneut.",
  "capture.noCameraHint":
    "Keine Kamera gefunden. Bitte verwende die Dateiauswahl.",
  "capture.unsupportedHint":
    "Dein Browser unterstützt keinen direkten Kamerazugriff. Bitte verwende die Dateiauswahl.",

  // ── Admin ─────────────────────────────────────────────────────────────────
  "admin.title": "Verwaltung",
  "admin.nav": "Verwaltung",
  "admin.export.heading": "Daten exportieren",
  "admin.export.description":
    "Lädt eine vollständige Sicherungskopie aller Daten als NDJSON-Datei herunter.",
  "admin.export.button": "Daten herunterladen",
  "admin.import.heading": "Daten importieren",
  "admin.import.description":
    "Stellt Daten aus einer zuvor exportierten NDJSON-Datei wieder her.",
  "admin.import.file_label": "Sicherungsdatei (.ndjson)",
  "admin.import.button": "Importieren",
  "admin.import.success":
    "{imported} Einträge importiert, {skipped} übersprungen.",
  "admin.import.error": "Import fehlgeschlagen: {message}",
  "admin.delete.heading": "Alle Daten löschen",
  "admin.delete.description":
    "Löscht unwiderruflich alle Gegenstände, Kartons, Räume, Kategorien und weitere Daten. Sitzungen bleiben erhalten.",
  "admin.delete.button": "Alle Daten löschen …",
  "admin.delete.success": "{deleted} Einträge gelöscht.",
  "admin.delete_confirm.title": "Alle Daten löschen",
  "admin.delete_confirm.warning":
    "Diese Aktion ist unwiderruflich. Alle Gegenstände, Kartons, Räume, Kategorien und weiteren Daten werden dauerhaft gelöscht.",
  "admin.delete_confirm.count": "Davon betroffen: {count} Einträge.",
  "admin.delete_confirm.button": "Ja, alle Daten unwiderruflich löschen",
  "admin.delete_confirm.cancel": "Abbrechen",

  // ── Boxes ──────────────────────────────────────────────────────────────────
  "boxes.title": "Kartons",
  "boxes.add": "Karton hinzufügen",
  "boxes.empty": "Noch keine Kartons vorhanden.",
  "boxes.code_label": "Code",
  "boxes.label_label": "Beschriftung (optional)",
  "boxes.label_placeholder": "z. B. Küche – Geschirr",
  "boxes.destination_room_label": "Zielraum (optional)",
  "boxes.status_label": "Status",
  "boxes.item_count": "Gegenstände",
  "boxes.new_title": "Neuer Karton",
  "boxes.edit_title": "Karton bearbeiten",
  "boxes.detail_title": "Karton",
  "boxes.label_page_title": "Karton-Etikett",
  "boxes.no_label": "Kein Etikett",
  "boxes.no_destination_room": "Kein Zielraum",
  "boxes.bulk_add_label": "Gegenstände hinzufügen",
  "boxes.bulk_add_placeholder":
    "Gegenstandsnamen eingeben, einer pro Zeile oder kommagetrennt …",
  "boxes.bulk_add_submit": "Hinzufügen",
  "boxes.bulk_add_result": "{count} Gegenstand/Gegenstände hinzugefügt.",
  "boxes.remove_item": "Entfernen",
  "boxes.remove_item_confirm": 'Gegenstand "{name}" aus Karton entfernen?',
  "boxes.delete_confirm": 'Karton "{code}" wirklich löschen?',
  "boxes.error.not_empty":
    "Karton enthält noch Gegenstände und kann nicht gelöscht werden.",
  "boxes.items_empty": "Noch keine Gegenstände in diesem Karton.",

  // Box status labels
  "boxes.status.empty": "Leer",
  "boxes.status.packed": "Gepackt",
  "boxes.status.delivered": "Geliefert",

  // Box lifecycle actions
  "boxes.action.mark_delivered": "Als geliefert markieren",
  "boxes.action.place_item": "Einlagern",
  "boxes.action.assign_room": "Zielraum festlegen",
  "boxes.action.unpack_all": "Alle entpacken nach {room}",

  // Box delivered-state UI copy
  "boxes.place_item_label": "In Raum einlagern",
  "boxes.assign_room_heading": "Zielraum festlegen",
  "boxes.label_item_count": "{count} Gegenstände",
} as const;

export default de;
