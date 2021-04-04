function mockCompanyApi( Y ) {
    const
        originalCompanyApi = Y.doccirrus.api.company;
    Y.doccirrus.api.company = {
        mocked: true,
        getActiveTenants() {
            return [];
        },
        createTenant: originalCompanyApi.createTenant,
        activateTenant( args ){
            setImmediate( args.callback );
        },
        deleteTenant( args ){
            return args.callback( null, args.query );
        },
        getNextDcCustomerNoFromDCPRC( args ){
            return args.callback( null, 9090 );
        },
        setVprcFQHostNameFromMVPRC: originalCompanyApi.setVprcFQHostNameFromMVPRC
    };
    return originalCompanyApi;
}

module.exports = mockCompanyApi;