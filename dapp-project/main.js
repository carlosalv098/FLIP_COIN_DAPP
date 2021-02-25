var web3 = new Web3(Web3.givenProvider);
var contractInstance;

$(document).ready(function(){
  window.ethereum.enable().then(function(accounts){
    contractInstance = new web3.eth.Contract(abi, "0x07A3919370175E4FD599D5503c9CB5c13108d786",
    {from: accounts[0]});
  })
  .then(function(){
    contractInstance.methods.getPlayer().call().then(function(player){
      $("#_player").text(player);
    })
  })
  .then(function(){
    contractInstance.methods.getPlayerBalance().call().then(function(playerBal){
      $("#balance_player").text(playerBal/1000000000000000000);
    })
  })
  .then(function(){
    contractInstance.methods.getContractBalance().call().then(function(contractBal){
      $("#balance_available_output").text(contractBal/1000000000000000000);
    })
  })
  .then(function(){
    contractInstance.methods.getContractBalance().call().then(function(contractBal){
      if(contractBal < 1000000000000000){
        $("#result").text("Contract does NOT have enough balance to play.");
      }
      else{
        $("#result").text("Player has not placed a bet yet.");
      }
    })
  });

  $("#place_bet_button").click(placeBet);
  $("#balance_available_button").click(balanceContract);
  $("#deposit_funds_button").click(deposit);
  $("#withdraw_button").click(withdrawAll);
  $("#check_balance_player").click(balancePlayer);
  $("#payout_player").click(payoutPlayer);

});

function getPlayer (){
  contractInstance.methods.getPlayer().call().then(function(playerAdd){
      $("#_player").text(playerAdd);
  })
}
function getPlayerAddress (){
  contractInstance.methods.getPlayer().call()
}

function placeBet(){

  var choice = $("#betChoice").val();
  var amount = $("#amount_input").val();
  var config = {
    value: web3.utils.toWei(amount, "ether")
  };

  contractInstance.methods.createBet(choice).send(config)
  .on("transactionHash", function(hash){
    console.log(hash);
    $("#bet_player_output").text("");
    $("#bet_amount_output").text("");
    $("#bet_decision_output").text("");
    $("#bet_status_output").text("Creating Bet...")
    $("#oracle_response").text("");
    $("#bet_result_output").text("");
  })
  .on("receipt", function(receipt){
    console.log(receipt);
  });

  contractInstance.once('LogNewProbableQuery',{
      filter: {player: getPlayerAddress()},
      fromBlock: 'latest'
    }, function(error, event){
          if (error) {
              $("#bet_status_output").text("Error, bet has not been placed correctly")}
          balanceContract();
          let betPlacedBy = event.returnValues.player;
          let betAmount = event.returnValues.amount;
          let betDecs = event.returnValues.decision;
          var choice;
          if(betDecs == 0){
            choice = "Head";
          }
          else {
            choice = "Tail";
          }
          $("#bet_player_output").text(betPlacedBy);
          $("#bet_amount_output").text(betAmount/1000000000000000000);
          $("#bet_decision_output").text(choice);
          $("#bet_status_output").text("Bet has been placed, waiting for Oracle response");
  });

  contractInstance.once('generatedRandomNumber', {
      filter: {player: getPlayerAddress()},
      fromBlock: 'latest'
    }, function (error, event){
          if (error) {
              $("#bet_status_output").text("Error, Random number was not generated")}
          else {
              let randNum = event.returnValues.random_Number;
              if (randNum == 0) {
                  $("#oracle_response").text("Head");
          }
              else {
                  $("#oracle_response").text("Tail");
              }
          }
  });

  contractInstance.once('betResult', {
      filter: {player: getPlayerAddress()},
      fromBlock: 'latest'
    }, function(error, event){
          if (error) throw ("Error");
          let result = event.returnValues.result;
          let amount = event.returnValues.amount;
          let amountEth = (amount/1000000000000000000);
          if (result == true){
            $("#bet_result_output").text("Congratulations! You won, " + amountEth + " ETH have been added to your Earnings balance");
          }
          else {
            $("#bet_result_output").text("You have lost, but you can try again!");
          }
          balancePlayer();
          balanceContract();
          $("#bet_status_output").text("Bet has Finished");
  });
}

function payoutPlayer(){
  contractInstance.methods.payoutPlayer().send()
  .on("transactionHash", function(){
      $("#result").text("Player Withdrawal in Process...");
  });

  contractInstance.once('playerWithdraw',{
      filter: {player: getPlayerAddress()},
      fromBlock: 'latest'
    }, function(error){
          if (error) throw ("Error fetching events");
          balancePlayer();
          $("#result").text('Player Withdrawal is Done');
        }
  );
}

function balancePlayer(){
  contractInstance.methods.getPlayerBalance().call().then(function(balance){
    $("#balance_player").text((balance)/1000000000000000000);
  });
}
function balanceContract(){
  contractInstance.methods.getContractBalance().call().then(function(balance){
    $("#balance_available_output").text(balance/1000000000000000000);
  });
}

function deposit(){
  var amount_deposit = $("#deposit_amount").val();

  var config_1 = {
    value: web3.utils.toWei(amount_deposit, "ether")
  };

  contractInstance.methods.depositFunds().send(config_1)
  .on("transactionHash", function(){
      $("#result").text("Funding Contract...")
  });

  contractInstance.once('contractFunded',{
      filter: {player: getPlayerAddress()},
      fromBlock: 'latest'
    }, function(error, event){
          if (error) throw ("Error fetching events");
          balanceContract();
          $("#result").text('Contract Funded Correctly');
  });
}

function withdrawAll(){
  contractInstance.methods.withdrawAllAvailable().send()
  .on("transactionHash", function(){
      $("#result").text("Owner Withdrawal in Process...");
  })

  contractInstance.once('contractWithdraw',{
      filter: {player: getPlayerAddress()},
      fromBlock: 'latest'
    }, function(error, event){
          if (error) throw ("Error fetching events");
          balanceContract();
          $("#result").text('Owner Withdrawal is Done');
  });
}
