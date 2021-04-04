/**
 * User: pi
 * Date: 10/03/16  15:25
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */
/*global Y, should, describe, it*/

describe( 'Access control tests', function() {
    let
        userGroups = Y.doccirrus.schemas.employee.userGroups;
    describe( '1. Check Y.doccirrus.schemas.employee.getGroupWeight', function() {
        let
            groups,
            weights = {};

        it( '1.1. getGroupWeight should be a function ', function() {
            should.exist( Y.doccirrus.schemas.employee.getGroupWeight );
            Y.doccirrus.schemas.employee.getGroupWeight.should.be.a( 'function' );
        } );
        it( '1.2. employee schema should have userGroups', function() {
            should.exist( Y.doccirrus.schemas.employee.userGroups );
            Y.doccirrus.schemas.employee.userGroups.should.be.a( 'object' );
            groups = Y.doccirrus.schemas.employee.userGroups;
        } );
        it( '1.3. getGroupWeight should return number', function() {
            let
                value = Y.doccirrus.schemas.employee.getGroupWeight();
            value.should.be.a( 'number' );
            Object.keys( groups ).forEach( groupName => {
                weights[ groupName ] = Y.doccirrus.schemas.employee.getGroupWeight( groupName );
            } );
            weights.should.be.an( 'object' ).that.has.all.keys( Object.keys( groups ) );
        } );
        it( '1.4. SUPPORT should have greatest weight', function() {
            Object.keys( groups ).every( group => {
                if( userGroups.SUPPORT === group ) {
                    return true;
                }
                return weights[ group ] < weights[ userGroups.SUPPORT ];
            } ).should.equal( true );
        } );
        it( '1.5. REDUCED USER should have least weight', function() {
            Object.keys( groups ).every( group => {
                if( userGroups.USER === group ) {
                    return true;
                }
                return weights[ group ] >= weights[ userGroups.REDUCED_USER ];
            } ).should.equal( true );

        } );
        it( '1.6. groups weight should match following chain: Reduced User < PARTNER < USER < PHYSICIAN < SUPERUSER < CONTROLLER < ADMIN < SUPPORT', function() {
            let
                sortedGroups = Object.keys( userGroups ).map( prop => userGroups[ prop ] ).sort( ( a, b ) => {
                    let
                        aWeight = Y.doccirrus.schemas.employee.getGroupWeight( a ),
                        bWeight = Y.doccirrus.schemas.employee.getGroupWeight( b );
                    if( aWeight === bWeight ) {
                        return 0;
                    }
                    return (aWeight > bWeight ) ? 1 : -1;
                } );
            sortedGroups[ 0 ].should.equal( userGroups.REDUCED_USER );
            sortedGroups[ 1 ].should.equal( userGroups.PHARMACY_STAFF );
            sortedGroups[ 2 ].should.equal( userGroups.USER );
            sortedGroups[ 3 ].should.equal( userGroups.PARTNER );
            sortedGroups[ 4 ].should.equal( userGroups.PHARMACIST );
            sortedGroups[ 5 ].should.equal( userGroups.PHYSICIAN );
            sortedGroups[ 6 ].should.equal( userGroups.SUPERUSER );
            sortedGroups[ 7 ].should.equal( userGroups.CONTROLLER );
            sortedGroups[ 8 ].should.equal( userGroups.ADMIN );
            sortedGroups[ 9 ].should.equal( userGroups.SUPPORT );
        } );

    } );
    describe( '2. Check Y.doccirrus.authpub.hasEnoughGroupRights', function() {
        it( '2.1. hasEnoughGroupRights should be a function ', function() {
            should.exist( Y.doccirrus.authpub.hasEnoughGroupRights );
            Y.doccirrus.authpub.hasEnoughGroupRights.should.be.a( 'function' );
        } );
        describe( '2.2. "ADMIN" User should have all rights', function() {
            let
                fakeUser = {
                    groups: [ userGroups.ADMIN ]
                };
            it( '2.2.1. User should have "ADMIN" group', function() {
                fakeUser.groups.should.contain( userGroups.ADMIN );
            } );
            it( '2.2.2. hasEnoughGroupRights should return true for "ADMIN" group', function() {
                let
                    value = Y.doccirrus.authpub.hasEnoughGroupRights( fakeUser.groups, userGroups.ADMIN );
                value.should.equal( true );
            } );
            it( '2.2.3. hasEnoughGroupRights should return true for "CONTROLLER" group', function() {
                let
                    value = Y.doccirrus.authpub.hasEnoughGroupRights( fakeUser.groups, userGroups.CONTROLLER );
                value.should.equal( true );
            } );
            it( '2.2.4. hasEnoughGroupRights should return true for "SUPERUSER" group', function() {
                let
                    value = Y.doccirrus.authpub.hasEnoughGroupRights( fakeUser.groups, userGroups.SUPERUSER );
                value.should.equal( true );
            } );
            it( '2.2.5. hasEnoughGroupRights should return true for "PHYSICIAN" group', function() {
                let
                    value = Y.doccirrus.authpub.hasEnoughGroupRights( fakeUser.groups, userGroups.PHYSICIAN );
                value.should.equal( true );
            } );
            it( '2.2.6. hasEnoughGroupRights should return true for "USER" group', function() {
                let
                    value = Y.doccirrus.authpub.hasEnoughGroupRights( fakeUser.groups, userGroups.USER );
                value.should.equal( true );
            } );

        } );
        describe( '2.3. "USER" User should have minimum rights', function() {
            let
                fakeUser = {
                    groups: [ userGroups.USER ]
                };
            it( '2.3.1. User should have "USER" group', function() {
                fakeUser.groups.length.should.equal( 1 );
                fakeUser.groups.should.contain( userGroups.USER );
            } );
            it( '2.3.2. hasEnoughGroupRights should return true for "USER" group', function() {
                let
                    value = Y.doccirrus.authpub.hasEnoughGroupRights( fakeUser.groups, userGroups.USER );
                value.should.equal( true );
            } );
            it( '2.3.3. hasEnoughGroupRights should return false for "PHYSICIAN" group', function() {
                let
                    value = Y.doccirrus.authpub.hasEnoughGroupRights( fakeUser.groups, userGroups.PHYSICIAN );
                value.should.equal( false );
            } );
            it( '2.3.4. hasEnoughGroupRights should return false for "SUPERUSER" group', function() {
                let
                    value = Y.doccirrus.authpub.hasEnoughGroupRights( fakeUser.groups, userGroups.SUPERUSER );
                value.should.equal( false );
            } );
            it( '2.3.5. hasEnoughGroupRights should return false for "CONTROLLER" group', function() {
                let
                    value = Y.doccirrus.authpub.hasEnoughGroupRights( fakeUser.groups, userGroups.CONTROLLER );
                value.should.equal( false );
            } );
            it( '2.3.6. hasEnoughGroupRights should return false for "ADMIN" group', function() {
                let
                    value = Y.doccirrus.authpub.hasEnoughGroupRights( fakeUser.groups, userGroups.ADMIN );
                value.should.equal( false );
            } );
        } );
        describe( '2.4. User who is in "USER", "SUPERUSER" groups should have "USER", "PHYSICIAN" and "SUPERUSER"', function() {
            let
                fakeUser = {
                    groups: [ userGroups.USER, userGroups.SUPERUSER ]
                };
            it( '2.4.1. User should have "USER" and "SUPERUSER" groups', function() {
                fakeUser.groups.length.should.equal( 2 );
                fakeUser.groups.should.contain( userGroups.USER );
                fakeUser.groups.should.contain( userGroups.SUPERUSER );
            } );
            it( '2.4.2. hasEnoughGroupRights should return true for "USER" group', function() {
                let
                    value = Y.doccirrus.authpub.hasEnoughGroupRights( fakeUser.groups, userGroups.USER );
                value.should.equal( true );
            } );
            it( '2.4.3. hasEnoughGroupRights should return true for "PHYSICIAN" group', function() {
                let
                    value = Y.doccirrus.authpub.hasEnoughGroupRights( fakeUser.groups, userGroups.PHYSICIAN );
                value.should.equal( true );
            } );
            it( '2.4.4. hasEnoughGroupRights should return true for "SUPERUSER" group', function() {
                let
                    value = Y.doccirrus.authpub.hasEnoughGroupRights( fakeUser.groups, userGroups.SUPERUSER );
                value.should.equal( true );
            } );
            it( '2.4.5. hasEnoughGroupRights should return false for "CONTROLLER" group', function() {
                let
                    value = Y.doccirrus.authpub.hasEnoughGroupRights( fakeUser.groups, userGroups.CONTROLLER );
                value.should.equal( false );
            } );
            it( '2.4.6. hasEnoughGroupRights should return false for "ADMIN" group', function() {
                let
                    value = Y.doccirrus.authpub.hasEnoughGroupRights( fakeUser.groups, userGroups.ADMIN );
                value.should.equal( false );
            } );
        } );

    } );
    describe( '3. Check Y.doccirrus.auth.hasCollectionAccess', function() {
        let
            users = {
                admin: {
                    groups: [
                        { group: userGroups.ADMIN },
                        { group: userGroups.USER }
                    ]
                },
                controller: {
                    groups: [
                        { group: userGroups.CONTROLLER },
                        { group: userGroups.USER }
                    ]
                },
                superuser: {
                    groups: [
                        { group: userGroups.SUPERUSER },
                        { group: userGroups.USER }
                    ]
                },
                physician: {
                    groups: [
                        { group: userGroups.PHYSICIAN },
                        { group: userGroups.USER }
                    ]
                },
                user: {
                    groups: [
                        { group: userGroups.USER }
                    ]
                }
            }, i = 2;
        it( '3.1. Y.doccirrus.auth.hasCollectionAccess should be a function ', function() {
            should.exist( Y.doccirrus.auth.hasCollectionAccess );
            Y.doccirrus.auth.hasCollectionAccess.should.be.a( 'function' );
        } );
        let
            rules = [
                {
                    collectionName: 'audit',
                    groups: {
                        user: {
                            write: false,
                            read: false
                        },
                        physician: {
                            write: false,
                            read: false
                        },
                        superuser: {
                            write: false,
                            read: true
                        },
                        controller: {
                            write: false,
                            read: true
                        },
                        admin: {
                            write: true,
                            read: true
                        }
                    }
                },
                {
                    collectionName: 'employee',
                    groups: {
                        user: {
                            write: false,
                            read: false
                        },
                        physician: {
                            write: false,
                            read: false
                        },
                        superuser: {
                            write: false,
                            read: true
                        },
                        controller: {
                            write: false,
                            read: true
                        },
                        admin: {
                            write: true,
                            read: true
                        }
                    }
                },
                {
                    collectionName: 'identity',
                    groups: {
                        user: {
                            write: false,
                            read: true
                        },
                        physician: {
                            write: false,
                            read: true
                        },
                        superuser: {
                            write: false,
                            read: true
                        },
                        controller: {
                            write: false,
                            read: true
                        },
                        admin: {
                            write: true,
                            read: true
                        }
                    }
                },
                {
                    collectionName: 'formtemplates',
                    groups: {
                        user: {
                            write: false,
                            read: true
                        },
                        physician: {
                            write: false,
                            read: true
                        },
                        superuser: {
                            write: true,
                            read: true
                        },
                        controller: {
                            write: true,
                            read: true
                        },
                        admin: {
                            write: true,
                            read: true
                        }
                    }
                },
                {
                    collectionName: 'formtemplateversions',
                    groups: {
                        user: {
                            write: false,
                            read: true
                        },
                        physician: {
                            write: false,
                            read: true
                        },
                        superuser: {
                            write: true,
                            read: true
                        },
                        controller: {
                            write: true,
                            read: true
                        },
                        admin: {
                            write: true,
                            read: true
                        }
                    }
                },
                {
                    collectionName: 'incaseconfigurations',
                    groups: {
                        user: {
                            write: false,
                            read: true
                        },
                        physician: {
                            write: false,
                            read: true
                        },
                        superuser: {
                            write: true,
                            read: true
                        },
                        controller: {
                            write: true,
                            read: true
                        },
                        admin: {
                            write: true,
                            read: true
                        }
                    }
                },
                {
                    collectionName: 'invoiceconfigurations',
                    groups: {
                        user: {
                            write: false,
                            read: true
                        },
                        physician: {
                            write: false,
                            read: true
                        },
                        superuser: {
                            write: true,
                            read: true
                        },
                        controller: {
                            write: true,
                            read: true
                        },
                        admin: {
                            write: true,
                            read: true
                        }
                    }
                },
                {
                    collectionName: 'activitysettings',
                    groups: {
                        user: {
                            write: false,
                            read: true
                        },
                        physician: {
                            write: false,
                            read: true
                        },
                        superuser: {
                            write: true,
                            read: true
                        },
                        controller: {
                            write: true,
                            read: true
                        },
                        admin: {
                            write: true,
                            read: true
                        }
                    }
                },
                {
                    collectionName: 'practices',
                    groups: {
                        user: {
                            write: false,
                            read: true
                        },
                        physician: {
                            write: false,
                            read: true
                        },
                        superuser: {
                            write: true,
                            read: true
                        },
                        controller: {
                            write: true,
                            read: true
                        },
                        admin: {
                            write: true,
                            read: true
                        }
                    }
                },
                {
                    collectionName: 'locations',
                    groups: {
                        user: {
                            write: false,
                            read: true
                        },
                        physician: {
                            write: false,
                            read: true
                        },
                        superuser: {
                            write: true,
                            read: true
                        },
                        controller: {
                            write: true,
                            read: true
                        },
                        admin: {
                            write: true,
                            read: true
                        }
                    }
                },
                {
                    collectionName: 'kbvlogs',
                    groups: {
                        user: {
                            write: false,
                            read: true
                        },
                        physician: {
                            write: false,
                            read: true
                        },
                        superuser: {
                            write: true,
                            read: true
                        },
                        controller: {
                            write: true,
                            read: true
                        },
                        admin: {
                            write: true,
                            read: true
                        }
                    }
                },
                {
                    collectionName: 'company',
                    groups: {
                        user: {
                            write: false,
                            read: true
                        },
                        physician: {
                            write: false,
                            read: true
                        },
                        superuser: {
                            write: true,
                            read: true
                        },
                        controller: {
                            write: true,
                            read: true
                        },
                        admin: {
                            write: true,
                            read: true
                        }
                    }
                }
            ];
        rules.forEach( rule => {
            let
                collectionName = rule.collectionName;
            describe( `3.${i}. Check ${collectionName} collection`, function() {
                let
                    j = 1;
                Object.keys( rule.groups ).forEach( groupName => {
                    it( `3.${i}.${j}. check "${groupName}" group rights`, function() {
                        let
                            group = rule.groups[ groupName ],
                            _user = users[ groupName ],
                            write = Y.doccirrus.auth.hasCollectionAccess( _user, 'write', collectionName ),
                            read = Y.doccirrus.auth.hasCollectionAccess( _user, 'read', collectionName );
                        write.should.equal( group.write );
                        read.should.equal( group.read );
                    } );
                    j++;
                } );
            } );
            i++;
        } );
    } );

} );



