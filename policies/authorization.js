/**
 * Authorization Key Generation & Verification
 */

 

//Check Authorization
var isAuthorized = function (authKey) {

    // If they pass in a basic auth credential it'll be in a header called "Authorization" (note NodeJS lowercases the names of headers in its request object)
    var auth = authKey;
    var uname = 'App@';
    var pwd = '54u31mpuzz';
    //var auth = req.headers['authorization'];  // auth is in base64(username:password)  so we need to decode the base64
    //console.log("Authorization Header is: ", auth);

    if (!auth) {     // No Authorization header was passed in so it's the first time the browser hit us

        return false;
    }
    else if (auth) {    // The Authorization was passed in so now we validate it

        var tmp = auth.split(' ');   // Split on a space, the original auth looks like  "Basic QXBwQDo1NHUzMW1wdXp6" and we need the 2nd part
        //console.log(tmp[1]);
        var buflen = uname.length + pwd.length + 1;
        //var buf = new Buffer(tmp[1], 'base64'); // create a buffer and tell it the data coming in is base64
        var buf = Buffer.alloc(buflen, tmp[1], 'base64'); // create a buffer and tell it the data coming in is base64
        var plain_auth = buf.toString();        // read it back out as a string
        //console.log(plain_auth);


        // At this point plain_auth = "username:password"

        var creds = plain_auth.split(':');      // split on a ':'
        var username = creds[0];
        var password = creds[1];

        if ((username == uname) && (password == pwd)) {   // Is the username/password correct?

            return true;
        }
        else {
            return false;
        }
    }
}

module.exports.isAuthorized = isAuthorized;
