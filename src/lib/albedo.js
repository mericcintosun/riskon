/**
 * Albedo Wallet Integration
 * Albedo, tarayıcı pop-up'ında XDR imzalama sağlar
 * Chrome extension kısıtlamalarından etkilenmez
 */

// Albedo SDK yüklenene kadar bekle
const waitForAlbedoSDK = async (maxAttempts = 20, interval = 500) => {
  for (let i = 0; i < maxAttempts; i++) {
    if (typeof window !== 'undefined' && window.albedo) {
      console.log(`✅ Albedo SDK yüklendi (${i + 1}. denemede)`);
      return true;
    }
    console.log(`⏳ Albedo SDK bekleniyor... (${i + 1}/${maxAttempts})`);
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  console.log('❌ Albedo SDK yüklenemedi');
  return false;
};

// Albedo API kontrolü - SDK yüklenene kadar bekle
export const isAlbedoAvailable = async () => {
  if (typeof window === 'undefined') {
    return false;
  }

  // Eğer zaten yüklüyse
  if (window.albedo) {
    return true;
  }

  // SDK yüklenene kadar bekle
  return await waitForAlbedoSDK();
};

// Albedo ile bağlantı kurma
export const connectAlbedo = async () => {
  console.log("🌟 Albedo bağlantısı başlatılıyor...");
  
  // SDK'nın yüklü olduğundan emin ol
  const isAvailable = await isAlbedoAvailable();
  if (!isAvailable) {
    throw new Error('Albedo SDK yüklenemedi. Lütfen sayfayı yenileyin.');
  }

  try {
    console.log("🌟 Albedo public key isteniyor...");
    
    // Albedo public key alma
    const result = await window.albedo.publicKey({
      token: 'stellar-risk-scoring-app',
      callback: 'postMessage'
    });

    if (result.pubkey) {
      console.log("✅ Albedo public key alındı:", result.pubkey);
      return {
        address: result.pubkey,
        network: 'TESTNET' // Albedo default olarak kullanıcının seçtiği network'ü kullanır
      };
    } else {
      throw new Error('Albedo bağlantısı reddedildi');
    }
  } catch (error) {
    console.error('Albedo bağlantı hatası:', error);
    throw new Error(`Albedo bağlantı hatası: ${error.message}`);
  }
};

// Albedo ile transaction imzalama
export const signTransactionWithAlbedo = async (xdr, network = 'TESTNET') => {
  // SDK'nın yüklü olduğundan emin ol
  const isAvailable = await isAlbedoAvailable();
  if (!isAvailable) {
    throw new Error('Albedo SDK yüklenemedi');
  }

  try {
    console.log('🔐 Albedo ile transaction imzalanıyor...', { 
      xdrLength: xdr.length, 
      network,
      xdrPreview: xdr.substring(0, 50) + '...'
    });

    // Albedo pop-up'ını aç ve XDR'ı imzala
    const result = await window.albedo.tx({
      xdr: xdr,
      network: network,
      token: 'stellar-risk-scoring-app',
      callback: 'postMessage'
    });

    console.log('🔐 Albedo imzalama sonucu:', {
      hasSignedXdr: !!result.signed_envelope_xdr,
      signedXdrLength: result.signed_envelope_xdr?.length
    });

    if (result.signed_envelope_xdr) {
      console.log('✅ Albedo imzalama başarılı!');
      return result.signed_envelope_xdr;
    } else {
      throw new Error('Transaction imzalanamadı - Kullanıcı reddetti veya hata oluştu');
    }
  } catch (error) {
    console.error('Albedo imzalama hatası:', error);
    
    // Kullanıcı friendly hata mesajları
    if (error.message.includes('rejected')) {
      throw new Error('İmzalama işlemi kullanıcı tarafından reddedildi');
    } else if (error.message.includes('timeout')) {
      throw new Error('İmzalama işlemi zaman aşımına uğradı');
    } else {
      throw new Error(`Transaction imzalama hatası: ${error.message}`);
    }
  }
};

// Albedo durumu kontrol etme - Async versiyonu
export const getAlbedoStatus = async () => {
  if (typeof window === 'undefined') {
    return { available: false, reason: 'Server-side rendering' };
  }

  const isAvailable = await isAlbedoAvailable();
  
  if (!isAvailable) {
    return { 
      available: false, 
      reason: 'Albedo SDK yüklenemedi',
      installUrl: 'https://albedo.link'
    };
  }

  return { available: true, reason: 'Albedo SDK yüklü ve hazır' };
};

// Sync versiyonu - Hızlı kontrol için
export const getAlbedoStatusSync = () => {
  if (typeof window === 'undefined') {
    return { available: false, reason: 'Server-side rendering' };
  }

  if (!window.albedo) {
    return { 
      available: false, 
      reason: 'Albedo SDK henüz yüklenmedi',
      installUrl: 'https://albedo.link'
    };
  }

  return { available: true, reason: 'Albedo SDK hazır' };
};

// Albedo ile uyumlu writeScore fonksiyonu - Gelişmiş XDR akışı
export const writeScoreWithAlbedo = async ({ address, score }) => {
  const { SorobanRpc, TransactionBuilder, Networks, Operation, Address, nativeToScVal } = await import('@stellar/stellar-sdk');
  
  try {
    console.log('📝 Albedo ile skor kaydediliyor...', { address, score });

    // Server bağlantısı
    const server = new SorobanRpc.Server('https://soroban-testnet.stellar.org');
    
    // Contract ID
    const contractId = process.env.NEXT_PUBLIC_RISKSCORE_CONTRACT_ID;
    if (!contractId) {
      throw new Error('Contract ID bulunamadı');
    }

    console.log('📋 Contract ID:', contractId);

    // Account bilgilerini al
    const account = await server.getAccount(address);
    console.log('📋 Account bilgileri alındı:', account.accountId());

    // Transaction builder - Unsigned XDR oluştur
    const transaction = new TransactionBuilder(account, {
      fee: '100000', // 0.01 XLM
      networkPassphrase: Networks.TESTNET,
    })
    .addOperation(
      Operation.invokeContract({
        contract: contractId,
        method: 'set_score',
        args: [
          // Address parameter - ScVal formatında
          nativeToScVal(Address.fromString(address)),
          // Score parameter - ScVal formatında  
          nativeToScVal(Math.round(score), { type: 'u32' })
        ]
      })
    )
    .setTimeout(30)
    .build();

    console.log('🧪 Transaction oluşturuldu, simulate ediliyor...');

    // Transaction'ı simulate et
    const simulateResponse = await server.simulateTransaction(transaction);
    
    if (simulateResponse.error) {
      console.error('❌ Simulation hatası:', simulateResponse.error);
      throw new Error(`Simulation hatası: ${simulateResponse.error}`);
    }

    console.log('✅ Simulation başarılı');

    // Simulated transaction'dan güncellenmiş transaction al
    const preparedTransaction = SorobanRpc.assembleTransaction(transaction, simulateResponse);

    // XDR string'e çevir - Bu Albedo'ya gönderilecek
    const unsignedXdr = preparedTransaction.toXDR();
    console.log('📄 Unsigned XDR hazırlandı:', {
      length: unsignedXdr.length,
      preview: unsignedXdr.substring(0, 100) + '...'
    });

    // Albedo ile imzala - Pop-up açılır
    console.log('🌟 Albedo pop-up açılıyor...');
    const signedXdr = await signTransactionWithAlbedo(unsignedXdr, 'TESTNET');

    // İmzalı XDR'dan transaction oluştur
    console.log('📤 İmzalı transaction gönderiliyor...');
    const signedTransaction = TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET);
    
    // Transaction'ı network'e gönder
    const sendResponse = await server.sendTransaction(signedTransaction);

    console.log('📤 Send response:', sendResponse);

    if (sendResponse.status === 'PENDING') {
      console.log('⏳ Transaction pending, hash:', sendResponse.hash);
      return sendResponse.hash;
    } else if (sendResponse.status === 'DUPLICATE') {
      console.log('🔄 Transaction duplicate, hash:', sendResponse.hash);
      return sendResponse.hash;
    } else {
      console.error('❌ Transaction başarısız:', sendResponse);
      throw new Error(`Transaction başarısız: ${sendResponse.status}`);
    }

  } catch (error) {
    console.error('❌ Albedo writeScore hatası:', error);
    throw error;
  }
};

// Explorer URL oluşturma
export const getExplorerUrl = (hash, network = 'testnet') => {
  if (network === 'testnet') {
    return `https://testnet.stellarchain.io/transactions/${hash}`;
  } else {
    return `https://stellarchain.io/transactions/${hash}`;
  }
};

// Albedo test fonksiyonu - Debug için
export const testAlbedoConnection = async () => {
  try {
    console.log('🧪 Albedo test başlatılıyor...');
    
    const status = getAlbedoStatus();
    console.log('📊 Albedo durumu:', status);
    
    if (!status.available) {
      return { success: false, error: status.reason };
    }
    
    const connection = await connectAlbedo();
    console.log('✅ Test bağlantısı başarılı:', connection);
    
    return { success: true, data: connection };
  } catch (error) {
    console.error('❌ Albedo test hatası:', error);
    return { success: false, error: error.message };
  }
};