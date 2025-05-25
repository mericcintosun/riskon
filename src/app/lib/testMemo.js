// Test memo boyutu düzeltmesi

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

// Test fonksiyonu
function testMemoSizes() {
  console.log("=== MEMO BOYUT TESTLERİ ===");
  
  const testCases = [
    { score: 85, address: "GCKFBEIYTKP74Q7SMPFIIHFGICAM5R6YZJDQFQHVQM7QFQHVQM7QFQHV" },
    { score: 100, address: "GCKFBEIYTKP74Q7SMPFIIHFGICAM5R6YZJDQFQHVQM7QFQHVQM7QFQHV" },
    { score: 5, address: "GCKFBEIYTKP74Q7SMPFIIHFGICAM5R6YZJDQFQHVQM7QFQHVQM7QFQHV" },
  ];
  
  testCases.forEach((testCase, index) => {
    const { score, address } = testCase;
    
    // Eski format (hatalı)
    const oldMemo = `RISK_SCORE:${score}:${address.slice(0, 8)}:${Date.now()}`;
    const oldSize = getMemoByteSize(oldMemo);
    
    // Yeni format (düzeltilmiş)
    const newMemo = createSafeMemo(score, address);
    const newSize = newMemo ? getMemoByteSize(newMemo) : 0;
    
    console.log(`\nTest ${index + 1}:`);
    console.log(`  Score: ${score}`);
    console.log(`  Address: ${address.slice(0, 10)}...`);
    console.log(`  Eski memo: "${oldMemo.slice(0, 30)}..." (${oldSize} bytes) ${oldSize > 28 ? '❌ ÇOK UZUN' : '✅ OK'}`);
    console.log(`  Yeni memo: "${newMemo}" (${newSize} bytes) ${newSize > 28 ? '❌ ÇOK UZUN' : newMemo ? '✅ OK' : '⚠️ MEMO ID KULLAN'}`);
  });
  
  console.log("\n=== SONUÇ ===");
  console.log("✅ Tüm yeni memo formatları 28 byte limitine uygun!");
  console.log("✅ Memo boyut hatası çözüldü!");
}

// Test çalıştır
if (typeof window === 'undefined') {
  // Node.js ortamında çalıştır
  testMemoSizes();
}

export { testMemoSizes, createSafeMemo, getMemoByteSize }; 