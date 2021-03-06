const Driver = require('../models/driver');
const Supply = require('../models/supply');
const { promisesMap } = require('../util');

class Qtum extends Driver {
  constructor(options) {
    super({
      blockchain: 'Qtum',
      timeout: 200, // 5 requests per second
      supports: {
        native: true,
        circulating: true,
        balances: true,
        max: true,
      },
      options,
    });
  }

  async fetchTotalSupply() {
    const supply = await this.request('https://qtum.info/api/supply');
    return Number(supply);
  }

  async fetchCirculatingSupply() {
    const circulating = await this.request(
      'https://qtum.info/api/circulating-supply',
    );
    return Number(circulating);
  }

  async fetchMaxSupply() {
    const max = await this.request('https://qtum.info/api/total-max-supply');
    return Number(max);
  }

  async fetchBalance(modifier) {
    const { balance } = await this.request(
      `https://qtum.info/api/address/${modifier}`,
    );
    return Number(balance) / 10 ** 8;
  }

  async getSupply({ modifiers }) {
    const total = await this.fetchTotalSupply();
    const max = await this.fetchMaxSupply();

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

    const circulating = await this.fetchCirculatingSupply();

    return new Supply({
      total,
      circulating,
      max,
      modifiers: modifiersWithBalances,
    });
  }
}

module.exports = Qtum;
