import React, { useState, useRef, useEffect } from 'react';
import { X, Sparkles, Send, FileText, Loader2, UploadCloud, FileAudio, Trash2 } from 'lucide-react';

const PRELOADED_SAMPLES = [
  {
    title: 'Transcript 1: Karen Ibsen (Landscaping LLC)',
    text: "Hi, yes, my name is Karen Ibsen, I run a small landscaping business, just me and two guys who work for me. I've been doing my own taxes but it's an LLC now since last year and I think I'm messing it up. I need someone to just do my business taxes this year, quarterly stuff too if that's a thing I'm supposed to be doing. You can reach me at karen.ibsen@ibsenlandscaping.com or 614-555-0142, whichever is easier."
  },
  {
    title: 'Transcript 2: Online Store (Missing Info / Callback)',
    text: "So I got your number from my cousin, she said you guys helped her with her books. I've got a little online store, nothing huge, and honestly I just have no idea what's going on with my finances month to month, like I couldn't tell you if I made money last month or not. I need somebody to just look at that regularly for me. I'm bad with this stuff, sorry, I don't even have my business name handy right now, I'll have to find it. Can someone just call me back at some point this week?"
  },
  {
    title: 'Transcript 3: Audit Hearsay vs Advisory / Budget',
    text: "Okay so, I think I need the audit protection kind of package, my friend mentioned that. But then also, actually, thinking about it more, what I might really need is somebody to just run the finance side of my company for me, like tell me what to do, because I'm making decent revenue now but I have zero idea if I'm actually profitable. I don't know, maybe that's a totally different thing and costs way more, I don't have a huge budget honestly. What would you even recommend for someone in my position, I guess I'm not fully sure what I'm asking for."
  },
  {
    title: 'Transcript 4: Estate Tax / Statutory Deadline',
    text: "Hey there, how's it going, nice to finally get through, your hold music is something else, ha. Yeah so it's been raining nonstop here, I don't know how you guys are doing over there. Anyway, my neighbor recommended you guys, she said you did her estate stuff a couple years back and it went smooth. So my situation, my dad passed last spring, and there's a decent amount of property and a couple accounts, and my brother and I have just been sitting on it because neither of us knows what we're doing, and honestly we're worried about doing something wrong with the estate taxes on it. We probably should have called sooner. Is that something you guys handle, the estate side of things?"
  }
];

export default function NewIntakeModal({ isOpen, onClose, onSubmit, onSubmitAudio, isSubmitting }) {
  const [activeTab, setActiveTab] = useState('text'); // 'text' | 'audio'
  const [transcript, setTranscript] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setTranscript('');
      setAudioFile(null);
      if (audioPreviewUrl) {
        URL.revokeObjectURL(audioPreviewUrl);
        setAudioPreviewUrl(null);
      }
      setActiveTab('text');
    }
  }, [isOpen]);

  const handleAudioSelect = (file) => {
    if (!file) return;
    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl);
    }
    setAudioFile(file);
    setAudioPreviewUrl(URL.createObjectURL(file));
  };

  const handleClearAudio = () => {
    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl);
    }
    setAudioFile(null);
    setAudioPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (activeTab === 'text') {
      if (!transcript.trim()) return;
      onSubmit(transcript);
    } else {
      if (!audioFile) return;
      if (onSubmitAudio) {
        onSubmitAudio(audioFile);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-meridian-600" />
              Process New Client Intake
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Paste raw transcript notes or upload a voicemail audio file for automated triage.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-40 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input Mode Tabs */}
        <div className="px-5 pt-3 pb-0 border-b border-slate-200 bg-white flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('text')}
            disabled={isSubmitting}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'text'
                ? 'border-meridian-600 text-meridian-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Text Transcript</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audio')}
            disabled={isSubmitting}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'audio'
                ? 'border-meridian-600 text-meridian-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileAudio className="w-3.5 h-3.5" />
            <span>Voicemail / Audio File</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {activeTab === 'text' ? (
            <>
              {/* Quick Presets */}
              <div>
                <span className="text-xs font-bold text-slate-700 block mb-2">
                  Quick Load Sample Transcripts:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PRELOADED_SAMPLES.map((sample, idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => setTranscript(sample.text)}
                      className="text-left p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-meridian-50 hover:border-meridian-200 text-slate-700 hover:text-meridian-900 text-xs transition-all flex items-start gap-2 disabled:opacity-40 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                      <span className="font-semibold line-clamp-1">{sample.title}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea Input */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Raw Spoken / Written Transcript Text:
                  </label>
                  <textarea
                    rows={6}
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    placeholder="Type or paste raw transcript here..."
                    disabled={isSubmitting}
                    required
                    className="w-full p-3.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-meridian-500 font-sans leading-relaxed resize-none disabled:bg-slate-50 disabled:text-slate-400"
                  />
                </div>

                {/* Submitting Loading Banner */}
                {isSubmitting && (
                  <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 flex items-center gap-2.5 text-slate-800 text-xs font-semibold">
                    <Loader2 className="w-4 h-4 text-sky-600 animate-spin flex-shrink-0" />
                    <span>Analyzing Intake Transcript with Gemini AI...</span>
                  </div>
                )}

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !transcript.trim()}
                    className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-meridian-600 hover:bg-meridian-700 transition-colors shadow-sm shadow-meridian-600/20 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Process Intake</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </>
          ) : (
            /* Audio / Voicemail File Tab */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Upload Voicemail or Call Audio:
                </label>
                <p className="text-[11px] text-slate-500 mb-3">
                  Supported audio formats: MP3, WAV, M4A, OGG, WebM, AAC (max 25MB).
                </p>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm,.aac"
                  onChange={(e) => handleAudioSelect(e.target.files?.[0])}
                  className="hidden"
                  id="audio-file-input"
                  disabled={isSubmitting}
                />

                {!audioFile ? (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      if (e.dataTransfer.files?.[0]) {
                        handleAudioSelect(e.dataTransfer.files[0]);
                      }
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                      isDragging
                        ? 'border-meridian-500 bg-meridian-50/50'
                        : 'border-slate-300 hover:border-meridian-400 bg-slate-50/50 hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-meridian-50 border border-meridian-200 text-meridian-600 flex items-center justify-center mb-3 shadow-2xs">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-bold text-slate-800">
                      Click to browse or drag and drop audio file
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Voicemails, telephone notes, client audio messages
                    </p>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-meridian-600 text-white flex items-center justify-center flex-shrink-0">
                          <FileAudio className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {audioFile.name}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {(audioFile.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleClearAudio}
                        disabled={isSubmitting}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Remove audio"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {audioPreviewUrl && (
                      <div className="pt-1">
                        <audio controls src={audioPreviewUrl} className="w-full h-10 rounded-lg" />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Submitting Loading Banner */}
              {isSubmitting && (
                <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 flex items-center gap-2.5 text-slate-800 text-xs font-semibold">
                  <Loader2 className="w-4 h-4 text-sky-600 animate-spin flex-shrink-0" />
                  <span>Transcribing spoken audio with Gemini AI & triaging intake...</span>
                </div>
              )}

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !audioFile}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-meridian-600 hover:bg-meridian-700 transition-colors shadow-sm shadow-meridian-600/20 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Transcribing & Triaging...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Transcribe & Process Audio</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
