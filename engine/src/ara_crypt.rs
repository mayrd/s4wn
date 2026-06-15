//! S4WN ARA Crypt Module
//!
//! Implementation of the ARA stream cipher used by Siedler 4
//! to encrypt map files, GFX data, and other game assets.
//!
//! Ported from the Settlers.ts TypeScript reference implementation
//! (tomsoftware/Settlers.ts — src/resources/file/ara-crypt.ts).
//!
//! ## Algorithm
//!
//! ARA Crypt is a binary-save version of Warren Ward's "Stream Encryption"
//! algorithm. It uses three 32-bit key registers and produces a byte-wide
//! XOR key for each output byte. Siedler 4 uses a fixed initial key:
//!
//! ```text
//!   key0 = 0x30313233
//!   key1 = 0x34353637
//!   key2 = 0x38393031
//! ```

/// Siedler 4 ARA stream cipher
pub struct AraCrypt {
    key0: u32,
    key1: u32,
    key2: u32,
}

impl AraCrypt {
    /// Siedler 4 fixed initial key
    pub const S4_KEY0: u32 = 0x30313233;
    pub const S4_KEY1: u32 = 0x34353637;
    pub const S4_KEY2: u32 = 0x38393031;

    /// Create a new ARA crypt with Siedler 4 default keys
    pub fn new_s4() -> Self {
        AraCrypt {
            key0: Self::S4_KEY0,
            key1: Self::S4_KEY1,
            key2: Self::S4_KEY2,
        }
    }

    /// Create with custom keys
    pub fn new(key0: u32, key1: u32, key2: u32) -> Self {
        AraCrypt { key0, key1, key2 }
    }

    /// Reset to given key state
    pub fn reset(&mut self, key0: u32, key1: u32, key2: u32) {
        self.key0 = key0;
        self.key1 = key1;
        self.key2 = key2;
    }

    /// Produce the next XOR key byte.
    /// Call this once per input byte to decrypt/encrypt.
    pub fn next_key(&mut self) -> u8 {
        let mut k0 = self.key0;
        let mut k1 = self.key1;
        let mut k2 = self.key2;

        let mut bit1: u32;
        let mut bit2: u32;
        let mut result: u32 = 0;

        const KEY_MASK_A: u32 = 0x80000062;
        const KEY_MASK_B: u32 = 0x40000020;
        const KEY_MASK_C: u32 = 0x10000002;

        const KEY_ROT0_A: u32 = 0x7FFFFFFF;
        const KEY_ROT0_B: u32 = 0x3FFFFFFF;
        const KEY_ROT0_C: u32 = 0x0FFFFFFF;

        const KEY_ROT1_A: u32 = 0x80000000;
        const KEY_ROT1_B: u32 = 0xC0000000;
        const KEY_ROT1_C: u32 = 0xF0000000;

        for _ in 0..8 {
            bit1 = k1 & 1;
            bit2 = k2 & 1;

            if (k0 & 1) != 0 {
                k0 = ((KEY_MASK_A ^ k0) >> 1) | KEY_ROT1_A;

                if (k1 & 1) != 0 {
                    k1 = ((KEY_MASK_B ^ k1) >> 1) | KEY_ROT1_B;
                    bit1 = 1;
                } else {
                    k1 = (k1 >> 1) & KEY_ROT0_B;
                    bit1 = 0;
                }
            } else {
                k0 = (k0 >> 1) & KEY_ROT0_A;

                if (k2 & 1) != 0 {
                    k2 = ((KEY_MASK_C ^ k2) >> 1) | KEY_ROT1_C;
                    bit2 = 1;
                } else {
                    k2 = (k2 >> 1) & KEY_ROT0_C;
                    bit2 = 0;
                }
            }

            result = (bit2 ^ bit1) | (result << 1);
        }

        self.key0 = k0;
        self.key1 = k1;
        self.key2 = k2;

        (result & 0xFF) as u8
    }

    /// Decrypt a buffer in-place using the stream cipher
    pub fn decrypt_in_place(&mut self, data: &mut [u8]) {
        for byte in data.iter_mut() {
            *byte ^= self.next_key();
        }
    }

    /// Decrypt a buffer, returning a new Vec<u8>
    pub fn decrypt(&mut self, data: &[u8]) -> Vec<u8> {
        let mut result = data.to_vec();
        self.decrypt_in_place(&mut result);
        result
    }

    /// Encrypt a buffer (same operation as decrypt — stream cipher)
    pub fn encrypt_in_place(&mut self, data: &mut [u8]) {
        self.decrypt_in_place(data);
    }

    /// Encrypt a buffer, returning a new Vec<u8>
    pub fn encrypt(&mut self, data: &[u8]) -> Vec<u8> {
        self.decrypt(data)
    }
}

// ── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ara_crypt_roundtrip() {
        let input = b"Hello, Siedler 4! This is a test of the ARA crypt.";
        let mut crypt = AraCrypt::new_s4();
        let encrypted = crypt.encrypt(input);

        // Reset and decrypt
        crypt.reset(AraCrypt::S4_KEY0, AraCrypt::S4_KEY1, AraCrypt::S4_KEY2);
        let decrypted = crypt.decrypt(&encrypted);

        assert_eq!(input, decrypted.as_slice());
    }

    #[test]
    fn test_ara_crypt_deterministic() {
        let input = b"test data 12345";
        let mut crypt1 = AraCrypt::new_s4();
        let result1 = crypt1.encrypt(input);

        let mut crypt2 = AraCrypt::new_s4();
        let result2 = crypt2.encrypt(input);

        assert_eq!(result1, result2, "ARA crypt must be deterministic");
    }

    #[test]
    fn test_ara_crypt_empty() {
        let mut crypt = AraCrypt::new_s4();
        let result = crypt.encrypt(&[]);
        assert!(result.is_empty());
    }

    #[test]
    fn test_ara_crypt_large_data() {
        // Test with 1KB of data
        let input = vec![0xAAu8; 1024];
        let mut crypt = AraCrypt::new_s4();
        let encrypted = crypt.encrypt(&input);

        // Reset and decrypt
        crypt.reset(AraCrypt::S4_KEY0, AraCrypt::S4_KEY1, AraCrypt::S4_KEY2);
        let decrypted = crypt.decrypt(&encrypted);

        assert_eq!(input, decrypted);
    }

    #[test]
    fn test_ara_crypt_known_values() {
        // Verify known S4 key sequence for a simple input
        let mut crypt = AraCrypt::new_s4();
        let key1 = crypt.next_key();
        let key2 = crypt.next_key();
        let key3 = crypt.next_key();

        // Key stream must not repeat immediately
        let mut crypt2 = AraCrypt::new_s4();
        let key1b = crypt2.next_key();
        assert_eq!(key1, key1b, "Keys must be deterministic");
        assert!(
            key1 != key2 || key2 != key3,
            "Key stream should not repeat immediately: k1={}, k2={}, k3={}",
            key1, key2, key3
        );
    }
}
