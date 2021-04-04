/**
 * User: abhijit.baldawa
 * Date: 2019-04-02  17:48
 * (c) 2012, Doc Cirrus GmbH, Berlin
 *
 * This module exposes a Object in the exactly in the format as we would have on datensafe
 */

const
    keysDirPath = `${process.cwd()}/mojits/TestingMojit/tests/certificates/prc`;

module.exports = {
    clientKeyPath: `${keysDirPath}/prcs.server.key`,
    clientCrtPath: `${keysDirPath}/prcs.server.crt`,
    serverCAsPath: `${keysDirPath}/doc-cirrus.ca`
};