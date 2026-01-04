"use client";
import { useLanguage, Language } from "@/lib/i18n";

interface LanguageSwitcherProps {
  className?: string;
  compact?: boolean;
}

export default function LanguageSwitcher({ className = "", compact = false }: LanguageSwitcherProps) {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    const newLang: Language = language === "en" ? "he" : "en";
    setLanguage(newLang);
  };

  if (compact) {
    return (
      <button
        onClick={toggleLanguage}
        className={`flex items-center justify-center px-2 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white font-semibold transition-all text-sm ${className}`}
        title={language === "en" ? "Switch to Hebrew" : "החלף לאנגלית"}
        aria-label={language === "en" ? "Switch to Hebrew" : "Switch to English"}
      >
        {language === "en" ? "עב" : "EN"}
      </button>
    );
  }

  return (
    <button
      onClick={toggleLanguage}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white text-blue-700 font-semibold hover:bg-blue-50 shadow-md text-xs sm:text-sm whitespace-nowrap transition-all ${className}`}
      title={language === "en" ? "Switch to Hebrew" : "החלף לאנגלית"}
      aria-label={language === "en" ? "Switch to Hebrew" : "Switch to English"}
    >
      🌐 <span className="hidden md:inline">{language === "en" ? "עברית" : "English"}</span>
      <span className="md:hidden">{language === "en" ? "עב" : "EN"}</span>
    </button>
  );
}
