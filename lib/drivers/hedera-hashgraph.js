const Driver = require('../models/driver');
const Supply = require('../models/supply');

/**
 * Hedera Hasgraph explorer. Supports total, max
 * and circulating supply for native token HBAR.
 *
 * @augments Driver
 * @memberof Driver
 */
class HederaHashgraph extends Driver {
  constructor(options) {
    super({
      blockchain: 'Hedera',
      timeout: 1000, // 1 requests per second
      supports: {
        max: true,
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
    return Number('50000000000'); // it's fixed
  }

  /** get max supply for native token
   *
   * @augments Driver.fetchMaxSupply
   * @async
   */
  async fetchMaxSupply() {
    return Number('50000000000'); // it's fixed
  }

  /** get circulating supply for native token
   *
   * @augments Driver.fetchCirculatingSupply
   * @async
   */
  async fetchCirculatingSupply() {
    const data = await this.request({
      url: 'https://hash-hash.info/rest/stats/circulating-supply-no-decimal',
      json: false,
    });
    const circulating = data.replace(/,/g, '');

    return Number(circulating);
  }

  /** get supply
   *
   * @augments Driver.getSupply
   */
  async getSupply() {
    const total = await this.fetchTotalSupply();
    const max = await this.fetchMaxSupply();
    const circulating = await this.fetchCirculatingSupply();

    return new Supply({
      total,
      max,
      circulating,
    });
  }
}

module.exports = HederaHashgraph;
