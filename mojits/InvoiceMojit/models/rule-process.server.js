/*global YUI */


YUI.add( 'rule-process', function( Y, NAME ) {
        const
            ObjectId = require( 'mongodb' ).ObjectID;

        function setIdStr( user, rule, callback ) {
            rule.idStr = rule._id && rule._id.toString();
            callback( null, rule );
        }

        function removeRuleLog( user, rule, callback ) {
            callback( null, rule ); // eslint-disable-line callback-return

            if( Y.doccirrus.auth.isMocha() ) { //do not run rule engine during mocha tests
                return;
            }

            let originalData = rule.originalData_ || rule,
                query = {
                    referenceArea: originalData.referenceArea,
                    ruleSetId: originalData._id && originalData._id.toString()
                },
                ids = [];


            if( originalData.rules && Array.isArray( originalData.rules ) ) {
                originalData.rules.forEach( rule => {
                    if( rule.ruleId ){
                        ids.push( rule.ruleId.toString() );
                    }
                } );
            }
            if( ids.length ){
                query.ruleId = { $in: ids };
            }
            Y.doccirrus.ruleutils.cleanRuleLog( user, query );
        }

        /**
         * @private
         *
         * traverse logical tree and return first founded value of operation key ($and|$or|$not)
         *
         * @param {Object} obj
         * @param {Object|undefined} parent
         * @returns {Object}
         */
        function traverseOperationTree( obj, parent ) {
            const ops = [ '\\\\$and', '\\\\$or', '\\\\$not' ];

            let keys = Object.keys( obj );
            if( Array.isArray( obj ) ){
                if( !obj.length ){
                    return obj;
                }
                for( let el of obj ){
                    return traverseOperationTree( el, obj );
                }
            } else if( keys && keys[0] && ops.includes( keys[0] ) ){
                for( let op of ops ){
                    if( obj[op] ){
                        return traverseOperationTree( obj[op], obj );
                    }
                }
            } else {
                return parent;
            }
        }

        /**
         * @private
         *
         * for given ruleset recalculate meta fields, in case new criterias can be added in process file
         *
         * @param {Object} ruleSet
         * @returns {Object} - mutated ruleSet object
         */
        function updateMeta( ruleSet ){
            let meta = Y.doccirrus.ruleutils.getMeta( ruleSet.rules, ruleSet );
            ruleSet.rules = ruleSet.rules.map( rule => {
                if( rule.ruleId ) {
                    return rule;
                }
                rule.ruleId = ( new ObjectId() ).toString();
                return rule;
            });

            ruleSet.idStr = ruleSet._id.toString();
            ruleSet.metaActTypes = meta.actTypes;
            ruleSet.metaActCodes = meta.actCodes;
            ruleSet.metaCriterias = (meta.criterias || []).filter( el => el.indexOf( '$' ) !== 0 );
            ruleSet.metaFuzzy = meta.metaFuzzy;
            ruleSet.metaCaseOpen = meta.metaCaseOpen;

            return ruleSet;
        }

        /**
         * @private
         *
         * if rule is nested in DOQUVIDE subtree set specialDOQUVIDE criteria for  MEASUREMENT and PROCESS validations
         *
         * @param {Object} user
         * @param {Object} ruleSet
         * @param {Function} callback
         *
         * @returns {Object} - mutated ruleSet object
         */
        function extendDOQUIDErule ( user, ruleSet, callback ){
            let isCasefolder = (ruleSet.caseFolderType || []).includes( 'CASEFOLDER' ),
                isPatient = (ruleSet.caseFolderType || []).includes( 'PATIENT' );
            if( isCasefolder || isPatient ) {
                return callback( null, ruleSet );
            }
            let parents = [ ruleSet. parent ],
                parentId = Y.doccirrus.schemas.rule.getDOQUVIDEDirId();

            if( !user || !user.tenantId ) {
                // skip updating for system users
                return callback( null, ruleSet );
            }

            Y.doccirrus.ruleutils.walkUpFrom( user, ruleSet.parent, (rule) => {
                if( rule ){
                    parents.push( rule.parent );
                }
            } ).then( () => {
                if( parents.includes(parentId) ){
                    (ruleSet.rules || []).forEach( rule => {
                        let criteriaFirst,
                            foundDoquvidoq = false,
                            criterias1Level,
                            criteriaActType;

                        const defaultCriteria = {
                            "context": "ACTIVITY",
                            "criteria": {
                                "actType": { "\\\\$eq": "MEASUREMENT" },
                                "specialDOQUVIDE": { "\\\\$eq": true }
                            }
                        };

                        if(!rule.validations){
                            rule.validations = {
                                '\\\\$and': [ defaultCriteria ]
                            };
                        } else {
                            criterias1Level = traverseOperationTree( rule.validations );

                            if( !criterias1Level ){
                                criterias1Level = [];
                            }
                            if( !criterias1Level.length ){
                                criterias1Level.push( defaultCriteria );
                            }
                        }

                        criterias1Level.forEach( validation => {
                            let criteria = validation.criteria || {};
                            if( !criteriaFirst && criteria ){
                                criteriaFirst = criteria;
                            }
                            if( criteria.specialDOQUVIDE ){
                                criteria.specialDOQUVIDE = {'\\\\$eq': true};
                                foundDoquvidoq = true;
                            }
                            if( criteria.actType ) {
                                criteriaActType = criteria.actType['\\\\$eq'] || criteria.actType;
                            }
                        } );

                        if( !foundDoquvidoq && criteriaFirst && criteriaActType && (criteriaActType === 'MEASUREMENT' || criteriaActType === 'PROCESS') ) {
                            criteriaFirst.specialDOQUVIDE = {'\\\\$eq': true};
                        }
                    } );

                    // for non folder ruleSet update meta data
                    if( ruleSet.rules && Array.isArray(ruleSet.rules) ) {
                        ruleSet = updateMeta( ruleSet );
                    }

                }
                callback( null, ruleSet );
            } );
        }

        /**
         * @private
         *
         * if rule is nested in CARDIO subtree set criteria patientId.partnerIds.partnerId equal to 'BIOTRONIK IN-TIME SOP'
         *
         * @param {Object} user
         * @param {Object} ruleSet
         * @param {Function} callback
         *
         * @returns {Object} - mutated ruleSet object
         */
        function extendCARDIOrule ( user, ruleSet, callback ){
            let parents = [ ruleSet. parent ],
                parentId = Y.doccirrus.schemas.rule.getCARDIODirId();

            if( !user || !user.tenantId ) {
                // skip updating for system users
                return callback( null, ruleSet );
            }

            Y.doccirrus.ruleutils.walkUpFrom( user, ruleSet.parent, (rule) => {
                if( rule ){
                    parents.push( rule.parent );
                }
            } ).then( () => {
                if( parents.includes(parentId) ){
                    (ruleSet.rules || []).forEach( rule => {
                        let criteriaFirst,
                            foundCardio = false,
                            criterias1Level;

                        const defaultCriteria = {
                            "context": "ACTIVITY",
                            "criteria": {
                                "actType": { "\\\\$eq": "MEASUREMENT" },
                                'patientId\\\\-partnerIds\\\\-partnerId': { '\\\\$eq': 'BIOTRONIK IN-TIME SOP' }
                            }
                        };
                        if(!rule.validations){
                            criterias1Level = [];
                            rule.validations = {
                                '\\\\$and': [ defaultCriteria ]
                            };
                        } else {
                            criterias1Level = traverseOperationTree( rule.validations );

                            if( !criterias1Level ){
                                criterias1Level = [];
                            }
                            if( !criterias1Level.length ){
                                criterias1Level.push( defaultCriteria );
                            }
                        }

                        criterias1Level.forEach( validation => {
                            if( !criteriaFirst && validation.criteria){
                                criteriaFirst = validation.criteria;
                            }
                            if( validation.criteria && validation.criteria['patientId\\\\-partnerIds\\\\-partnerId'] ){
                                validation.criteria['patientId\\\\-partnerIds\\\\-partnerId'] = {'\\\\$eq': 'BIOTRONIK IN-TIME SOP'};
                                foundCardio = true;
                            }
                        } );
                        if(!foundCardio && criteriaFirst){
                            criteriaFirst['patientId\\\\-partnerIds\\\\-partnerId'] = {'\\\\$eq': 'BIOTRONIK IN-TIME SOP'};
                        }

                        // for non folder ruleSet update meta data
                        if( ruleSet.rules && Array.isArray(ruleSet.rules) ) {
                            ruleSet = updateMeta( ruleSet );
                        }
                    } );
                }
                callback( null, ruleSet );
            } );
        }

        function dropRuleCache( user, ruleSet, callback ){
            Y.doccirrus.api.rule.dropCacheIPC();
            callback( null, ruleSet );
        }

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {
            pre: [
                {
                    run: [
                        setIdStr,
                        extendDOQUIDErule,
                        extendCARDIOrule
                    ], forAction: 'write'
                }
            ],
            post: [
                {
                    run: [
                        removeRuleLog,
                        dropRuleCache
                    ], forAction: 'write'
                },
                {
                    run: [
                        removeRuleLog,
                        dropRuleCache
                    ], forAction: 'delete'
                }

            ],

            name: NAME
        };

    },
    '0.0.1', { requires: ['rule-schema'] }
);
