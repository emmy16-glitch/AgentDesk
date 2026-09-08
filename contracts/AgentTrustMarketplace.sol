// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal BNB Testnet registry for marketplace agent activations.
contract AgentTrustMarketplace {
    struct Activation { uint256 agentId; uint256 timestamp; uint256 amount; }
    mapping(uint256 => uint256) public agentPrice;
    mapping(address => Activation[]) private activations;
    event AgentHired(address indexed user, uint256 indexed agentId, uint256 timestamp);

    constructor() { uint256 price = 0.0001 ether; agentPrice[1] = price; agentPrice[2] = price; agentPrice[3] = price; agentPrice[4] = price; }

    function hireAgent(uint256 agentId) external payable {
        uint256 price = agentPrice[agentId];
        require(price != 0, "Unknown agent");
        require(msg.value >= price, "Insufficient BNB");
        activations[msg.sender].push(Activation(agentId, block.timestamp, msg.value));
        emit AgentHired(msg.sender, agentId, block.timestamp);
    }

    function getActivations(address user) external view returns (Activation[] memory) { return activations[user]; }
}
