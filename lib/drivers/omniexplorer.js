const Driver = require('../models/driver');
const Supply = require('../models/supply');
const { promisesMap } = require('../util');

/**
 * Omniexplorer driver. Supports circulating and max supply for tokens.
 *
 * @memberof Driver
 * @augments Driver
 */
class OmniExplorer extends Driver {
  constructor(options) {
    super({
      blockchain: 'Omnilayer',
      timeout: 100, // 10 requests per second
      supports: {
        balances: true,
        tokens: true,
      },
      options,
    });
  }

  /**
   * @augments Driver.fetchTotalSupply
   */
  async fetchTotalSupply() {
    const options = {
      url: 'https://api.omniexplorer.info/v1/properties/listbyecosystem',
      method: 'post',
      form: {
        ecosystem: 1,
      },
    };

    const { properties } = await this.request(options);
    const property = properties.find(
      (item) => (Number(item.propertyid) === 1),
    );

    return Number(property.totaltokens);
  }

  /**
   * @augments Driver.fetchBalance
   * @param {modifierParam} modifier {@link modifierParam}
   * @async
   */
  async fetchBalance(modifier) {
    const options = {
      url: 'https://api.omniexplorer.info/v1/address/addr/',
      method: 'post',
      form: {
        addr: modifier,
      },
    };

    const { balance: balances } = await this.request(options);
    const balance = balances.find((item) => (Number(item.id) === 1));

    if (!balance) return 0;

    return Number(balance.value) / 100000000;
  }

  /**
   * @augments Driver.fetchTokenTotalSupply
   * @param {referenceParam} reference {@link referenceParam}
   * @async
   */
  async fetchTokenTotalSupply(reference) {
    const options = {
      url: 'https://api.omniexplorer.info/v1/properties/listbyecosystem',
      method: 'post',
      form: {
        ecosystem: 1,
      },
    };

    const { properties } = await this.request(options);
    const property = properties.find(
      (item) => (Number(item.propertyid) === Number(reference)),
    );

    return Number(property.totaltokens);
  }

  /**
   * @augments Driver.fetchTokenBalance
   * @param {referenceParam} reference {@link referenceParam}
   * @param {modifierParam} modifier {@link modifierParam}
   * @async
   */
  async fetchTokenBalance(reference, modifier) {
    const options = {
      url: 'https://api.omniexplorer.info/v1/address/addr/',
      method: 'post',
      form: {
        addr: modifier,
      },
    };

    const { balance: balances } = await this.request(options);
    const balance = balances.find((item) => (Number(item.id) === Number(reference)));

    if (!balance) return 0;

    return Number(balance.value) / 100000000;
  }

  /**
   * @augments Driver.getSupply
   * @param {coinParam} coin {@link coinParam}
   */
  async getSupply(coin) {
    let total;
    if (typeof coin.reference === 'undefined') {
      total = await this.fetchTotalSupply();
    } else {
      total = await this.fetchTokenTotalSupply(coin.reference);
    }

    const modifiersWithBalances = await promisesMap(
      coin.modifiers,
      async (modifier) => {
        if (typeof coin.reference === 'undefined') {
          const balance = await this.fetchBalance(modifier);
          return {
            reference: modifier,
            balance,
          };
        }
        const balance = await this.fetchTokenBalance(coin.reference, modifier);
        return {
          reference: modifier,
          balance,
        };
      },
    );
    const circulating = modifiersWithBalances
      .reduce((current, modifier) => current - modifier.balance, total);

    return new Supply({
      total,
      circulating,
      modifiers: modifiersWithBalances,
    });
  }
}

module.exports = OmniExplorer;
