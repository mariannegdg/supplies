const Driver = require('../models/driver');
const Supply = require('../models/supply');
const { promisesMap } = require('../util');

/**
 * Sierra driver. Supports total supply
 * and balance for specific address for
 * native token on Sierracoin blockchain.
 *
 * @memberof Driver
 * @augments Driver
 */
class Sierracoin extends Driver {
  constructor(options) {
    super({
      blockchain: 'Sierracoin',
      timeout: 100, // 10 requiest per second
      supports: {
        balances: true,
      },
      options,
    });
  }

  /** get total supply for native token
   *
   * @augments Driver.fetchTotalSupply
   * @async
   */
  async fetchTotalSupply() {
    const total = await this.request(
      'https://explorer.sierracoin.net/ext/getmoneysupply',
    );
    return Number(total);
  }

  /** get balance for specific wallet address
   *
   * @augments Driver.fetchBalance
   * @param {modifierParam} modifier {@link modifierParam}
   * @async
   */
  async fetchBalance(modifier) {
    const balance = await this.request(
      `https://explorer.sierracoin.net/ext/getbalance/${modifier}`,
    );
    return Number(balance);
  }

  /**
   * @augments Driver.getSupply
   * @param {modifierParam[]} modifiers {@link modifierParam}
   */
  async getSupply({ modifiers }) {
    const total = await this.fetchTotalSupply();

    const modifiersWithBalances = await promisesMap(
      modifiers,
      async (modifier) => {
        const balance = await this.fetchBalance(modifier);
        return {
          reference: modifier,
          balance,
        };
      },
    );

    const circulating = modifiersWithBalances.reduce(
      (current, modifier) => current - modifier.balance,
      total,
    );

    return new Supply({
      total,
      circulating,
      modifiers: modifiersWithBalances,
    });
  }
}

module.exports = Sierracoin;
