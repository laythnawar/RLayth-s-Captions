import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, Download, Copy, Save, Trash2, Upload } from 'lucide-react';
import { get, set } from 'idb-keyval';

const Logo = () => (
  <img 
    src="https://image2url.com/r2/default/images/1774726434455-d377c9e5-a027-4811-8a44-dd15b86cce3a.png" 
    alt="RLayth Logo" 
    className="w-10 h-10 object-cover rounded-md shadow-sm" 
    crossOrigin="anonymous"
  />
);

const createMeme = async (imageUrl: string, caption: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!imageUrl.startsWith('data:')) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('No 2d context');
        
        const width = img.width || 800;
        const height = img.height || 600;
        
        if (!caption || caption.trim() === '') {
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/png'));
          return;
        }

        const fontSize = Math.max(24, Math.floor(width / 10));
        const fontString = `bold ${fontSize}px Arial, sans-serif`;
        ctx.font = fontString;
        
        const padding = Math.max(20, Math.floor(width / 15));
        const maxWidth = width - padding * 2;
        
        const paragraphs = caption.split('\n');
        const lines: string[] = [];
        
        paragraphs.forEach(paragraph => {
          if (paragraph.trim() === '') {
            lines.push('');
            return;
          }
          const words = paragraph.split(' ');
          let line = '';
          for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;
            if (testWidth > maxWidth && n > 0) {
              lines.push(line.trim());
              line = words[n] + ' ';
            } else {
              line = testLine;
            }
          }
          lines.push(line.trim());
        });
        
        const lineHeight = fontSize * 1.2;
        const textBlockHeight = lines.length * lineHeight;
        const topAreaHeight = textBlockHeight + padding * 2;
        
        canvas.width = width;
        canvas.height = height + topAreaHeight;
        
        ctx.font = fontString;
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        lines.forEach((line, i) => {
          ctx.fillText(line, width / 2, padding + i * lineHeight);
        });
        
        ctx.drawImage(img, 0, topAreaHeight, width, height);
        
        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    try {
      img.src = imageUrl;
    } catch (err) {
      reject(err);
    }
  });
};

function MainApp() {
  const [history, setHistory] = useState<any[]>([]);
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [currentCaption, setCurrentCaption] = useState('My honest reaction when\nsomeone asks me what\nkinda music I like');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    get('meme_history').then((saved) => {
      if (saved && Array.isArray(saved)) {
        setHistory(saved);
      }
      setIsHistoryLoaded(true);
    }).catch(e => {
      console.error('Failed to load history from IndexedDB', e);
      setIsHistoryLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (isHistoryLoaded) {
      set('meme_history', history).catch(e => {
        console.error('Failed to save history to IndexedDB', e);
        alert('Failed to save to dashboard. Storage might be full.');
      });
    }
  }, [history, isHistoryLoaded]);

  useEffect(() => {
    if (!currentImage) {
      setPreviewUrl(null);
      return;
    }
    const updatePreview = async () => {
      try {
        const url = await createMeme(currentImage, currentCaption);
        setPreviewUrl(url);
      } catch (e) {
        console.error(e);
      }
    };
    const timer = setTimeout(updatePreview, 100);
    return () => clearTimeout(timer);
  }, [currentImage, currentCaption]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCurrentImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCopy = async () => {
    if (!previewUrl) return;
    try {
      const res = await fetch(previewUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);
      alert('Copied to clipboard!');
    } catch (e: any) {
      alert('Failed to copy: ' + e.message);
    }
  };

  const handleDownload = () => {
    if (!previewUrl) return;
    const a = document.createElement('a');
    a.href = previewUrl;
    a.download = `captioned-${Date.now()}.png`;
    a.click();
  };

  const handleSaveToDashboard = () => {
    if (!previewUrl) return;
    const newItem = {
      id: Date.now().toString(),
      previewUrl,
      timestamp: Date.now()
    };
    setHistory([newItem, ...history]);
  };

  const handleDelete = (id: string) => {
    setHistory(history.filter(h => h.id !== id));
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold flex items-center gap-3">
            <Logo />
            RLayth's Captions
          </h1>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Dashboard</h2>
          {history.length === 0 ? (
            <p className="text-sm text-gray-400">No captions saved yet.</p>
          ) : (
            history.map(item => (
              <div key={item.id} className="group relative rounded-lg overflow-hidden border border-gray-200 shadow-sm bg-gray-100">
                <img src={item.previewUrl} alt="Saved caption" className="w-full h-auto block" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button onClick={() => {
                    const a = document.createElement('a');
                    a.href = item.previewUrl;
                    a.download = `captioned-${item.timestamp}.png`;
                    a.click();
                  }} className="p-2 bg-white rounded-full text-gray-900 hover:bg-gray-100" title="Download">
                    <Download className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="p-2 bg-white rounded-full text-red-600 hover:bg-red-50" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className="flex-1 overflow-y-auto p-8 flex justify-center">
          <div className="max-w-3xl w-full space-y-8">
            
            {/* Controls */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-6">
              
              {/* Image Source */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Upload Image</label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-2 text-gray-500" />
                      <p className="text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                    </div>
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                  </label>
                </div>
              </div>

              {/* Caption Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Caption Text</label>
                <textarea 
                  value={currentCaption}
                  onChange={(e) => setCurrentCaption(e.target.value)}
                  placeholder="Enter your caption here..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none h-24"
                />
              </div>

            </div>

            {/* Preview Area */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col items-center">
              <div className="w-full flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Preview</h2>
                <div className="flex gap-2">
                  <button 
                    onClick={handleCopy}
                    disabled={!previewUrl}
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Copy className="w-4 h-4" /> Copy
                  </button>
                  <button 
                    onClick={handleDownload}
                    disabled={!previewUrl}
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" /> Export
                  </button>
                  <button 
                    onClick={handleSaveToDashboard}
                    disabled={!previewUrl}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" /> Save to Dashboard
                  </button>
                </div>
              </div>
              
              <div className="w-full max-w-2xl bg-gray-100 rounded-lg border border-gray-200 min-h-[400px] flex items-center justify-center overflow-hidden">
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="max-w-full max-h-[600px] object-contain shadow-md" />
                ) : (
                  <p className="text-gray-400 text-sm">Upload or generate an image to see preview</p>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return <MainApp />;
}
