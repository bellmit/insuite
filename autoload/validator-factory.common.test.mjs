describe( 'validator-factory', function() {

    before( async function() {
        await import( './utils/utils.common.yui' );
        await import( './validator-factory.common.yui' );
    } );

    after( function() {
        Y = null;
    } );

    describe( 'Y.doccirrus.validator.factory.', function() {

        context( 'given single region system', function() {

            before( function() {
                Y.doccirrus.commonutils.getCountryModeFromConfigs = () => ['D'];
            } );

            context( 'given common multi validator', function() {

                beforeEach( function() {
                    this.fixture = [
                        { validate: () => false },
                        { validate: () => false }
                    ];
                } );

                describe( '.createMultiValidator()', function() {

                    it( 'returns multi validator with all inner validators', function() {
                        const validator = Y.doccirrus.validator.factory.createMultiValidator( this.fixture, 'foo' );

                        expect( validator ).to.eql(
                            [
                                this.fixture[0],
                                this.fixture[1]
                            ]
                        );
                    } );

                    it( 'returns multi validator with given metadata', function() {
                        const validator = Y.doccirrus.validator.factory.createMultiValidator( this.fixture, 'foo' );

                        expect( validator.__identifier ).to.exist;
                        expect( validator.__identifier ).to.eql( 'foo' );
                    } );

                    it( 'returns multi validator with helper function', function() {
                        const validator = Y.doccirrus.validator.factory.createMultiValidator( this.fixture, 'foo' );

                        expect( validator.__isCountrySpecific ).to.exist;
                        expect( validator.__isCountrySpecific ).to.be.false;
                    } );
                } );
            } );

            context( 'given multi validator which is not an array', function() {

                beforeEach( function() {
                    this.fixture = { validate: () => true };
                } );

                describe( '.createMultiValidator()', function() {

                    it( 'throws an error', function() {
                        expect( () => Y.doccirrus.validator.factory.createMultiValidator( this.fixture, 'foo' ) ).to.throw( Error );
                    } );
                } );
            } );

            context( 'given region specific multi validator with empty region', function() {

                beforeEach( function() {
                    this.fixture = [
                        { countries: [], validate: () => false },
                        { countries: ['DE'], validate: () => false },
                        { validate: () => false }
                    ];
                } );

                describe( '.createMultiValidator()', function() {

                    it( 'throws an error', function() {
                        expect( () => Y.doccirrus.validator.factory.createMultiValidator( this.fixture, 'foo' ) ).to.throw( Error );
                    } );
                } );
            } );

            context( 'given region specific multi validator with invalid region', function() {

                beforeEach( function() {
                    this.fixture = [
                        { countries: ['CH'], validate: () => false },
                        { countries: ['DE'], validate: () => false },
                        { validate: () => false }
                    ];
                } );

                describe( '.createMultiValidator()', function() {

                    it( 'throws an error', function() {
                        expect( () => Y.doccirrus.validator.factory.createMultiValidator( this.fixture, 'foo' ) ).to.throw( Error );
                    } );
                } );
            } );

            context( 'given region specific multi validator', function() {

                beforeEach( function() {
                    this.fixture = [
                        { countries: ['CH'], validate: () => false },
                        { countries: ['D'], validate: () => false },
                        { countries: ['D', 'CH'], validate: () => false },
                        { validate: () => false }
                    ];
                } );

                describe( '.createMultiValidator()', function() {

                    it( 'returns multi validator with matching inner validators', function() {
                        const validator = Y.doccirrus.validator.factory.createMultiValidator( this.fixture, 'bar' );

                        expect( validator.map( validator => validator.countries ) ).to.eql(
                            [
                                this.fixture[1].countries,
                                this.fixture[2].countries,
                                this.fixture[3].countries
                            ]
                        );
                    } );

                    it( 'returns multi validator with given metadata', function() {
                        const validator = Y.doccirrus.validator.factory.createMultiValidator( this.fixture, 'bar' );

                        expect( validator.__identifier ).to.exist;
                        expect( validator.__identifier ).to.eql( 'bar' );
                    } );

                    it( 'returns multi validator with helper function', function() {
                        const validator = Y.doccirrus.validator.factory.createMultiValidator( this.fixture, 'foo' );

                        expect( validator.__isCountrySpecific ).to.exist;
                        expect( validator.__isCountrySpecific ).to.be.true;
                    } );
                } );

                context( 'given context without region', function() {

                    beforeEach( function() {
                        this.context = {};
                    } );

                    describe( '.createMultiValidator()', function() {

                        it( 'returns multi validator which respects given context', function() {
                            const validator = Y.doccirrus.validator.factory.createMultiValidator( this.fixture, 'bar' );

                            expect( validator[0].validate.bind( this.context )() ).to.be.true;
                            expect( validator[1].validate.bind( this.context )() ).to.be.true;
                            expect( validator[2].validate.bind( this.context )() ).to.be.false;
                        } );
                    } );
                } );

                context( 'given single region context', function() {

                    beforeEach( function() {
                        this.context = {
                            countryMode: ['D']
                        };
                    } );

                    describe( '.createMultiValidator()', function() {

                        it( 'returns validators respecting given context', function() {
                            const validator = Y.doccirrus.validator.factory.createMultiValidator( this.fixture, 'bar' );

                            expect( validator[0].validate.bind( this.context )() ).to.be.false;
                            expect( validator[1].validate.bind( this.context )() ).to.be.false;
                            expect( validator[2].validate.bind( this.context )() ).to.be.false;
                        } );
                    } );
                } );
            } );
        } );
    } );
} );
