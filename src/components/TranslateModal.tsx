import React, { useState } from 'react';
import { Languages, Loader2, X, Check, Globe } from 'lucide-react';
import { TranscriptResult } from '../types/transcript';

interface TranslateModalProps {
  isOpen: boolean;
  onClose: () => void;
  transcript: TranscriptResult;
  onApplyTranslation: (translatedData: {
    language: string;
    summary: string;
    segments: any[];
  }) => void;
}

const SUPPORTED_LANGUAGES = [
  { code: 'es', name: 'Spanish (Español)' },
  { code: 'fr', name: 'French (Français)' },
  { code: 'de', name: 'German (Deutsch)' },
  { code: 'ja', name: 'Japanese (日本語)' },
  { code: 'zh', name: 'Chinese (Simplified)' },
  { code: 'pt', name: 'Portuguese (Português)' },
  { code: 'it', name: 'Italian (Italiano)' },
  { code: 'ar', name: 'Arabic (العربية)' },
  { code: 'hi', name: 'Hindi (हिन्दी)' },
  { code: 'ko', name: 'Korean (한국어)' },
  { code: 'ru', name: 'Russian (Русский)' },
  { code: 'nl', name: 'Dutch (Nederlands)' },
  { code: 'tr', name: 'Turkish (Türkçe)' },
  { code: 'sv', name: 'Swedish (Svenska)' },
  { code: 'pl', name: 'Polish (Polski)' },
];

export const TranslateModal: React.FC<TranslateModalProps> = ({
  isOpen,
  onClose,
  transcript,
  onApplyTranslation,
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState(SUPPORTED_LANGUAGES[0].name);
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTranslate = async () => {
    setIsTranslating(true);
    setError(null);
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segments: transcript.segments,
          summary: transcript.summary,
          targetLanguage: selectedLanguage,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Translation failed');
      }

      onApplyTranslation({
        language: selectedLanguage,
        summary: data.summary,
        segments: data.segments,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to translate transcript');
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white">Translate Transcript</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-400">
            Translate dialogue segments and summary while keeping the exact millisecond timestamps and speaker labels intact.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Select Target Language
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1">
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isSelected = selectedLanguage === lang.name;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setSelectedLanguage(lang.name)}
                    className={`px-3 py-2 rounded-xl text-left text-xs transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                        : 'bg-slate-950/60 text-slate-300 border border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <span>{lang.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 ml-1 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleTranslate}
            disabled={isTranslating}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 disabled:opacity-50 transition-all cursor-pointer"
          >
            {isTranslating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Translating with AI...</span>
              </>
            ) : (
              <>
                <Languages className="w-4 h-4" />
                <span>Translate to {selectedLanguage.split(' ')[0]}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
