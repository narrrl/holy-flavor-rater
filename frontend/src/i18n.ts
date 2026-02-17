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
        "settings": "Settings",
        "logout": "Logout",
        "login": "Login / Signup"
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
        "backToArchive": "Back to Archive",
        "backToHome": "Back to Home",
        "backTo": "Back to",
        "buyNow": "Buy Now",
        "reviews": "reviews",
        "rank": "Rank",
        "loading": "Loading..."
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
        "settings": "Einstellungen",
        "logout": "Abmelden",
        "login": "Anmelden / Registrieren"
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
        "backToArchive": "Zurück zum Archiv",
        "backToHome": "Zurück zur Startseite",
        "backTo": "Zurück zu",
        "buyNow": "Jetzt kaufen",
        "reviews": "Bewertungen",
        "rank": "Rang",
        "loading": "Wird geladen..."
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
