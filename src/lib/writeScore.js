"use client";

import {
  Contract,
  Address,
  nativeToScVal,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  Transaction,
} from "@stellar/stellar-sdk";
import { Server } from "@stellar/stellar-sdk/rpc";
import { signTransaction } from "@stellar/freighter-api";

/* --- 1. Ortak RPC nesnesi ------------------------------------------ */
const server = new Server("https://soroban-testnet.stellar.org");

/* --- 2. Skoru sözleşmeye yazan fonksiyon --------------------------- */
export async function writeScore({ address, score }) {
  try {
    console.log("writeScore başlatılıyor:", { address, score });
    
    const contractId = process.env.NEXT_PUBLIC_RISKSCORE_CONTRACT_ID;
    
    if (!contractId) {
      throw new Error("Sözleşme ID'si tanımlanmamış. .env.local dosyasını kontrol edin.");
    }
    
    if (!address) {
      throw new Error("Cüzdan adresi bulunamadı. Lütfen cüzdanınızı bağlayın.");
    }
    
    if (typeof score !== 'number' || score < 0 || score > 100) {
      throw new Error("Geçersiz skor değeri. Skor 0-100 arasında olmalıdır.");
    }

    console.log("Sözleşme ID:", contractId);
    console.log("Network:", Networks.TESTNET);
    
    const contract = new Contract(contractId);
    
    // Address ve score parametrelerini doğru formatta hazırla
    const addrVal = Address.fromString(address).toScVal();
    const scoreVal = nativeToScVal(Math.round(score), { type: "u32" });
    
    console.log("Parametreler hazırlandı:", { 
      address, 
      score: Math.round(score),
      contractId,
      network: Networks.TESTNET
    });
    
    // Hesap bilgilerini al
    console.log("Hesap bilgileri alınıyor...");
    const account = await server.getAccount(address);
    console.log("Hesap bilgileri alındı:", {
      accountId: account.accountId(),
      sequence: account.sequenceNumber()
    });
    
    // İşlem oluştur - TESTNET kullan
    console.log("İşlem oluşturuluyor...");
    const tx = new TransactionBuilder(account, {
      fee: (BASE_FEE * 100).toString(),
      networkPassphrase: Networks.TESTNET, // Açıkça TESTNET belirt
    })
      .addOperation(contract.call("set_score", addrVal, scoreVal))
      .setTimeout(30)
      .build();
    
    console.log("İşlem oluşturuldu:", {
      networkPassphrase: tx.networkPassphrase,
      fee: tx.fee,
      operations: tx.operations.length
    });
    
    console.log("İşlem imzalanıyor...");
    
    // Freighter ile imza - basit format
    const signedXdr = await signTransaction(tx.toXDR(), {
      network: "TESTNET",
      networkPassphrase: Networks.TESTNET,
    });
    
    console.log("İşlem imzalandı, gönderiliyor...");
    
    // İmzalı işlemi parse et - Transaction constructor kullan
    const signedTx = new Transaction(signedXdr, Networks.TESTNET);
    
    // Ağa gönder
    const result = await server.sendTransaction(signedTx);
    console.log("İşlem gönderildi:", result);
    
    if (result.status === "PENDING") {
      // İşlem onayını bekle
      let attempts = 0;
      const maxAttempts = 10;
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        try {
          const txResult = await server.getTransaction(result.hash);
          if (txResult.status === "SUCCESS") {
            console.log("İşlem başarılı:", txResult);
            return result.hash;
          } else if (txResult.status === "FAILED") {
            throw new Error(`İşlem başarısız: ${txResult.resultXdr}`);
          }
        } catch (err) {
          if (err.response?.status !== 404) {
            throw err;
          }
        }
        
        attempts++;
      }
      
      throw new Error("İşlem onayı zaman aşımına uğradı");
    } else if (result.status === "ERROR") {
      const errorDetails = result.extras?.result_codes || result.extras || 'Bilinmeyen hata';
      throw new Error(`İşlem hatası: ${JSON.stringify(errorDetails)}`);
    }
    
    return result.hash;
    
  } catch (error) {
    console.error("writeScore hatası - Detaylı:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
      response: error.response?.data || error.response,
      fullError: error
    });
    
    // Daha spesifik hata mesajları
    if (error.message?.includes("User declined") || error.message?.includes("user rejected")) {
      throw new Error("İşlem kullanıcı tarafından iptal edildi.");
    } else if (error.message?.includes("account not found")) {
      throw new Error("Hesap bulunamadı. Cüzdanınızın Testnet'te aktif olduğundan emin olun.");
    } else if (error.message?.includes("insufficient balance") || error.message?.includes("underfunded")) {
      throw new Error("Yetersiz bakiye. Testnet XLM'ye ihtiyacınız var.");
    } else if (error.message?.includes("timeout") || error.message?.includes("network")) {
      throw new Error("Ağ bağlantı hatası. Lütfen tekrar deneyin.");
    } else if (error.message?.includes("invalid") && error.message?.includes("parameter")) {
      throw new Error(`Geçersiz parametreler: ${error.message}`);
    } else if (error.message?.includes("switch is not a function")) {
      throw new Error("Stellar SDK uyumluluk hatası. Lütfen sayfayı yenileyin.");
    } else if (error.message?.includes("Public Global Stellar Network")) {
      throw new Error("Network uyumsuzluğu: Freighter Testnet'e ayarlı ama işlem Mainnet için oluşturulmuş. Lütfen sayfayı yenileyin.");
    } else if (error.response?.status === 400) {
      throw new Error(`Sunucu hatası (400): ${JSON.stringify(error.response.data || error.response)}`);
    } else if (error.response?.status === 404) {
      throw new Error("Sözleşme bulunamadı. Contract ID'sini kontrol edin.");
    } else if (error.response?.status >= 500) {
      throw new Error("Sunucu hatası. Lütfen daha sonra tekrar deneyin.");
    }
    
    // Eğer hiçbir spesifik hata yakalanmazsa, orijinal hatayı fırlat
    throw new Error(`Beklenmeyen hata: ${error.message || JSON.stringify(error)}`);
  }
}
