// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.6;

contract CashbackController {
    uint256 public constant FEE_FRACTION = 20;            // 20/1000 (2%) taken as total transaction fees:
    uint256 public constant LVL1_CASHBACK_FRACTION = 5;   // 0.5% as cashback, 1.5% as developer fees.
    uint256 public constant LVL2_CASHBACK_FRACTION = 9;   // 0.9% as cashback, 1.1% as developer fees.
    uint256 public constant LVL3_CASHBACK_FRACTION = 13;  // 1.3% as cashback, 0.7% as developer fees.

    uint256 public constant LVL2_CASHBACK_TURNOVER = 35 * 10**14; // 0.0035 RBTC 
    uint256 public constant LVL3_CASHBACK_TURNOVER = 13 * 10**15; // 0.0130 RBTC 
  
    struct Merchant {
        string name;          // Business name.
        string description;   // Short business description.
        string contact;       // Contact information.
        address smartWallet;  // The address of the smart wallet that processes payments for this merchant.
    } 

    struct User {
        uint256 turnover;         // The total amount of satoshis payed using this service.
        uint256 cashbackBalance;  // Total amount of cashback that is not yet reedemed.
        uint256 cashbackFraction; // The fraction of fee that is given as cashback.
    }

    address internal developer;   // Contract developer.
    uint256 public developerFees; // Total amount of developer fees that is not yet reedemed.

    // Merchants and users.
    mapping(address => Merchant) public merchants; 
    address[] public merchantList;
    mapping(address => User) public users;
   
    // Reentrancy checker.
    bool internal locked;

    constructor() {
        developer = msg.sender;
    }

    function setMerchant(string calldata name, string calldata description, string calldata contact) external {
        // Sanity checks.
        require (bytes(name).length > 0, "Name must be set");
        require (bytes(description).length > 0, "Description must be set");
        require (bytes(contact).length > 0, "Contact information must be set");

        // Retrieve merchant info (if it exists).
        Merchant storage merchant = merchants[msg.sender];

        // Merchant doesn't exist yet.
        if (merchant.smartWallet == address(0)) {
            // Deploy new smart wallet for the merchant.
            MerchantSmartWallet smartWallet = new MerchantSmartWallet(this, msg.sender);

            // Register merchant. 
            merchants[msg.sender] = Merchant(name, description, contact, address(smartWallet));
            merchantList.push(msg.sender);
        }
        // Update merchant info.
        else {
            merchant.name = name;
            merchant.description = description;
            merchant.contact = contact;
        }
    }

    function getMerchants() external view returns(Merchant[] memory) {
        Merchant[] memory ret = new Merchant[](merchantList.length);
        for (uint256 i = 0; i < merchantList.length; i++) {
            ret[i] = merchants[merchantList[i]];
        }
        return ret;
    }

    function makePayment(address sender, address receiver) external payable {
        // Sanity checks.
        uint256 amount = msg.value;
        require (amount > 0, "Payment should be > 0");
        require (merchants[receiver].smartWallet != address(0x0), "Receiver must be a registered merchant");

        // Calculate the net amount (after deducting all transaction fees) that the merchant will receive.
        uint256 paymentValue = ((1000 - FEE_FRACTION) * amount) / 1000;

        // Update turnover for user.
        users[sender].turnover += amount;

        // See if cleared threshold then increase the cashback fraction.
        updateCashbackLevel(sender);
        
        // Increase cashback balance for user.
        uint256 cashback = (users[sender].cashbackFraction * amount) / 1000;
        users[sender].cashbackBalance += cashback;

        // Take developer fees.
        uint256 developerFee = amount - (cashback + paymentValue);
        developerFees += developerFee;

        // Transfer payment to the merchant's wallet.
        require (!locked, "No Reentrancy");
        locked = true;
        (bool sent, ) = receiver.call{value: paymentValue}("");
        locked = false;
        require(sent, "Failed to make payment");
    }

    function withdrawCashback() external {
        require (!locked, "No Reentrancy");
        locked = true;

        uint256 balance = users[msg.sender].cashbackBalance;
        users[msg.sender].cashbackBalance = 0;
        (bool sent, ) = msg.sender.call{value: balance}("");
        locked = false;

        require (sent, "Failed to send cashback");
    }

    function updateCashbackLevel(address sender) internal {
        if (users[sender].turnover < LVL2_CASHBACK_TURNOVER) {
            users[sender].cashbackFraction = LVL1_CASHBACK_FRACTION; 
        } else if (users[sender].turnover < LVL3_CASHBACK_TURNOVER) {
            users[sender].cashbackFraction = LVL2_CASHBACK_FRACTION;
        } else {
            users[sender].cashbackFraction = LVL3_CASHBACK_FRACTION;
        }
    }

    function withdrawDeveloperFees() external {
        require (msg.sender == developer);
        require (!locked, "No Reentrancy");
        locked = true;

        uint256 balance = developerFees;
        developerFees = 0;
        (bool sent, ) = msg.sender.call{value: balance}("");
        locked = false;

        require (sent, "Failed to send developer fees.");
    }
}

contract MerchantSmartWallet {
   CashbackController internal cashbackController;
   address internal merchantAddress;
   bool internal locked;

    constructor (CashbackController _cashbackController, address _merchantAddress) {
        cashbackController = _cashbackController;
        merchantAddress = _merchantAddress;
    }

    receive() external payable {
        require (!locked, "No Reentrancy");
        locked = true;
        cashbackController.makePayment{value: msg.value}(msg.sender, merchantAddress);
        locked = false;
    }
}

