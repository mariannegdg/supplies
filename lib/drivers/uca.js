const Driver = require('../models/driver');
const Supply = require('../models/supply');
const { promisesMap } = require('../util');

/**
 * Uca explorer. Supports total supply
 * and balance for specific address.
 *
 * @memberof Driver
 * @augments Driver
 */
class Uca extends Driver {
  constructor(options) {
    super({
      blockchain: 'Uca',
      timeout: 100, // 10 requiest per second
      supports: {
        native: true,
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
      'https://blockexplorer.ucacoin.cash/ext/getmoneysupply',
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
    const { balance } = await this.request(
      `https://blockexplorer.ucacoin.cash/ext/getaddress/${modifier}`,
    );
    return Number(balance);
  }

  /**
   * @augments Driver.getSupply
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

module.exports = Uca;
