import React, { useState, useRef } from 'react';
import { Camera, Upload, Check, AlertCircle, Loader2, X, RefreshCw, FileText, Sparkles } from 'lucide-react';
import { CategoryName, Transaction, GeminiModelId, AVAILABLE_GEMINI_MODELS } from '../types';

interface ReceiptScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => void;
  selectedModel?: GeminiModelId;
}

const CATEGORIES: CategoryName[] = [
  'Alimentos & Supermercado',
  'Transporte & Movilidad',
  'Entretenimiento & Ocio',
  'Servicios & Hogar',
  'Salud & Bienestar',
  'Educación & Libros',
  'Ropa & Compras',
  'Restaurantes & Cafeterías',
  'Otros',
];

export const ReceiptScannerModal: React.FC<ReceiptScannerModalProps> = ({
  isOpen,
  onClose,
  onAddTransaction,
  selectedModel = 'gemini-3.8-flash',
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const modelMeta = AVAILABLE_GEMINI_MODELS.find((m) => m.id === selectedModel) || AVAILABLE_GEMINI_MODELS[0];

  // Extracted fields for review/editing
  const [extractedData, setExtractedData] = useState<{
    fecha: string;
    concepto: string;
    cantidad: number;
    categoria: CategoryName;
    comercio: string;
    desglose?: string[];
    notas?: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Por favor selecciona una imagen válida (JPG, PNG, WebP).');
      return;
    }

    setMimeType(file.type);
    setError(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setImagePreview(base64);
      analyzeReceipt(base64, file.type);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      setError('Por favor arrastra una imagen válida.');
      return;
    }
    setMimeType(file.type);
    setError(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setImagePreview(base64);
      analyzeReceipt(base64, file.type);
    };
    reader.readAsDataURL(file);
  };

  const analyzeReceipt = async (base64String: string, type: string) => {
    setIsAnalyzing(true);
    setError(null);
    setExtractedData(null);

    try {
      const res = await fetch('/api/gemini/parse-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64String,
          mimeType: type,
          model: selectedModel,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'No fue posible extraer los datos del recibo.');
      }

      const data = json.data;
      const todayStr = new Date().toISOString().split('T')[0];

      // Match or fallback to a standard category
      let cat: CategoryName = 'Otros';
      if (CATEGORIES.includes(data.categoria)) {
        cat = data.categoria;
      } else if (data.categoria?.toLowerCase().includes('alimento') || data.categoria?.toLowerCase().includes('super')) {
        cat = 'Alimentos & Supermercado';
      } else if (data.categoria?.toLowerCase().includes('restaurante') || data.categoria?.toLowerCase().includes('café')) {
        cat = 'Restaurantes & Cafeterías';
      } else if (data.categoria?.toLowerCase().includes('transporte') || data.categoria?.toLowerCase().includes('gasolina')) {
        cat = 'Transporte & Movilidad';
      }

      setExtractedData({
        fecha: data.fecha || todayStr,
        concepto: data.concepto || data.comercio || 'Gasto de recibo',
        cantidad: typeof data.cantidad === 'number' ? data.cantidad : parseFloat(data.cantidad) || 0,
        categoria: cat,
        comercio: data.comercio || '',
        desglose: Array.isArray(data.desglose) ? data.desglose : [],
        notas: data.notas || '',
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al comunicarse con el modelo de visión financiera.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRetry = () => {
    if (imagePreview) {
      analyzeReceipt(imagePreview, mimeType);
    }
  };

  const handleConfirm = () => {
    if (!extractedData) return;
    if (extractedData.cantidad <= 0) {
      setError('La cantidad debe ser mayor a 0.');
      return;
    }

    onAddTransaction({
      date: extractedData.fecha,
      concept: extractedData.concepto,
      merchant: extractedData.comercio || extractedData.concepto,
      amount: extractedData.cantidad,
      category: extractedData.categoria,
      note: extractedData.notas || (extractedData.desglose?.length ? extractedData.desglose.join(', ') : undefined),
      rawSource: 'receipt',
      receiptImg: imagePreview || undefined,
    });

    handleReset();
    onClose();
  };

  const handleReset = () => {
    setImagePreview(null);
    setExtractedData(null);
    setError(null);
    setIsAnalyzing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div id="receipt-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div id="receipt-modal-card" className="bg-surface rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden my-8 transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-rule">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent text-white flex items-center justify-center shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-ink">Escanear Recibo con IA</h3>
                <span className="bg-accent-soft text-accent rounded-full px-2.5 py-1 text-[11px] font-medium">
                  {modelMeta.name}
                </span>
              </div>
              <p className="text-xs text-ink-muted">
                Extracción multimodal de fecha, concepto, cantidad y categorización
              </p>
            </div>
          </div>
          <button
            id="close-receipt-modal-btn"
            onClick={onClose}
            className="p-2 text-ink-muted hover:text-ink hover:bg-rule/50 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {!imagePreview ? (
            <div
              id="receipt-dropzone"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-rule hover:border-accent bg-paper hover:bg-accent-soft/40 rounded-2xl p-8 text-center cursor-pointer transition group"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              <div className="w-16 h-16 rounded-full bg-accent-soft text-accent flex items-center justify-center mx-auto mb-4 transition">
                <Upload className="w-7 h-7" />
              </div>
              <p className="font-medium text-ink mb-1">
                Haz clic para subir o arrastra la foto del recibo
              </p>
              <p className="text-xs text-ink-muted">
                Soporta tickets de supermercado, facturas, restaurantes, gasolineras (JPG, PNG, WebP)
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Preview image */}
              <div className="relative rounded-2xl overflow-hidden shadow-sm max-h-72 flex items-center justify-center bg-paper">
                <img
                  src={imagePreview}
                  alt="Recibo"
                  className="w-full h-full object-contain max-h-72"
                  referrerPolicy="no-referrer"
                />
                <button
                  id="reset-receipt-img-btn"
                  onClick={handleReset}
                  className="absolute top-2 right-2 bg-black/60 hover:bg-black/75 text-white p-1.5 rounded-lg text-xs flex items-center gap-1 transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Cambiar foto
                </button>
              </div>

              {/* Extraction State / Review Form */}
              <div className="flex flex-col justify-between">
                {isAnalyzing ? (
                  <div className="flex flex-col items-center justify-center h-full py-8 text-center space-y-3">
                    <Loader2 className="w-8 h-8 text-accent animate-spin" />
                    <p className="font-medium text-ink-muted text-sm">
                      Analizando recibo con {modelMeta.name}...
                    </p>
                    <p className="text-xs text-ink-muted max-w-xs">
                      Extrayendo fecha, establecimiento, desglose de montos y categorización conductual.
                    </p>
                  </div>
                ) : extractedData ? (
                  <div className="bg-surface rounded-2xl shadow-sm p-4 space-y-3 text-left">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-gain w-fit">
                      <Check className="w-3.5 h-3.5" /> Datos detectados con éxito
                    </div>

                    <div>
                      <label className="block text-xs text-ink-muted mb-1">Concepto / Tienda</label>
                      <input
                        type="text"
                        value={extractedData.concepto}
                        onChange={(e) => setExtractedData({ ...extractedData, concepto: e.target.value })}
                        className="w-full text-sm font-medium px-3 py-1.5 border border-rule bg-paper text-ink rounded-lg focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none transition"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-ink-muted mb-1">Monto Total ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={extractedData.cantidad}
                          onChange={(e) => setExtractedData({ ...extractedData, cantidad: parseFloat(e.target.value) || 0 })}
                          className="w-full text-sm font-mono font-bold text-ink px-3 py-1.5 border border-rule bg-paper rounded-lg focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none transition"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-ink-muted mb-1">Fecha</label>
                        <input
                          type="date"
                          value={extractedData.fecha}
                          onChange={(e) => setExtractedData({ ...extractedData, fecha: e.target.value })}
                          className="w-full text-sm px-3 py-1.5 border border-rule bg-paper text-ink rounded-lg focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-ink-muted mb-1">Categoría</label>
                      <select
                        value={extractedData.categoria}
                        onChange={(e) => setExtractedData({ ...extractedData, categoria: e.target.value as CategoryName })}
                        className="w-full text-sm px-3 py-1.5 border border-rule rounded-lg focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none bg-paper text-ink transition"
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat} className="bg-paper">{cat}</option>
                        ))}
                      </select>
                    </div>

                    {extractedData.desglose && extractedData.desglose.length > 0 && (
                      <div className="p-2.5 bg-paper rounded-lg">
                        <div className="text-[11px] text-ink-muted flex items-center gap-1 mb-1">
                          <FileText className="w-3 h-3" /> Ítems detectados
                        </div>
                        <p className="text-xs text-ink-muted line-clamp-2">
                          {extractedData.desglose.join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {error && (
            <div className="p-3.5 bg-loss/10 rounded-xl text-loss text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium block sm:inline mr-1">Aviso del servicio:</span>
                  <span>{error}</span>
                </div>
              </div>
              {imagePreview && !isAnalyzing && (
                <button
                  type="button"
                  id="retry-receipt-analysis-btn"
                  onClick={handleRetry}
                  className="px-3 py-1.5 bg-loss/10 text-loss hover:bg-loss/20 rounded-lg font-medium text-xs flex items-center justify-center gap-1.5 shrink-0 transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reintentar análisis
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-rule">
          <button
            id="cancel-receipt-btn"
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium bg-rule/50 hover:bg-rule text-ink-muted hover:text-ink rounded-lg transition cursor-pointer"
          >
            Cancelar
          </button>
          {extractedData && (
            <button
              id="confirm-receipt-btn"
              type="button"
              disabled={isAnalyzing || extractedData.cantidad <= 0}
              onClick={handleConfirm}
              className="px-5 py-2 text-sm font-medium text-white bg-accent hover:bg-accent/90 disabled:opacity-50 rounded-lg transition flex items-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" /> Guardar Transacción
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
