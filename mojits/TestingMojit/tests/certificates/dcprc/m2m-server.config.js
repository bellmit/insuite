/**
 * User: abhijit.baldawa
 * Date: 2019-04-02  17:48
 * (c) 2012, Doc Cirrus GmbH, Berlin
 *
 * This module exposes a Object in the exactly in the format as we would have in DCPRC server
 */

const
    keysDirPath = `${process.cwd()}/mojits/TestingMojit/tests/certificates/dcprc`;

module.exports = {
    serverKeyPath: `${keysDirPath}/server.key`,
    serverCrtPath: `${keysDirPath}/server.crt`,
    clientCAsPath: `${keysDirPath}/m2m-merged.ca`
};