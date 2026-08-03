import { QRCodeCanvas } from 'qrcode.react';
import { Download } from 'lucide-react';
import { toast } from '@/lib/toast';

// qrcode.react v4 exposes named exports (QRCodeCanvas / QRCodeSVG) — there is
// no default export and no `renderAs` prop. QRCodeCanvas forwards `id` onto the
// underlying <canvas>, which we grab to export a PNG.
export default function QrCodePanel({ label, url }) {
  // Deterministic, DOM-safe id derived from the encoded url.
  const canvasId = `qr-canvas-${btoa(unescape(encodeURIComponent(url))).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16)}`;

  const downloadQr = () => {
    const canvas = document.getElementById(canvasId);
    if (!canvas) { toast.stop('Could not find QR canvas.'); return; }
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `azaman-qr-${label.replace(/\s+/g, '-').toLowerCase()}.png`;
    a.click();
    toast.go('QR code downloaded');
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-[#0a0a12] border border-[#1e1e2e] rounded-2xl">
      <div className="bg-[var(--f-surface)] p-2 rounded-xl flex-shrink-0">
        <QRCodeCanvas
          id={canvasId}
          value={url}
          size={100}
          bgColor="#ffffff"
          fgColor="#0a0a12"
          level="M"
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#e8e8f0] truncate">{label}</p>
        <p className="text-xs text-[#4a4a6a] truncate mt-0.5 font-mono">{url}</p>
        <button
          onClick={downloadQr}
          className="mt-2 flex items-center gap-1.5 text-xs text-[#00d97e] hover:text-[#00b870] transition-colors"
        >
          <Download className="w-3 h-3" /> Download PNG
        </button>
      </div>
    </div>
  );
}
