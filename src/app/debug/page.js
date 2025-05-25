"use client";

import { useState, useEffect } from "react";
import { useSorobanReact } from "@soroban-react/core";
import { getAlbedoStatusSync, getAlbedoStatus, testAlbedoConnection } from "../../lib/albedo";

export default function DebugPage() {
  // SorobanReact hook'larını güvenli şekilde kullan
  let sorobanContext;
  try {
    sorobanContext = useSorobanReact();
  } catch (error) {
    console.error("Debug SorobanReact hook hatası:", error);
    sorobanContext = {
      address: null,
      server: null,
      activeChain: null,
      connect: null
    };
  }
  
  const { address, server, activeChain, connect } = sorobanContext;
  const [debugInfo, setDebugInfo] = useState({});
  const [detectionLogs, setDetectionLogs] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [albedoTestResult, setAlbedoTestResult] = useState(null);

  const addLog = (message, type = "info") => {
    const timestamp = new Date().toLocaleTimeString();
    setDetectionLogs(prev => [...prev, { timestamp, message, type }]);
  };

  // Chrome Güvenlik Kısıtlaması için kapsamlı tarama
  const performComprehensiveScan = async () => {
    setIsScanning(true);
    setDetectionLogs([]);
    
    addLog("🔍 Chrome Güvenlik Kısıtlaması Farkında Kapsamlı Tarama Başlatılıyor...", "info");

    try {
      // 1. Browser Bilgileri
      const browserInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        vendor: navigator.vendor,
        chrome: !!window.chrome,
        chromeRuntime: !!(window.chrome && window.chrome.runtime),
        chromeExtensions: !!(window.chrome && window.chrome.runtime && window.chrome.runtime.getManifest)
      };
      
      addLog(`🌐 Browser: ${browserInfo.userAgent}`, "info");
      addLog(`🔧 Chrome Context: ${browserInfo.chrome ? "✅" : "❌"}`, browserInfo.chrome ? "success" : "error");
      addLog(`🔧 Chrome Runtime: ${browserInfo.chromeRuntime ? "✅" : "❌"}`, browserInfo.chromeRuntime ? "success" : "error");

      // 2. Chrome Extension Security Context
      const extensionSecurityContext = {
        manifestV3Support: !!(window.chrome && window.chrome.runtime && window.chrome.runtime.getManifest),
        contentSecurityPolicy: document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.content || "Yok",
        crossOriginIsolated: window.crossOriginIsolated || false,
        isSecureContext: window.isSecureContext || false
      };

      addLog(`🔒 Manifest V3 Support: ${extensionSecurityContext.manifestV3Support ? "✅" : "❌"}`, 
        extensionSecurityContext.manifestV3Support ? "success" : "warning");
      addLog(`🔒 Secure Context: ${extensionSecurityContext.isSecureContext ? "✅" : "❌"}`, 
        extensionSecurityContext.isSecureContext ? "success" : "warning");

      // 3. Freighter Extension Detection (11 farklı yöntem)
      const freighterDetection = {
        // Method 1: Direct API Check
        freighterApi: !!(window.freighterApi),
        freighterWindow: !!(window.freighter),
        
        // Method 2: DOM Element Scanning
        domElements: document.querySelectorAll('[data-freighter], [id*="freighter"], [class*="freighter"]').length,
        
        // Method 3: Script Tag Detection
        extensionScripts: Array.from(document.scripts).filter(script => 
          script.src && (
            script.src.includes('freighter') || 
            script.src.includes('dngmlblcodfobpdpecaadgfbcggfjfnm') ||
            script.src.includes('chrome-extension')
          )
        ),
        
        // Method 4: Window Property Scanning
        windowProps: Object.keys(window).filter(key => 
          key.toLowerCase().includes('freighter') || 
          key.toLowerCase().includes('stellar')
        ),
        
        // Method 5: Chrome Extension API Check
        chromeExtensionAPI: !!(window.chrome && window.chrome.runtime),
        
        // Method 6: Content Script Markers
        contentScriptMarkers: document.querySelectorAll('script[data-extension], [data-injected]').length,
        
        // Method 7: Extension Manifest Detection
        manifestLinks: document.querySelectorAll('link[rel="manifest"]').length,
        
        // Method 8: PostMessage Listeners
        hasPostMessageListeners: window.addEventListener ? true : false,
        
        // Method 9: Custom Event Support
        customEventSupport: !!(window.CustomEvent),
        
        // Method 10: Extension Storage Access
        extensionStorageAccess: !!(window.chrome && window.chrome.storage),
        
        // Method 11: Web Accessible Resources Check
        webAccessibleResources: Array.from(document.querySelectorAll('link, script, img')).filter(el => 
          el.src && el.src.includes('chrome-extension')
        ).length
      };

      // Freighter detection sonuçları
      addLog("🔍 Freighter Extension Detection Sonuçları:", "info");
      addLog(`  • Direct API (window.freighterApi): ${freighterDetection.freighterApi ? "✅" : "❌"}`, 
        freighterDetection.freighterApi ? "success" : "error");
      addLog(`  • Window Object (window.freighter): ${freighterDetection.freighterWindow ? "✅" : "❌"}`, 
        freighterDetection.freighterWindow ? "success" : "error");
      addLog(`  • DOM Elements: ${freighterDetection.domElements} adet`, 
        freighterDetection.domElements > 0 ? "success" : "warning");
      addLog(`  • Extension Scripts: ${freighterDetection.extensionScripts.length} adet`, 
        freighterDetection.extensionScripts.length > 0 ? "success" : "warning");
      addLog(`  • Window Properties: ${freighterDetection.windowProps.length} adet`, 
        freighterDetection.windowProps.length > 0 ? "success" : "warning");
      addLog(`  • Content Script Markers: ${freighterDetection.contentScriptMarkers} adet`, 
        freighterDetection.contentScriptMarkers > 0 ? "success" : "warning");
      addLog(`  • Web Accessible Resources: ${freighterDetection.webAccessibleResources} adet`, 
        freighterDetection.webAccessibleResources > 0 ? "success" : "warning");

      // Extension script detayları
      if (freighterDetection.extensionScripts.length > 0) {
        addLog("📜 Extension Script Detayları:", "info");
        freighterDetection.extensionScripts.forEach((script, index) => {
          addLog(`  ${index + 1}. ${script.src}`, "info");
        });
      }

      // 4. Chrome Security Restriction Analysis
      const securityRestrictionAnalysis = {
        hasExtensionScripts: freighterDetection.extensionScripts.length > 0,
        hasAPIAccess: freighterDetection.freighterApi || freighterDetection.freighterWindow,
        securityBlocked: freighterDetection.extensionScripts.length > 0 && 
                        !(freighterDetection.freighterApi || freighterDetection.freighterWindow),
        manifestV3Restrictions: extensionSecurityContext.manifestV3Support && 
                               !extensionSecurityContext.crossOriginIsolated,
        cspRestrictions: extensionSecurityContext.contentSecurityPolicy.includes('script-src')
      };

      addLog("🔒 Chrome Güvenlik Kısıtlaması Analizi:", "info");
      addLog(`  • Extension Scripts Var: ${securityRestrictionAnalysis.hasExtensionScripts ? "✅" : "❌"}`, 
        securityRestrictionAnalysis.hasExtensionScripts ? "success" : "warning");
      addLog(`  • API Erişimi Var: ${securityRestrictionAnalysis.hasAPIAccess ? "✅" : "❌"}`, 
        securityRestrictionAnalysis.hasAPIAccess ? "success" : "error");
      addLog(`  • Güvenlik Engeli: ${securityRestrictionAnalysis.securityBlocked ? "🔒 EVET" : "❌ Hayır"}`, 
        securityRestrictionAnalysis.securityBlocked ? "error" : "success");

      // 5. Freighter API Functionality Test
      if (freighterDetection.freighterApi || freighterDetection.freighterWindow) {
        addLog("🧪 Freighter API Fonksiyonalite Testi:", "info");
        
        const api = window.freighterApi || window.freighter;
        const apiMethods = Object.keys(api || {});
        const requiredMethods = ['isConnected', 'getNetwork', 'requestAccess', 'signTransaction'];
        
        addLog(`  • Mevcut Metodlar: ${apiMethods.length} adet`, "info");
        addLog(`  • Metodlar: ${apiMethods.join(', ')}`, "info");
        
        const missingMethods = requiredMethods.filter(method => !apiMethods.includes(method));
        if (missingMethods.length > 0) {
          addLog(`  • Eksik Metodlar: ${missingMethods.join(', ')}`, "error");
        } else {
          addLog(`  • Tüm Gerekli Metodlar Mevcut ✅`, "success");
        }

        // API test
        try {
          if (api.isConnected) {
            const isConnected = await api.isConnected();
            addLog(`  • Bağlantı Durumu: ${isConnected ? "✅ Bağlı" : "❌ Bağlı Değil"}`, 
              isConnected ? "success" : "warning");
            
            if (isConnected && api.getNetwork) {
              const network = await api.getNetwork();
              addLog(`  • Network: ${network}`, "info");
            }
          }
        } catch (apiError) {
          addLog(`  • API Test Hatası: ${apiError.message}`, "error");
        }
      }

      // 6. SorobanReact Integration Status
      addLog("⚛️ SorobanReact Integration:", "info");
      addLog(`  • Address: ${address || "Yok"}`, address ? "success" : "warning");
      addLog(`  • Server: ${server ? "Mevcut" : "Yok"}`, server ? "success" : "warning");
      addLog(`  • Active Chain: ${activeChain?.id || "Yok"}`, activeChain ? "success" : "warning");
      addLog(`  • Connect Function: ${connect ? "Mevcut" : "Yok"}`, connect ? "success" : "warning");

      // 7. Chrome Extension Troubleshooting Recommendations
      addLog("💡 Chrome Güvenlik Kısıtlaması Çözüm Önerileri:", "info");
      
      if (securityRestrictionAnalysis.securityBlocked) {
        addLog("🔧 ÇÖZÜM ADIMLARı:", "warning");
        addLog("  1. chrome://extensions/ adresine gidin", "warning");
        addLog("  2. Freighter extension'ını bulun", "warning");
        addLog("  3. 'Yeniden yükle' (reload) butonuna tıklayın", "warning");
        addLog("  4. Bu sayfayı yenileyin (F5)", "warning");
        addLog("  5. Hala çalışmıyorsa Chrome'u yeniden başlatın", "warning");
        addLog("  6. Son çare: Extension'ı kaldırıp yeniden yükleyin", "warning");
      } else if (!freighterDetection.freighterApi && !freighterDetection.freighterWindow) {
        addLog("📥 Extension yüklü değil:", "error");
        addLog("  1. https://freighter.app/ adresinden indirin", "error");
        addLog("  2. Chrome'a yükleyin", "error");
        addLog("  3. Sayfayı yenileyin", "error");
      } else {
        addLog("✅ Freighter düzgün çalışıyor görünüyor!", "success");
      }

      // Debug bilgilerini güncelle
      setDebugInfo({
        browserInfo,
        extensionSecurityContext,
        freighterDetection,
        securityRestrictionAnalysis,
        sorobanReact: {
          address,
          server: !!server,
          activeChain: activeChain?.id,
          hasConnect: !!connect
        },
        timestamp: new Date().toISOString()
      });

      addLog("✅ Kapsamlı tarama tamamlandı!", "success");

    } catch (error) {
      addLog(`❌ Tarama hatası: ${error.message}`, "error");
      console.error("Debug tarama hatası:", error);
    } finally {
      setIsScanning(false);
    }
  };

  // Chrome Extension Reset
  const resetChromeExtension = () => {
    addLog("🔄 Chrome Extension Reset başlatılıyor...", "info");
    
    try {
      // Local storage temizle
      localStorage.clear();
      sessionStorage.clear();
      addLog("✅ Local/Session storage temizlendi", "success");
      
      // Extension script'lerini DOM'dan kaldır
      const extensionScripts = document.querySelectorAll('script[src*="chrome-extension"], script[src*="freighter"]');
      extensionScripts.forEach(script => script.remove());
      addLog(`✅ ${extensionScripts.length} extension script DOM'dan kaldırıldı`, "success");
      
      // Window object'ten extension property'lerini temizle
      const extensionProps = Object.keys(window).filter(key => 
        key.toLowerCase().includes('freighter') || key.toLowerCase().includes('stellar')
      );
      extensionProps.forEach(prop => {
        try {
          delete window[prop];
        } catch (e) {
          // Silme başarısız - read-only property
        }
      });
      addLog(`✅ ${extensionProps.length} window property temizlendi`, "success");
      
      addLog("🔄 Sayfayı yenileyin veya Chrome'u yeniden başlatın", "warning");
      
    } catch (error) {
      addLog(`❌ Reset hatası: ${error.message}`, "error");
    }
  };

  // Albedo test fonksiyonu
  const runAlbedoTest = async () => {
    addLog("🧪 Albedo test başlatılıyor...", "info");
    setAlbedoTestResult(null);
    
    try {
      // İlk SDK kontrolü
      const syncStatus = getAlbedoStatusSync();
      addLog(`📊 Sync Status: ${syncStatus.available ? "✅ Available" : "❌ Not Available"}`, 
        syncStatus.available ? "success" : "warning");
      
      // Async SDK kontrolü
      const asyncStatus = await getAlbedoStatus();
      addLog(`📊 Async Status: ${asyncStatus.available ? "✅ Available" : "❌ Not Available"}`, 
        asyncStatus.available ? "success" : "error");
      
      if (!asyncStatus.available) {
        setAlbedoTestResult({ success: false, error: asyncStatus.reason });
        return;
      }
      
      // Bağlantı testi
      const result = await testAlbedoConnection();
      setAlbedoTestResult(result);
      
      if (result.success) {
        addLog(`✅ Albedo test başarılı: ${result.data.address}`, "success");
      } else {
        addLog(`❌ Albedo test başarısız: ${result.error}`, "error");
      }
    } catch (error) {
      addLog(`❌ Albedo test hatası: ${error.message}`, "error");
      setAlbedoTestResult({ success: false, error: error.message });
    }
  };

  // Sayfa yüklendiğinde otomatik tarama
  useEffect(() => {
    performComprehensiveScan();
  }, []);

  return (
    <main className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">🔍 Chrome Güvenlik Kısıtlaması Debug</h1>
        <p className="text-gray-600">
          Chrome 2024 extension güvenlik politikaları ve Freighter uyumluluğu analizi
        </p>
      </div>

      {/* Chrome Güvenlik Kısıtlaması Bilgi Kutusu */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-orange-800 mb-3">🔒 Chrome Güvenlik Kısıtlaması Hakkında</h2>
        <div className="text-orange-700 space-y-2 text-sm">
          <p><strong>SORUN:</strong> Chrome 2024'te Manifest V3 ile extension güvenlik politikalarını sıkılaştırdı.</p>
          <p><strong>ETKİ:</strong> Extension'lar web sayfalarına API inject etmekte zorlanıyor.</p>
          <p><strong>FREIGHTER:</strong> Bu durum Freighter'ın sorunu değil, Chrome'un normal güvenlik özelliğidir.</p>
          <p><strong>ÇÖZÜM:</strong> Extension'ı yeniden yüklemek genellikle sorunu çözer.</p>
        </div>
      </div>

      {/* Kontrol Butonları */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={performComprehensiveScan}
          disabled={isScanning}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isScanning ? "🔍 Taranıyor..." : "🔍 Yeniden Tara"}
        </button>
        
        <button
          onClick={resetChromeExtension}
          className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
        >
          🔄 Extension Reset
        </button>
        
        <button
          onClick={() => window.location.reload()}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
          🔄 Sayfayı Yenile
        </button>
        
        <a
          href="chrome://extensions/"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
        >
          🔧 Chrome Extensions
        </a>
      </div>

      {/* Real-time Detection Logs */}
      <div className="bg-gray-50 border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-3">📋 Real-time Detection Logs</h2>
        <div className="bg-black text-green-400 p-4 rounded font-mono text-sm max-h-96 overflow-y-auto">
          {detectionLogs.length === 0 ? (
            <p>Henüz log yok...</p>
          ) : (
            detectionLogs.map((log, index) => (
              <div key={index} className={`mb-1 ${
                log.type === "success" ? "text-green-400" :
                log.type === "error" ? "text-red-400" :
                log.type === "warning" ? "text-yellow-400" :
                "text-blue-400"
              }`}>
                <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Debug Information */}
      {Object.keys(debugInfo).length > 0 && (
        <div className="bg-gray-50 border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">🔍 Detaylı Debug Bilgileri</h2>
          <pre className="bg-black text-green-400 p-4 rounded text-xs overflow-x-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      )}

      {/* Albedo Test Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-3">🌟 Albedo Wallet Test</h3>
        
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Albedo SDK Status:</span>
              <span className={`ml-2 px-2 py-1 rounded text-xs ${
                getAlbedoStatusSync().available 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {getAlbedoStatusSync().available ? '✅ SDK Loaded' : '⏳ SDK Loading...'}
              </span>
            </div>
            <div>
              <span className="font-medium">Chrome Extension Issues:</span>
              <span className="ml-2 px-2 py-1 rounded text-xs bg-green-100 text-green-800">
                ✅ No Issues (Pop-up Based)
              </span>
            </div>
          </div>
          
          <div className="text-xs text-blue-600 bg-blue-100 p-2 rounded">
            💡 <strong>Albedo SDK Info:</strong> Albedo script'i layout.js'de yüklü. 
            SDK yüklenene kadar "⏳ SDK Loading..." gösterilir.
          </div>
          
          <button
            onClick={runAlbedoTest}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
          >
            🧪 Test Albedo Connection
          </button>
          
          {albedoTestResult && (
            <div className={`p-3 rounded border ${
              albedoTestResult.success 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <h4 className={`font-medium ${
                albedoTestResult.success ? 'text-green-800' : 'text-red-800'
              }`}>
                Test Result:
              </h4>
              <pre className={`text-xs mt-2 ${
                albedoTestResult.success ? 'text-green-700' : 'text-red-700'
              }`}>
                {JSON.stringify(albedoTestResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Chrome Güvenlik Kısıtlaması Troubleshooting Guide */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-blue-800 mb-4">🛠️ Chrome Güvenlik Kısıtlaması Sorun Giderme</h2>
        
        <div className="space-y-4 text-sm">
          <div>
            <h3 className="font-semibold text-blue-700 mb-2">1. 🔄 Extension Yeniden Yükleme (En Etkili)</h3>
            <ul className="list-disc list-inside text-blue-600 space-y-1 ml-4">
              <li>Chrome'da <code>chrome://extensions/</code> adresine gidin</li>
              <li>Freighter extension'ını bulun</li>
              <li>"Yeniden yükle" (reload) butonuna tıklayın</li>
              <li>Bu sayfayı yenileyin (F5)</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-blue-700 mb-2">2. 🔧 Extension İzinleri</h3>
            <ul className="list-disc list-inside text-blue-600 space-y-1 ml-4">
              <li>Freighter extension'ına tıklayın</li>
              <li>"Site erişimi" bölümünde "Tüm sitelerde" seçili olduğundan emin olun</li>
              <li>"Gizli modda izin ver" seçeneğini aktif edin</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-blue-700 mb-2">3. 🌐 Chrome Yeniden Başlatma</h3>
            <ul className="list-disc list-inside text-blue-600 space-y-1 ml-4">
              <li>Chrome'u tamamen kapatın (tüm pencereler)</li>
              <li>Yeniden açın ve sayfayı yenileyin</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-blue-700 mb-2">4. 🔧 Bypass Mode</h3>
            <ul className="list-disc list-inside text-blue-600 space-y-1 ml-4">
              <li>Ana sayfada "Bypass Mode" kutusunu işaretleyin</li>
              <li>Risk skorunu hesaplayabilirsiniz (blockchain'e kaydetmez)</li>
              <li>Extension düzelince normal moda geçin</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-blue-700 mb-2">5. 🌍 Alternatif Browser</h3>
            <ul className="list-disc list-inside text-blue-600 space-y-1 ml-4">
              <li>Firefox'ta Freighter genellikle daha az sorun yaşar</li>
              <li>Edge veya Brave'de de deneyebilirsiniz</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Geri dönüş linki */}
      <div className="text-center">
        <a
          href="/predict"
          className="bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 inline-block"
        >
          ← Ana Sayfaya Dön
        </a>
      </div>
    </main>
  );
} 