/*global YUI*/

YUI.add( 'JsonRpcInvocationPrivilegeEvaluator', function( Y, NAME ) {
    class JsonRpcInvocationPrivilegeEvaluator {

        constructor(reflection) {
            this.reflection = reflection;
            this.rpcObject = {};
            this.exposedApis = [                //  !rate-limits.json
                'calendar.gettime',             //  device server
                'auth.loginDevicePoll',         //  nfc-device login
                'auth.testConnection',          //  prc login
                'patientportal.resetPassword',  //  pp pw reset
                'employee.doResetEmployeePw'    //  prc pw reset
            ];
        }

        /**
         * Returns a object tree which leaves are the minimum access role for an rpc call
         * @returns {object}
         * @private
         */
        _getRpcMethodObj() {
            const
                localRpcList =  this.reflection &&  this.reflection.getDescription() || null,
                isEmptyRpcObject = Object.keys( this.rpcObject ).length === 0 && this.rpcObject.constructor === Object;

            if( isEmptyRpcObject && localRpcList ) {

                localRpcList.forEach( element => {

                    if( !this.rpcObject.hasOwnProperty( element.namespace ) ) {
                        this.rpcObject[element.namespace] = {};
                    }

                    if( this.rpcObject[element.namespace].hasOwnProperty( element.method ) ) {
                        Y.log( 'Error: duplicate in JSON RPC found', element, 'error', NAME );
                    }

                    this.rpcObject[element.namespace][element.method] = element.access || '';
                } );
            }
            return this.rpcObject;
        }

        /**
         * Minimum allowed UserGroup (i.e. 'ADMIN' 'SUPERUSER' or '') to acces the requested rpc
         * @param model {string}
         * @param action {string}
         * @returns {string}
         * @private
         */
         _getAccessGroup( model, action ) {

            const
                rpcMethod = this._getRpcMethodObj();
            if( rpcMethod.hasOwnProperty( model ) ) {
                if( rpcMethod[model].hasOwnProperty( action ) ) {
                    return rpcMethod[model][action];
                }
            }

            Y.log( 'Could not find JsonRpcReflection entry, Please add:  namespace: \'' + model + '\', method: \'' + action + '\'', 'error', NAME );

            // FAIL OPEN '' to collect all routes which are not in JSON RPC REFLECTION, switch to FAIL SAVE by returning 'ADMIN' as default
            return '';
        }

        /**
         * Function verifies if user has a role needed to access route
         * @param  user {object}
         * @param  model {string}
         * @param  action {string}
         * @returns {boolean}
         */
        isAllowed( user, model, action ) {
            let
                employeeGroups,
                userGroups,
                accessGroup;

            Y.log( `isAllowed: action: ${action} , model: ${model}`, 'debug', NAME );

            if( this.exposedApis.includes( model + '.' + action ) ) {
                return true;
            }

            if( !user ) {
                    return false;
            }
            userGroups = user.groups || user.memberOf;

            //  security relevant APIS should be checked
            //  https://confluence.intra.doc-cirrus.com/display/SD/Security+Relevant+Interfaces
            switch( model ) {
                case 'test':
                case 'performance':
                    accessGroup = 'ADMIN';
                    break;
                default:
                    accessGroup = this._getAccessGroup( model, action );
                    break;
            }
            if( accessGroup === '' ) {
                return true;
            }

            employeeGroups = Y.doccirrus.schemas.employee.userGroups;
            if( !employeeGroups.hasOwnProperty( accessGroup ) ) {
                Y.log( `isAllowed: Method access group not found! ${model}.${action}`, 'error', NAME );
                return true;
            }

            return Y.doccirrus.authpub.hasEnoughGroupRights( userGroups, accessGroup );
        }
    }

    Y.namespace( 'doccirrus' ).jsonrpc.privilige = {
        evaluator: new JsonRpcInvocationPrivilegeEvaluator(Y.doccirrus.jsonrpc && Y.doccirrus.jsonrpc.reflection),
        JsonRpcInvocationPrivilegeEvaluator
    };

}, '0.0.1', {
    requires: [
        'JsonRpcReflection-doccirrus'
    ]
} );
