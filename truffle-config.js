var HDWalletProvider = require('truffle-hdwallet-provider');
var mnemonic = 'hello hello';

module.exports = {
  plugins: ['solidity-coverage'],
  networks: {
    // mainnet: {
    //   provider: function() {
    //     return new HDWalletProvider(mnemonic, 'https://mainnet.infura.io/v3/b1a09f85070f4b0992f75729f569b0b1');
    //   },
    //   port: 8545,
    //   network_id: 1,
    // },
    rinkeby: {
      provider: function() {
        return new HDWalletProvider(mnemonic, 'https://rinkeby.infura.io/v3/b1a09f85070f4b0992f75729f569b0b1');
      },
      port: 8545,
      network_id: '4',
      skipDryRun: true,
    },
    development: {
      host: 'localhost',
      port: 8545,
      network_id: '*',
    },
    coverage: {
      host: 'localhost',
      network_id: '*',
      port: 8555,
      gas: 0xfffffffffff,
      gasPrice: 0x01,
    },
  },

  compilers: {
    solc: {
      version: '0.5.11', // 0.4.26, 0.5.11, 0.6.2
      settings: {
        optimizer: {
          enabled: true,
          runs: 999,
        },
        evmVersion: '', //basically verstion defult, petersburg, istanbul
      },
    },
  },
};
