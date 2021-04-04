/**
 * User: rrrw
 * Date: 17.7.2018 16:30
 * (c) 2018, Doc Cirrus GmbH, Berlin
 */

/*global YUI */



YUI.add(
    'dcstatuscheck',
    function (Y, NAME) {

        function get(args) {
            Y.log('Entering Y.doccirrus.api.statuscheck.get', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.linkedactivities.statuscheck.get');
            }
            Y.log('ok, running', 'debug', NAME);
            args.callback(null, {
                meta: {
                    model: 'statuscheck',
                    tenant: args.user && args.user.tenantId,
                    timestamp: Date.now()
                },
                data: [
                    {
                        status: 'ok',
                        state: 'running', // Auth complete, DB Init complete, System ready???
                        mem: JSON.stringify(process.memoryUsage()),
                        load: JSON.stringify(require('os').loadavg())
                    }]
            });
        }

        Y.namespace('doccirrus').api.statuscheck = {
            get
        };
    }, '0.0.1',
    {
        requires: []
    }
);
