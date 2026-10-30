import React, { useState } from 'react';
import { PersonaConfig } from '@/types';
import { DEFAULT_PERSONA } from '@/lib/persona';
import { X, Save, RotateCcw, UserCheck, Sparkles } from 'lucide-react';

interface PersonaModalProps {
  isOpen: boolean;
  onClose: () => void;
  persona: PersonaConfig;
  onSave: (newPersona: PersonaConfig) => void;
}

export const PersonaModal: React.FC<PersonaModalProps> = ({
  isOpen,
  onClose,
  persona,
  onSave
}) => {
  const [formData, setFormData] = useState<PersonaConfig>(persona);
  const [savedAlert, setSavedAlert] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    setSavedAlert(true);
    setTimeout(() => {
      setSavedAlert(false);
      onClose();
    }, 800);
  };

  const handleReset = () => {
    setFormData(DEFAULT_PERSONA);
  };

  const updateGrowthArea = (index: number, val: string) => {
    const updated = [...formData.growthAreas] as [string, string, string];
    updated[index] = val;
    setFormData({ ...formData, growthAreas: updated });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-950 border border-cyan-800/40 text-cyan-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Customize Persona & Knowledge Base</h2>
              <p className="text-xs text-slate-400">Review and tailor how your voicebot answers interview questions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs sm:text-sm">
          {savedAlert && (
            <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-600/40 text-emerald-300 font-medium flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              Persona updated and saved successfully!
            </div>
          )}

          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Your Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-800/90 text-white rounded-lg px-3 py-2 border border-slate-700 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Role / Headline</label>
              <input
                type="text"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full bg-slate-800/90 text-white rounded-lg px-3 py-2 border border-slate-700 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Assessment Core Q1: Life Story */}
          <div>
            <label className="block text-slate-300 font-medium mb-1 flex items-center justify-between">
              <span>Life Story (Assessment Question #1)</span>
              <span className="text-[11px] text-cyan-400 font-mono">Spoken in a few sentences</span>
            </label>
            <textarea
              rows={3}
              value={formData.lifeStory}
              onChange={(e) => setFormData({ ...formData, lifeStory: e.target.value })}
              className="w-full bg-slate-800/90 text-white rounded-lg p-3 border border-slate-700 focus:outline-none focus:border-cyan-500 leading-relaxed"
            />
          </div>

          {/* Assessment Core Q2: Superpower */}
          <div>
            <label className="block text-slate-300 font-medium mb-1 flex items-center justify-between">
              <span>#1 Superpower (Assessment Question #2)</span>
            </label>
            <textarea
              rows={2}
              value={formData.superpower}
              onChange={(e) => setFormData({ ...formData, superpower: e.target.value })}
              className="w-full bg-slate-800/90 text-white rounded-lg p-3 border border-slate-700 focus:outline-none focus:border-cyan-500 leading-relaxed"
            />
          </div>

          {/* Assessment Core Q3: Growth Areas */}
          <div className="space-y-2">
            <label className="block text-slate-300 font-medium">Top 3 Areas for Growth (Assessment Question #3)</label>
            <input
              type="text"
              placeholder="Area 1"
              value={formData.growthAreas[0]}
              onChange={(e) => updateGrowthArea(0, e.target.value)}
              className="w-full bg-slate-800/90 text-white rounded-lg px-3 py-2 border border-slate-700 focus:outline-none focus:border-cyan-500"
            />
            <input
              type="text"
              placeholder="Area 2"
              value={formData.growthAreas[1]}
              onChange={(e) => updateGrowthArea(1, e.target.value)}
              className="w-full bg-slate-800/90 text-white rounded-lg px-3 py-2 border border-slate-700 focus:outline-none focus:border-cyan-500"
            />
            <input
              type="text"
              placeholder="Area 3"
              value={formData.growthAreas[2]}
              onChange={(e) => updateGrowthArea(2, e.target.value)}
              className="w-full bg-slate-800/90 text-white rounded-lg px-3 py-2 border border-slate-700 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Assessment Core Q4: Misconception */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Coworker Misconception (Assessment Question #4)
            </label>
            <textarea
              rows={2}
              value={formData.coworkerMisconception}
              onChange={(e) => setFormData({ ...formData, coworkerMisconception: e.target.value })}
              className="w-full bg-slate-800/90 text-white rounded-lg p-3 border border-slate-700 focus:outline-none focus:border-cyan-500 leading-relaxed"
            />
          </div>

          {/* Assessment Core Q5: Pushing boundaries */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Pushing Boundaries & Limits (Assessment Question #5)
            </label>
            <textarea
              rows={2}
              value={formData.pushingLimits}
              onChange={(e) => setFormData({ ...formData, pushingLimits: e.target.value })}
              className="w-full bg-slate-800/90 text-white rounded-lg p-3 border border-slate-700 focus:outline-none focus:border-cyan-500 leading-relaxed"
            />
          </div>

          {/* Why 100x */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Why 100x Engineers?
            </label>
            <textarea
              rows={2}
              value={formData.why100x}
              onChange={(e) => setFormData({ ...formData, why100x: e.target.value })}
              className="w-full bg-slate-800/90 text-white rounded-lg p-3 border border-slate-700 focus:outline-none focus:border-cyan-500 leading-relaxed"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset to Defaults
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium shadow-md transition-colors"
              >
                <Save className="w-4 h-4" />
                Save & Apply
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

