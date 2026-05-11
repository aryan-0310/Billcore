import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera, Check, Info, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export type ScannerStatus = {
  type: 'success' | 'error';
  message: string;
} | null;

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (decodedText: string) => void;
  isContinuous?: boolean;
  status?: ScannerStatus; // Added: Allows parent to provide explicit feedback
}

export default function BarcodeScanner({ 
  isOpen, 
  onClose, 
  onScan, 
  isContinuous = false,
  status = null 
}: BarcodeScannerProps) {
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const [internalSuccess, setInternalSuccess] = useState<string | null>(null);
  const [internalError, setInternalError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const stopScanner = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (err) {
        console.error("Failed to stop scanner", err);
      }
    }
  };

  // Sync internal UI with parent status if provided
  useEffect(() => {
    if (status) {
      if (status.type === 'success') {
        setInternalSuccess(status.message);
        setInternalError(null);
        if (!isContinuous) {
           setTimeout(onClose, 1200);
        } else {
           setTimeout(() => setInternalSuccess(null), 1500);
        }
      } else {
        setInternalError(status.message);
        setInternalSuccess(null);
        // Clear error after a delay to allow next scan
        setTimeout(() => setInternalError(null), 2000);
      }
    }
  }, [status, isContinuous]);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setInternalSuccess(null);
      setInternalError(null);
      setLastScanned(null);
      setIsInitializing(true);

      const startScanner = async () => {
        try {
          const html5QrCode = new Html5Qrcode("reader");
          html5QrCodeRef.current = html5QrCode;

          const config = {
            fps: 15,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            formatsToSupport: [
              Html5QrcodeSupportedFormats.QR_CODE,
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODE_39,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
            ]
          };

          await html5QrCode.start(
            { facingMode: "environment" },
            config,
            (decodedText) => {
              if (isContinuous && decodedText === lastScanned) return; 
              if (internalSuccess || internalError) return; // Prevent scanning while showing feedback

              setLastScanned(decodedText);
              onScan(decodedText);
              
              // If status prop is NOT used, we fallback to internal basic success
              if (!status) {
                setInternalSuccess(decodedText);
                if (isContinuous) {
                  setTimeout(() => setInternalSuccess(null), 1500);
                } else {
                  setTimeout(() => onClose(), 1000);
                }
              }
            },
            () => {}
          );
          setIsInitializing(false);
        } catch (err: any) {
          console.error("Error starting scanner:", err);
          setError(err?.message || "Could not access camera. Please check permissions.");
          setIsInitializing(false);
        }
      };

      // Small delay to ensure the "reader" element is in the DOM
      const timer = setTimeout(startScanner, 300);
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            className="bg-white rounded-[3rem] overflow-hidden shadow-2xl max-w-md w-full border border-blue-100"
          >
            {/* Header */}
            <div className="p-8 pb-2 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                  <Camera className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight leading-none mb-1">Optic Engine</h3>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">System Active</p>
                  </div>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-3 hover:bg-slate-100 rounded-2xl transition-all text-slate-400 active:scale-90"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-8 pt-6 relative">
              <div className={cn(
                "relative rounded-[2.5rem] overflow-hidden border-8 border-slate-900 bg-slate-100 aspect-square shadow-inner transition-all",
                internalSuccess && "border-emerald-500",
                internalError && "border-rose-500"
              )}>
                <div id="reader" className="w-full h-full object-cover [&>video]:object-cover overflow-hidden"></div>
                
                {/* State Overlays */}
                {isInitializing && !error && (
                  <div className="absolute inset-0 bg-slate-50 flex flex-col items-center justify-center gap-4 z-30">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Warming Up Optics...</p>
                  </div>
                )}

                {error && (
                  <div className="absolute inset-0 bg-red-50 flex flex-col items-center justify-center p-8 text-center gap-4 z-30">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                      <AlertCircle className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-red-900 uppercase tracking-tight mb-2">Sensor Connection Failed</p>
                      <p className="text-xs text-red-600 font-medium leading-relaxed">{error}</p>
                    </div>
                    <button 
                      onClick={() => window.location.reload()}
                      className="px-6 py-2 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-100"
                    >
                      Refresh Module
                    </button>
                  </div>
                )}
                
                {/* Scanning Frame Overlay */}
                {!error && !internalSuccess && !internalError && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-10">
                    {/* Corners */}
                    <div className="absolute top-12 left-12 w-12 h-12 border-t-4 border-l-4 border-blue-500 rounded-tl-2xl opacity-80"></div>
                    <div className="absolute top-12 right-12 w-12 h-12 border-t-4 border-r-4 border-blue-500 rounded-tr-2xl opacity-80"></div>
                    <div className="absolute bottom-12 left-12 w-12 h-12 border-b-4 border-l-4 border-blue-500 rounded-bl-2xl opacity-80"></div>
                    <div className="absolute bottom-12 right-12 w-12 h-12 border-b-4 border-r-4 border-blue-500 rounded-br-2xl opacity-80"></div>
                    
                    {/* Scanning Line Animation */}
                    <motion.div 
                      animate={{ top: ['20%', '80%', '20%'] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute left-[20%] right-[20%] h-1 bg-blue-400/50 shadow-[0_0_20px_rgba(37,99,235,0.8)]"
                    />

                    <div className="absolute bottom-16 text-center">
                       <p className="text-[10px] font-black text-white uppercase tracking-[0.3em] drop-shadow-md">Scan Code</p>
                    </div>
                  </div>
                )}

                {/* Success Overlay */}
                <AnimatePresence>
                  {internalSuccess && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-emerald-500/90 flex items-center justify-center z-40 backdrop-blur-md"
                    >
                      <div className="text-center text-white space-y-6 p-8">
                         <motion.div 
                           initial={{ scale: 0, rotate: -45 }}
                           animate={{ scale: 1, rotate: 0 }}
                           className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto shadow-2xl"
                         >
                            <Check className="w-12 h-12 text-emerald-500 stroke-[5]" />
                         </motion.div>
                         <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-60">Verified SKU</p>
                            <p className="text-3xl font-black tracking-tighter leading-none">{internalSuccess}</p>
                         </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Error Overlay */}
                <AnimatePresence>
                  {internalError && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-rose-500/90 flex items-center justify-center z-40 backdrop-blur-md"
                    >
                      <div className="text-center text-white space-y-6 p-8">
                         <motion.div 
                           initial={{ scale: 0, rotate: 45 }}
                           animate={{ scale: 1, rotate: 0 }}
                           className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto shadow-2xl"
                         >
                            <X className="w-12 h-12 text-rose-500 stroke-[5]" />
                         </motion.div>
                         <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-60">Scan Failed</p>
                            <p className="text-2xl font-black tracking-tighter leading-tight">{internalError}</p>
                         </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Tips */}
              <div className="mt-8 flex gap-4 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                 <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center shrink-0">
                    <Info className="w-5 h-5 text-blue-600" />
                 </div>
                 <div>
                    <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] mb-1">Scanning Advice</h4>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                      Hold your device steady about <span className="text-slate-900 font-bold">15cm</span> from the code. Ensure there is plenty of light on the surface.
                    </p>
                 </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-center">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em]">System Protocol • V2.0.4</p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
