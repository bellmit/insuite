//npm install ldapjs
//http://ldapjs.org/client.html

/* eslint-disable no-console */
let OPTS;

try {
    OPTS = require( process.cwd() + '/../../ldap.json' ) || {};
} catch( e ) {
    console.warn( 'cannot load ldap.json: ', e );
    return;
}

const
    ldap = require('ldapjs'),
    client = ldap.createClient({
        url: OPTS.server.url
    });
console.log('LDAP:', OPTS.server.url);
client.bind(OPTS.server.bindDN, OPTS.server.bindCredentials, (err) => {
    if(err){
        console.warn(`Error accessing LDAP ${err}`);
        process.exit(1);
    }

    //ldapsearch -x -W -D 'cn=admin,dc=test,dc=com' -b 'ou=groups,dc=test,dc=com' "(cn=*)" memberUid
    let opts = {
        filter: `(cn=*)`,
        scope: 'sub',
        attributes: ['dn', 'sn', 'cn', 'memberUid', 'member']
    };

    let searchBase = OPTS.server.groupsBase || ['ou=groups', OPTS.server.searchBase].join();
    client.search(searchBase, opts, (err, res) => {
        if(err){
            console.warn(`Error searching LDAP: ${err}`);
        }
        res.on('searchEntry', function(entry) {
            console.log('entry: ' + JSON.stringify(entry.object));
        });
        res.on('searchReference', function(referral) {
            console.log('referral: ' + referral.uris.join());
        });
        res.on('error', function(err) {
            console.warn('error: ' + err.message);
            process.exit(1);
        });
        res.on('end', function(result) {
            console.log('status: ' + result.status);
            process.exit(1);
        });

    } );
});