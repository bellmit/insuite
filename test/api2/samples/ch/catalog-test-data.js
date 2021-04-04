var
    catalog = {
        "_id" : "5fbbddc4dd211565957921dd",
        "seq" : "E78.4",
        "unifiedSeq" : "E000000078.4",
        "title" : "Sonstige Hyperlipidämien",
        "infos" : [
            "Familiäre Hyperalphalipoproteinämie",
            "Cholesterin-Ester-Transfer-Protein-Mangel",
            "CEPT [Cholesterin-Ester-Transfer-Protein]-Mangel",
            "Hyperlipidämie durch hepatischen Triglyceridlipase-Mangel",
            "Familiäre Hyperlipidämie",
            "Essentielle Hyperlipidämie",
            "Familiäre kombinierte Hyperlipidämie"
        ],
        "u_extra" : {
            "abrechenbar" : "j",
            "krankheit_in_mitteleuropa_sehr_selten" : "n",
            "schlüsselnummer_mit_inhalt_belegt" : "j",
            "infektionsschutzgesetz_meldepflicht" : "n",
            "infektionsschutzgesetz_abrechnungsbesonderheit" : "n"
        },
        "catalog" : "DC-ICD-10-D,CH-1606146367720.json"
    },
    putParams = {
        data: catalog
    },
    postResult = {};

module.exports = {
    getData: function() {
        var
            data = JSON.parse( JSON.stringify( catalog ) );

        return data;
    },
    putParams: putParams,
    getPostResult() {
        return JSON.parse( JSON.stringify(postResult) );
    },
    getPutResult() {
        return JSON.parse( JSON.stringify(postResult) );
    },
    getDeleteResult() {
        return JSON.parse( JSON.stringify( postResult ) );
    },
    getDeleteUpsertResult() {
        return JSON.parse( JSON.stringify( postResult ) );
    },
    testData: [
        {
            title: 'kombinierte Hyperlipidämie',
            expectedCodeResults: ['E78.2', 'E78.4']
        },
        {
            title: 'Sonstige Hyperlipidämien',
            expectedCodeResults: ['E78.4']
        },
        {
            title: 'Akute Bronchitis durch Mycoplasma pneumoniae',
            expectedCodeResults: ['J20.0']
        },
        {
            title: 'E78',
            expectedCodeResults: [
                'E78.-',
                'E78.0',
                'E78.1',
                'E78.2',
                'E78.3',
                'E78.4',
                'E78.5',
                'E78.6',
                'E78.8',
                'E78.9',
                'M14.-',
                'M14.3-',
                'N08.-',
                'N08.4'
            ]
        },
        {
            title: 'Nicht näher bezeichnete Staphylokokken',
            expectedCodeResults: ['B95.8', 'A41.2', 'A49.0', 'M00.09', 'P36.3']
        }
    ]
};

