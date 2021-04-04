
/*global YUI */
YUI.add( 'user-api', function( Y, NAME ) {

    function populateData (requestData) {
        if( !requestData.countryMode ) {
            let practiceCountryMode = Y.doccirrus.commonutils.getCountryModeFromConfigs() || [];
            let countryMode = practiceCountryMode.length ? practiceCountryMode[0] : 'D';
            Y.log('Automatic settings POST: ' + practiceCountryMode, 'info', NAME);
            requestData.countryMode = [countryMode]; // reqd for /2 REST backward compatibility.
        }

        return {
            employee: requestData,
            identity: {
                username: requestData.username,
                memberOf: requestData.memberOf,
                roles: requestData.roles,

                firstname: requestData.firstname,
                lastname: requestData.lastname,

                locations: requestData.locations,
                status: requestData.status || 'ACTIVE'
            }
        };
    }

   Y.namespace( 'doccirrus.api' ).user = {
        name: NAME,

        get: (args) => {
            Y.log('Entering Y.doccirrus.api.user.get', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.user.get');
            }
            if (args.originalParams) {
                args.originalParams = {...args.originalParams, includeAll: true};
            } else {
                args.originalParams = { includeAll: true };
            }
            Y.doccirrus.api.employee.get(args);
        },
        post: (args) => {
            Y.log('Entering Y.doccirrus.api.user.post', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.user.post');
            }
            args.data = populateData(args.data);
            Y.doccirrus.api.employee.post(args);
        },
        put: (args) => {
            Y.log('Entering Y.doccirrus.api.user.put', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.user.put');
            }
            args.data = populateData(args.data);
            Y.doccirrus.api.employee.put(args);
        },
        delete: (args) => {
            Y.log('Entering Y.doccirrus.api.user.delete', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.user.delete');
            }
            Y.doccirrus.api.employee.delete(args);
        }
   };
},

   '0.0.1', {requires: [ 'intl', 'employee-api' ]}
);
