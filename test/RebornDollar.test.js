const { constants, expectEvent, expectRevert, BN, ether, time } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const web3 = require('web3');

const tokenFactory = artifacts.require('RebornDollar');

require('chai').should();

const name = 'Reborn dollar';
const symbol = 'REBD';
const decimals = new BN('18');
const initial_supply = new BN('2').mul(new BN('10').pow(new BN('9')));
var token;
var init;
function expectNoEvent(receipt, event) {
  const logs = receipt.logs;
  const eventLogs = receipt.logs.filter(e => e.event == event);
  expect(eventLogs.length).to.be.equal(0);
}

function expectEvents(receipt, events, args) {
  for (var i = 0; i < events.length; i++) {
    expectEvent(receipt, events[i], args[i]);
  }
}

const INITIAL_BALANCE = [new BN('100'), new BN('1000'), new BN('2534')];

contract('RebornDollar', account => {
  const [owner, sender, recipient, spender, ...others] = account;
  beforeEach(async () => {
    token = await tokenFactory.new({ from: owner });
    await token.transfer(sender, INITIAL_BALANCE[0], { from: owner });
    await token.transfer(recipient, INITIAL_BALANCE[1], { from: owner });
    await token.transfer(spender, INITIAL_BALANCE[2], { from: owner });
    init = await token.balanceOf(owner);
  });

  describe('constructor', () => {
    it('total supply should be equal to initial supply', async () => {
      expect(await token.totalSupply()).to.be.bignumber.equal(initial_supply.mul(new BN('10').pow(decimals)));
    });

    it(`token name should be ${name}`, async () => {
      expect(await token.name()).to.be.equal(name);
    });

    it(`token symbol should be ${symbol}`, async () => {
      expect(await token.symbol()).to.be.equal(symbol);
    });
  });

  describe('#transfer()', () => {
    var amount = new BN('100');

    it('should fail if recipient is ZERO_ADDRESS', async () => {
      await expectRevert.unspecified(token.transfer(constants.ZERO_ADDRESS, amount, { from: owner }));
    });

    it("should fail if sender's amount is lower than value", async () => {
      await expectRevert.unspecified(token.transfer(recipient, init.add(new BN('1')), { from: owner }));
    });

    describe('valid case', () => {
      var logs;

      beforeEach(async () => {
        const receipt = await token.transfer(recipient, amount, {
          from: owner,
        });
        logs = receipt.logs;
      });

      it("sender's balance should decrease", async () => {
        (await token.balanceOf(owner)).should.be.bignumber.equal(init.sub(amount));
      });

      it("recipient's balance should increase", async () => {
        (await token.balanceOf(recipient)).should.be.bignumber.equal(INITIAL_BALANCE[1].add(amount));
      });

      it('should emit Transfer event', async () => {
        expectEvent.inLogs(logs, 'Transfer', {
          0: owner,
          1: recipient,
          2: amount,
        });
      });
    });
  });

  describe('#approve()', () => {
    let amount = new BN('100');

    it('should fail if spender is ZERO_ADDRESS', async () => {
      await expectRevert.unspecified(token.approve(constants.ZERO_ADDRESS, amount, { from: owner }));
    });

    describe('valid case', () => {
      var logs;

      beforeEach(async () => {
        const receipt = await token.approve(spender, amount, { from: owner });
        logs = receipt.logs;
      });

      it('allowance should set appropriately', async () => {
        (await token.allowance(owner, spender)).should.be.bignumber.equal(amount);
      });

      it('should emit Approval event', async () => {
        expectEvent.inLogs(logs, 'Approval', {
          0: owner,
          1: spender,
          2: amount,
        });
      });
    });
  });

  describe('#transferFrom()', () => {
    let amount = new BN('100');

    it('should fail if sender is ZERO_ADDRESS', async () => {
      // await token.approve(spender, amount, {from: constants.ZERO_ADDRESS});
      await expectRevert.unspecified(
        token.transferFrom(constants.ZERO_ADDRESS, recipient, amount, {
          from: spender,
        }),
      );
    });

    it('should fail if recipient is ZERO_ADDRESS', async () => {
      await token.approve(spender, amount, { from: owner });
      await expectRevert.unspecified(
        token.transferFrom(owner, constants.ZERO_ADDRESS, amount, {
          from: spender,
        }),
      );
    });

    it("should fail if sender's amount is lower than transfer value", async () => {
      await token.approve(spender, init.mul(new BN('2')), { from: owner });
      await expectRevert.unspecified(
        token.transferFrom(owner, recipient, init.add(new BN('1')), {
          from: owner,
        }),
      );
    });

    it('should fail if allowance is lower than transfer value', async () => {
      await token.approve(spender, new BN('1'), { from: owner });
      await expectRevert.unspecified(token.transferFrom(owner, recipient, amount, { from: spender }));
    });

    it("should fail even if try to transfer own's token without approve process", async () => {
      await expectRevert.unspecified(token.transferFrom(owner, recipient, amount, { from: owner }));
    });

    describe('valid case', () => {
      var logs;

      beforeEach(async () => {
        await token.approve(spender, amount, { from: owner });
        const receipt = await token.transferFrom(owner, recipient, amount, {
          from: spender,
        });
        logs = receipt.logs;
      });

      it("owner's balance should decrease", async () => {
        (await token.balanceOf(owner)).should.be.bignumber.equal(init.sub(amount));
      });

      it("recipient's balance should increase", async () => {
        (await token.balanceOf(recipient)).should.be.bignumber.equal(INITIAL_BALANCE[1].add(amount));
      });

      it('should emit Transfer event', async () => {
        expectEvent.inLogs(logs, 'Transfer', {
          0: owner,
          1: recipient,
          2: amount,
        });
      });

      it('allowance should decrease', async () => {
        (await token.allowance(owner, spender)).should.be.bignumber.equal(amount.sub(amount));
      });

      it('should emit Approval event', async () => {
        expectEvent.inLogs(logs, 'Approval', {
          0: owner,
          1: spender,
          2: amount.sub(amount),
        });
      });
    });
  });

  describe('#mint()', () => {
    let amount = new BN('100');
    let minted = others[0];

    it('should fail if account is ZERO_ADDRESS', async () => {
      await expectRevert.unspecified(token.mint(constants.ZERO_ADDRESS, amount));
    });

    it('should fail if overflows', async () => {
      await expectRevert.unspecified(token.mint(others[0], constants.MAX_UINT256, { from: owner }));
    });

    describe('valid case', () => {
      var logs;
      var totalBefore;

      beforeEach(async () => {
        totalBefore = await token.totalSupply();
        const receipt = await token.mint(others[0], amount);
        logs = receipt.logs;
      });

      it('total supply should increase', async () => {
        (await token.totalSupply()).should.be.bignumber.equal(totalBefore.add(amount));
      });

      it("account's balance should increase", async () => {
        (await token.balanceOf(others[0])).should.be.bignumber.equal(amount);
      });
      //transfer event
      it('should emit Transfer event', async () => {
        expectEvent.inLogs(logs, 'Transfer', {
          0: constants.ZERO_ADDRESS,
          1: others[0],
          2: amount,
        });
      });
      //mint event
      it('should emit Mint event', async () => {
        expectEvent.inLogs(logs, 'Mint', {
          0: others[0],
          1: amount,
        });
      });
    });
  });

  describe('#transferWithLockUp()', () => {
    const amount = new BN('100');
    var due;
    beforeEach(async () => {
      due = (await time.latest()).add(new BN('1000'));
    });

    it('should fail if recipient is zero address', async () => {
      await expectRevert(
        token.transferWithLockUp(constants.ZERO_ADDRESS, amount, due, { from: owner }),
        'ERC20Lockable/transferWithLockUp : Cannot send to zero address',
      );
    });

    it('should fail if there is alreay a lock', async () => {
      await token.transferWithLockUp(recipient, amount, due, { from: owner });
      await expectRevert(
        token.transferWithLockUp(recipient, amount, due, { from: owner }),
        'ERC20Lockable/lock : Cannot have more than one lock',
      );
    });

    describe('when transferWithLockUp succeeded', () => {
      var logs;
      var balances = {};
      beforeEach(async () => {
        balances.owner = await token.balanceOf(owner);
        balances.recipient = await token.balanceOf(recipient);
        logs = await token.transferWithLockUp(recipient, amount, due, { from: owner });
      });

      it("should decrease sender's balance", async () => {
        expect(await token.balanceOf(owner)).to.be.bignumber.equal(balances.owner.sub(amount));
      });

      it("recipient's balance should not increase", async () => {
        expect(await token.balanceOf(recipient)).to.be.bignumber.equal(balances.recipient);
      });

      it('should set lock info', async () => {
        const res = await token.lockInfo(recipient);
        expect(res.amount).to.be.bignumber.equal(amount);
        expect(res.due).to.be.bignumber.equal(due);
      });

      it('should emit Transfer event', async () => {
        expectEvent(logs, 'Transfer', {
          0: owner,
          1: recipient,
          2: amount,
        });
      });

      it('should emit Lock event', async () => {
        expectEvent(logs, 'Lock', {
          0: recipient,
          1: amount,
          2: due,
        });
      });
    });
  });
});
