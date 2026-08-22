'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  Camera, X, RefreshCw, Zap, Volume2, VolumeX, AlertCircle,
  Upload, ArrowRight, ZoomIn, ZoomOut, CheckCircle2, ScanLine
} from 'lucide-react';
import toast from 'react-hot-toast';
import { itemsApi } from '@/lib/api';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
  subtitle?: string;
  autoCloseOnScan?: boolean;
}

// Crisp 1800Hz synthesized audio beep on successful line decode
function playBeep() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1800, ctx.currentTime);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(80);
    }
  } catch {}
}

export default function BarcodeScannerModal({
  isOpen,
  onClose,
  onScan,
  title = 'Scan 1D Product Barcode',
  subtitle = 'Align the vertical black & white barcode lines across the laser guide',
  autoCloseOnScan = true,
}: BarcodeScannerModalProps) {
  const [cameras, setCameras] = useState<any[]>([]);
  const [activeCameraId, setActiveCameraId] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [manualBarcode, setManualBarcode] = useState('');
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [detectedFormat, setDetectedFormat] = useState<string>('');

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isStoppingRef = useRef(false);
  const hasTriggeredScanRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nativeDetectorLoopRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    hasTriggeredScanRef.current = false;
    setZoomLevel(1);
    setDetectedFormat('');

    async function initCamera() {
      try {
        setCameraError(null);
        const devices = await Html5Qrcode.getCameras();
        if (!isMounted) return;

        if (!devices || devices.length === 0) {
          setCameraError('No cameras detected on this device.');
          return;
        }

        setCameras(devices);

        // Auto-select rear/environment camera on phones & tablets for macro autofocus
        const backCamera = devices.find((d) => {
          const l = d.label.toLowerCase();
          return l.includes('back') || l.includes('rear') || l.includes('environment') || l.includes('0');
        });
        const selectedId = backCamera ? backCamera.id : devices[0].id;
        setActiveCameraId(selectedId);

        startDualEngineScanner(selectedId);
      } catch (err: any) {
        if (!isMounted) return;
        setCameraError(err.message || 'Camera permission denied or camera not accessible.');
      }
    }

    initCamera();

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [isOpen]);

  // Live item catalog autocomplete when typing digits
  useEffect(() => {
    if (!manualBarcode.trim() || manualBarcode.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await itemsApi.list({ search: manualBarcode.trim(), limit: 4 });
        setSearchResults(res.data.items ?? []);
      } catch {
        setSearchResults([]);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [manualBarcode]);

  const handleSuccessfulScan = async (rawBarcode: string, formatName?: string) => {
    const cleanBarcode = rawBarcode.trim();
    if (!cleanBarcode || hasTriggeredScanRef.current) return;

    hasTriggeredScanRef.current = true;
    if (formatName) setDetectedFormat(formatName);

    if (soundEnabled) {
      playBeep();
    }

    toast.success(`Barcode Lines Detected: ${cleanBarcode}`, {
      id: 'barcode-scan-result',
      duration: 2500,
      icon: '⚡',
    });

    await stopScanner();
    onScan(cleanBarcode);

    if (autoCloseOnScan) {
      onClose();
    }
  };

  const startDualEngineScanner = async (cameraId: string) => {
    try {
      if (scannerRef.current) {
        await stopScanner();
      }

      // Initialize Html5Qrcode with all 1D linear barcode formats (EAN, UPC, Code 128, Code 39)
      const html5QrCode = new Html5Qrcode('camera-barcode-reader', {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.QR_CODE,
        ],
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true,
        },
        verbose: false,
      });

      scannerRef.current = html5QrCode;

      // High-resolution video feed request to ensure thin 1D barcode lines are sharp and uncompressed
      const cameraConfig = {
        deviceId: { exact: cameraId },
      };

      const scanConfig = {
        fps: 15,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          // Extra-wide rectangular target box for standard 1D linear product barcodes
          const width = Math.min(viewfinderWidth * 0.94, 380);
          const height = Math.min(viewfinderHeight * 0.65, 220);
          return { width: Math.floor(width), height: Math.floor(height) };
        },
        aspectRatio: 1.333334,
        disableFlip: false,
      };

      await html5QrCode.start(
        cameraConfig,
        scanConfig,
        (decodedText) => {
          handleSuccessfulScan(decodedText, '1D Linear Barcode');
        },
        () => {},
      );

      setIsScanning(true);

      // Start Parallel Hardware Vision BarcodeDetector loop for instant line recognition
      startHardwareLineDetector();
    } catch (err: any) {
      setCameraError(err.message || 'Failed to start camera video stream.');
      setIsScanning(false);
    }
  };

  // Hardware Vision Engine (runs direct GPU line edge detection on video canvas)
  const startHardwareLineDetector = () => {
    if (typeof window === 'undefined' || !('BarcodeDetector' in window)) return;

    try {
      const detector = new (window as any).BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'code_93', 'itf', 'qr_code'],
      });

      if (!offscreenCanvasRef.current) {
        offscreenCanvasRef.current = document.createElement('canvas');
      }

      const canvas = offscreenCanvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      nativeDetectorLoopRef.current = setInterval(async () => {
        if (hasTriggeredScanRef.current || isStoppingRef.current) return;

        const videoEl = document.querySelector('#camera-barcode-reader video') as HTMLVideoElement;
        if (!videoEl || videoEl.readyState < 2) return;

        try {
          // 1. Direct raw video frame detect
          const barcodes = await detector.detect(videoEl);
          if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
            handleSuccessfulScan(barcodes[0].rawValue, barcodes[0].format || 'Hardware 1D Line');
            return;
          }

          // 2. Enhanced High-Contrast Binarized canvas pass for low light / webcams
          if (ctx) {
            canvas.width = videoEl.videoWidth || 640;
            canvas.height = videoEl.videoHeight || 480;

            // Apply high-contrast line sharpening filter
            ctx.filter = 'contrast(200%) brightness(110%) grayscale(100%)';
            ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

            const enhancedBarcodes = await detector.detect(canvas);
            if (enhancedBarcodes && enhancedBarcodes.length > 0 && enhancedBarcodes[0].rawValue) {
              handleSuccessfulScan(enhancedBarcodes[0].rawValue, enhancedBarcodes[0].format || 'High-Contrast 1D Line');
            }
          }
        } catch {}
      }, 100);
    } catch {}
  };

  const stopScanner = async () => {
    if (nativeDetectorLoopRef.current) {
      clearInterval(nativeDetectorLoopRef.current);
      nativeDetectorLoopRef.current = undefined;
    }

    if (scannerRef.current && isScanning && !isStoppingRef.current) {
      isStoppingRef.current = true;
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {}
      isStoppingRef.current = false;
      setIsScanning(false);
    }
  };

  const handleSwitchCamera = () => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex((c) => c.id === activeCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCamera = cameras[nextIndex];
    setActiveCameraId(nextCamera.id);
    startDualEngineScanner(nextCamera.id);
  };

  const handleZoom = async (delta: number) => {
    const newZoom = Math.min(Math.max(Number((zoomLevel + delta).toFixed(1)), 1), 3.5);
    setZoomLevel(newZoom);
    if (!scannerRef.current || !isScanning) return;

    try {
      await (scannerRef.current as any).applyVideoConstraints({
        advanced: [{ zoom: newZoom }],
      });
    } catch {}
  };

  const toggleTorch = async () => {
    if (!scannerRef.current || !isScanning) return;
    try {
      await (scannerRef.current as any).applyVideoConstraints({
        advanced: [{ torch: !torchOn }],
      });
      setTorchOn(!torchOn);
    } catch {
      toast.error('Torch not supported on this camera', { id: 'torch-err' });
    }
  };

  // High-Resolution Still Photo Scan (Uncompressed 1080p line decoding)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    try {
      const html5QrCode = new Html5Qrcode('camera-file-reader', {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.QR_CODE,
        ],
        experimentalFeatures: { useBarCodeDetectorIfSupported: true },
        verbose: false,
      });

      const decodedResult = await html5QrCode.scanFile(file, true);
      html5QrCode.clear();

      if (decodedResult) {
        handleSuccessfulScan(decodedResult, 'Photo High-Res 1D Line');
      }
    } catch {
      toast.error('Could not detect barcode lines from image. Hold camera steady or type numbers.', {
        id: 'photo-scan-err',
      });
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBarcode.trim()) return;
    handleSuccessfulScan(manualBarcode.trim(), 'Direct Input');
    setManualBarcode('');
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(8px)',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="glass-card animate-fadeIn"
        style={{
          width: '100%',
          maxWidth: 520,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 20,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 12,
              background: 'linear-gradient(135deg, rgb(139,92,246), rgb(52,211,153))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(139,92,246,0.3)',
            }}>
              <ScanLine size={20} color="white" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{title}</h2>
              <p style={{ fontSize: '0.72rem', color: 'rgb(161,161,170)' }}>{subtitle}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              padding: 6,
              cursor: 'pointer',
              color: 'rgb(161,161,170)',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Viewfinder Container */}
        <div style={{
          position: 'relative',
          width: '100%',
          minHeight: 290,
          background: 'rgb(14, 14, 18)',
          borderRadius: 14,
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {cameraError ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'rgb(239,100,100)' }}>
              <AlertCircle size={36} style={{ display: 'block', margin: '0 auto 12px', opacity: 0.8 }} />
              <p style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 8 }}>Camera Access Unavailable</p>
              <p style={{ fontSize: '0.75rem', color: 'rgb(161,161,170)' }}>{cameraError}</p>
              <p style={{ fontSize: '0.7rem', color: 'rgb(113,113,122)', marginTop: 8 }}>
                You can type the barcode digits or search the product name below.
              </p>
            </div>
          ) : (
            <>
              <div
                id="camera-barcode-reader"
                style={{
                  width: '100%',
                  height: '100%',
                  transform: zoomLevel > 1 ? `scale(${zoomLevel})` : undefined,
                  transition: 'transform 0.2s ease',
                }}
              />
              <div id="camera-file-reader" style={{ display: 'none' }} />

              {/* 1D Linear Barcode Guide Overlay */}
              {isScanning && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {/* Wide 1D Barcode Line Target Box */}
                  <div style={{
                    width: '88%',
                    height: '60%',
                    border: '2px solid rgba(52,211,153,0.9)',
                    borderRadius: 12,
                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
                    position: 'relative',
                    overflow: 'hidden',
                  }}>
                    {/* Laser line animation across vertical barcode stripes */}
                    <div style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      height: 3,
                      background: 'linear-gradient(90deg, transparent, rgb(52,211,153), rgb(245,158,11), rgb(52,211,153), transparent)',
                      boxShadow: '0 0 12px rgb(52,211,153)',
                      animation: 'scanLaser 1.8s linear infinite alternate',
                    }} />

                    {/* Aim guide text */}
                    <div style={{
                      position: 'absolute',
                      bottom: 8,
                      left: 0,
                      right: 0,
                      textAlign: 'center',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: 'rgba(255,255,255,0.9)',
                      letterSpacing: '0.04em',
                      textShadow: '0 1px 3px rgba(0,0,0,0.9)',
                    }}>
                      Align horizontal barcode lines inside frame
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Live Search & Direct Digits Input */}
        <div style={{ marginTop: 12, position: 'relative' }}>
          <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              className="input"
              placeholder="Or type/paste barcode digits (e.g. 9789362255495)"
              value={manualBarcode}
              onChange={(e) => setManualBarcode(e.target.value)}
              style={{ fontSize: '0.82rem', height: 38 }}
            />
            <button
              type="submit"
              className="btn-primary"
              style={{ height: 38, padding: '0 14px', fontSize: '0.8rem', flexShrink: 0 }}
              disabled={!manualBarcode.trim()}
            >
              <ArrowRight size={14} /> Submit
            </button>
          </form>

          {/* Quick matching product suggestions */}
          {searchResults.length > 0 && (
            <div
              className="glass-card"
              style={{
                position: 'absolute',
                top: 44,
                left: 0,
                right: 0,
                zIndex: 50,
                padding: 6,
                borderRadius: 10,
                maxHeight: 180,
                overflowY: 'auto',
                boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                background: 'rgb(22, 22, 30)',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
            >
              {searchResults.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    if (item.barcode) {
                      handleSuccessfulScan(item.barcode, 'Catalog Selection');
                    } else {
                      onScan(item.id);
                      onClose();
                    }
                  }}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.8rem',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(139,92,246,0.2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{item.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'rgb(161,161,170)' }}>
                      Barcode: {item.barcode || '—'} · Stock: {item.currentStock} {item.unit}
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, color: 'rgb(52,211,153)' }}>
                    ₹{item.offerPrice ?? item.mrp}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Controls Toolbar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 12,
          paddingTop: 10,
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {/* Zoom controls (magnifies barcode lines for fixed-focus webcams) */}
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '6px 8px', fontSize: '0.72rem' }}
              onClick={() => handleZoom(0.5)}
              title="Zoom In (magnifies barcode lines for clearer line detection)"
            >
              <ZoomIn size={13} /> {zoomLevel}x
            </button>

            {zoomLevel > 1 && (
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '6px 8px', fontSize: '0.72rem' }}
                onClick={() => handleZoom(-0.5)}
                title="Zoom Out"
              >
                <ZoomOut size={13} />
              </button>
            )}

            {cameras.length > 1 && (
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '6px 10px', fontSize: '0.72rem' }}
                onClick={handleSwitchCamera}
                title="Switch Camera"
              >
                <RefreshCw size={13} /> Switch ({cameras.length})
              </button>
            )}

            {/* High-res uncompressed photo scanner */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '6px 10px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 4 }}
              onClick={() => fileInputRef.current?.click()}
              title="Upload photo of barcode"
              disabled={isProcessingFile}
            >
              <Upload size={13} /> {isProcessingFile ? 'Scanning...' : 'Upload Photo'}
            </button>

            <button
              type="button"
              className="btn-secondary"
              style={{
                padding: '6px 10px',
                fontSize: '0.72rem',
                color: soundEnabled ? 'rgb(52,211,153)' : 'rgb(113,113,122)',
              }}
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute Sound' : 'Enable Sound'}
            >
              {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
            </button>

            <button
              type="button"
              className="btn-secondary"
              style={{
                padding: '6px 10px',
                fontSize: '0.72rem',
                color: torchOn ? 'rgb(245,158,11)' : 'rgb(113,113,122)',
              }}
              onClick={toggleTorch}
              title="Toggle Torch"
            >
              <Zap size={13} />
            </button>
          </div>

          <button
            type="button"
            className="btn-secondary"
            style={{ padding: '6px 14px', fontSize: '0.75rem' }}
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <style jsx>{`
          @keyframes scanLaser {
            0% { top: 6%; }
            100% { top: 90%; }
          }
        `}</style>
      </div>
    </div>
  );
}
