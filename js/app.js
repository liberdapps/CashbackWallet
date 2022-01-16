const contractSpecs = {
  "abi": [
    {
      "inputs": [],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "inputs": [],
      "name": "developerFees",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "feeFraction",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getMerchants",
      "outputs": [
        {
          "components": [
            {
              "internalType": "string",
              "name": "name",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "description",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "contact",
              "type": "string"
            },
            {
              "internalType": "address",
              "name": "smartWallet",
              "type": "address"
            }
          ],
          "internalType": "struct CashbackController.Merchant[]",
          "name": "",
          "type": "tuple[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "sender",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "receiver",
          "type": "address"
        }
      ],
      "name": "makePayment",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "merchantList",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "merchants",
      "outputs": [
        {
          "internalType": "string",
          "name": "name",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "description",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "contact",
          "type": "string"
        },
        {
          "internalType": "address",
          "name": "smartWallet",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "name",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "description",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "contact",
          "type": "string"
        }
      ],
      "name": "setMerchant",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "users",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "turnover",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "cashbackBalance",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "cashbackFraction",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "withdrawCashback",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "withdrawDeveloperFees",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ]
};

const App = {

  contractInstance: null,

  init: async function () {

    let appData = {
      loadingError: null,
      walletAddress: null,
      qrcode: new QRious({ size: 200 }),
      merchantInfo: null,
      userInfo: null,
      merchantList: [],
      merchantEditMode: false,
      merchantInputName: "",
      merchantInputDescription: "",
      merchantInputContact: "",
      processing: false
    };

    try {
      if (!window.ethereum) {
        throw "Failure detecting wallet (err: 1)";
      }

      let response = await ethereum.request({ method: 'eth_requestAccounts' });
      window.web3 = new Web3(window.ethereum);

      if (!response) {
        throw "Failure detecting wallet (err: 2)";
      }

      let accounts = response;
      if (!accounts || !accounts.length) {
        throw "Failure detecting wallet (err: 3)";
      }

      App.contractInstance = new web3.eth.Contract(contractSpecs.abi, '0x4B5e92ed374b7fDC6e92fBBDE4a88d4ff1BAE7D6');
      appData.walletAddress = accounts[0];
      appData.merchantInfo = await App.contractInstance.methods.merchants(appData.walletAddress).call();
      appData.userInfo = await App.contractInstance.methods.users(appData.walletAddress).call();
      appData.merchantList = await App.contractInstance.methods.getMerchants().call();

      for (let i = 0; i < appData.merchantList.length; i++) {
        appData.merchantList[i].id = i;
      }

      if (!appData.merchantInfo.name) {
        appData.merchantInfo = null;
      } else {
        appData.merchantInputName = appData.merchantInfo.name;
        appData.merchantInputDescription = appData.merchantInfo.description;
        appData.merchantInputContact = appData.merchantInfo.contact;
      }

    } catch (err) {
      console.log(err);
      error = err;
      if (err.message) {
        error = err.message;
      }
      appData.loadingError = error;
    }

    Vue.component('dapp-page', {
      template: '#dapp-template',
      data() {
        return appData;
      },
      computed: {
        isFormValid() {
          return (
            !this.isEmpty(this.merchantInputName) &&
            !this.isEmpty(this.merchantInputDescription) &&
            !this.isEmpty(this.merchantInputContact)
          );
        },
        newQRCode() {
          this.qrcode.value = this.merchantInfo.smartWallet;
          return this.qrcode.toDataURL();
        },
        formattedUserInfo() {
          let info = {
            cashbackBalance: formatUnit(toBN(this.userInfo.cashbackBalance), 18) + ' rBTC',
          }

          if (this.userInfo.cashbackFraction === '0' || this.userInfo.cashbackFraction === '5') {
            info.cashbackLevel = '0.5%';
            info.nextLevelRemaining = formatUnit(toBN(35).mul(exp(10, 14)).sub(toBN(this.userInfo.turnover)), 18) + ' rBTC';
            info.nextLevelProgress = formatUnit(toBN(this.userInfo.turnover).mul(exp(10, 4)).div(toBN('35').mul(exp(10, 14))), 2) + '%';
          } else if(this.userInfo.cashbackFraction === '9') {
            info.cashbackLevel = '0.9%';
            info.nextLevelRemaining = formatUnit(toBN(13).mul(exp(10, 15)).sub(toBN(this.userInfo.turnover)), 18) + ' rBTC';
            info.nextLevelProgress = formatUnit(toBN(this.userInfo.turnover).mul(exp(10, 4)).div(toBN('13').mul(exp(10, 15))), 2) + '%';
          } else {
            info.cashbackLevel = '1.3%';
            info.nextLevelProgress = null;
            info.nextLevelRemaining = null;
          }

          return info;

        },

        hasCashback() {
          return (this.userInfo !== null && this.userInfo.cashbackBalance !== '0');
        }
      },
      methods: {
        isEmpty(str) {
          return (str === undefined || str === null || str.trim().length === 0);
        },
        async saveMerchantInfo() {
          let name = this.merchantInputName.trim();
          let description = this.merchantInputDescription.trim();
          let contact = this.merchantInputContact.trim();
          let ctx = this;

          function onError(err) {
            ctx.processing = false;
            console.log(err);

            // Error 4001 means that user just denied the signature of the transaction, no need to show an error.
            // The 'Invalid JSON RPC response' is a workaround for the RSK wallet which doesn't provide a good error code...
            if (err.code !== 4001 && String(err).indexOf("Invalid JSON RPC response") === -1) {
              let errorMsg = err;
              if (err.message && err.message.trim().length > 0) {
                errorMsg = err.message;
              }
              $("#errorMsg").text(errorMsg);
              $("#errorModal").modal('show');
            }
          }

          this.processing = true;

          invokeMethodAndWaitConfirmation(
            App.contractInstance.methods.setMerchant(name, description, contact), 
            this.walletAddress,
            async function() {
              try {
                let merchantInfo = await App.contractInstance.methods.merchants(ctx.walletAddress).call();
                let merchantList = await App.contractInstance.methods.getMerchants().call();
                for (let i = 0; i < merchantList.length; i++) {
                  merchantList[i].id = i;
                }

                ctx.merchantInfo = merchantInfo;
                ctx.merchantInputName = ctx.merchantInfo.name;
                ctx.merchantInputDescription = ctx.merchantInfo.description;
                ctx.merchantInputContact = ctx.merchantInfo.contact;
                ctx.merchantList = merchantList;

                ctx.processing = false;
                ctx.merchantEditMode = false;
              } catch (err) {
                onError(err);
              }
            },
            function(err) {
              onError(err);
            }
          );
        },
        editMerchantInfo() {
          this.merchantEditMode = true;
          this.$nextTick(() => this.$refs.txtName.focus());
        },
        cancelMerchantChanges() {
          this.merchantEditMode = false;
          this.merchantInputName = this.merchantInfo.name;
          this.merchantInputDescription = this.merchantInfo.description;
          this.merchantInputContact = this.merchantInfo.contact;
        },
        async withdrawCashback() {
          let ctx = this;
          this.processing = true;

          function onError(err) {
            ctx.processing = false;
            console.log(err);

            // Error 4001 means that user just denied the signature of the transaction, no need to show an error.
            // The 'Invalid JSON RPC response' is a workaround for the RSK wallet which doesn't provide a good error code...
            if (err.code !== 4001 && String(err).indexOf("Invalid JSON RPC response") === -1) {
              let errorMsg = err;
              if (err.message && err.message.trim().length > 0) {
                errorMsg = err.message;
              }
              $("#errorMsg").text(errorMsg);
              $("#errorModal").modal('show');
            }
          }
          
          invokeMethodAndWaitConfirmation(
            App.contractInstance.methods.withdrawCashback(), 
            this.walletAddress,
            async function() {
              try {
                ctx.userInfo = await App.contractInstance.methods.users(ctx.walletAddress).call();
                ctx.processing = false;
              } catch (err) {
                onError(err);
              }
            },
            function(err) {
              onError(err);
            }
          );       
        }

      }
    });

    new Vue({
      el: '#app'
    })
  }

};

function toBN(value) {
  return new web3.utils.BN(value);
}

function exp(base, exp) {
  return toBN(base).pow(toBN(exp));
}

function formatUnit(value, decimals) {
  let base = new web3.utils.BN(10).pow(new web3.utils.BN(decimals));
  let fraction = value.mod(base).toString(10);

  while (fraction.length < decimals) {
    fraction = `0${fraction}`;
  }

  fraction = fraction.match(/^([0-9]*[1-9]|0)(0*)/)[1];

  let whole = value.div(base).toString(10);
  value = `${whole}.${fraction}`;

  let paddingZeroes = decimals - fraction.length;
  while (paddingZeroes > 0) {
    paddingZeroes--;
    value = `${value}0`;
  }

  return value;
}

async function invokeMethodAndWaitConfirmation(contractMethod, walletAddress, onSuccessCallback, onErrorCallback) {
  let timer = null;
  let onErrorCalled = false;
  let onSuccessCalled = false;

  function stopTimer() {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  }

  function onError(err) {
    if (onErrorCalled) {
      return;
    }
    onErrorCalled = true;
    stopTimer();
    onErrorCallback(err);
  }

  async function monitorTx(hash) {
    let tx = await web3.eth.getTransactionReceipt(hash);
    if (tx) {
      if (tx.status) {
        stopTimer();
        if(onSuccessCalled) {
          return;
        }
        onSuccessCalled = true;
        onSuccessCallback();
        $("#successModal").modal('show');
      } else {
        onError('Transaction failed. Please try again later.');
      }        
    }
  }

  contractMethod.send({from: walletAddress, value: 0})
  .on('transactionHash', function (hash) {
    timer = setInterval(function() { monitorTx(hash) }, 5000);
  })
  .on('error', onError);  
}

$(window).load(function () {
  let attempts = 5;
  function detectWallet() {
    if (window.ethereum && window.ethereum.request || attempts === 0) {
      App.init();
    } else {
      attempts--;
      setTimeout(detectWallet, 2000);
    }
  }
  detectWallet();
});

