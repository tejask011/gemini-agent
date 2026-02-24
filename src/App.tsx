/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback } from 'react';
import { GoogleGenAI } from "@google/genai";
import Markdown from 'react-markdown';
import { Camera, RefreshCw, Sparkles, Loader2, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Initialize Gemini API
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setError(null);
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Could not access camera. Please ensure you have granted permission.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setImage(dataUrl);
        stopCamera();
      }
    }
  };

  const analyzeImage = async () => {
    if (!image) return;
    
    setLoading(true);
    setResult("");
    setError(null);

    try {
      const base64Data = image.split(',')[1];
      
      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { text: "Explain what is in this image in a beginner-friendly way. Be concise but informative." },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: base64Data
                }
              }
            ]
          }
        ]
      });

      setResult(response.text || "No explanation generated.");
    } catch (err) {
      console.error("Error analyzing image:", err);
      setError("Failed to analyze image. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setImage(null);
    setResult("");
    setError(null);
    startCamera();
  };

  // Start camera on mount
  React.useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans selection:bg-emerald-100">
      <header className="max-w-4xl mx-auto px-6 py-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
            <Sparkles size={20} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Vision Lens</h1>
        </div>
        <div className="text-xs font-mono text-zinc-400 uppercase tracking-widest">
          AI-Powered Recognition
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Camera / Image Section */}
          <section className="space-y-6">
            <div className="relative aspect-video bg-zinc-200 rounded-3xl overflow-hidden shadow-inner border border-zinc-200 group">
              <AnimatePresence mode="wait">
                {!image ? (
                  <motion.div
                    key="camera"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full h-full"
                  >
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    {!stream && !error && (
                      <div className="absolute inset-0 flex items-center justify-center bg-zinc-100">
                        <Loader2 className="animate-spin text-zinc-400" size={32} />
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="captured"
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full h-full"
                  >
                    <img src={image} alt="Captured" className="w-full h-full object-cover" />
                  </motion.div>
                )}
              </AnimatePresence>

              {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-red-50/90 p-8 text-center">
                  <p className="text-red-600 text-sm font-medium">{error}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              {!image ? (
                <button
                  onClick={captureImage}
                  disabled={!stream}
                  className="flex-1 bg-zinc-900 text-white py-4 rounded-2xl font-medium flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-zinc-200"
                >
                  <Camera size={20} />
                  Capture Photo
                </button>
              ) : (
                <>
                  <button
                    onClick={reset}
                    className="flex-1 bg-white border border-zinc-200 text-zinc-600 py-4 rounded-2xl font-medium flex items-center justify-center gap-2 hover:bg-zinc-50 transition-all active:scale-[0.98]"
                  >
                    <RefreshCw size={18} />
                    Retake
                  </button>
                  <button
                    onClick={analyzeImage}
                    disabled={loading}
                    className="flex-[2] bg-emerald-600 text-white py-4 rounded-2xl font-medium flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all active:scale-[0.98] disabled:opacity-50 shadow-xl shadow-emerald-100"
                  >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                    {loading ? "Analyzing..." : "Analyze Image"}
                  </button>
                </>
              )}
            </div>
          </section>

          {/* Result Section */}
          <section className="flex flex-col">
            <div className="flex-1 bg-white rounded-3xl border border-zinc-200 p-8 shadow-sm relative overflow-hidden min-h-[400px]">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <ImageIcon size={120} />
              </div>

              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                <Sparkles size={14} className="text-emerald-500" />
                AI Explanation
              </h2>

              <div className="prose prose-zinc max-w-none">
                {loading ? (
                  <div className="space-y-4">
                    <div className="h-4 bg-zinc-100 rounded-full w-3/4 animate-pulse" />
                    <div className="h-4 bg-zinc-100 rounded-full w-full animate-pulse" />
                    <div className="h-4 bg-zinc-100 rounded-full w-5/6 animate-pulse" />
                    <div className="h-4 bg-zinc-100 rounded-full w-2/3 animate-pulse" />
                  </div>
                ) : result ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="markdown-body"
                  >
                    <Markdown>{result}</Markdown>
                  </motion.div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center text-zinc-400 py-12">
                    <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mb-4">
                      <ImageIcon size={24} />
                    </div>
                    <p className="text-sm">Capture and analyze an image to see the explanation here.</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>

      <canvas ref={canvasRef} className="hidden" />

      <footer className="max-w-4xl mx-auto px-6 py-12 border-t border-zinc-100 text-center">
        <p className="text-xs text-zinc-400">
          Powered by Gemini 3 Flash & React
        </p>
      </footer>
    </div>
  );
}
