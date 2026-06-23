## 2025-05-15 - Caching Block Serialization Prefix
**Learning:** During PoW mining, the nonce is the only field that changes. Re-serializing the entire block (including `JSON.stringify` on transaction lists) in every iteration is a significant source of overhead. Caching the "prefix" (everything but the nonce) reduces serialization time by ~95% and provides a ~5% boost to overall hashing throughput.
**Action:** Always check for immutable fields in tight loops and cache their string representations.

## 2025-05-16 - Optimizing SHA-256 Throughput
**Learning:** Standard JavaScript array-based processing and string formatting in hashing algorithms are extremely slow. Switching to `Uint8Array` for byte processing, a shared `Uint32Array` for the work array `w`, and a pre-calculated hexadecimal lookup table for the final output string can more than double hashing throughput (from ~108k H/s to ~228k H/s).
**Action:** Use typed arrays and lookup tables for high-frequency cryptographic operations. Ensure pre-allocated buffers are dynamic to avoid silent overflows.

## 2025-05-17 - Inlining Bitwise Rotations and Caching Lookups
**Learning:** Even small function call overhead (like a simple `rotr` utility) and repeated typed array lookups (e.g., `w[t-15]`) add up in the hottest loop of SHA-256. Inlining these bitwise operations and using local variables for hot lookups provides a ~10% throughput increase in Node.js.
**Action:** In high-frequency cryptographic or mathematical loops, prefer inlining simple bitwise helpers and caching array values to minimize overhead.
