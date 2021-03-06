const Driver = require('../models/driver');
const Supply = require('../models/supply');
const { promisesMap } = require('../util');

/**
 * Etherscan driver. Supports circulating and total supply for ethereum and
 * tokens on the ethereum blockchain.
 *
 * @augments Driver
 * @memberof Driver
 */
class Etherscan extends Driver {
  constructor(options) {
    super({
      blockchain: 'Ethereum',
      timeout: 200, // 5 requests per second
      supports: {
        balances: true,
        tokens: true,
        decimals: true, // Should this be required?
        secret: true, // Should this be required?
      },
      options,
    });
  }

  get secret() {
    if (!this._secret) {
      throw new Error('API key is required');
    }
    return this._secret;
  }

  set secret(secret) {
    this._secret = secret;
  }

  /**
   * @augments Driver.fetchTotalSupply
   * @async
   */
  async fetchTotalSupply() {
    const { result: total } = await this.request(`https://api.etherscan.io/api?module=stats&action=ethsupply&apikey=${this.secret}`);

    if (total === null) throw new Error('Total supply is null');

    return total / (10 ** 18);
  }

  /**
   * @augments Driver.fetchBalance
   * @param {modifierParam} modifier {@link modifierParam}
   * @async
   */
  async fetchBalance(modifier) {
    const { result: balance } = await this.request(`https://api.etherscan.io/api?module=account&action=balance&address=${modifier}&tag=latest&apikey=${this.secret}`);

    return balance / (10 ** 18);
  }

  /**
   * @augments Driver.fetchTokenTotalSupply
   * @param {referenceParam} reference {@link referenceParam}
   * @param {decimalsParam} decimals {@link decimalsParam}
   * @async
   */
  async fetchTokenTotalSupply(reference, decimals) {
    const { result: total } = await this.request(`https://api.etherscan.io/api?module=stats&action=tokensupply&contractaddress=${reference}&apikey=${this.secret}`);

    if (decimals === null || decimals === undefined) {
      return total / (10 ** 18);
    }

    return total / (10 ** decimals);
  }

  /**
   * @augments Driver.fetchTokenBalance
   * @param {referenceParam} reference {@link referenceParam}
   * @param {modifierParam} modifier {@link modifierParam}
   * @param {decimalsParam} decimals {@link decimalsParam}
   * @async
   */
  async fetchTokenBalance(reference, modifier, decimals) {
    const { result: balance } = await this.request(`https://api.etherscan.io/api?module=account&action=tokenbalance&contractaddress=${reference}&address=${modifier}&tag=latest&apikey=${this.secret}`);

    if (decimals === null || decimals === undefined) {
      return balance / (10 ** 18);
    }

    return balance / (10 ** decimals);
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
      total = await this.fetchTokenTotalSupply(coin.reference, coin.decimals);
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
        const balance = await this.fetchTokenBalance(coin.reference, modifier, coin.decimals);
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

module.exports = Etherscan;
