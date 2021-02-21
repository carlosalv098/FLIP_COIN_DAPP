import "./Ownable.sol";
import "./provableAPI.sol";
import { SafeMath } from "./SafeMath.sol";

pragma solidity >= 0.5.0 < 0.6.0;

contract FlipCoin is Ownable, usingProvable {

    using SafeMath for uint;

    uint private minimumBet;
    uint private contractBalance;
    bytes32 queryId;
    uint private constant NUM_RANDOM_BYTES_REQUESTED = 1;

    struct Bet {
        address player;
        uint amount;
        bool betPlaced;
    }
    struct Pending {
        bytes32 id;
        address player;
        uint amount;
        uint queryPrice;
    }

    mapping (address => Bet) private bets;
    mapping (bytes32 => Pending) private pendingBets;
    mapping (address => uint) private playersBalance;

    constructor () public {
        minimumBet = 1000000000000000;
        provable_setProof(proofType_Ledger);
    }

    event LogNewProbableQuery(address indexed player);
    event generatedRandomNumber(uint indexed random_Number);
    event betResult(address indexed player, uint amount, bool indexed result);
    event contractFunded(address indexed owner, uint indexed amount);
    event playerWithdraw(address indexed player, uint indexed amount);
    event contractWithdraw(address indexed owner, uint indexed amount);
    event proofVerificationFail(bytes32 indexed Id);


    function createBet () public payable {
        require(bets[msg.sender].betPlaced == false, "Bet already placed");
        require(msg.value >= minimumBet, "Minimum bet has to be above 0.001 ETH");
        require(contractBalance >= msg.value, "Not enough balance in the contract to support the bet");

        Bet memory newBet = Bet(msg.sender, msg.value, true);
        _insertBet(newBet);

        uint QUERY_EXECUTION_DELAY = 0;
        uint GAS_FOR_CALLBACK = 200000;
        queryId = provable_newRandomDSQuery(QUERY_EXECUTION_DELAY, NUM_RANDOM_BYTES_REQUESTED, GAS_FOR_CALLBACK);

        Pending memory newPending = Pending(queryId, msg.sender, msg.value, provable_getPrice("Random"));
        _insertPending(newPending, queryId);

        contractBalance = contractBalance.sub(bets[msg.sender].amount);
        emit LogNewProbableQuery(msg.sender);
    }

    function __callback (bytes32 _queryId, string memory _result, bytes memory _proof) public {
        require(msg.sender == provable_cbAddress());

        if(provable_randomDS_proofVerify__returnCode(_queryId, _result, _proof) == 0){
            uint randomNumber = uint(keccak256(abi.encodePacked(_result))) % 2;
            emit generatedRandomNumber(randomNumber);
            address _player = pendingBets[_queryId].player;
            uint _amount = pendingBets[_queryId].amount;
            uint _oracleCost = pendingBets[_queryId].queryPrice;
            uint _totalAmount = _amount.mul(2).sub(_oracleCost);
            //whoever wins pays the Oracle fee
            if (randomNumber == 0) {
                playersBalance[_player] = playersBalance[_player].add(_totalAmount);
                emit betResult(_player, _totalAmount, true);
            }
            else {
                contractBalance = contractBalance.add(_totalAmount);
                emit betResult(_player, _amount, false);
            }
            delete bets[_player];
            //_deleteBet(_player);
            delete pendingBets[_queryId];
            //_deletePending(_queryId);
        }
        else {
            emit proofVerificationFail(_queryId);
        }
    }

    function _insertBet (Bet memory newBet) private {
        address betCreator = msg.sender;
        bets[betCreator] = newBet;
    }
    function _insertPending (Pending memory newPending, bytes32 _queryId) private {
        pendingBets[_queryId] = newPending;
    }

    function depositFunds () public payable onlyOwner returns (uint) {
        contractBalance = contractBalance.add(msg.value);
        emit contractFunded(msg.sender, msg.value);
        return contractBalance;
    }

    function getContractBalance () public view returns (uint) {
        return contractBalance;
    }
    function getPlayer () public view returns (address) {
        address playerAddress = msg.sender;
        return playerAddress;
    }
    function getPlayerBalance () public view returns (uint) {
        return playersBalance[msg.sender];
    }

    function withdrawAllAvailable () public onlyOwner returns (uint) {
        uint amountToWithdraw = contractBalance;
        require(amountToWithdraw > 0, "Contract balance is $0.00, there is nothing to withdraw");
        contractBalance = 0;
        msg.sender.transfer(amountToWithdraw);
        emit contractWithdraw(msg.sender, amountToWithdraw);
        return contractBalance;
    }

    function payoutPlayer () public {
        uint amounToPay = playersBalance[msg.sender];
        require(amounToPay > 0, "Your balance is $0.00, there is nothing to withdraw");
        playersBalance[msg.sender] = 0;
        msg.sender.transfer(amounToPay);
        emit playerWithdraw(msg.sender, amounToPay);
    }
}
