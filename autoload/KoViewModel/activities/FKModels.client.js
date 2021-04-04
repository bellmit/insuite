/**
 * User: pi
 * Date: 03/12/15  09:50
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'FKModels', function( Y/*, NAME*/ ) {
        /**
         * @module FKModels
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            unwrap = ko.unwrap;

        /**
         * @class Fk4234Model
         * @constructor
         * @extends KoViewModel
         */
        //function Fk4234Model( config ) {
        //    Fk4234Model.superclass.constructor.call( this, config );
        //}
        //
        //Fk4234Model.ATTRS = {
        //    validatable: {
        //        value: true
        //
        //    }
        //};
        //Y.extend( Fk4234Model, KoViewModel.getBase(), {
        //
        //        initializer: function Fk4234Model_initializer() {
        //            var
        //                self = this;
        //            self.initFk4234Model();
        //        },
        //        destructor: function Fk4234Model_destructor() {
        //        },
        //        initFk4234Model: function Fk4234Model_initFk4234Model() {
        //        }
        //    },
        //    {
        //        schemaName: 'activity.Fk4234',
        //        NAME: 'Fk4234Model'
        //    }
        //);
        //KoViewModel.registerConstructor( Fk4234Model );

        /**
         * @class Fk4235Model
         * @constructor
         * @extends KoViewModel
         */
        function Fk4235Model( config ) {
            Fk4235Model.superclass.constructor.call( this, config );
        }

        Fk4235Model.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( Fk4235Model, KoViewModel.getBase(), {

                initializer: function Fk4235Model_initializer() {
                    var
                        self = this;
                    self.initFk4235Model();
                },
                destructor: function Fk4235Model_destructor() {
                },
                initFk4235Model: function Fk4235Model_initFk4235Model() {
                },
                addFk4244Set: function( data ) {
                    var
                        self = this;
                    self.fk4244Set.push( data || {} );
                },
                removeFk4244Set: function( obj ) {
                    var
                        self = this;
                    self.fk4244Set.remove( obj );
                },
                addFk4256Set: function( data ) {
                    var
                        self = this;
                    self.fk4256Set.push( data || {} );
                },
                removeFk4256Set: function( obj ) {
                    var
                        self = this;
                    self.fk4256Set.remove( obj );
                },
                addFk4251Set: function() {
                    var
                        self = this;
                    // MOJ-8047: kbv data structure changed we only allow one element now
                    if( 0 !== self.fk4251Set().length ) {
                        return;
                    }
                    self.fk4251Set.push( {} );
                },
                removeFk4251Set: function( obj ) {
                    var
                        self = this;
                    self.fk4251Set.remove( obj );
                }
            },
            {
                schemaName: 'activity.Fk4235Set',
                NAME: 'Fk4235Model'
            }
        );
        KoViewModel.registerConstructor( Fk4235Model );

        /**
         * @class Fk4244Model
         * @constructor
         * @extends KoViewModel
         */
        function Fk4244Model( config ) {
            Fk4244Model.superclass.constructor.call( this, config );
        }

        Fk4244Model.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( Fk4244Model, KoViewModel.getBase(), {

                initializer: function Fk4244Model_initializer() {
                    var
                        self = this;
                    self.initFk4244Model();
                },
                destructor: function Fk4244Model_destructor() {
                },
                select2Mapper: function( val ) {
                    return { id: val.seq, text: val.title, catalogShort: val.catalogShort };
                },
                initFk4244Model: function Fk4244Model_initFk4244Model() {
                    var
                        self = this;
                    self.addDisposable( ko.computed( function() {
                        self.fk4244();
                        self.fk4246();
                        self.revalidate();
                    } ) );
                }
            },
            {
                schemaName: 'activity.fk4235Set.fk4244Set',
                NAME: 'Fk4244Model'
            }
        );
        KoViewModel.registerConstructor( Fk4244Model );

        /**
         * @class Fk4251SetModel
         * @constructor
         * @extends KoViewModel
         */
        function Fk4251Model( config ) {
            Fk4251Model.superclass.constructor.call( this, config );
        }

        Fk4251Model.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( Fk4251Model, KoViewModel.getBase(), {

                initializer: function Fk4251Model_initializer() {
                    var
                        self = this;
                    self.initFk4251Model();
                },
                destructor: function Fk4251Model_destructor() {
                },
                initFk4251Model: function Fk4251Model_initFk4251Model() {
                }
            },
            {
                schemaName: 'activity.fk4235Set.Fk4251Set',
                NAME: 'Fk4251Model'
            }
        );
        KoViewModel.registerConstructor( Fk4251Model );

        /**
         * @class Fk5012Model
         * @constructor
         * @extends KoViewModel
         */
        function Fk5012Model( config ) {
            Fk5012Model.superclass.constructor.call( this, config );
        }

        Fk5012Model.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( Fk5012Model, KoViewModel.getBase(), {

                initializer: function Fk5012Model_initializer() {
                    var
                        self = this;
                    self.initFk5012Model();
                },
                destructor: function Fk5012Model_destructor() {
                },
                initFk5012Model: function Fk5012Model_initFk5012Model() {
                },
                addFk5011Set: function() {
                    var
                        self = this;
                    self.fk5011Set.push( {} );
                },
                removeFk5011Set: function( obj ) {
                    var
                        self = this;
                    self.fk5011Set.remove( obj );
                }
            },
            {
                schemaName: 'activity.fk5012Set',
                NAME: 'Fk5012Model'
            }
        );
        KoViewModel.registerConstructor( Fk5012Model );

        /**
         * @class Fk5011Model
         * @constructor
         * @extends KoViewModel
         */
        function Fk5011Model( config ) {
            Fk5011Model.superclass.constructor.call( this, config );
        }

        Fk5011Model.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( Fk5011Model, KoViewModel.getBase(), {

                initializer: function Fk5011Model_initializer() {
                    var
                        self = this;
                    self.initFk5011Model();
                },
                destructor: function Fk5011Model_destructor() {
                },
                initFk5011Model: function Fk5011Model_initFk5011Model() {
                }
            },
            {
                schemaName: 'activity.fk5012Set.fk5011Set',
                NAME: 'Fk5011Model'
            }
        );
        KoViewModel.registerConstructor( Fk5011Model );

        /**
         * @class Fk5020Model
         * @constructor
         * @extends KoViewModel
         */
        function Fk5020Model( config ) {
            Fk5020Model.superclass.constructor.call( this, config );
        }

        Fk5020Model.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( Fk5020Model, KoViewModel.getBase(), {

                initializer: function Fk5020Model_initializer() {
                    var
                        self = this;
                    self.initFk5020Model();
                },
                destructor: function Fk5020Model_destructor() {
                },
                initFk5020Model: function Fk5020Model_initFk5020Model() {
                    var
                        self = this;

                    /**
                     * validate those dependencies
                     */
                    self.addDisposable( ko.computed( function() {
                        unwrap( self.fk5020 );
                        self.fk5021.validate();
                    } ).extend( {rateLimit: ko.extenders.validate.VALIDATE_RATELIMIT_TIMEOUT} ) );
                }
            },
            {
                schemaName: 'activity.fk5011Set',
                NAME: 'Fk5020Model'
            }
        );
        KoViewModel.registerConstructor( Fk5020Model );

        /**
         * @class Fk5035Model
         * @constructor
         * @extends KoViewModel
         */
        function Fk5035Model( config ) {
            Fk5035Model.superclass.constructor.call( this, config );
        }

        Fk5035Model.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( Fk5035Model, KoViewModel.getBase(), {

                initializer: function Fk5035Model_initializer() {
                    var
                        self = this;
                    self.initFk5035Model();
                },
                destructor: function Fk5035Model_destructor() {
                },
                initFk5035Model: function Fk5035Model_initFk5035Model() {
                }
            },
            {
                schemaName: 'activity.fk5035Set',
                NAME: 'Fk5035Model'
            }
        );
        KoViewModel.registerConstructor( Fk5035Model );

        /**
         * @class Fk5036Model
         * @constructor
         * @extends KoViewModel
         */
        function Fk5036Model( config ) {
            Fk5036Model.superclass.constructor.call( this, config );
        }

        Fk5036Model.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( Fk5036Model, KoViewModel.getBase(), {

                initializer: function Fk5036Model_initializer() {
                    var
                        self = this;
                    self.initFk5036Model();
                },
                destructor: function Fk5036Model_destructor() {
                },
                initFk5036Model: function Fk5036Model_initFk5036Model() {
                }
            },
            {
                schemaName: 'activity.fk5036Set',
                NAME: 'Fk5036Model'
            }
        );
        KoViewModel.registerConstructor( Fk5036Model );

        /**
         * @class Fk5042Model
         * @constructor
         * @extends KoViewModel
         */
        function Fk5042Model( config ) {
            Fk5042Model.superclass.constructor.call( this, config );
        }

        Fk5042Model.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( Fk5042Model, KoViewModel.getBase(), {

                initializer: function Fk5042Model_initializer() {
                    var
                        self = this;
                    self.initFk5042Model();
                },
                destructor: function Fk5042Model_destructor() {
                },
                initFk5042Model: function Fk5042Model_initFk5042Model() {
                    var
                        self = this;
                    self.addDisposable( ko.computed( function() {
                        self.fk5042();
                        self.fk5043();
                        self.revalidate();
                    } ) );
                }
            },
            {
                schemaName: 'activity.fk5042Set',
                NAME: 'Fk5042Model'
            }
        );
        KoViewModel.registerConstructor( Fk5042Model );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'activity-schema'
        ]
    }
)
;