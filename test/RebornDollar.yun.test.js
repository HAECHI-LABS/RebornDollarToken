/*  RebornDollar Contract Audit
 *
 *   ISSUE LIST
 *
 *   1. user cannot check who is owner(notice? tip?)
 *   2. owner can be renounced(notice)
 *   3. when transferWithLockUp, sender can set due to past.
 *   4. cannot burn when paused, however can burnFrom even if paused
 *
 *
 *
 *
 */

const { constants, expectEvent, expectRevert, BN, ether, time } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const web3 = require('web3');

const tokenFactory = artifacts.require('RebornDollar');

require('chai').should();

// constant variable
const name = 'Reborn dollar';
const symbol = 'REBD';
const decimals = new BN('18');
const INITIAL_SUPPLY = new BN('2000000000').mul(ether('1'));

var token;

contract('RebornDollar', account => {
  const [owner, sender, recipient, spender, ...others] = account;

  beforeEach(async () => {
    token = await tokenFactory.new({ from: owner });
  });

  // RebornDollar.sol

  describe('#constructor()', () => {
    it('contract caller set to owner', async () => {
      (await token.owner()).should.be.equal(owner);
    });

    it("contract initializer's balance set to initial supply", async () => {
      (await token.balanceOf(owner)).should.be.bignumber.equal(INITIAL_SUPPLY);
    });

    it('name, symbol, decimals set properly', async () => {
      (await token.name()).should.be.equal(name);
      (await token.symbol()).should.be.equal(symbol);
      (await token.decimals()).should.be.bignumber.equal(decimals);
    });
  });

  describe('#transfer()', () => {
    var amount = new BN('100');

    it('should fail if recipient is ZERO_ADDRESS', async () => {
      await expectRevert.unspecified(token.transfer(constants.ZERO_ADDRESS, amount, { from: owner }));
    });

    it("should fail if sender's amount is lower than burnAmount", async () => {
      await expectRevert.unspecified(token.transfer(recipient, INITIAL_SUPPLY.add(new BN('1')), { from: owner }));
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
        (await token.balanceOf(owner)).should.be.bignumber.equal(INITIAL_SUPPLY.sub(amount));
      });

      it("recipient's balance should increase", async () => {
        (await token.balanceOf(recipient)).should.be.bignumber.equal(amount);
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

    it("should fail if sender's amount is lower than transfer burnAmount", async () => {
      await token.approve(spender, INITIAL_SUPPLY.mul(new BN('2')), { from: owner });
      await expectRevert.unspecified(
        token.transferFrom(owner, recipient, INITIAL_SUPPLY.add(new BN('1')), {
          from: owner,
        }),
      );
    });

    it('should fail if allowance is lower than transfer burnAmount', async () => {
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
        (await token.balanceOf(owner)).should.be.bignumber.equal(INITIAL_SUPPLY.sub(amount));
      });

      it("recipient's balance should increase", async () => {
        (await token.balanceOf(recipient)).should.be.bignumber.equal(amount);
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

  // ERC20Lockable

  describe('#transferWithLockUp()', () => {
    var amount = new BN('100');
    let now;
    let due;

    beforeEach(async () => {
      now = await time.latest();
    });

    it('should fail if recipient is ZERO_ADDRESS', async () => {
      due = now.add(await time.duration.days(1));
      await expectRevert.unspecified(token.transferWithLockUp(constants.ZERO_ADDRESS, amount, due, { from: owner }));
    });

    it("should fail if sender's amount is lower than burnAmount", async () => {
      due = now.add(await time.duration.days(1));
      await expectRevert.unspecified(
        token.transferWithLockUp(recipient, INITIAL_SUPPLY.add(new BN('1')), due, { from: owner }),
      );
    });

    it('should fail if try to lock with set due to past time', async () => {
      due = now.sub(await time.duration.days(1));
      await expectRevert.unspecified(token.transferWithLockUp(recipient, amount, due, { from: owner }));
    });

    it('user who has locked token cannot received locked token', async () => {
      due = now.add(await time.duration.days(1));
      await token.transferWithLockUp(recipient, amount, due, {
        from: owner,
      });
      await expectRevert(
        token.transferWithLockUp(recipient, amount, due, { from: owner }),
        'ERC20Lockable/lock : Cannot have more than one lock',
      );
    });

    describe('valid case', () => {
      var logs;

      beforeEach(async () => {
        due = now.add(await time.duration.days(1));
        const receipt = await token.transferWithLockUp(recipient, amount, due, {
          from: owner,
        });
        logs = receipt.logs;
      });

      it("sender's balance should decrease", async () => {
        (await token.balanceOf(owner)).should.be.bignumber.equal(INITIAL_SUPPLY.sub(amount));
      });

      it("recipient's balance should increase except lock amount", async () => {
        let lockInfo = await token.lockInfo(recipient);
        (await token.balanceOf(recipient)).should.be.bignumber.equal(amount.sub(lockInfo[0]));
      });

      it("recipient's lock info update properly", async () => {
        let lockInfo = await token.lockInfo(recipient);
        lockInfo[0].should.be.bignumber.equal(amount);
        lockInfo[1].should.be.bignumber.equal(due);
      });

      it('should emit Transfer event', async () => {
        expectEvent.inLogs(logs, 'Transfer', {
          0: owner,
          1: recipient,
          2: amount,
        });
      });

      it('should emit Lock event', async () => {
        expectEvent.inLogs(logs, 'Lock', {
          0: recipient,
          1: amount,
          2: due,
        });
      });
    });
  });

  describe('#unlock()', () => {
    let now, due;
    let amount = ether('1');

    beforeEach(async () => {
      now = await time.latest();
      due = now.add(await time.duration.weeks(1));
      await token.transferWithLockUp(recipient, amount, due, {
        from: owner,
      });
    });

    it('should fail if try to unlock before due', async () => {
      await expectRevert.unspecified(token.unlock(recipient));
    });

    describe('valid case', () => {
      let receipt;
      let beforeBalance;
      let afterBalance;
      beforeEach(async () => {
        beforeBalance = await token.balanceOf(recipient);
        await time.increase(await time.duration.weeks(2));
        receipt = await token.unlock(recipient);
        afterBalance = await token.balanceOf(recipient);
      });

      it("locked user's amount should increase amount of locked", async () => {
        afterBalance.should.be.bignumber.equal(beforeBalance.add(amount));
      });

      it('should delete lock information', async () => {
        let lockInfo;
        lockInfo = await token.lockInfo(recipient);
        lockInfo[0].should.be.bignumber.equal(new BN('0'));
        lockInfo[1].should.be.bignumber.equal(new BN('0'));
      });

      it('should emit Unlock event', () => {
        expectEvent(receipt, 'Unlock', {
          0: recipient,
          1: amount,
        });
      });
    });
  });

  describe('#releaseLock()', () => {
    let now, due;
    let amount = ether('1');

    beforeEach(async () => {
      now = await time.latest();
      due = now.add(await time.duration.weeks(1));
      await token.transferWithLockUp(recipient, amount, due, {
        from: owner,
      });
    });

    it('should fail if msg.sender is not owner', async () => {
      await expectRevert.unspecified(token.releaseLock(recipient, { from: others[0] }));
    });

    describe('valid case', () => {
      let receipt;
      let beforeBalance;
      let afterBalance;
      beforeEach(async () => {
        beforeBalance = await token.balanceOf(recipient);
        await time.increase(await time.duration.weeks(2));
        receipt = await token.releaseLock(recipient, { from: owner });
        afterBalance = await token.balanceOf(recipient);
      });

      it("locked user's amount should increase amount of locked", async () => {
        afterBalance.should.be.bignumber.equal(beforeBalance.add(amount));
      });

      it('should delete lock information', async () => {
        let lockInfo;
        lockInfo = await token.lockInfo(recipient);
        lockInfo[0].should.be.bignumber.equal(new BN('0'));
        lockInfo[1].should.be.bignumber.equal(new BN('0'));
      });

      it('should emit Unlock event', () => {
        expectEvent(receipt, 'Unlock', {
          0: recipient,
          1: amount,
        });
      });
    });
  });

  describe('#mint()', () => {
    let mintAmount = ether('1');

    it('should fail if msg.sender is not owner', async () => {
      await expectRevert(
        token.mint(recipient, mintAmount, { from: others[0] }),
        'Ownable : Function called by unauthorized user.',
      );
    });

    it('should fail when paused', async () => {
      await token.pause({ from: owner });
      await expectRevert.unspecified(token.mint(recipient, mintAmount, { from: owner }));
    });

    it('should fail if overflows', async () => {
      await expectRevert.unspecified(token.mint(recipient, constants.MAX_UINT256, { from: owner }));
    });

    it('should fail if try to mint to ZERO_ADDRESS', async () => {
      await expectRevert.unspecified(
        token.mint(constants.ZERO_ADDRESS, mintAmount, { from: owner }),
        'ERC20Mintable/mint : Should not mint to zero address',
      );
    });

    describe('valid case', async () => {
      let receipt;
      let beforeReceiverBalance, beforeTotalSupply;
      let afterReceiverBalance, afterTotalSupply;

      beforeEach(async () => {
        beforeReceiverBalance = await token.balanceOf(recipient);
        beforeTotalSupply = await token.totalSupply();
        receipt = await token.mint(recipient, mintAmount, { from: owner });
        afterReceiverBalance = await token.balanceOf(recipient);
        afterTotalSupply = await token.totalSupply();
      });

      it("receiver's amount should increase", async () => {
        afterReceiverBalance.should.be.bignumber.equal(beforeReceiverBalance.add(mintAmount));
      });

      it('totalSupply should increase', async () => {
        afterTotalSupply.should.be.bignumber.equal(beforeTotalSupply.add(mintAmount));
      });

      it('should emit Transfer event', () => {
        expectEvent(receipt, 'Transfer', {
          0: constants.ZERO_ADDRESS,
          1: recipient,
          2: mintAmount,
        });
      });

      it('should emit Mint event', () => {
        expectEvent(receipt, 'Mint', {
          0: recipient,
          1: mintAmount,
        });
      });
    });
  });

  describe('#burn()', () => {
    let burnAmount = ether('1');

    it('should fail if overflows', async () => {
      await expectRevert.unspecified(token.burn(constants.MAX_UINT256, { from: owner }));
    });

    it('should fail when paused', async() => {
        await token.pause({from: owner});
      await expectRevert.unspecified(token.burn(burnAmount, { from: owner }));

    })

    describe('valid case', () => {
      let receipt;

      beforeEach(async () => {
        receipt = await token.burn(burnAmount, { from: owner });
      });

      it('totalSupply should decrease', async () => {
        (await token.totalSupply()).should.be.bignumber.equal(INITIAL_SUPPLY.sub(burnAmount));
      });

      it("account's balance should decrease", async () => {
        (await token.balanceOf(owner)).should.be.bignumber.equal(INITIAL_SUPPLY.sub(burnAmount));
      });
      
      it('should emit Transfer event', async () => {
        expectEvent(receipt, 'Transfer', {
          0: owner,
          1: constants.ZERO_ADDRESS,
          2: burnAmount,
        });
      });

      it('should emit Burn event', async () => {
        expectEvent(receipt, 'Burn', {
          0: owner,
          1: burnAmount,
        });
      });
    });
  });

  describe('#burnFrom()', () => {
    let burnAmount = new BN('100');

    it('should fail if account is ZERO_ADDRESS', async () => {
      await expectRevert.unspecified(token.burnFrom(constants.ZERO_ADDRESS, burnAmount));
    });

    it("should fail if account's amount is lower than burn burnAmount", async () => {
      await token.approve(spender, INITIAL_SUPPLY.mul(new BN('2')), {
        from: owner,
      });
      await expectRevert.unspecified(token.burnFrom(owner, INITIAL_SUPPLY.add(new BN('1')), { from: spender }));
    });

    it('should fail if allowance is lower than burn burnAmount', async () => {
      await token.approve(spender, new BN('1'), { from: owner });
      await expectRevert.unspecified(token.burnFrom(owner, burnAmount, { from: spender }));
    });

    it("should fail even if try to burn account's token without approve process", async () => {
      await expectRevert.unspecified(token.burnFrom(owner, burnAmount, { from: owner }));
    });

    it('should fail when paused', async() => {
        await token.pause({from: owner});
      await token.approve(spender, burnAmount, { from: owner });
      await expectRevert.unspecified(token.burnFrom(owner, burnAmount, { from: spender }));

    });

    describe('valid case', () => {
      var receipt;

      beforeEach(async () => {
        await token.approve(spender, burnAmount, { from: owner });
        receipt = await token.burnFrom(owner, burnAmount, {
          from: spender,
        });
      });

      it('totalSupply should decrease', async () => {
        (await token.totalSupply()).should.be.bignumber.equal(INITIAL_SUPPLY.sub(burnAmount));
      });

      it("account's balance should decrease", async () => {
        (await token.balanceOf(owner)).should.be.bignumber.equal(INITIAL_SUPPLY.sub(burnAmount));
      });

      it('should emit Transfer event', async () => {
        expectEvent(receipt, 'Transfer', {
          0: owner,
          1: constants.ZERO_ADDRESS,
          2: burnAmount,
        });
      });

      it('allowance should decrease', async () => {
        (await token.allowance(owner, spender)).should.be.bignumber.equal(new BN('0'));
      });

      it('should emit Approval event', async () => {
        expectEvent(receipt, 'Approval', {
          0: owner,
          1: spender,
          2: new BN('0'),
        });
      });

      it('should emit Burn event', async () => {
        expectEvent(receipt, 'Burn', {
          0: owner,
          1: burnAmount,
        });
      });
    });
  });
});
