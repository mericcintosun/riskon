"use client";

import { useState, useEffect } from "react";
import { useSorobanReact } from "@soroban-react/core";
import { useRiskScore } from "../../lib/useRiskScore";
import { writeScore } from "../../lib/writeScore";
import { 
  isAlbedoAvailable, 
  connectAlbedo, 
  getAlbedoStatus, 
  writeScoreWithAlbedo,
  getExplorerUrl 
} from "../../lib/albedo";

export default function PredictPage() {
  /* ------------------------------------------------------------------
     1. CÜZDAN DURUMU - Freighter + Albedo Dual Support
     ------------------------------------------------------------------ */
  // SorobanReact hook'larını güvenli şekilde kullan
  let sorobanContext;
  try {
    sorobanContext = useSorobanReact();
  } catch (error) {
    console.error("SorobanReact hook hatası:", error);
    sorobanContext = {
      address: null,
      server: null,
      activeChain: null,
      connect: null
    };
  }
  
  const { address, server, activeChain, connect } = sorobanContext;
  const [freighterStatus, setFreighterStatus] = useState("checking");
  const [detectionAttempts, setDetectionAttempts] = useState(0);
  
  // Albedo state
  const [albedoStatus, setAlbedoStatus] = useState("checking");
  const [albedoAddress, setAlbedoAddress] = useState(null);
  const [walletMode, setWalletMode] = useState("auto"); // "freighter", "albedo", "auto"

  /* ------------------------------------------------------------------
     2. FORM STATE
     ------------------------------------------------------------------ */
  const [tx, setTx] = useState(""); // Son 30 günde işlem adedi
  const [hrs, setHrs] = useState(""); // İşlemler arası ort. saat
  const [kinds, setKinds] = useState(""); // Tutulan varlık çeşidi
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [bypassMode, setBypassMode] = useState(false); // Freighter bypass modu
  const [transactionHash, setTransactionHash] = useState(null); // Explorer link için

  // Albedo durumu kontrol et
  useEffect(() => {
    const checkAlbedoStatus = () => {
      const status = getAlbedoStatus();
      console.log("🔍 Albedo durumu:", status);
      
      if (status.available) {
        setAlbedoStatus("available");
      } else {
        setAlbedoStatus("not-installed");
      }
    };

    checkAlbedoStatus();
    
    // Periyodik kontrol
    const interval = setInterval(checkAlbedoStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  // Chrome Güvenlik Kısıtlaması için gelişmiş Freighter algılama
  useEffect(() => {
    const detectFreighterWithSecurityWorkaround = async () => {
      if (typeof window === 'undefined') {
        setFreighterStatus("unavailable");
        return;
      }

      console.log("🔍 Chrome güvenlik kısıtlaması farkında Freighter algılama başlatılıyor...");
      
      // 1. Hızlı API kontrolü
      let freighterApi = window.freighterApi || window.freighter;
      if (freighterApi && typeof freighterApi.isConnected === 'function') {
        console.log("✅ Freighter API hemen bulundu!");
        await validateFreighterConnection(freighterApi);
        return;
      }

      // 2. Chrome Extension Context Kontrolü
      const chromeExtensionContext = {
        hasChrome: typeof chrome !== 'undefined',
        hasRuntime: typeof chrome !== 'undefined' && !!chrome.runtime,
        hasExtensions: typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.getManifest
      };

      console.log("🔍 Chrome extension context:", chromeExtensionContext);

      // 3. DOM-based Extension Detection (Chrome güvenlik kısıtlaması için)
      const extensionIndicators = {
        // Extension script'leri
        extensionScripts: Array.from(document.scripts).filter(script => 
          script.src && (
            script.src.includes('freighter') || 
            script.src.includes('dngmlblcodfobpdpecaadgfbcggfjfnm') ||
            script.src.includes('chrome-extension')
          )
        ).length > 0,
        
        // Extension DOM elementleri
        extensionElements: document.querySelectorAll('[data-freighter], [id*="freighter"], [class*="freighter"]').length > 0,
        
        // Window property'leri
        windowProps: Object.keys(window).filter(key => 
          key.toLowerCase().includes('freighter') || 
          key.toLowerCase().includes('stellar')
        ).length > 0,

        // Content Script Injection Indicators
        contentScriptMarkers: document.querySelectorAll('script[data-extension], [data-injected]').length > 0
      };

      console.log("🔍 Extension indicators:", extensionIndicators);

      // 4. Chrome Security Restriction Workaround
      if (extensionIndicators.extensionScripts || extensionIndicators.extensionElements) {
        console.log("🔒 Extension algılandı ama Chrome güvenlik kısıtlaması aktif");
        setFreighterStatus("security-blocked");
        
        // Content Script Loader yaklaşımı dene
        await tryContentScriptLoader();
        return;
      }

      // 5. Extension yüklü değil
      console.log("❌ Freighter extension bulunamadı");
      setFreighterStatus("not-installed");
    };

    // Content Script Loader yaklaşımı (Chrome güvenlik kısıtlaması için)
    const tryContentScriptLoader = async () => {
      console.log("🔧 Content Script Loader yaklaşımı deneniyor...");
      
      // Freighter'ın kendi content script'ini tetiklemeye çalış
      const triggerMethods = [
        // Method 1: Custom Event Dispatch
        () => {
          const event = new CustomEvent('freighter:requestAPI', {
            detail: { source: 'stellar-app', timestamp: Date.now() }
          });
          document.dispatchEvent(event);
          window.dispatchEvent(event);
        },
        
        // Method 2: PostMessage to Extension
        () => {
          window.postMessage({
            type: 'FREIGHTER_API_REQUEST',
            source: 'stellar-app',
            timestamp: Date.now()
          }, '*');
        },
        
        // Method 3: DOM Ready Event Re-trigger
        () => {
          const event = new Event('DOMContentLoaded');
          document.dispatchEvent(event);
        },
        
        // Method 4: Window Focus Event
        () => {
          window.focus();
          const event = new Event('focus');
          window.dispatchEvent(event);
        },

        // Method 5: Page Visibility Change
        () => {
          const event = new Event('visibilitychange');
          document.dispatchEvent(event);
        }
      ];

      // Her metodu sırayla dene
      for (let i = 0; i < triggerMethods.length; i++) {
        try {
          triggerMethods[i]();
          console.log(`🔧 Trigger method ${i + 1} çalıştırıldı`);
          
          // Kısa bekleme sonrası API kontrolü
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const api = window.freighterApi || window.freighter;
          if (api && typeof api.isConnected === 'function') {
            console.log(`✅ Content Script Loader başarılı! Method ${i + 1}`);
            await validateFreighterConnection(api);
            return;
          }
        } catch (error) {
          console.warn(`⚠️ Trigger method ${i + 1} hatası:`, error);
        }
      }

      // Tüm metodlar başarısız
      console.log("❌ Content Script Loader başarısız - Chrome güvenlik kısıtlaması aşılamadı");
      setFreighterStatus("security-blocked");
    };

    // Freighter bağlantısını doğrula
    const validateFreighterConnection = async (api) => {
      try {
        console.log("🔗 Freighter bağlantısı doğrulanıyor...");
        
        // API metodlarını kontrol et
        const requiredMethods = ['isConnected', 'getNetwork'];
        const availableMethods = Object.keys(api);
        const missingMethods = requiredMethods.filter(method => !availableMethods.includes(method));
        
        if (missingMethods.length > 0) {
          console.error("❌ Freighter API eksik metodlar:", missingMethods);
          setFreighterStatus("error");
          return;
        }

        const isConnected = await api.isConnected();
        console.log("🔗 Freighter bağlantı durumu:", isConnected);
        
        if (isConnected) {
          // Network kontrolü
          try {
            const network = await api.getNetwork();
            console.log("🌐 Freighter network:", network, "ActiveChain:", activeChain?.id);
            
            if (network === "TESTNET") {
              if (activeChain?.id === "testnet" || !activeChain) {
                setFreighterStatus("connected");
              } else {
                setFreighterStatus("chain-mismatch");
              }
            } else if (network === "MAINNET") {
              setFreighterStatus("mainnet-not-supported");
            } else {
              setFreighterStatus("wrong-network");
            }
          } catch (networkError) {
            console.warn("⚠️ Network bilgisi alınamadı:", networkError);
            setFreighterStatus("connected"); // Network kontrolü yapılamıyorsa bağlı kabul et
          }
        } else {
          setFreighterStatus("not-connected");
        }
      } catch (error) {
        console.error("❌ Freighter doğrulama hatası:", error);
        setFreighterStatus("error");
      }
    };

    // İlk algılama
    detectFreighterWithSecurityWorkaround();
    
    // Periyodik kontrol - Chrome güvenlik kısıtlaması için daha sık
    const interval = setInterval(() => {
      if (freighterStatus === "checking" || freighterStatus === "security-blocked") {
        setDetectionAttempts(prev => prev + 1);
        
        // 10 denemeden sonra dur
        if (detectionAttempts < 10) {
          detectFreighterWithSecurityWorkaround();
        } else {
          clearInterval(interval);
          console.log("🛑 Maksimum algılama denemesi aşıldı");
        }
      }
    }, 2000); // 2 saniyede bir
    
    // Cleanup
    return () => clearInterval(interval);
  }, [freighterStatus, activeChain, detectionAttempts]);

  // Albedo ile bağlantı kurma
  const connectWithAlbedo = async () => {
    try {
      console.log("🔗 Albedo ile bağlanıyor...");
      setIsLoading(true);
      
      const result = await connectAlbedo();
      setAlbedoAddress(result.address);
      setWalletMode("albedo");
      setAlbedoStatus("connected");
      
      console.log("✅ Albedo bağlantısı başarılı:", result.address);
      setSuccess(`✅ Albedo ile bağlandı: ${result.address.slice(0, 8)}...${result.address.slice(-8)}`);
      
    } catch (error) {
      console.error("❌ Albedo bağlantı hatası:", error);
      setError(`Albedo bağlantı hatası: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Chrome Güvenlik Kısıtlaması için gelişmiş bağlantı
  const connectFreighterWithWorkaround = async () => {
    try {
      console.log("🔗 Chrome güvenlik kısıtlaması farkında Freighter bağlantısı...");
      
      // 1. SorobanReact connect metodunu öncelikle dene
      if (connect) {
        console.log("🔗 SorobanReact connect kullanılıyor...");
        try {
          await connect();
          console.log("✅ SorobanReact connect başarılı!");
          setFreighterStatus("connected");
          setWalletMode("freighter");
          return;
        } catch (connectError) {
          console.log("⚠️ SorobanReact connect hatası:", connectError.message);
          // Fallback'e geç
        }
      }
      
      // 2. Manuel Freighter API kontrolü
      let freighterApi = window.freighterApi || window.freighter;
      
      // 3. Chrome güvenlik kısıtlaması için API trigger
      if (!freighterApi && freighterStatus === "security-blocked") {
        console.log("🔧 Chrome güvenlik kısıtlaması için API trigger...");
        
        // Extension'a bağlantı isteği gönder
        const connectionRequest = new CustomEvent('freighter:connect', {
          detail: { 
            source: 'stellar-app', 
            action: 'requestAccess',
            timestamp: Date.now() 
          }
        });
        document.dispatchEvent(connectionRequest);
        window.dispatchEvent(connectionRequest);
        
        // PostMessage ile de dene
        window.postMessage({
          type: 'FREIGHTER_CONNECT_REQUEST',
          source: 'stellar-app',
          action: 'requestAccess',
          timestamp: Date.now()
        }, '*');
        
        // Kısa bekleme
        await new Promise(resolve => setTimeout(resolve, 1000));
        freighterApi = window.freighterApi || window.freighter;
      }
      
      if (!freighterApi) {
        // Extension var ama API yok - kullanıcıyı bilgilendir
        if (freighterStatus === "security-blocked") {
          alert(`🔒 Chrome Güvenlik Kısıtlaması Algılandı

Freighter extension yüklü ama Chrome'un güvenlik politikaları API erişimini engelliyor.

ÇÖZÜM ADIMLARı:
1. Chrome'da chrome://extensions/ adresine gidin
2. Freighter extension'ını bulun
3. "Yeniden yükle" (reload) butonuna tıklayın
4. Bu sayfayı yenileyin (F5)
5. Hala çalışmıyorsa Chrome'u yeniden başlatın

ALTERNATİF: Albedo wallet kullanarak devam edebilirsiniz.`);
          return;
        }
        
        alert("Freighter extension bulunamadı. Lütfen:\n1. Extension'ı yükleyin: https://freighter.app/\n2. Sayfayı yenileyin\n3. Extension'ın aktif olduğundan emin olun");
        return;
      }

      console.log("🔗 Manuel Freighter API ile bağlanıyor...");
      await freighterApi.requestAccess();
      
      console.log("✅ Freighter bağlantısı başarılı!");
      setFreighterStatus("connected");
      setWalletMode("freighter");
      
      // Bağlantı sonrası durumu kontrol et
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error("❌ Freighter bağlantı hatası:", error);
      setError(`Bağlantı hatası: ${error.message}`);
    }
  };

  // Chrome güvenlik kısıtlaması troubleshooting
  const troubleshootChromeSecurityRestriction = () => {
    const troubleshootingSteps = `
🔒 CHROME GÜVENLİK KISITLAMASI SORUN GİDERME

SORUN:
Chrome 2024'te extension güvenlik politikalarını sıkılaştırdı.
Extension'lar artık web sayfalarına API inject etmekte zorlanıyor.

ÇÖZÜM ADIMLARı:

1. EXTENSION YENİDEN YÜKLEME:
   • Chrome'da chrome://extensions/ adresine gidin
   • Freighter'ı bulun ve "Yeniden yükle" butonuna tıklayın
   • Bu sayfayı yenileyin (F5)

2. CHROME YENİDEN BAŞLATMA:
   • Chrome'u tamamen kapatın
   • Yeniden açın ve sayfayı yenileyin

3. EXTENSION İZİNLERİ:
   • chrome://extensions/ adresinde Freighter'a tıklayın
   • "Site erişimi" bölümünde "Tüm sitelerde" seçili olduğundan emin olun

4. ALTERNATİF - ALBEDO WALLET:
   • Albedo.link adresinden Albedo'yu yükleyin
   • Chrome extension kısıtlamalarından etkilenmez
   • Pop-up tabanlı imzalama yapar

5. BYPASS MODE:
   • Eğer sorun devam ederse "Bypass Mode" kutusunu işaretleyin
   • Risk skorunu hesaplayabilirsiniz (blockchain'e kaydetmez)

Bu Chrome'un normal güvenlik özelliğidir ve Freighter'ın sorunu değildir.
    `;
    
    alert(troubleshootingSteps);
  };

  // Manuel yenileme fonksiyonu
  const refreshFreighterStatus = () => {
    console.log("🔄 Manuel yenileme başlatılıyor...");
    setFreighterStatus("checking");
    setDetectionAttempts(0);
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  /* ------------------------------------------------------------------
     3. RİSK SKORU HESABI
     ------------------------------------------------------------------ */
  // Input validation
  const txNum = parseFloat(tx) || 0;
  const hrsNum = parseFloat(hrs) || 0;
  const kindsNum = parseFloat(kinds) || 0;
  
  const isValidInput = txNum >= 0 && txNum <= 100 && 
                      hrsNum >= 0 && hrsNum <= 24 && 
                      kindsNum >= 0 && kindsNum <= 10;
  
  const norm = isValidInput ? [txNum / 100, hrsNum / 24, kindsNum / 10] : [0, 0, 0];
  const score = useRiskScore(isValidInput ? norm : null);
  
  // Wallet bağlantı durumu - Freighter veya Albedo
  const currentAddress = walletMode === "albedo" ? albedoAddress : address;
  const isWalletConnected = walletMode === "albedo" 
    ? (albedoStatus === "connected" && albedoAddress)
    : (freighterStatus === "connected" && address);
  
  // Bypass mode'da wallet olmadan da çalışabilir
  const ready = bypassMode 
    ? (score !== null && isValidInput)
    : (isWalletConnected && score !== null && isValidInput);

  /* ------------------------------------------------------------------
     4. FORM HANDLERS
     ------------------------------------------------------------------ */
  const handleSubmit = async () => {
    if (!ready) return;
    
    setIsLoading(true);
    setError("");
    setSuccess("");
    setTransactionHash(null); // Reset hash
    
    try {
      console.log("Skor kaydediliyor:", { 
        address: bypassMode ? "BYPASS_MODE" : currentAddress, 
        score, 
        txNum, 
        hrsNum, 
        kindsNum,
        isValidInput,
        ready,
        walletMode,
        bypassMode
      });
      
      if (bypassMode) {
        // Bypass mode - sadece skoru göster, blockchain'e kaydetme
        setSuccess(`✅ Risk skoru hesaplandı: ${score}/100

⚠️ BYPASS MODE AKTIF:
• Blockchain'e kaydedilmedi
• Wallet bağlantısı olmadan çalışıyor
• Test amaçlı kullanım

Normal kayıt için Bypass Mode'u kapatın ve wallet'ı bağlayın.`);
        return;
      }
      
      // Normal mode - Wallet gerekli
      if (!currentAddress) {
        throw new Error("Wallet bağlı değil. Lütfen wallet'ınızı bağlayın.");
      }
      
      if (!isWalletConnected) {
        throw new Error("Wallet düzgün bağlı değil. Lütfen wallet'ınızı kontrol edin.");
      }
      
      if (score === null || score === undefined) {
        throw new Error("Risk skoru hesaplanmadı. Lütfen form verilerini kontrol edin.");
      }
      
      if (typeof score !== 'number' || isNaN(score)) {
        throw new Error("Geçersiz risk skoru. Lütfen sayfayı yenileyin.");
      }
      
      let hash;
      
      // Wallet moduna göre işlem yap
      if (walletMode === "albedo") {
        console.log("📝 Albedo ile skor kaydediliyor...");
        hash = await writeScoreWithAlbedo({ address: currentAddress, score });
      } else {
        console.log("📝 Freighter ile skor kaydediliyor...");
        hash = await writeScore({ address: currentAddress, score });
      }
      
      // Transaction hash'i sakla
      setTransactionHash(hash);
      
      setSuccess(`✅ Skor başarıyla zincire kaydedildi!

📊 Risk Skoru: ${score}/100
🔗 Transaction Hash: ${hash}
🌐 Network: Stellar Testnet
💳 Wallet: ${walletMode === "albedo" ? "Albedo" : "Freighter"}

Skorunuz blockchain'de kalıcı olarak saklandı.`);
      
    } catch (err) {
      console.error("Kaydetme hatası - Detaylı:", {
        error: err,
        message: err.message,
        stack: err.stack,
        address: bypassMode ? "BYPASS_MODE" : currentAddress,
        score,
        ready,
        walletMode,
        bypassMode
      });
      
      setError(err.message || "Bilinmeyen bir hata oluştu");
    } finally {
      setIsLoading(false);
    }
  };

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  // Wallet durumu mesajı
  const getWalletStatusMessage = () => {
    // Albedo öncelikli kontrol
    if (albedoStatus === "connected" && albedoAddress) {
      return { 
        type: "success", 
        message: `✅ Albedo bağlı (${albedoAddress.slice(0, 8)}...${albedoAddress.slice(-8)}) - Testnet`
      };
    }
    
    if (albedoStatus === "available") {
      return { 
        type: "info", 
        message: "🌟 Albedo mevcut - Chrome kısıtlaması olmayan alternatif wallet",
        action: "connect-albedo"
      };
    }
    
    // Freighter kontrolleri
    switch (freighterStatus) {
      case "checking":
        return { type: "info", message: "🔍 Freighter durumu kontrol ediliyor..." };
      case "loading":
        return { 
          type: "warning", 
          message: "⚠️ Freighter extension algılandı ama API henüz hazır değil. Lütfen bekleyin veya sayfayı yenileyin.",
          action: "refresh"
        };
      case "security-blocked":
        return { 
          type: "error", 
          message: "🔒 Chrome güvenlik kısıtlaması: Freighter API'sine erişilemiyor. Albedo alternatifini deneyin.",
          action: "troubleshoot"
        };
      case "not-installed":
        return { 
          type: "error", 
          message: "❌ Freighter extension bulunamadı. Albedo alternatifini kullanabilirsiniz.",
          action: "install"
        };
      case "not-connected":
        return { 
          type: "warning", 
          message: "⚠️ Freighter bağlı değil. Bağlanmak için butona tıklayın.",
          action: "connect"
        };
      case "wrong-network":
        return { 
          type: "error", 
          message: "🌐 Freighter Testnet'e ayarlı değil. Lütfen network'ü Testnet'e değiştirin.",
          action: "refresh"
        };
      case "chain-mismatch":
        return { 
          type: "error", 
          message: "🌐 Network uyumsuzluğu. Freighter ve uygulama farklı network'lerde. Sayfayı yenileyin.",
          action: "refresh"
        };
      case "mainnet-not-supported":
        return { 
          type: "error", 
          message: "🌐 Bu uygulama sadece Testnet'i destekler. Freighter'ı Testnet'e ayarlayın.",
          action: "refresh"
        };
      case "connected":
        return { 
          type: "success", 
          message: `✅ Freighter bağlı (${address?.slice(0, 8)}...${address?.slice(-8)}) - Testnet`
        };
      case "error":
        return { 
          type: "error", 
          message: "❌ Freighter ile bağlantı hatası. Albedo alternatifini deneyin.",
          action: "troubleshoot"
        };
      default:
        return { type: "info", message: "Wallet durumu kontrol ediliyor..." };
    }
  };

  const walletStatus = getWalletStatusMessage();

  /* ------------------------------------------------------------------
     5. JSX
     ------------------------------------------------------------------ */
  return (
    <main className="flex flex-col items-center gap-6 p-10 max-w-md mx-auto">
      <h1 className="text-2xl font-semibold text-center">Risk Skoru Hesapla</h1>

      {/* Albedo Önerisi */}
      {(freighterStatus === "security-blocked" || freighterStatus === "not-installed") && albedoStatus === "not-installed" && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 w-full">
          <h3 className="font-semibold text-blue-800 mb-2">🌟 Albedo Wallet Önerisi</h3>
          <p className="text-blue-700 text-sm mb-3">
            Chrome extension kısıtlamalarından etkilenmeyen alternatif wallet. 
            Pop-up tabanlı imzalama yapar, extension yükleme gerektirmez.
          </p>
          <a
            href="https://albedo.link"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
          >
            🌟 Albedo'yu Dene
          </a>
        </div>
      )}

      {/* Chrome Güvenlik Kısıtlaması Uyarısı */}
      {freighterStatus === "security-blocked" && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 w-full">
          <h3 className="font-semibold text-orange-800 mb-2">🔒 Chrome Güvenlik Kısıtlaması</h3>
          <p className="text-orange-700 text-sm mb-3">
            Chrome 2024'te extension güvenlik politikalarını sıkılaştırdı. 
            Albedo wallet alternatifini deneyebilirsiniz.
          </p>
          <div className="space-y-2">
            <button
              onClick={troubleshootChromeSecurityRestriction}
              className="bg-orange-600 text-white px-3 py-1 rounded text-sm hover:bg-orange-700 mr-2"
            >
              🔧 Detaylı Çözüm
            </button>
            <button
              onClick={refreshFreighterStatus}
              className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
            >
              🔄 Yeniden Dene
            </button>
          </div>
        </div>
      )}

      {/* Wallet durumu */}
      <div className={`border rounded-lg p-4 w-full ${
        walletStatus.type === "success" ? "bg-green-50 border-green-200" :
        walletStatus.type === "warning" ? "bg-yellow-50 border-yellow-200" :
        walletStatus.type === "error" ? "bg-red-50 border-red-200" :
        "bg-blue-50 border-blue-200"
      }`}>
        <p className={`text-sm ${
          walletStatus.type === "success" ? "text-green-800" :
          walletStatus.type === "warning" ? "text-yellow-800" :
          walletStatus.type === "error" ? "text-red-800" :
          "text-blue-800"
        }`}>
          {walletStatus.message}
        </p>
        
        {/* Bypass Mode Toggle */}
        <div className="mt-3 p-3 bg-gray-100 rounded border">
          <label className="flex items-center space-x-2 text-sm">
            <input
              type="checkbox"
              checked={bypassMode}
              onChange={(e) => setBypassMode(e.target.checked)}
              className="rounded"
            />
            <span className="text-gray-700">
              🔧 <strong>Bypass Mode:</strong> Wallet olmadan test modu
            </span>
          </label>
          {bypassMode && (
            <p className="text-xs text-gray-600 mt-1">
              ✅ Aktif: Risk skoru hesaplanacak ama blockchain'e kaydedilmeyecek
            </p>
          )}
        </div>
        
        {walletStatus.action === "connect-albedo" && (
          <button
            onClick={connectWithAlbedo}
            disabled={isLoading}
            className="mt-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isLoading ? "Bağlanıyor..." : "🌟 Albedo ile Bağlan"}
          </button>
        )}
        
        {walletStatus.action === "connect" && (
          <button
            onClick={connectFreighterWithWorkaround}
            className="mt-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
          >
            Freighter'a Bağlan
          </button>
        )}
        
        {walletStatus.action === "refresh" && (
          <button
            onClick={refreshFreighterStatus}
            className="mt-2 bg-orange-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-700"
          >
            Sayfayı Yenile
          </button>
        )}
        
        {walletStatus.action === "troubleshoot" && (
          <div className="mt-2 space-x-2">
            <button
              onClick={troubleshootChromeSecurityRestriction}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700"
            >
              🔧 Sorun Giderme
            </button>
            {albedoStatus === "not-installed" && (
              <a
                href="https://albedo.link"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
              >
                🌟 Albedo Dene
              </a>
            )}
          </div>
        )}
        
        {walletStatus.action === "install" && (
          <div className="mt-2 space-x-2">
            <a
              href="https://freighter.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
            >
              Freighter'ı Yükle
            </a>
            {albedoStatus === "not-installed" && (
              <a
                href="https://albedo.link"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700"
              >
                🌟 Albedo Dene
              </a>
            )}
          </div>
        )}
      </div>

      {/* Form alanları */}
      <div className="w-full space-y-4">
        <label className="flex flex-col">
          <span className="text-sm font-medium mb-1">İşlem sayısı (0-100)</span>
          <input
            type="number"
            min="0"
            max="100"
            step="1"
            className="border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={tx}
            onChange={(e) => {
              setTx(e.target.value);
              clearMessages();
            }}
            placeholder="Örn: 25"
          />
          {tx && (txNum < 0 || txNum > 100) && (
            <span className="text-red-500 text-xs mt-1">0-100 arasında bir değer girin</span>
          )}
        </label>

        <label className="flex flex-col">
          <span className="text-sm font-medium mb-1">Ortalama saat aralığı (0-24)</span>
          <input
            type="number"
            min="0"
            max="24"
            step="0.1"
            className="border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={hrs}
            onChange={(e) => {
              setHrs(e.target.value);
              clearMessages();
            }}
            placeholder="Örn: 6.5"
          />
          {hrs && (hrsNum < 0 || hrsNum > 24) && (
            <span className="text-red-500 text-xs mt-1">0-24 arasında bir değer girin</span>
          )}
        </label>

        <label className="flex flex-col">
          <span className="text-sm font-medium mb-1">Varlık çeşidi (0-10)</span>
          <input
            type="number"
            min="0"
            max="10"
            step="1"
            className="border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={kinds}
            onChange={(e) => {
              setKinds(e.target.value);
              clearMessages();
            }}
            placeholder="Örn: 3"
          />
          {kinds && (kindsNum < 0 || kindsNum > 10) && (
            <span className="text-red-500 text-xs mt-1">0-10 arasında bir değer girin</span>
          )}
        </label>
      </div>

      {/* Sonuç gösterimi */}
      {score !== null && isValidInput && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 w-full">
          <p className="text-lg text-center">
            Tahmini risk skoru: <span className="font-bold text-blue-700">{score}/100</span>
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                score <= 30 ? 'bg-green-500' : 
                score <= 70 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${score}%` }}
            ></div>
          </div>
          <p className="text-xs text-center mt-2 text-gray-600">
            {score <= 30 ? "🟢 Düşük Risk" : 
             score <= 70 ? "🟡 Orta Risk" : "🔴 Yüksek Risk"}
          </p>
        </div>
      )}

      {/* Hata mesajları */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 w-full">
          <p className="text-red-800 text-sm whitespace-pre-line">{error}</p>
        </div>
      )}

      {/* Başarı mesajları */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 w-full">
          <p className="text-green-800 text-sm whitespace-pre-line">{success}</p>
          
          {/* Explorer Link */}
          {transactionHash && (
            <div className="mt-3 pt-3 border-t border-green-200">
              <a
                href={getExplorerUrl(transactionHash, 'testnet')}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition-colors"
              >
                <span>🔍</span>
                <span>View on Stellar Explorer</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
              <p className="text-xs text-green-600 mt-2">
                ↗️ Jüri bu linke tıklayarak işleminizi Stellar Testnet'te canlı olarak görebilir
              </p>
            </div>
          )}
        </div>
      )}

      {/* Kaydet düğmesi */}
      <button
        disabled={!ready || isLoading}
        className={`w-full rounded-lg px-4 py-3 text-white font-medium transition-all duration-200 ${
          ready && !isLoading
            ? "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800"
            : "bg-gray-400 cursor-not-allowed"
        }`}
        onClick={handleSubmit}
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {bypassMode ? "Hesaplanıyor..." : 
             walletMode === "albedo" ? "🌟 Sign with Albedo" : "🚀 Sign with Freighter"
            }
          </span>
        ) : (
          bypassMode ? "🧮 Risk Skorunu Hesapla (Bypass Mode)" : 
          walletMode === "albedo" ? "🌟 Sign with Albedo" : "🚀 Sign with Freighter"
        )}
      </button>

      {/* Bilgi notları */}
      <div className="text-xs text-gray-500 text-center space-y-1">
        <p>• Cüzdanınızın Stellar Testnet'e bağlı olduğundan emin olun</p>
        <p>• İşlem için küçük miktarda Testnet XLM gereklidir</p>
        <p>• Testnet XLM için: <a href="https://laboratory.stellar.org/#account-creator" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Stellar Laboratory</a></p>
        <p>• Sorun yaşıyorsanız: <a href="/debug" className="text-blue-500 hover:underline">Debug Sayfası</a></p>
        <p>• <strong>Albedo:</strong> Chrome kısıtlaması olmayan alternatif wallet</p>
        {freighterStatus === "security-blocked" && (
          <p className="text-orange-600 font-medium">⚠️ Chrome güvenlik kısıtlaması aktif - Albedo'yu deneyin</p>
        )}
      </div>
    </main>
  );
}
