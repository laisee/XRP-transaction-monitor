module.exports = {
  getAddressList: function(coin) {
    let list;
    if (process.env[coin.toUpperCase()+"_ADDRESS_LIST"]) {
      try {
        list = process.env[coin.toUpperCase()+"_ADDRESS_LIST"];
        if (list) {
          list = list.split(',');
        } else {
          throw "Address list for coin "+coin.toUpperCase()+" cannot be retrieved";
        }
      }
      catch (err) {
        console.log(err);
        throw err;
      }
    } else {
      throw coin.toUpperCase()+" Address list cannot be found in process.env ...";
    }
    return list;
  }
}
