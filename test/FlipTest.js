const Flip = artifacts.require("FlipCoin");
const truffleAssert = require("truffle-assertions");

//This tests are useless now that the DAPP uses an Oracle
contract("FlipCoin", async function(accounts){

  let instance;

  before(async function(){
    instance = await Flip.deployed();
  });

  it("should initalize with a balance of 0.1 ether ", async function(){
    let balance = parseFloat(await instance.getBalance());
    assert(balance === 100000000000000000);
  });
  it("shouldn't create bet with amount below 0.001 ether", async function(){
    await truffleAssert.fails(instance.createBet({from: accounts[1], value: web3.utils.toWei("0.0001", "ether")}),
  truffleAssert.ErrorType.REVERT);
  });
  it("shouldn't allow a player to place a bet if the player has already one", async function(){
    await instance.createBet({from: accounts[1], value: web3.utils.toWei("0.002", "ether")});
    await truffleAssert.fails(instance.createBet({from: accounts[1], value: web3.utils.toWei("0.001", "ether")}),
    truffleAssert.ErrorType.REVERT);
  });
  it("should create bet correctly", async function(){
    let instance = await Flip.new();
    await instance.depositFunds({from: accounts[0], value: web3.utils.toWei("0.5", "ether")});
    await instance.createBet({from: accounts[1], value: web3.utils.toWei("0.002", "ether")});
    let betPlayer = await instance.getBet({from: accounts[1]});
    assert(betPlayer.player === accounts[1] && betPlayer.amount.toNumber() === 2000000000000000
    && betPlayer.finished === false && betPlayer.placed === true, "Bet not created correctly");
  });
  it("should delete bet after flipping the coin", async function(){
    let instance = await Flip.new();
    await instance.depositFunds({from: accounts[0], value: web3.utils.toWei("0.5", "ether")});
    await instance.createBet({from: accounts[1], value: web3.utils.toWei("0.002", "ether")});
    //await instance.flip({from: accounts[1]});
    let betPlayer = await instance.getBet({from: accounts[1]});
    assert(betPlayer.player != accounts[1] && betPlayer.amount.toNumber() == 0
    && betPlayer.finished === false && betPlayer.placed === false, "Bet was not deleted correctly");
  });
  it("shouldn't allow non owner to withdraw funds", async function(){
    await truffleAssert.fails(instance.withdrawAll({from: accounts[1]}), truffleAssert.ErrorType.REVERT);
  });
  it("should allow only owner to withdraw funds", async function(){
    await truffleAssert.passes(instance.withdrawAll({from: accounts[0]}));
  });
  it("shouldn't accept bets above contract balance", async function(){
    let instance = await Flip.new();
    await instance.depositFunds({from:accounts[0], value: web3.utils.toWei("0.1", "ether")});
    await truffleAssert.fails(instance.createBet({from: accounts[2], value: web3.utils.toWei("0.2", "ether")}),
    truffleAssert.ErrorType.REVERT);
  });
});
