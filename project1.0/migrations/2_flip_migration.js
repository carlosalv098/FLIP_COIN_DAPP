const Flip = artifacts.require("FlipCoin");

module.exports = function(deployer, network, accounts){
  deployer.deploy(Flip).then(function(instance){
    instance.depositFunds({from:accounts[0], value:web3.utils.toWei(".1", "ether")}).then(function(){
      instance.getContractBalance().then(function(balance){
        console.log("Contract Balance is " + balance);
      });
    });
  }).catch(function(err){
    console.log("Error deploying contract: " + err);
  });
}
