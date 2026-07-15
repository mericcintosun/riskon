/**
 * Address handling in the risk oracle.
 *
 * These cover a bug found in the real browser, not by any test here: connecting
 * a passkey smart wallet made the app fire two guaranteed-400 Horizon requests
 * and then fail attestation with "A valid Stellar account address (G...) is
 * required." The smart wallet address is minted by this very app, so calling it
 * invalid was both wrong and confusing.
 */

import { assertValidStellarAddress } from '../riskOracle.js';

const ACCOUNT = 'GBMF7MDHLF6E5GWNCUJZKDBID5LCU5U5K7J26MRUJCM2FK7J7VZXTZZ3';
// A real passkey smart wallet this project deployed and verified on chain.
const SMART_WALLET = 'CB5R46H4YMSP7YGXDEBIX7C6DI5ENIFDXV6EJ34UTGPTO56VVZWP4PGF';

describe('assertValidStellarAddress', () => {
  it('accepts an account address', () => {
    expect(assertValidStellarAddress(ACCOUNT)).toBe(ACCOUNT);
  });

  it('trims surrounding whitespace', () => {
    expect(assertValidStellarAddress(`  ${ACCOUNT}  `)).toBe(ACCOUNT);
  });

  it('tells a smart wallet it is unscorable, not malformed', () => {
    expect.assertions(3);
    try {
      assertValidStellarAddress(SMART_WALLET);
    } catch (error) {
      // 422, not 400: the address is well-formed, there is just nothing to read.
      expect(error.status).toBe(422);
      expect(error.code).toBe('UNSCORABLE_ADDRESS');
      expect(error.message).toMatch(/no classic payment history/i);
    }
  });

  it('still rejects genuine garbage as a 400', () => {
    expect.assertions(4);
    for (const bad of ['', 'not-an-address', 'GXXX', null]) {
      try {
        assertValidStellarAddress(bad);
      } catch (error) {
        expect(error.status).toBe(400);
      }
    }
  });
});
