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
