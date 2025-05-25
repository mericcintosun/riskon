"use client";

import * as StellarSdk from "@stellar/stellar-sdk";

const {
  Keypair,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  Transaction,
  Operation,
  Memo,
} = StellarSdk;

// Basit bir destination account (risk skorlarını memo olarak kaydedeceğiz)
const DESTINATION_ACCOUNT = "GDNE57HVQSG3JIGWNPEBZPJAD2F42FS3YL67RIEMJZ77JW5R75L3OE5B";

// Horizon API endpoints
const HORIZON_URL = "https://horizon-testnet.stellar.org";

// Account bilgilerini fetch ile al
async function loadAccount(accountId) {
  const response = await fetch(`${HORIZON_URL}/accounts/${accountId}`);
  if (!response.ok) {
    throw new Error(`Account bulunamadı: ${response.status}`);
  }
  const accountData = await response.json();
  
  // Account objesini Stellar SDK formatına çevir
  return {
    accountId: () => accountData.account_id,
    sequenceNumber: () => accountData.sequence,
    sequence: accountData.sequence,
    account_id: accountData.account_id,
    balances: accountData.balances,
  };
}

// Transaction'ı submit et
async function submitTransaction(transaction) {
  const response = await fetch(`${HORIZON_URL}/transactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `tx=${encodeURIComponent(transaction.toXDR())}`,
  });
  
  const result = await response.json();
  
  if (response.ok) {
    return {
      successful: true,
      hash: result.hash,
      result: result,
    };
  } else {
    return {
      successful: false,
      result_xdr: result.extras?.result_xdr || 'Bilinmeyen hata',
      result: result,
    };
  }
}

// Memo boyutunu kontrol eden yardımcı fonksiyon
function getMemoByteSize(text) {
  return new TextEncoder().encode(text).length;
}

// Güvenli memo oluşturan fonksiyon
function createSafeMemo(scoreValue, address) {
  // En kısa format: "RS:85:ABC" (9-11 karakter)
  let addressPrefix = address.slice(0, 3);
  let memo = `RS:${scoreValue}:${addressPrefix}`;
  
  // Eğer hala çok uzunsa, daha da kısalt
  if (getMemoByteSize(memo) > 28) {
    // Sadece score: "RS:85" (5-6 karakter)
    memo = `RS:${scoreValue}`;
  }
  
  // Son kontrol
  if (getMemoByteSize(memo) > 28) {
    // Bu durumda memo ID kullanmak zorundayız
    return null;
  }
  
  return memo;
}

export async function writeScoreToBlockchain({ kit, address, score }) {
  try {
    console.log("🚀 Blockchain'e risk skoru yazılıyor (Memo ile):", { address, score });
    
    if (!kit) {
      throw new Error("Wallet kit bulunamadı");
    }
    
    if (!address) {
      throw new Error("Wallet adresi bulunamadı");
    }
    
    if (typeof score !== 'number' || score < 0 || score > 100) {
      throw new Error("Geçersiz skor değeri. Skor 0-100 arasında olmalıdır.");
    }

    const scoreValue = Math.round(score);
    
    console.log("📋 Risk skoru parametreleri hazırlandı:", { 
      address, 
      score: scoreValue
    });
    
    // Account bilgilerini al
    console.log("📡 Account bilgileri alınıyor...");
    const accountData = await loadAccount(address);
    console.log("✅ Account bilgileri alındı:", {
      accountId: accountData.account_id,
      sequence: accountData.sequence
    });
    
    // Stellar SDK Account objesi oluştur
    const account = new StellarSdk.Account(accountData.account_id, accountData.sequence);
    
    // Risk skorunu memo olarak kaydet
    const safeMemo = createSafeMemo(scoreValue, address);
    let transaction;
    
    if (safeMemo === null) {
      console.warn("⚠️ Memo çok uzun, Memo ID kullanılacak");
      // Alternatif: Memo ID kullan (64-bit integer)
      // Score'u ve timestamp'i birleştirerek unique ID oluştur
      const timestamp = Math.floor(Date.now() / 1000); // Unix timestamp (saniye)
      const memoId = BigInt(scoreValue) * 1000000n + BigInt(timestamp % 1000000); // Score + timestamp
      
      console.log("📝 Memo ID kullanılıyor:", memoId.toString());
      
      // Basit payment transaction oluştur (0.0000001 XLM)
      transaction = new TransactionBuilder(account, {
        fee: BASE_FEE.toString(),
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          Operation.payment({
            destination: DESTINATION_ACCOUNT,
            asset: StellarSdk.Asset.native(), // XLM
            amount: "0.0000001", // Minimal miktar
          })
        )
        .addMemo(Memo.id(memoId.toString()))
        .setTimeout(30)
        .build();
        
      console.log("✅ Transaction oluşturuldu (Memo ID ile):", {
        networkPassphrase: transaction.networkPassphrase,
        fee: transaction.fee,
        operations: transaction.operations.length,
        memoId: memoId.toString()
      });
    } else {
      console.log("📝 Risk skoru memo'su:", safeMemo, "- Byte uzunluğu:", getMemoByteSize(safeMemo));
      
      // Basit payment transaction oluştur (0.0000001 XLM)
      transaction = new TransactionBuilder(account, {
        fee: BASE_FEE.toString(),
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          Operation.payment({
            destination: DESTINATION_ACCOUNT,
            asset: StellarSdk.Asset.native(), // XLM
            amount: "0.0000001", // Minimal miktar
          })
        )
        .addMemo(Memo.text(safeMemo))
        .setTimeout(30)
        .build();
        
      console.log("✅ Transaction oluşturuldu (Memo Text ile):", {
        networkPassphrase: transaction.networkPassphrase,
        fee: transaction.fee,
        operations: transaction.operations.length,
        memo: safeMemo
      });
    }
    
    // Stellar Wallets Kit ile transaction'ı imzala
    console.log("✍️ Transaction imzalanıyor...");
    const { signedTxXdr } = await kit.signTransaction(transaction.toXDR(), {
      address,
      networkPassphrase: Networks.TESTNET
    });
    
    console.log("✅ Transaction imzalandı");
    
    // İmzalı transaction'ı parse et
    const signedTransaction = new Transaction(signedTxXdr, Networks.TESTNET);
    
    // Blockchain'e gönder
    console.log("📤 Transaction blockchain'e gönderiliyor...");
    const result = await submitTransaction(signedTransaction);
    console.log("📨 Transaction gönderildi:", result);
    
    if (result.successful) {
      console.log("🎉 Transaction başarılı:", result.hash);
      return result.hash;
    } else {
      console.error("❌ Transaction başarısız:", result);
      throw new Error(`Transaction başarısız: ${result.result_xdr || 'Bilinmeyen hata'}`);
    }
    
  } catch (error) {
    console.error("❌ writeScoreToBlockchain detaylı hatası:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
      response: error.response?.data || error.response,
      fullError: error
    });
    
    // Kullanıcı dostu hata mesajları
    if (error.message?.includes("User declined") || error.message?.includes("user rejected")) {
      throw new Error("İşlem kullanıcı tarafından iptal edildi.");
    } else if (error.message?.includes("Expects string, array or buffer, max 28 bytes")) {
      throw new Error("Memo çok uzun. Lütfen daha kısa bir memo kullanın veya uygulamayı güncelleyin.");
    } else if (error.message?.includes("account not found") || error.message?.includes("Account bulunamadı")) {
      throw new Error("Hesap bulunamadı. Wallet'ınızın Testnet'te aktiv olduğundan emin olun.");
    } else if (error.message?.includes("insufficient balance") || error.message?.includes("underfunded")) {
      throw new Error("Yetersiz bakiye. Testnet XLM'ye ihtiyacınız var: https://laboratory.stellar.org/#account-creator");
    } else if (error.message?.includes("timeout") || error.message?.includes("network")) {
      throw new Error("Ağ bağlantı hatası. Lütfen tekrar deneyin.");
    } else if (error.message?.includes("invalid") && error.message?.includes("parameter")) {
      throw new Error(`Geçersiz parametreler: ${error.message}`);
    } else if (error.response?.status === 400) {
      throw new Error(`Sunucu hatası (400): ${JSON.stringify(error.response.data || error.response)}`);
    } else if (error.response?.status === 404) {
      throw new Error("Hesap bulunamadı. Wallet'ınızın Testnet'te aktiv olduğundan emin olun.");
    } else if (error.response?.status >= 500) {
      throw new Error("Sunucu hatası. Lütfen daha sonra tekrar deneyin.");
    }
    
    // Eğer hiçbir spesifik hata yakalanmazsa, orijinal hatayı fırlat
    throw new Error(`Blockchain hatası: ${error.message || JSON.stringify(error)}`);
  }
} 