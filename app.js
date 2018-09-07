const addy        = require('./utils/address');
const bodyParser  = require('body-parser');
const express 	  = require('express');
const request     = require('request-promise');
const rp          = require('request-promise');
  

const app         = express()

// assign app settings from envirtonment || default values
const port    = process.env.PORT || 8080;

// convert to read this from Env setting
let deposit_address_list = addy.getAddressList('nem');
const update_url         = process.env.API_UPDATE_URL;

// parse application/json
app.use(bodyParser.json())

// make express look in the public directory for assets (css/js/img)
app.use(express.static(__dirname + '/public'));

// set the home page route
app.get('/', function(req, res) {
  const name    = process.env.HEROKU_APP_NAME || 'Unknown Name';
  const version = process.env.HEROKU_RELEASE_VERSION || 'Unknown Version';
  res.json({"name": name,"version": version}); 	
});

//
// Retrieve transaction sent to Abele XRP addresses
//
app.post('/transaction/update', function(req, res) {
  let count = 0;
  let total = 0;
  const errors = [];
  const promises = [];
  for (var address of deposit_address_list) {
    let url = 'http://'+ nem_server + '/account/transfers/incoming?address=' + address;
    console.log("processing deposit address "+address+" by checking URL "+url);
    var options = { uri: url, json: true };
    promises.push(rp(options)
      .then(function(body) {
        if (body && body.data.length > 0) {
          for (var txn of body.data) {
            let data = {};
            let address = txn.address;
            console.log("Tx is "+txn.meta.id+" with hash "+txn.meta.hash.data);
            console.log("Tx amount was "+txn.transaction.amount+" sent by "+address);
            data["wallet_address"] = nemsdk.model.address.toAddress(txn.transaction.signer, 104);
            data["tx_id"] = txn.meta.id;
            data["tx_hash"] = txn.meta.hash.data;
            data["amount"] = txn.transaction.amount;
            data["currency"] = 'XRP';
            count++;
            total += txn.value;
            request.post({
              url: update_url,
              method: "POST",
              json: true,
              body: data
            },
            function (error, response, body) {
              if (response.statusCode == 200) {
                console.log("Updated "+ data.tx_hash+ " successfully for sender "+data.wallet_address);
              } else {
                console.log("Update of txn "+txn.meta.hash.data+ " failed wallet"+nemsdk.model.address.toAddress(txn.transaction.signer, 104)+" Status "+response.statusCode);
                errors.push("Error " +response.statusCode+"  while updating wallet "+error);
              }
            });
          }
          console.log("Process "+count+" transactions for a total of "+total+" XRP");
        } else {
          console.log("No transactions for address "+address+" at ts "+new Date());
        }
      })
      .catch(function (err) {
        errors.push("Error processing wallet updates "+err);
      })
    );
  } 
  Promise.all(promises)
  .then(function(values) {
     if (errors && errors.length > 0) {
       res.send({ status: 500, error: errors });
     } else {
       res.send({ status: 200, error: errors });
     }
  });
});

// Start the app listening to default port
app.listen(port, function() {
   const name = process.env.HEROKU_APP_NAME || 'Unknown'
   console.log(name + ' app is running on port ' + port+" for any Tx @ "+deposit_address_list);
});
