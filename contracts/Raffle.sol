// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;
import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/vrf/VRFCoordinatorV2.sol";
import "@chainlink/contracts/src/v0.8/vrf/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";

error Raffle__NotEnoughETHEntered();
error Raffle__TransferFailed();
error Raffle__RaffleNotOpen();
error Raffle__UpkeepNotNeeded(
    uint256 balance,
    uint256 numPlayers,
    uint256 raffleState
);

/**@title A sample Raffle Contract
 * @author dsme1995
 * @notice This contract is for creating a sample raffle contract
 * @dev This implements the Chainlink VRF Version 2
 */

contract Raffle is VRFConsumerBaseV2, AutomationCompatibleInterface {
    enum RaffleState {
        OPEN,
        CALCULATING
    }

    uint256 private immutable i_entranceFee;
    address payable[] private s_players;
    bytes32 private immutable i_gasLane;
    uint64 private immutable i_subscriptionId;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private immutable i_callbackGasLimit;
    uint32 private constant NUM_WORDS = 1;
    address payable s_recent_winner;
    uint256 private s_lastTimestamp;
    uint256 private i_interval;
    RaffleState private s_raffleState;

    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;

    event RaffleEnter(address indexed player);
    event RequestRaffleWinner(uint256 indexed player);
    event WinnerPicked(address indexed player);

    constructor(
        address vrfCoordinator_,
        uint64 subscriptionId_,
        bytes32 gasLane_,
        uint256 interval_,
        uint256 entranceFee_,
        uint32 callbackGasLimit_
    ) VRFConsumerBaseV2(vrfCoordinator_) {
        i_entranceFee = entranceFee_;
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinator_);
        i_gasLane = gasLane_;
        i_subscriptionId = subscriptionId_;
        i_callbackGasLimit = callbackGasLimit_;
        s_raffleState = RaffleState.OPEN;
        s_lastTimestamp = block.timestamp;
        i_interval = interval_;
    }

    function enterRaffle() public payable {
        if (msg.value < i_entranceFee) revert Raffle__NotEnoughETHEntered();
        if (s_raffleState != RaffleState.OPEN) {
            revert Raffle__RaffleNotOpen();
        }
        s_players.push(payable(msg.sender));
        emit RaffleEnter(msg.sender);
    }

    function checkUpkeep(
        bytes memory /* checkData*/
    )
        public
        override
        returns (
            bool upkeepNeeded,
            bytes memory /*performData*/
        )
    {
        bool isOpen = (RaffleState.OPEN == s_raffleState);

        bool timePassed = ((block.timestamp - s_lastTimestamp) > i_interval);
        bool hasPlayers = (s_players.length > 0);
        bool hasBalance = address(this).balance > 0;
        upkeepNeeded = (isOpen && timePassed && hasPlayers && hasBalance);
    }

    function performUpkeep(bytes calldata /*performData*/)
        external
        override
        /* returns (bool upkeepNeeded, bytes memory performData) */
    {
        (bool upkeepNeeded, ) = checkUpkeep("");
        if (!upkeepNeeded) {
            revert Raffle__UpkeepNotNeeded(
                address(this).balance,
                s_players.length,
                uint256(s_raffleState)
            );
        }
        s_raffleState = RaffleState.CALCULATING;
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );
        emit RequestRaffleWinner(requestId);
    }

    function fulfillRandomWords(
        uint256, /* requestId */
        uint256[] memory randomWords
    ) internal override {
        uint256 indexOfWinner = randomWords[0] % s_players.length;
        address payable recentWinner = s_players[indexOfWinner];
        s_recent_winner = recentWinner;
        s_raffleState = RaffleState.OPEN;
        s_players = new address payable[](0);
        s_lastTimestamp = block.timestamp;
        (bool success, ) = recentWinner.call{value: address(this).balance}("");
        if (!success) {
            revert Raffle__TransferFailed();
        }
        emit WinnerPicked(recentWinner);
    }

    /*function performUpkeep(bytes calldata /*performData/*) external override {
         // performUpkeepFunction siganture example
    }*/

    function getRaffleState() public view returns (RaffleState){
        return s_raffleState;
    }

    function getNumWords() public pure returns(uint256){
        return NUM_WORDS;
    }

    function getRequestConfirmations() public pure returns(uint256){
        return REQUEST_CONFIRMATIONS;
    }

    function getLastTimestamp() public view returns(uint256){
        return s_lastTimestamp;
    }

    function getEntranceFee() public view returns (uint256) {
        return i_entranceFee;
    }

    function getPlayer(uint256 index_) public view returns (address) {
        return s_players[index_];
    }

    function getRecentWinner() public view returns (address payable) {
        return s_recent_winner;
    }

    function getInterval() public view returns(uint256) {
        return i_interval;
    }

    function getNumberOfPlayers() public view returns(uint256){
        return s_players.length;
    }
}
