const Driver = require('../models/driver');
const Supply = require('../models/supply');
const { promisesMap } = require('../util');

class Ontology extends Driver {
  constructor(options) {
    super({
      blockchain: 'Ontology',
      timeout: 100, // 10 requests per second
      supports: {
        balance: true,
      },
      options,
    });
  }

  async fetchTotalSupply() {
    const { result: { ont: totalSupply } } = await this.request('https://explorer.ont.io/api/v1/explorer/summary/native/totalsupply');

    return Number(totalSupply);
  }

  async fetchBalance(modifier) {
    const { result } = await this.request(`https://explorer.ont.io/v2/addresses/${modifier}/native/balances`);
    const record = result.find((item) => item.asset_name === 'ont');

    return record ? Number(record.balance) : 0;
  }

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

    const circulating = modifiersWithBalances
      .reduce((current, modifier) => current - modifier.balance, total);

    return new Supply({
      total,
      circulating,
      modifiers: modifiersWithBalances,
    });
  }
}

module.exports = Ontology;
