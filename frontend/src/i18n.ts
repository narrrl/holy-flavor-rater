import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      "nav": {
        "home": "Home",
        "community": "Community",
        "about": "About",
        "dashboard": "Dashboard",
        "profile": "My Profile",
        "settings": "Settings",
        "logout": "Logout",
        "login": "Login / Signup",
        "following": "Following",
        "categories": "Categories"
      },
      "categories": {
        "energy": "Energy",
        "hydration": "Hydration",
        "iced-tea": "Iced Tea",
        "milkshake": "Milkshake",
        "packs-and-other": "Packs & Other"
      },
      "dashboard": {
        "welcome": "Welcome back, {{username}}!",
        "shareProfile": "Share Profile:",
        "copySuccess": "Link copied to clipboard!",
        "myRatings": "My Ratings",
        "missing": "Missing",
        "noRatings": "You haven't rated any flavors yet.",
        "exploreFlavors": "Go explore flavors",
        "allRated": "Amazing! You've rated everything! 🏆"
      },
      "settings": {
        "subtitle": "Manage your account and preferences",
        "appearanceTitle": "Appearance & Language",
        "themeLabel": "Theme",
        "langLabel": "Language",
        "avatarTitle": "Profile Picture",
        "avatarButton": "Upload New Avatar",
        "avatarHint": "Max size: 2MB. JPG, PNG or WEBP.",
        "avatarSuccess": "Avatar updated successfully!",
        "infoTitle": "Profile Information",
        "usernameLabel": "Username",
        "emailLabel": "Email",
        "emailHint": "Change will require confirmation",
        "updateButton": "Update Profile",
        "updateSuccess": "Profile updated successfully!",
        "confirmEmailTitle": "Confirm Email Change",
        "confirmEmailHint": "Enter the 6-digit code sent to {{email}}",
        "confirmButton": "Verify & Update Email",
        "passwordTitle": "Change Password",
        "oldPasswordLabel": "Old Password",
        "newPasswordLabel": "New Password",
        "passwordButton": "Change Password",
        "passwordSuccess": "Password changed successfully!",
        "dangerTitle": "Danger Zone",
        "dangerDesc": "Permanently delete your account and all associated data. This action is irreversible.",
        "deleteButton": "Delete My Account",
        "deletionCodeLabel": "Deletion Code",
        "deletionCodeHint": "Enter verification code:",
        "confirmDeleteButton": "Confirm Permanent Deletion",
        "cancelButton": "Cancel",
        "codeSent": "Verification code sent to your email."
      },
      "hero": {
        "title": "The Ultimate Holy Archive",
        "subtitle": "Browse every flavor ever released, discover new favorites, and share your ratings with the community.",
        "join": "Join Community",
        "whatIsThis": "What is this for?"
      },
      "home": {
        "activity": "Community Activity",
        "activitySubtitle": "Latest reviews from people you follow",
        "viewFullFeed": "View Full Feed",
        "quietFeed": "Your feed is a bit quiet",
        "followMore": "Follow more users to see their activity here!",
        "exploreFlavors": "Explore Flavors",
        "hallOfFame": "Hall of Fame",
        "communityVoice": "Community Voice",
        "newArrivals": "New Arrivals",
        "viewAllReviews": "View All Reviews",
        "viewMoreReviews": "View more reviews",
        "rated": "rated"
      },
      "common": {
        "search": "Search...",
        "back": "Back",
        "backTo": "Back to {{page}}",
        "backToArchive": "Back to Archive",
        "backToHome": "Back to Home",
        "buyNow": "Buy Now",
        "reviews": "reviews",
        "rank": "Rank",
        "loading": "Loading...",
        "replies": "Replies",
        "reply": "Reply",
        "edit": "Edit",
        "delete": "Delete",
        "save": "Save",
        "cancel": "Cancel"
      },
      "community": {
        "title": "Community Activity",
        "subtitle": "Stay updated with your circle's latest ratings and discussions.",
        "quietFeed": "Your feed is a bit empty...",
        "followMore": "Follow more people to see their flavor ratings here!",
        "topRated": "Circle's Top Rated",
        "notifications": "Recent Notifications",
        "notifReply": "replied",
        "notifMention": "mentioned you",
        "noNotifications": "No notifications.",
        "searchFriends": "Search friends...",
        "writeReply": "Add a reply...",
        "rated": "rated"
      },
      "about": {
        "title": "About This Project",
        "mission": "Holy Flavors Archive is a community-driven project dedicated to documenting and rating the vast world of Holy Energy products. Our goal is to create a definitive, high-density catalog of every flavor ever released—including legacy and limited editions.",
        "canDoTitle": "What you can do here:",
        "featureExplore": "Explore: Find details on any Holy Energy, Iced Tea, or Milkshake product.",
        "featureRate": "Rate: Share your honest opinion and score flavors from 1 to 10.",
        "featureCommunity": "Community: Follow other fans, see their latest tests, and discover new favorites together.",
        "featureProfile": "Taste Profile: Build your own personal tiered leaderboard to share with the world.",
        "disclaimer": "This website is a fan project and is not officially affiliated with, authorized, maintained, sponsored, or endorsed by HOLY Energy GmbH. All product names, logos, and brands are property of their respective owners.",
        "impressumTitle": "Impressum (Legal Notice)",
        "legalInfo": "Information according to § 5 TMG:",
        "contact": "Contact",
        "responsible": "Responsible for content according to § 55 Abs. 2 RStV:",
        "disclaimerTitle": "Legal Disclaimer"
      }
    }
  },
  de: {
    translation: {
      "nav": {
        "home": "Startseite",
        "community": "Community",
        "about": "Über uns",
        "dashboard": "Dashboard",
        "profile": "Mein Profil",
        "settings": "Einstellungen",
        "logout": "Abmelden",
        "login": "Anmelden / Registrieren",
        "following": "Folge ich",
        "categories": "Kategorien"
      },
      "categories": {
        "energy": "Energy",
        "hydration": "Hydration",
        "iced-tea": "Eistee",
        "milkshake": "Milkshake",
        "packs-and-other": "Bundles & Mehr"
      },
      "dashboard": {
        "welcome": "Willkommen zurück, {{username}}!",
        "shareProfile": "Profil teilen:",
        "copySuccess": "Link in die Zwischenablage kopiert!",
        "myRatings": "Meine Bewertungen",
        "missing": "Fehlend",
        "noRatings": "Du hast noch keine Sorten bewertet.",
        "exploreFlavors": "Sorten entdecken",
        "allRated": "Wahnsinn! Du hast alles bewertet! 🏆"
      },
      "settings": {
        "subtitle": "Verwalte dein Konto und deine Einstellungen",
        "appearanceTitle": "Erscheinungsbild & Sprache",
        "themeLabel": "Design",
        "langLabel": "Sprache",
        "avatarTitle": "Profilbild",
        "avatarButton": "Neues Bild hochladen",
        "avatarHint": "Max. Größe: 2MB. JPG, PNG oder WEBP.",
        "avatarSuccess": "Profilbild erfolgreich aktualisiert!",
        "infoTitle": "Profil-Informationen",
        "usernameLabel": "Benutzername",
        "emailLabel": "E-Mail",
        "emailHint": "Änderung erfordert Bestätigung",
        "updateButton": "Profil aktualisieren",
        "updateSuccess": "Profil erfolgreich aktualisiert!",
        "confirmEmailTitle": "E-Mail-Änderung bestätigen",
        "confirmEmailHint": "Gib den 6-stelligen Code ein, der an {{email}} gesendet wurde",
        "confirmButton": "E-Mail verifizieren & aktualisieren",
        "passwordTitle": "Passwort ändern",
        "oldPasswordLabel": "Altes Passwort",
        "newPasswordLabel": "Neues Passwort",
        "passwordButton": "Passwort ändern",
        "passwordSuccess": "Passwort erfolgreich geändert!",
        "dangerTitle": "Gefahrenzone",
        "dangerDesc": "Lösche dein Konto und alle damit verbundenen Daten dauerhaft. Dies kann nicht rückgängig gemacht werden.",
        "deleteButton": "Mein Konto löschen",
        "deletionCodeLabel": "Löschcode",
        "deletionCodeHint": "Bestätigungscode eingeben:",
        "confirmDeleteButton": "Dauerhafte Löschung bestätigen",
        "cancelButton": "Abbrechen",
        "codeSent": "Bestätigungscode an deine E-Mail gesendet."
      },
      "hero": {
        "title": "Das ultimative Holy-Archiv",
        "subtitle": "Durchsuche jede jemals veröffentlichte Sorte, entdecke neue Favoriten und teile deine Bewertungen mit der Community.",
        "join": "Community beitreten",
        "whatIsThis": "Was ist das?"
      },
      "home": {
        "activity": "Community-Aktivität",
        "activitySubtitle": "Neueste Bewertungen von Personen, denen du folgst",
        "viewFullFeed": "Vollständiger Feed",
        "quietFeed": "Dein Feed ist noch etwas ruhig",
        "followMore": "Folge mehr Benutzern, um deren Aktivitäten hier zu sehen!",
        "exploreFlavors": "Sorten entdecken",
        "hallOfFame": "Hall of Fame",
        "communityVoice": "Community-Stimmen",
        "newArrivals": "Neuheiten",
        "viewAllReviews": "Alle Bewertungen ansehen",
        "viewMoreReviews": "Mehr Bewertungen",
        "rated": "bewertete"
      },
      "common": {
        "search": "Suchen...",
        "back": "Zurück",
        "backTo": "Zurück zu {{page}}",
        "backToArchive": "Zurück zum Archiv",
        "backToHome": "Zurück zur Startseite",
        "buyNow": "Jetzt kaufen",
        "reviews": "Bewertungen",
        "rank": "Rang",
        "loading": "Wird geladen...",
        "replies": "Antworten",
        "reply": "Antworten",
        "edit": "Bearbeiten",
        "delete": "Löschen",
        "save": "Speichern",
        "cancel": "Abbrechen"
      },
      "community": {
        "title": "Community-Aktivität",
        "subtitle": "Bleib auf dem Laufenden mit den neuesten Bewertungen und Diskussionen deines Kreises.",
        "quietFeed": "Dein Feed ist noch etwas leer...",
        "followMore": "Folge mehr Personen, um deren Bewertungen hier zu sehen!",
        "topRated": "Top-Bewertungen deines Kreises",
        "notifications": "Neueste Benachrichtigungen",
        "notifReply": "hat geantwortet",
        "notifMention": "hat dich erwähnt",
        "noNotifications": "Keine Benachrichtigungen.",
        "searchFriends": "Freunde suchen...",
        "writeReply": "Eine Antwort hinzufügen...",
        "rated": "bewertete"
      },
      "about": {
        "title": "Über dieses Projekt",
        "mission": "Das Holy Flavors Archiv ist ein von der Community getriebenes Projekt, das sich der Dokumentation und Bewertung der riesigen Welt der Holy Energy Produkte widmet. Unser Ziel ist es, einen definitiven Katalog jeder jemals veröffentlichten Sorte zu erstellen – einschließlich Legacy- und Limited-Editionen.",
        "canDoTitle": "Was du hier tun kannst:",
        "featureExplore": "Entdecken: Details zu jedem Holy Energy, Eistee oder Milkshake Produkt finden.",
        "featureRate": "Bewerten: Deine ehrliche Meinung teilen und Sorten von 1 bis 10 bewerten.",
        "featureCommunity": "Community: Folge anderen Fans, sieh dir ihre neuesten Tests an und entdeckt gemeinsam neue Favoriten.",
        "featureProfile": "Geschmacksprofil: Erstelle deine eigene persönliche Bestenliste, um sie mit der Welt zu teilen.",
        "disclaimer": "Diese Website ist ein Fan-Projekt und wird nicht von der HOLY Energy GmbH offiziell unterstützt, autorisiert, gepflegt oder gesponselt. Alle Produktnamen, Logos und Marken sind Eigentum ihrer jeweiligen Inhaber.",
        "impressumTitle": "Impressum",
        "legalInfo": "Angaben gemäß § 5 TMG:",
        "contact": "Kontakt",
        "responsible": "Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV:",
        "disclaimerTitle": "Haftungsausschluss"
      }
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

export default i18n;
