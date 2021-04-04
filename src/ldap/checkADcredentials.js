//npm install ldapjs
//http://ldapjs.org/client.html

/* globals console */
/* eslint-disable no-console */
const OPTS ={
    "server": {
        "url": "ldap://192.168.99.100:32873"
    }
};

const
    ldap = require('ldapjs'),
    client = ldap.createClient({
        url: OPTS.server.url
    });

const testUser = (user, pass) => {
   return new Promise( ( resolve ) => {
        console.log(`Testing: ${user}`);
        client.bind(user, pass, (err) => {
            console.warn( ' bind result', err && err.message );
            if(err ){
                return resolve( err.message );
            }
            resolve();
        } );
    } );
};


const sequential = async () => {
    await testUser( 'CN=Administrator,CN=Users,DC=samdom,DC=example,DC=com', 'Password1!' );
    await testUser( 'CN=gogo,CN=Users,DC=samdom,DC=example,DC=com', 'Password4!' );
    await testUser( 'CN=test,CN=Users,DC=samdom,DC=example,DC=com', 'Password3!' );
};

sequential().then( () => {
    process.exit(0);
});

