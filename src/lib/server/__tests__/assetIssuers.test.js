/**
 * Asset issuer rating tests.
 *
 * Horizon is stubbed so these stay deterministic, but the fixtures are shaped
 * from real mainnet responses — including the detail that made the feature
 * necessary: impersonators outrank the genuine issuer on balance and lose badly
 * on holders.
 */

import { rateAssetIssuers } from '../assetIssuers.js';

/** Build a Horizon /assets record. */
function record({ issuer, domain, holders, issued, flags = {} }) {
  return {
    _links: {
      toml: { href: domain ? `https://${domain}/.well-known/stellar.toml` : '' },
    },
    asset_code: 'USDC',
    asset_issuer: issuer,
    accounts: { authorized: holders, authorized_to_maintain_liabilities: 0, unauthorized: 0 },
    balances: { authorized: String(issued), authorized_to_maintain_liabilities: '0', unauthorized: '0' },
    flags: {
      auth_required: false,
      auth_revocable: false,
      auth_immutable: false,
      auth_clawback_enabled: false,
      ...flags,
    },
  };
}

/** Stub Horizon with `pages` — each entry is one page of records. */
function stubHorizon(pages) {
  let call = 0;
  global.fetch = jest.fn(async () => {
    const records = pages[call] ?? [];
    const hasNext = call < pages.length - 1;
    call += 1;
    return {
      ok: true,
      json: async () => ({
        _embedded: { records },
        _links: hasNext ? { next: { href: 'https://horizon.stellar.org/assets?cursor=next' } } : {},
      }),
    };
  });
}

const REAL = record({
  issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
  domain: 'circle.com',
  holders: 2273108,
  issued: 253761704,
  flags: { auth_revocable: true },
});

const IMPOSTOR = record({
  issuer: 'GAPFZ7AVITBO74EATBUPLT4FCKA2JUY2QOF3FNSC23BW3DIYGIVYQGBP',
  domain: 'xlmgbptreasury.com',
  holders: 1715,
  issued: 1112449582285342,
});

afterEach(() => {
  jest.restoreAllMocks();
  delete global.fetch;
});

describe('rateAssetIssuers', () => {
  it('ranks the genuine issuer first even though the impostor has issued 4M times more', async () => {
    stubHorizon([[IMPOSTOR, REAL]]);

    const result = await rateAssetIssuers('USDC');

    expect(result.dominant.domain).toBe('circle.com');
    expect(result.issuerCount).toBe(2);
  });

  it('reports which issuer a balance ranking would have picked instead', async () => {
    stubHorizon([[IMPOSTOR, REAL]]);

    const result = await rateAssetIssuers('USDC');

    // The whole point of the ranking choice is visible rather than asserted.
    expect(result.balanceRankingWouldPick.domain).toBe('xlmgbptreasury.com');
  });

  it('stays silent about the balance ranking when both rankings agree', async () => {
    stubHorizon([[REAL]]);

    const result = await rateAssetIssuers('USDC');

    expect(result.balanceRankingWouldPick).toBeNull();
  });

  it('maps issuer flags to what the issuer can do to a holder', async () => {
    stubHorizon([
      [
        record({
          issuer: 'GAJMPX5NBOG6TQFPQGRABJEEB2YE7RFRLUKJDZAZGAD5GFX4J7TADAZ6',
          domain: 'ondo.finance',
          holders: 2462,
          issued: 461655183,
          flags: { auth_clawback_enabled: true, auth_revocable: true },
        }),
      ],
    ]);

    const result = await rateAssetIssuers('USDY');

    expect(result.dominant.powers.canSeize).toBe(true);
    expect(result.dominant.powers.canFreeze).toBe(true);
    expect(result.dominant.powers.canBlock).toBe(false);
  });

  it('pages past the first 200 rather than reporting a truncated count', async () => {
    // Real behaviour: a single page reports 200 USDC issuers when there are 387.
    const full = Array.from({ length: 200 }, (_, i) =>
      record({ issuer: `GFAKE${String(i).padStart(50, '0')}`, domain: `fake${i}.com`, holders: i, issued: 1 })
    );
    stubHorizon([full, [REAL]]);

    const result = await rateAssetIssuers('USDC');

    expect(result.issuerCount).toBe(201);
    expect(result.dominant.domain).toBe('circle.com');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('never lets a display cap read as the whole list', async () => {
    const many = Array.from({ length: 40 }, (_, i) =>
      record({ issuer: `GFAKE${String(i).padStart(50, '0')}`, domain: `fake${i}.com`, holders: i, issued: 1 })
    );
    stubHorizon([many]);

    const result = await rateAssetIssuers('USDC');

    expect(result.issuers).toHaveLength(25);
    expect(result.meta.total).toBe(40);
    expect(result.meta.omitted).toBe(15);
  });

  it('rejects a malformed asset code instead of asking Horizon about it', async () => {
    stubHorizon([[]]);

    await expect(rateAssetIssuers('../etc/passwd')).rejects.toThrow(/Asset code must be/);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns an empty result for a code nobody issues', async () => {
    stubHorizon([[]]);

    const result = await rateAssetIssuers('ZZQQXX9');

    expect(result.issuerCount).toBe(0);
    expect(result.dominant).toBeNull();
  });
});
