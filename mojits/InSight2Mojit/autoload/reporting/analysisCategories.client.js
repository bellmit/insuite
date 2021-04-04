/*global YUI */
YUI.add( 'analysisCategories', function( Y/*, NAME*/ ) {
    'use strict';

    var list = {
        mediPZN: {
            "buttonId": "mediPZN",
            "categoryName": "Medikation",
            "categoryValue": "phPZN",
            "filter": {
                "actType": ["MEDICATION"]
            },
            "additionalFields": [
                {fieldName: "phNLabel", mode: "first"},
                {fieldName: "code", mode: "first"}
            ],
            "inactive" : true,
            "values": []
        },
        treatCode: {
            "buttonId": "treatCode",
            "categoryName": "Behandlungen",
            "categoryValue": "treatCode",
            "filter": {
                "actType": ["TREATMENT"]
            },
            "additionalFields": [
                {fieldName: 'content', mode: 'first'}
            ],
            "showPrice": true,
            "inactive" : true,
            "virtualField": true,
            "values": []
        },
        ageGroup: {
            "buttonId": "ageGroup",
            "categoryName": "Altersgruppen",
            "categoryValue": "ageGroup",
            "virtualField": true,
            "values": []
        },
        age: {
            "buttonId": "age",
            "categoryName": "Alter",
            "categoryValue": "age",
            "inactive": true,
            "values": []
        },
        gender: {
            "buttonId": "gender",
            "categoryName": "Geschlecht",
            "categoryValue": "gender",
            "map": {
                "m": "männlich",
                "w": "weiblich",
                "x": "unbekannt",
                "u": "unbestimmt",
                "null": "N/A"
            },
            "values": []
        },
        employeeLastname: {
            "buttonId": "employeeLastname",
            "categoryName": "Arzt",
            "categoryValue": "employeeLastname",
            "additionalFields": [
                {fieldName: 'employeeTitle', mode: 'first'},
                {fieldName: 'employeeFirstname', mode: 'first'},
                {fieldName: 'employeeLastname', mode: 'first'}
            ],
            "inactive" : true,
            "values": []
        },
        diagCode: {
            "buttonId": "diagCode",
            "categoryName": "Diagnosen",
            "categoryValue": "diagCode",
            "inactive": true,
            "filter": {
                "actType": ["DIAGNOSIS"]
            },
            "additionalFields": [
                {fieldName: 'content', mode: 'first'}
            ],
            "virtualField": true,
            "values": [
                {
                    "Name": "A00.0",
                    "Value": "A00.0",
                    "Description": "Cholera"
                },
                {
                    "Name": "A01.0",
                    "Value": "A01.0",
                    "Description": "Typhus abdominalis und Paratyphus"
                },
                {
                    "Name": "A02.0",
                    "Value": "A02.0",
                    "Description": "Sonstige Salmonelleninfektionen"
                },
                {
                    "Name": "A03.0",
                    "Value": "A03.0",
                    "Description": "Shigellose [Bakterielle Ruhr]"
                },
                {
                    "Name": "A04.0",
                    "Value": "A04.0",
                    "Description": "Sonstige bakterielle Darminfektionen"
                },
                {
                    "Name": "A05.0",
                    "Value": "A05.0",
                    "Description": "Sonstige bakteriell bedingte Lebensmittelvergiftungen, anderenorts nicht klassifiziert"
                },
                {
                    "Name": "A06.0",
                    "Value": "A06.0",
                    "Description": "Amöbiasis"
                },
                {
                    "Name": "A07.0",
                    "Value": "A07.0",
                    "Description": "Sonstige Darmkrankheiten durch Protozoen"
                },
                {
                    "Name": "A08.0",
                    "Value": "A08.0",
                    "Description": "Virusbedingte und sonstige näher bezeichnete Darminfektionen"
                },
                {
                    "Name": "A09.0",
                    "Value": "A09.0",
                    "Description": "Sonstige und nicht näher bezeichnete Gastroenteritis und Kolitis infektiösen und nicht näher bezeichneten Ursprungs"
                },
                {
                    "Name": "A15.0",
                    "Value": "A15.0",
                    "Description": "Tuberkulose"
                },
                {
                    "Name": "A16.0",
                    "Value": "A16.0",
                    "Description": "Tuberkulose der Atmungsorgane, weder bakteriologisch, molekularbiologisch noch histologisch gesichert"
                },
                {
                    "Name": "A17.0",
                    "Value": "A17.0",
                    "Description": "Tuberkulose des Nervensystems"
                },
                {
                    "Name": "A18.0",
                    "Value": "A18.0",
                    "Description": "Tuberkulose sonstiger Organe"
                },
                {
                    "Name": "A19.0",
                    "Value": "A19.0",
                    "Description": "Miliartuberkulose"
                },
                {
                    "Name": "A20.0",
                    "Value": "A20.0",
                    "Description": "Bestimmte bakterielle Zoonosen"
                },
                {
                    "Name": "A21.0",
                    "Value": "A21.0",
                    "Description": "Tularämie"
                },
                {
                    "Name": "A22.0",
                    "Value": "A22.0",
                    "Description": "Anthrax [Milzbrand]"
                },
                {
                    "Name": "A23.0",
                    "Value": "A23.0",
                    "Description": "Brucellose"
                },
                {
                    "Name": "A24.0",
                    "Value": "A24.0",
                    "Description": "Rotz [Malleus] und Melioidose [Pseudorotz]"
                },
                {
                    "Name": "A25.0",
                    "Value": "A25.0",
                    "Description": "Rattenbisskrankheiten"
                },
                {
                    "Name": "A26.0",
                    "Value": "A26.0",
                    "Description": "Erysipeloid"
                },
                {
                    "Name": "A27.0",
                    "Value": "A27.0",
                    "Description": "Leptospirose"
                },
                {
                    "Name": "A28.0",
                    "Value": "A28.0",
                    "Description": "Sonstige bakterielle Zoonosen, anderenorts nicht klassifiziert"
                },
                {
                    "Name": "A30.0",
                    "Value": "A30.0",
                    "Description": "Sonstige bakterielle Krankheiten"
                },
                {
                    "Name": "A31.0",
                    "Value": "A31.0",
                    "Description": "Infektion durch sonstige Mykobakterien"
                },
                {
                    "Name": "A32.0",
                    "Value": "A32.0",
                    "Description": "Listeriose"
                },
                {
                    "Name": "A33.0",
                    "Value": "A33.0",
                    "Description": "Tetanus neonatorum"
                },
                {
                    "Name": "A34.0",
                    "Value": "A34.0",
                    "Description": "Tetanus während der Schwangerschaft, der Geburt und des Wochenbettes"
                },
                {
                    "Name": "A35.0",
                    "Value": "A35.0",
                    "Description": "Sonstiger Tetanus"
                },
                {
                    "Name": "A36.0",
                    "Value": "A36.0",
                    "Description": "Diphtherie"
                },
                {
                    "Name": "A37.0",
                    "Value": "A37.0",
                    "Description": "Keuchhusten"
                },
                {
                    "Name": "A38.0",
                    "Value": "A38.0",
                    "Description": "Scharlach"
                },
                {
                    "Name": "A39.0",
                    "Value": "A39.0",
                    "Description": "Meningokokkeninfektion"
                },
                {
                    "Name": "A40.0",
                    "Value": "A40.0",
                    "Description": "Streptokokkensepsis"
                },
                {
                    "Name": "A41.0",
                    "Value": "A41.0",
                    "Description": "Sonstige Sepsis"
                },
                {
                    "Name": "A42.0",
                    "Value": "A42.0",
                    "Description": "Aktinomykose"
                },
                {
                    "Name": "A43.0",
                    "Value": "A43.0",
                    "Description": "Nokardiose"
                },
                {
                    "Name": "A44.0",
                    "Value": "A44.0",
                    "Description": "Bartonellose"
                },
                {
                    "Name": "A46.0",
                    "Value": "A46.0",
                    "Description": "Erysipel [Wundrose]"
                },
                {
                    "Name": "A48.0",
                    "Value": "A48.0",
                    "Description": "Sonstige bakterielle Krankheiten, anderenorts nicht klassifiziert"
                },
                {
                    "Name": "A49.0",
                    "Value": "A49.0",
                    "Description": "Bakterielle Infektion nicht näher bezeichneter Lokalisation"
                },
                {
                    "Name": "A50.0",
                    "Value": "A50.0",
                    "Description": "nbsp;Infektionen, die vorwiegend durch Geschlechtsverkehr übertragen werden"
                },
                {
                    "Name": "A51.0",
                    "Value": "A51.0",
                    "Description": "Frühsyphilis"
                },
                {
                    "Name": "A52.0",
                    "Value": "A52.0",
                    "Description": "Spätsyphilis"
                },
                {
                    "Name": "A53.0",
                    "Value": "A53.0",
                    "Description": "Sonstige und nicht näher bezeichnete Syphilis"
                },
                {
                    "Name": "A54.0",
                    "Value": "A54.0",
                    "Description": "Gonokokkeninfektion"
                },
                {
                    "Name": "A55.0",
                    "Value": "A55.0",
                    "Description": "Lymphogranuloma inguinale (venereum) durch Chlamydien"
                },
                {
                    "Name": "A56.0",
                    "Value": "A56.0",
                    "Description": "Sonstige durch Geschlechtsverkehr übertragene Chlamydienkrankheiten"
                },
                {
                    "Name": "A57.0",
                    "Value": "A57.0",
                    "Description": "Ulcus molle (venereum)"
                },
                {
                    "Name": "A58.0",
                    "Value": "A58.0",
                    "Description": "Granuloma venereum (inguinale)"
                },
                {
                    "Name": "A59.0",
                    "Value": "A59.0",
                    "Description": "Trichomoniasis"
                },
                {
                    "Name": "A60.0",
                    "Value": "A60.0",
                    "Description": "Infektionen des Anogenitalbereiches durch Herpesviren [Herpes simplex]"
                },
                {
                    "Name": "A63.0",
                    "Value": "A63.0",
                    "Description": "Sonstige vorwiegend durch Geschlechtsverkehr übertragene Krankheiten, anderenorts nicht klassifiziert"
                },
                {
                    "Name": "A64.0",
                    "Value": "A64.0",
                    "Description": "Durch Geschlechtsverkehr übertragene Krankheiten, nicht näher bezeichnet"
                },
                {
                    "Name": "A65.0",
                    "Value": "A65.0",
                    "Description": "Sonstige Spirochätenkrankheiten"
                },
                {
                    "Name": "A66.0",
                    "Value": "A66.0",
                    "Description": "Frambösie"
                },
                {
                    "Name": "A67.0",
                    "Value": "A67.0",
                    "Description": "Pinta [Carate]"
                },
                {
                    "Name": "A68.0",
                    "Value": "A68.0",
                    "Description": "Rückfallfieber"
                },
                {
                    "Name": "A69.0",
                    "Value": "A69.0",
                    "Description": "Sonstige Spirochäteninfektionen"
                },
                {
                    "Name": "A70.0",
                    "Value": "A70.0",
                    "Description": "Sonstige Krankheiten durch Chlamydien"
                },
                {
                    "Name": "A71.0",
                    "Value": "A71.0",
                    "Description": "Trachom"
                },
                {
                    "Name": "A74.0",
                    "Value": "A74.0",
                    "Description": "Sonstige Krankheiten durch Chlamydien"
                },
                {
                    "Name": "A75.0",
                    "Value": "A75.0",
                    "Description": "Rickettsiosen"
                },
                {
                    "Name": "A77.0",
                    "Value": "A77.0",
                    "Description": "Zeckenbissfieber [Rickettsiosen, durch Zecken übertragen]"
                },
                {
                    "Name": "A78.0",
                    "Value": "A78.0",
                    "Description": "Q-Fieber"
                },
                {
                    "Name": "A79.0",
                    "Value": "A79.0",
                    "Description": "Sonstige Rickettsiosen"
                },
                {
                    "Name": "A80.0",
                    "Value": "A80.0",
                    "Description": "Virusinfektionen des Zentralnervensystems"
                },
                {
                    "Name": "A81.0",
                    "Value": "A81.0",
                    "Description": "Atypische Virus-Infektionen des Zentralnervensystems"
                },
                {
                    "Name": "A82.0",
                    "Value": "A82.0",
                    "Description": "Tollwut [Rabies]"
                },
                {
                    "Name": "A83.0",
                    "Value": "A83.0",
                    "Description": "Virusenzephalitis, durch Moskitos [Stechmücken] übertragen"
                },
                {
                    "Name": "A84.0",
                    "Value": "A84.0",
                    "Description": "Virusenzephalitis, durch Zecken übertragen"
                },
                {
                    "Name": "A85.0",
                    "Value": "A85.0",
                    "Description": "Sonstige Virusenzephalitis, anderenorts nicht klassifiziert"
                },
                {
                    "Name": "A86.0",
                    "Value": "A86.0",
                    "Description": "Virusenzephalitis, nicht näher bezeichnet"
                },
                {
                    "Name": "A87.0",
                    "Value": "A87.0",
                    "Description": "Virusmeningitis"
                },
                {
                    "Name": "A88.0",
                    "Value": "A88.0",
                    "Description": "Sonstige Virusinfektionen des Zentralnervensystems, anderenorts nicht klassifiziert"
                },
                {
                    "Name": "A89.0",
                    "Value": "A89.0",
                    "Description": "Virusinfektion des Zentralnervensystems, nicht näher bezeichnet"
                },
                {
                    "Name": "A90.0",
                    "Value": "A90.0",
                    "Description": "nbsp;Durch Arthropoden übertragene Viruskrankheiten und virale hämorrhagische Fieber"
                },
                {
                    "Name": "A91.0",
                    "Value": "A91.0",
                    "Description": "Hämorrhagisches Dengue-Fieber"
                },
                {
                    "Name": "A92.0",
                    "Value": "A92.0",
                    "Description": "Sonstige durch Moskitos [Stechmücken] übertragene Viruskrankheiten"
                },
                {
                    "Name": "A93.0",
                    "Value": "A93.0",
                    "Description": "Sonstige durch Arthropoden übertragene Viruskrankheiten, anderenorts nicht klassifiziert"
                },
                {
                    "Name": "A94.0",
                    "Value": "A94.0",
                    "Description": "Durch Arthropoden übertragene Viruskrankheit, nicht näher bezeichnet"
                },
                {
                    "Name": "A95.0",
                    "Value": "A95.0",
                    "Description": "Gelbfieber"
                },
                {
                    "Name": "A96.0",
                    "Value": "A96.0",
                    "Description": "Hämorrhagisches Fieber durch Arenaviren"
                },
                {
                    "Name": "A98.0",
                    "Value": "A98.0",
                    "Description": "Sonstige hämorrhagische Viruskrankheiten, anderenorts nicht klassifiziert"
                },
                {
                    "Name": "A99.0",
                    "Value": "A99.0",
                    "Description": "Nicht näher bezeichnete hämorrhagische Viruskrankheit"
                },
                {
                    "Name": "B00.0",
                    "Value": "B00.0",
                    "Description": "nbsp;Virusinfektionen, die durch Haut- und Schleimhautläsionen gekennzeichnet sind"
                },
                {
                    "Name": "B01.0",
                    "Value": "B01.0",
                    "Description": "Varizellen [Windpocken]"
                },
                {
                    "Name": "B02.0",
                    "Value": "B02.0",
                    "Description": "Zoster [Herpes zoster]"
                },
                {
                    "Name": "B03.0",
                    "Value": "B03.0",
                    "Description": "Pocken"
                },
                {
                    "Name": "B04.0",
                    "Value": "B04.0",
                    "Description": "Affenpocken"
                },
                {
                    "Name": "B05.0",
                    "Value": "B05.0",
                    "Description": "Masern"
                },
                {
                    "Name": "B06.0",
                    "Value": "B06.0",
                    "Description": "Röteln [Rubeola] [Rubella]"
                },
                {
                    "Name": "B07.0",
                    "Value": "B07.0",
                    "Description": "Viruswarzen"
                },
                {
                    "Name": "B08.0",
                    "Value": "B08.0",
                    "Description": "Sonstige Virusinfektionen, die durch Haut- und Schleimhautläsionen gekennzeichnet sind, anderenorts nicht klassifiziert"
                },
                {
                    "Name": "B09.0",
                    "Value": "B09.0",
                    "Description": "Nicht näher bezeichnete Virusinfektion, die durch Haut- und Schleimhautläsionen gekennzeichnet ist"
                },
                {
                    "Name": "B12.0",
                    "Value": "B12.0",
                    "Description": "Vitamin-"
                },
                {
                    "Name": "B15.0",
                    "Value": "B15.0",
                    "Description": "Virushepatitis"
                },
                {
                    "Name": "B16.0",
                    "Value": "B16.0",
                    "Description": "Akute Virushepatitis B"
                },
                {
                    "Name": "B17.0",
                    "Value": "B17.0",
                    "Description": "Sonstige akute Virushepatitis"
                },
                {
                    "Name": "B18.0",
                    "Value": "B18.0",
                    "Description": "Chronische Virushepatitis"
                },
                {
                    "Name": "B19.0",
                    "Value": "B19.0",
                    "Description": "Nicht näher bezeichnete Virushepatitis"
                },
                {
                    "Name": "B20.0",
                    "Value": "B20.0",
                    "Description": "HIV-Krankheit [Humane Immundefizienz-Viruskrankheit]"
                },
                {
                    "Name": "B21.0",
                    "Value": "B21.0",
                    "Description": "Bösartige Neubildungen infolge HIV-Krankheit [Humane Immundefizienz-Viruskrankheit]"
                },
                {
                    "Name": "B22.0",
                    "Value": "B22.0",
                    "Description": "Sonstige näher bezeichnete Krankheiten infolge HIV-Krankheit [Humane Immundefizienz-Viruskrankheit]"
                },
                {
                    "Name": "B23.0",
                    "Value": "B23.0",
                    "Description": "Sonstige Krankheitszustände infolge HIV-Krankheit [Humane Immundefizienz-Viruskrankheit]"
                },
                {
                    "Name": "B24.0",
                    "Value": "B24.0",
                    "Description": "Nicht näher bezeichnete HIV-Krankheit [Humane Immundefizienz-Viruskrankheit]"
                },
                {
                    "Name": "B25.0",
                    "Value": "B25.0",
                    "Description": "Sonstige Viruskrankheiten"
                },
                {
                    "Name": "B26.0",
                    "Value": "B26.0",
                    "Description": "Mumps"
                },
                {
                    "Name": "B27.0",
                    "Value": "B27.0",
                    "Description": "Infektiöse Mononukleose"
                },
                {
                    "Name": "B30.0",
                    "Value": "B30.0",
                    "Description": "Viruskonjunktivitis"
                },
                {
                    "Name": "B33.0",
                    "Value": "B33.0",
                    "Description": "Sonstige Viruskrankheiten, anderenorts nicht klassifiziert"
                },
                {
                    "Name": "B34.0",
                    "Value": "B34.0",
                    "Description": "Viruskrankheit nicht näher bezeichneter Lokalisation"
                },
                {
                    "Name": "B35.0",
                    "Value": "B35.0",
                    "Description": "Mykosen"
                },
                {
                    "Name": "B36.0",
                    "Value": "B36.0",
                    "Description": "Sonstige oberflächliche Mykosen"
                },
                {
                    "Name": "B37.0",
                    "Value": "B37.0",
                    "Description": "Kandidose"
                },
                {
                    "Name": "B38.0",
                    "Value": "B38.0",
                    "Description": "Kokzidioidomykose"
                },
                {
                    "Name": "B39.0",
                    "Value": "B39.0",
                    "Description": "Histoplasmose"
                },
                {
                    "Name": "B40.0",
                    "Value": "B40.0",
                    "Description": "Blastomykose"
                },
                {
                    "Name": "B41.0",
                    "Value": "B41.0",
                    "Description": "Parakokzidioidomykose"
                },
                {
                    "Name": "B42.0",
                    "Value": "B42.0",
                    "Description": "Sporotrichose"
                },
                {
                    "Name": "B43.0",
                    "Value": "B43.0",
                    "Description": "Chromomykose und chromomykotischer Abszess"
                },
                {
                    "Name": "B44.0",
                    "Value": "B44.0",
                    "Description": "Aspergillose"
                },
                {
                    "Name": "B45.0",
                    "Value": "B45.0",
                    "Description": "Kryptokokkose"
                },
                {
                    "Name": "B46.0",
                    "Value": "B46.0",
                    "Description": "Zygomykose"
                },
                {
                    "Name": "B47.0",
                    "Value": "B47.0",
                    "Description": "Myzetom"
                },
                {
                    "Name": "B48.0",
                    "Value": "B48.0",
                    "Description": "Sonstige Mykosen, anderenorts nicht klassifiziert"
                },
                {
                    "Name": "B49.0",
                    "Value": "B49.0",
                    "Description": "Nicht näher bezeichnete Mykose"
                },
                {
                    "Name": "B50.0",
                    "Value": "B50.0",
                    "Description": "Protozoenkrankheiten"
                },
                {
                    "Name": "B51.0",
                    "Value": "B51.0",
                    "Description": "Malaria tertiana durch Plasmodium vivax"
                },
                {
                    "Name": "B52.0",
                    "Value": "B52.0",
                    "Description": "Malaria quartana durch Plasmodium malariae"
                },
                {
                    "Name": "B53.0",
                    "Value": "B53.0",
                    "Description": "Sonstige parasitologisch bestätigte Malaria"
                },
                {
                    "Name": "B54.0",
                    "Value": "B54.0",
                    "Description": "Malaria, nicht näher bezeichnet"
                },
                {
                    "Name": "B55.0",
                    "Value": "B55.0",
                    "Description": "Leishmaniose"
                },
                {
                    "Name": "B56.0",
                    "Value": "B56.0",
                    "Description": "Afrikanische Trypanosomiasis"
                },
                {
                    "Name": "B57.0",
                    "Value": "B57.0",
                    "Description": "Chagas-Krankheit"
                },
                {
                    "Name": "B58.0",
                    "Value": "B58.0",
                    "Description": "Toxoplasmose"
                },
                {
                    "Name": "B59.0",
                    "Value": "B59.0",
                    "Description": "Pneumozystose ("
                },
                {
                    "Name": "B60.0",
                    "Value": "B60.0",
                    "Description": "Sonstige Protozoenkrankheiten, anderenorts nicht klassifiziert"
                },
                {
                    "Name": "B64.0",
                    "Value": "B64.0",
                    "Description": "Nicht näher bezeichnete Protozoenkrankheit"
                },
                {
                    "Name": "B65.0",
                    "Value": "B65.0",
                    "Description": "Helminthosen"
                },
                {
                    "Name": "B66.0",
                    "Value": "B66.0",
                    "Description": "Befall durch sonstige Trematoden [Egel]"
                },
                {
                    "Name": "B67.0",
                    "Value": "B67.0",
                    "Description": "Echinokokkose"
                },
                {
                    "Name": "B68.0",
                    "Value": "B68.0",
                    "Description": "Taeniasis"
                },
                {
                    "Name": "B69.0",
                    "Value": "B69.0",
                    "Description": "Zystizerkose"
                },
                {
                    "Name": "B70.0",
                    "Value": "B70.0",
                    "Description": "Diphyllobothriose und Sparganose"
                },
                {
                    "Name": "B71.0",
                    "Value": "B71.0",
                    "Description": "Befall durch sonstige Zestoden"
                },
                {
                    "Name": "B72.0",
                    "Value": "B72.0",
                    "Description": "Drakunkulose"
                },
                {
                    "Name": "B73.0",
                    "Value": "B73.0",
                    "Description": "Onchozerkose"
                },
                {
                    "Name": "B74.0",
                    "Value": "B74.0",
                    "Description": "Filariose"
                },
                {
                    "Name": "B75.0",
                    "Value": "B75.0",
                    "Description": "Trichinellose"
                },
                {
                    "Name": "B76.0",
                    "Value": "B76.0",
                    "Description": "Hakenwurm-Krankheit"
                },
                {
                    "Name": "B77.0",
                    "Value": "B77.0",
                    "Description": "Askaridose"
                },
                {
                    "Name": "B78.0",
                    "Value": "B78.0",
                    "Description": "Strongyloidiasis"
                },
                {
                    "Name": "B79.0",
                    "Value": "B79.0",
                    "Description": "Trichuriasis"
                },
                {
                    "Name": "B80.0",
                    "Value": "B80.0",
                    "Description": "Enterobiasis"
                },
                {
                    "Name": "B81.0",
                    "Value": "B81.0",
                    "Description": "Sonstige intestinale Helminthosen, anderenorts nicht klassifiziert"
                },
                {
                    "Name": "B82.0",
                    "Value": "B82.0",
                    "Description": "Nicht näher bezeichneter intestinaler Parasitismus"
                },
                {
                    "Name": "B83.0",
                    "Value": "B83.0",
                    "Description": "Sonstige Helminthosen"
                },
                {
                    "Name": "B85.0",
                    "Value": "B85.0",
                    "Description": "nbsp;Pedikulose [Läusebefall], Akarinose [Milbenbefall] und sonstiger Parasitenbefall der Haut"
                },
                {
                    "Name": "B86.0",
                    "Value": "B86.0",
                    "Description": "Skabies"
                },
                {
                    "Name": "B87.0",
                    "Value": "B87.0",
                    "Description": "Myiasis"
                },
                {
                    "Name": "B88.0",
                    "Value": "B88.0",
                    "Description": "Sonstiger Parasitenbefall der Haut"
                },
                {
                    "Name": "B89.0",
                    "Value": "B89.0",
                    "Description": "Nicht näher bezeichnete parasitäre Krankheit"
                },
                {
                    "Name": "B90.0",
                    "Value": "B90.0",
                    "Description": "Folgezustände von infektiösen und parasitären Krankheiten"
                },
                {
                    "Name": "B91.0",
                    "Value": "B91.0",
                    "Description": "Folgezustände der Poliomyelitis"
                },
                {
                    "Name": "B92.0",
                    "Value": "B92.0",
                    "Description": "Folgezustände der Lepra"
                },
                {
                    "Name": "B94.0",
                    "Value": "B94.0",
                    "Description": "Folgezustände sonstiger und nicht näher bezeichneter infektiöser und parasitärer Krankheiten"
                },
                {
                    "Name": "B95.0",
                    "Value": "B95.0",
                    "Description": "nbsp;Bakterien, Viren und sonstige Infektionserreger als Ursache von Krankheiten, die in anderen Kapiteln klassifiziert sind"
                },
                {
                    "Name": "B96.0",
                    "Value": "B96.0",
                    "Description": "Sonstige näher bezeichnete Bakterien als Ursache von Krankheiten, die in anderen Kapiteln klassifiziert sind"
                },
                {
                    "Name": "B97.0",
                    "Value": "B97.0",
                    "Description": "Viren als Ursache von Krankheiten, die in anderen Kapiteln klassifiziert sind"
                },
                {
                    "Name": "B98.0",
                    "Value": "B98.0",
                    "Description": "Sonstige näher bezeichnete infektiöse Erreger als Ursache von Krankheiten, die in anderen Kapiteln klassifiziert sind"
                },
                {
                    "Name": "B99.0",
                    "Value": "B99.0",
                    "Description": "Sonstige Infektionskrankheiten"
                },
                {
                    "Name": "C00.0",
                    "Value": "C00.0",
                    "Description": "nbsp;Bösartige Neubildungen der Lippe, der Mundhöhle und des Pharynx"
                },
                {
                    "Name": "C01.0",
                    "Value": "C01.0",
                    "Description": "Bösartige Neubildung des Zungengrundes"
                },
                {
                    "Name": "C02.0",
                    "Value": "C02.0",
                    "Description": "verschlüsselt werden sollte. Andererseits sollte Karzinom der Zungenspitze mit Ausdehnung auf die"
                },
                {
                    "Name": "C03.0",
                    "Value": "C03.0",
                    "Description": "Bösartige Neubildung des Zahnfleisches"
                },
                {
                    "Name": "C04.0",
                    "Value": "C04.0",
                    "Description": "Bösartige Neubildung des Mundbodens"
                },
                {
                    "Name": "C05.0",
                    "Value": "C05.0",
                    "Description": "Bösartige Neubildung des Gaumens"
                },
                {
                    "Name": "C06.0",
                    "Value": "C06.0",
                    "Description": "Bösartige Neubildung sonstiger und nicht näher bezeichneter Teile des Mundes"
                },
                {
                    "Name": "C07.0",
                    "Value": "C07.0",
                    "Description": "Bösartige Neubildung der Parotis"
                },
                {
                    "Name": "C08.0",
                    "Value": "C08.0",
                    "Description": "Große Speicheldrüsen, mehrere Teilbereiche überlappend"
                },
                {
                    "Name": "C09.0",
                    "Value": "C09.0",
                    "Description": "Bösartige Neubildung der Tonsille"
                },
                {
                    "Name": "C10.0",
                    "Value": "C10.0",
                    "Description": "Bösartige Neubildung des Oropharynx"
                },
                {
                    "Name": "C11.0",
                    "Value": "C11.0",
                    "Description": "Bösartige Neubildung des Nasopharynx"
                },
                {
                    "Name": "C12.0",
                    "Value": "C12.0",
                    "Description": "Bösartige Neubildung des Recessus piriformis"
                },
                {
                    "Name": "C13.0",
                    "Value": "C13.0",
                    "Description": "Bösartige Neubildung des Hypopharynx"
                },
                {
                    "Name": "C14.0",
                    "Value": "C14.0",
                    "Description": "Lippe, Mundhöhle und Pharynx, mehrere Teilbereiche überlappend"
                },
                {
                    "Name": "C15.0",
                    "Value": "C15.0",
                    "Description": "Bösartige Neubildungen der Verdauungsorgane"
                },
                {
                    "Name": "C16.0",
                    "Value": "C16.0",
                    "Description": "(Kardia) klassifiziert, während Karzinom der Spitze und der Ventralfläche der Zunge mit"
                },
                {
                    "Name": "C17.0",
                    "Value": "C17.0",
                    "Description": "Bösartige Neubildung des Dünndarmes"
                },
                {
                    "Name": "C18.0",
                    "Value": "C18.0",
                    "Description": "Bösartige Neubildung des Kolons"
                },
                {
                    "Name": "C19.0",
                    "Value": "C19.0",
                    "Description": "Bösartige Neubildung am Rektosigmoid, übergang"
                },
                {
                    "Name": "C20.0",
                    "Value": "C20.0",
                    "Description": "Bösartige Neubildung des Rektums"
                },
                {
                    "Name": "C21.0",
                    "Value": "C21.0",
                    "Description": "Rektum, Anus und Canalis analis, mehrere Teilbereiche überlappend"
                },
                {
                    "Name": "C22.0",
                    "Value": "C22.0",
                    "Description": "Bösartige Neubildung der Leber und der intrahepatischen Gallengänge"
                },
                {
                    "Name": "C23.0",
                    "Value": "C23.0",
                    "Description": "Bösartige Neubildung der Gallenblase"
                },
                {
                    "Name": "C24.0",
                    "Value": "C24.0",
                    "Description": "Gallenwege, mehrere Teilbereiche überlappend"
                },
                {
                    "Name": "C25.0",
                    "Value": "C25.0",
                    "Description": "Pankreas, nicht näher bezeichnet, verschlüsselt."
                },
                {
                    "Name": "C26.0",
                    "Value": "C26.0",
                    "Description": "Verdauungssystem, mehrere Teilbereiche überlappend"
                },
                {
                    "Name": "C30.0",
                    "Value": "C30.0",
                    "Description": "nbsp;Bösartige Neubildungen der Atmungsorgane und sonstiger intrathorakaler Organe"
                },
                {
                    "Name": "C31.0",
                    "Value": "C31.0",
                    "Description": "Bösartige Neubildung der Nasennebenhöhlen"
                },
                {
                    "Name": "C32.0",
                    "Value": "C32.0",
                    "Description": "Bösartige Neubildung des Larynx"
                },
                {
                    "Name": "C33.0",
                    "Value": "C33.0",
                    "Description": "Bösartige Neubildung der Trachea"
                },
                {
                    "Name": "C34.0",
                    "Value": "C34.0",
                    "Description": "Bösartige Neubildung der Bronchien und der Lunge"
                },
                {
                    "Name": "C37.0",
                    "Value": "C37.0",
                    "Description": "Bösartige Neubildung des Thymus"
                },
                {
                    "Name": "C38.0",
                    "Value": "C38.0",
                    "Description": "Bösartige Neubildung des Herzens, des Mediastinums und der Pleura"
                },
                {
                    "Name": "C39.0",
                    "Value": "C39.0",
                    "Description": "Atmungsorgane und intrathorakale Organe, mehrere Teilbereiche überlappend"
                },
                {
                    "Name": "C40.0",
                    "Value": "C40.0",
                    "Description": "nbsp;Bösartige Neubildungen des Knochens und des Gelenkknorpels"
                },
                {
                    "Name": "C41.0",
                    "Value": "C41.0",
                    "Description": "Knochen und Gelenkknorpel, mehrere Teilbereiche überlappend"
                },
                {
                    "Name": "C43.0",
                    "Value": "C43.0",
                    "Description": "nbsp;Melanom und sonstige bösartige Neubildungen der Haut"
                },
                {
                    "Name": "C44.0",
                    "Value": "C44.0",
                    "Description": "Sonstige bösartige Neubildungen der Haut"
                },
                {
                    "Name": "C45.0",
                    "Value": "C45.0",
                    "Description": "nbsp;Bösartige Neubildungen des mesothelialen Gewebes und des Weichteilgewebes"
                },
                {
                    "Name": "C46.0",
                    "Value": "C46.0",
                    "Description": "Kaposi-Sarkom [Sarcoma idiopathicum multiplex haemorrhagicum]"
                },
                {
                    "Name": "C47.0",
                    "Value": "C47.0",
                    "Description": "Bösartige Neubildung der peripheren Nerven und des autonomen Nervensystems"
                },
                {
                    "Name": "C48.0",
                    "Value": "C48.0",
                    "Description": "Bösartige Neubildung des Retroperitoneums und des Peritoneums"
                },
                {
                    "Name": "C49.0",
                    "Value": "C49.0",
                    "Description": "Bindegewebe und Weichteilgewebe, mehrere Teilbereiche überlappend"
                },
                {
                    "Name": "C50.0",
                    "Value": "C50.0",
                    "Description": "Bösartige Neubildungen der Brustdrüse [Mamma]"
                },
                {
                    "Name": "C51.0",
                    "Value": "C51.0",
                    "Description": "nbsp;Bösartige Neubildungen der weiblichen Genitalorgane"
                },
                {
                    "Name": "C52.0",
                    "Value": "C52.0",
                    "Description": "Bösartige Neubildung der Vagina"
                },
                {
                    "Name": "C53.0",
                    "Value": "C53.0",
                    "Description": "Bösartige Neubildung der Cervix uteri"
                },
                {
                    "Name": "C54.0",
                    "Value": "C54.0",
                    "Description": "Bösartige Neubildung des Corpus uteri"
                },
                {
                    "Name": "C55.0",
                    "Value": "C55.0",
                    "Description": "Bösartige Neubildung des Uterus, Teil nicht näher bezeichnet"
                },
                {
                    "Name": "C56.0",
                    "Value": "C56.0",
                    "Description": "Bösartige Neubildung des Ovars"
                },
                {
                    "Name": "C57.0",
                    "Value": "C57.0",
                    "Description": "Weibliche Genitalorgane, mehrere Teilbereiche überlappend"
                },
                {
                    "Name": "C58.0",
                    "Value": "C58.0",
                    "Description": "Bösartige Neubildung der Plazenta"
                },
                {
                    "Name": "C60.0",
                    "Value": "C60.0",
                    "Description": "nbsp;Bösartige Neubildungen der männlichen Genitalorgane"
                },
                {
                    "Name": "C61.0",
                    "Value": "C61.0",
                    "Description": "Bösartige Neubildung der Prostata"
                },
                {
                    "Name": "C62.0",
                    "Value": "C62.0",
                    "Description": "Bösartige Neubildung des Hodens"
                },
                {
                    "Name": "C63.0",
                    "Value": "C63.0",
                    "Description": "Männliche Genitalorgane, mehrere Teilbereiche überlappend"
                },
                {
                    "Name": "C64.0",
                    "Value": "C64.0",
                    "Description": "Bösartige Neubildungen der Harnorgane"
                },
                {
                    "Name": "C65.0",
                    "Value": "C65.0",
                    "Description": "Bösartige Neubildung des Nierenbeckens"
                },
                {
                    "Name": "C66.0",
                    "Value": "C66.0",
                    "Description": "Bösartige Neubildung des Ureters"
                },
                {
                    "Name": "C67.0",
                    "Value": "C67.0",
                    "Description": ", so dass der Kodierer bei der Festlegung der topographischen Beziehungen möglicherweise auf anatomische"
                },
                {
                    "Name": "C68.0",
                    "Value": "C68.0",
                    "Description": "Harnorgane, mehrere Teilbereiche überlappend"
                },
                {
                    "Name": "C69.0",
                    "Value": "C69.0",
                    "Description": "nbsp;Bösartige Neubildungen des Auges, des Gehirns und sonstiger Teile des Zentralnervensystems"
                },
                {
                    "Name": "C70.0",
                    "Value": "C70.0",
                    "Description": "Bösartige Neubildung der Meningen"
                },
                {
                    "Name": "C71.0",
                    "Value": "C71.0",
                    "Description": "Bösartige Neubildung des Gehirns"
                },
                {
                    "Name": "C72.0",
                    "Value": "C72.0",
                    "Description": "Zentralnervensystem, mehrere Teilbereiche überlappend"
                },
                {
                    "Name": "C73.0",
                    "Value": "C73.0",
                    "Description": "nbsp;Bösartige Neubildungen der Schilddrüse und sonstiger endokriner Drüsen"
                },
                {
                    "Name": "C74.0",
                    "Value": "C74.0",
                    "Description": "und die zusätzliche Schlüsselnummer"
                },
                {
                    "Name": "C75.0",
                    "Value": "C75.0",
                    "Description": "Bösartige Neubildung sonstiger endokriner Drüsen und verwandter Strukturen"
                },
                {
                    "Name": "C76.0",
                    "Value": "C76.0",
                    "Description": "nbsp;Bösartige Neubildungen ungenau bezeichneter, sekundärer und nicht näher bezeichneter Lokalisationen"
                },
                {
                    "Name": "C77.0",
                    "Value": "C77.0",
                    "Description": ","
                },
                {
                    "Name": "C78.0",
                    "Value": "C78.0",
                    "Description": "Sekundäre bösartige Neubildung der Atmungs- und Verdauungsorgane"
                },
                {
                    "Name": "C79.0",
                    "Value": "C79.0",
                    "Description": "Sekundäre bösartige Neubildung an sonstigen und nicht näher bezeichneten Lokalisationen"
                },
                {
                    "Name": "C80.0",
                    "Value": "C80.0",
                    "Description": "; dadurch wird eine genauere Verschlüsselung der Lokalisation anderer Neubildungen (bösartige"
                },
                {
                    "Name": "C81.0",
                    "Value": "C81.0",
                    "Description": "nbsp;Bösartige Neubildungen des lymphatischen, blutbildenden und verwandten Gewebes, als primär festgestellt oder vermutet"
                },
                {
                    "Name": "C82.0",
                    "Value": "C82.0",
                    "Description": "Follikuläres Lymphom"
                },
                {
                    "Name": "C83.0",
                    "Value": "C83.0",
                    "Description": "Nicht follikuläres Lymphom"
                },
                {
                    "Name": "C84.0",
                    "Value": "C84.0",
                    "Description": "Reifzellige T/NK-Zell-Lymphome"
                },
                {
                    "Name": "C85.0",
                    "Value": "C85.0",
                    "Description": "Sonstige und nicht näher bezeichnete Typen des Non-Hodgkin-Lymphoms"
                },
                {
                    "Name": "C86.0",
                    "Value": "C86.0",
                    "Description": "Weitere spezifizierte T/NK-Zell-Lymphome"
                },
                {
                    "Name": "C88.0",
                    "Value": "C88.0",
                    "Description": "Bösartige immunproliferative Krankheiten"
                },
                {
                    "Name": "C90.0",
                    "Value": "C90.0",
                    "Description": "Plasmozytom und bösartige Plasmazellen-Neubildungen"
                },
                {
                    "Name": "C91.0",
                    "Value": "C91.0",
                    "Description": "Lymphatische Leukämie"
                },
                {
                    "Name": "C92.0",
                    "Value": "C92.0",
                    "Description": "Myeloische Leukämie"
                },
                {
                    "Name": "C93.0",
                    "Value": "C93.0",
                    "Description": "Monozytenleukämie"
                },
                {
                    "Name": "C94.0",
                    "Value": "C94.0",
                    "Description": "Sonstige Leukämien näher bezeichneten Zelltyps"
                },
                {
                    "Name": "C95.0",
                    "Value": "C95.0",
                    "Description": "Leukämie nicht näher bezeichneten Zelltyps"
                },
                {
                    "Name": "C96.0",
                    "Value": "C96.0",
                    "Description": "Sonstige und nicht näher bezeichnete bösartige Neubildungen des lymphatischen, blutbildenden und verwandten Gewebes"
                },
                {
                    "Name": "C97.0",
                    "Value": "C97.0",
                    "Description": "nbsp;Bösartige Neubildungen als Primärtumoren an mehreren Lokalisationen"
                },
                {
                    "Name": "D00.0",
                    "Value": "D00.0",
                    "Description": "In-situ-Neubildungen"
                },
                {
                    "Name": "D01.0",
                    "Value": "D01.0",
                    "Description": "Carcinoma in situ sonstiger und nicht näher bezeichneter Verdauungsorgane"
                },
                {
                    "Name": "D02.0",
                    "Value": "D02.0",
                    "Description": "Carcinoma in situ des Mittelohres und des Atmungssystems"
                },
                {
                    "Name": "D03.0",
                    "Value": "D03.0",
                    "Description": "Melanoma in situ"
                },
                {
                    "Name": "D04.0",
                    "Value": "D04.0",
                    "Description": "Carcinoma in situ der Haut"
                },
                {
                    "Name": "D05.0",
                    "Value": "D05.0",
                    "Description": "Carcinoma in situ der Brustdrüse [Mamma]"
                },
                {
                    "Name": "D06.0",
                    "Value": "D06.0",
                    "Description": "Carcinoma in situ der Cervix uteri"
                },
                {
                    "Name": "D07.0",
                    "Value": "D07.0",
                    "Description": "Carcinoma in situ sonstiger und nicht näher bezeichneter Genitalorgane"
                },
                {
                    "Name": "D09.0",
                    "Value": "D09.0",
                    "Description": "Carcinoma in situ sonstiger und nicht näher bezeichneter Lokalisationen"
                },
                {
                    "Name": "D10.0",
                    "Value": "D10.0",
                    "Description": "Gutartige Neubildungen"
                },
                {
                    "Name": "D11.0",
                    "Value": "D11.0",
                    "Description": "Gutartige Neubildung der großen Speicheldrüsen"
                },
                {
                    "Name": "D12.0",
                    "Value": "D12.0",
                    "Description": "Gutartige Neubildung des Kolons, des Rektums, des Analkanals und des Anus"
                },
                {
                    "Name": "D13.0",
                    "Value": "D13.0",
                    "Description": "Gutartige Neubildung sonstiger und ungenau bezeichneter Teile des Verdauungssystems"
                },
                {
                    "Name": "D14.0",
                    "Value": "D14.0",
                    "Description": "Gutartige Neubildung des Mittelohres und des Atmungssystems"
                },
                {
                    "Name": "D15.0",
                    "Value": "D15.0",
                    "Description": "Gutartige Neubildung sonstiger und nicht näher bezeichneter intrathorakaler Organe"
                },
                {
                    "Name": "D16.0",
                    "Value": "D16.0",
                    "Description": "Gutartige Neubildung des Knochens und des Gelenkknorpels"
                },
                {
                    "Name": "D17.0",
                    "Value": "D17.0",
                    "Description": "Gutartige Neubildung des Fettgewebes"
                },
                {
                    "Name": "D18.0",
                    "Value": "D18.0",
                    "Description": "Hämangiom und Lymphangiom"
                },
                {
                    "Name": "D19.0",
                    "Value": "D19.0",
                    "Description": "Gutartige Neubildung des mesothelialen Gewebes"
                },
                {
                    "Name": "D20.0",
                    "Value": "D20.0",
                    "Description": "Gutartige Neubildung des Weichteilgewebes des Retroperitoneums und des Peritoneums"
                },
                {
                    "Name": "D21.0",
                    "Value": "D21.0",
                    "Description": "Sonstige gutartige Neubildungen des Bindegewebes und anderer Weichteilgewebe"
                },
                {
                    "Name": "D22.0",
                    "Value": "D22.0",
                    "Description": "Melanozytennävus"
                },
                {
                    "Name": "D23.0",
                    "Value": "D23.0",
                    "Description": "Sonstige gutartige Neubildungen der Haut"
                },
                {
                    "Name": "D24.0",
                    "Value": "D24.0",
                    "Description": "Gutartige Neubildung der Brustdrüse [Mamma]"
                },
                {
                    "Name": "D25.0",
                    "Value": "D25.0",
                    "Description": "Leiomyom des Uterus"
                },
                {
                    "Name": "D26.0",
                    "Value": "D26.0",
                    "Description": "Sonstige gutartige Neubildungen des Uterus"
                },
                {
                    "Name": "D27.0",
                    "Value": "D27.0",
                    "Description": "Gutartige Neubildung des Ovars"
                },
                {
                    "Name": "D28.0",
                    "Value": "D28.0",
                    "Description": "Gutartige Neubildung sonstiger und nicht näher bezeichneter weiblicher Genitalorgane"
                },
                {
                    "Name": "D29.0",
                    "Value": "D29.0",
                    "Description": "Gutartige Neubildung der männlichen Genitalorgane"
                },
                {
                    "Name": "D30.0",
                    "Value": "D30.0",
                    "Description": "Gutartige Neubildung der Harnorgane"
                },
                {
                    "Name": "D31.0",
                    "Value": "D31.0",
                    "Description": "Gutartige Neubildung des Auges und der Augenanhangsgebilde"
                },
                {
                    "Name": "D32.0",
                    "Value": "D32.0",
                    "Description": "Gutartige Neubildung der Meningen"
                },
                {
                    "Name": "D33.0",
                    "Value": "D33.0",
                    "Description": "Gutartige Neubildung des Gehirns und anderer Teile des Zentralnervensystems"
                },
                {
                    "Name": "D34.0",
                    "Value": "D34.0",
                    "Description": "Gutartige Neubildung der Schilddrüse"
                },
                {
                    "Name": "D35.0",
                    "Value": "D35.0",
                    "Description": "und die zusätzliche Schlüsselnummer"
                },
                {
                    "Name": "D36.0",
                    "Value": "D36.0",
                    "Description": "Gutartige Neubildung an sonstigen und nicht näher bezeichneten Lokalisationen"
                },
                {
                    "Name": "D37.0",
                    "Value": "D37.0",
                    "Description": "Neubildungen unsicheren oder unbekannten Verhaltens"
                },
                {
                    "Name": "D38.0",
                    "Value": "D38.0",
                    "Description": "Neubildung unsicheren oder unbekannten Verhaltens des Mittelohres, der Atmungsorgane und der intrathorakalen Organe"
                },
                {
                    "Name": "D39.0",
                    "Value": "D39.0",
                    "Description": "Neubildung unsicheren oder unbekannten Verhaltens der weiblichen Genitalorgane"
                },
                {
                    "Name": "D40.0",
                    "Value": "D40.0",
                    "Description": "Neubildung unsicheren oder unbekannten Verhaltens der männlichen Genitalorgane"
                },
                {
                    "Name": "D41.0",
                    "Value": "D41.0",
                    "Description": "Neubildung unsicheren oder unbekannten Verhaltens der Harnorgane"
                },
                {
                    "Name": "D42.0",
                    "Value": "D42.0",
                    "Description": "Neubildung unsicheren oder unbekannten Verhaltens der Meningen"
                },
                {
                    "Name": "D43.0",
                    "Value": "D43.0",
                    "Description": "Neubildung unsicheren oder unbekannten Verhaltens des Gehirns und des Zentralnervensystems"
                },
                {
                    "Name": "D44.0",
                    "Value": "D44.0",
                    "Description": "Neubildung unsicheren oder unbekannten Verhaltens der endokrinen Drüsen"
                },
                {
                    "Name": "D45.0",
                    "Value": "D45.0",
                    "Description": "Polycythaemia vera"
                },
                {
                    "Name": "D46.0",
                    "Value": "D46.0",
                    "Description": "Myelodysplastische Syndrome"
                },
                {
                    "Name": "D47.0",
                    "Value": "D47.0",
                    "Description": "Sonstige Neubildungen unsicheren oder unbekannten Verhaltens des lymphatischen, blutbildenden und verwandten Gewebes"
                },
                {
                    "Name": "D48.0",
                    "Value": "D48.0",
                    "Description": "Neubildung unsicheren oder unbekannten Verhaltens an sonstigen und nicht näher bezeichneten Lokalisationen"
                },
                {
                    "Name": "D50.0",
                    "Value": "D50.0",
                    "Description": "Alimentäre Anämien"
                },
                {
                    "Name": "D51.0",
                    "Value": "D51.0",
                    "Description": "Vitamin-"
                },
                {
                    "Name": "D52.0",
                    "Value": "D52.0",
                    "Description": "Folsäure-Mangelanämie"
                },
                {
                    "Name": "D53.0",
                    "Value": "D53.0",
                    "Description": "Sonstige alimentäre Anämien"
                },
                {
                    "Name": "D55.0",
                    "Value": "D55.0",
                    "Description": "Hämolytische Anämien"
                },
                {
                    "Name": "D56.0",
                    "Value": "D56.0",
                    "Description": "Thalassämie"
                },
                {
                    "Name": "D57.0",
                    "Value": "D57.0",
                    "Description": "Sichelzellenkrankheiten"
                },
                {
                    "Name": "D58.0",
                    "Value": "D58.0",
                    "Description": "Sonstige hereditäre hämolytische Anämien"
                },
                {
                    "Name": "D59.0",
                    "Value": "D59.0",
                    "Description": "Erworbene hämolytische Anämien"
                },
                {
                    "Name": "D60.0",
                    "Value": "D60.0",
                    "Description": "Aplastische und sonstige Anämien"
                },
                {
                    "Name": "D61.0",
                    "Value": "D61.0",
                    "Description": "Sonstige aplastische Anämien"
                },
                {
                    "Name": "D62.0",
                    "Value": "D62.0",
                    "Description": "Akute Blutungsanämie"
                },
                {
                    "Name": "D63.0",
                    "Value": "D63.0",
                    "Description": "Anämie bei chronischen, anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "D64.0",
                    "Value": "D64.0",
                    "Description": "Sonstige Anämien"
                },
                {
                    "Name": "D65.0",
                    "Value": "D65.0",
                    "Description": "Koagulopathien, Purpura und sonstige hämorrhagische Diathesen"
                },
                {
                    "Name": "D66.0",
                    "Value": "D66.0",
                    "Description": "Hereditärer Faktor-VIII-Mangel"
                },
                {
                    "Name": "D67.0",
                    "Value": "D67.0",
                    "Description": "Hereditärer Faktor-IX-Mangel"
                },
                {
                    "Name": "D68.0",
                    "Value": "D68.0",
                    "Description": "Sonstige Koagulopathien"
                },
                {
                    "Name": "D69.0",
                    "Value": "D69.0",
                    "Description": "Purpura und sonstige hämorrhagische Diathesen"
                },
                {
                    "Name": "D70.0",
                    "Value": "D70.0",
                    "Description": "Sonstige Krankheiten des Blutes und der blutbildenden Organe"
                },
                {
                    "Name": "D71.0",
                    "Value": "D71.0",
                    "Description": "Funktionelle Störungen der neutrophilen Granulozyten"
                },
                {
                    "Name": "D72.0",
                    "Value": "D72.0",
                    "Description": "Sonstige Krankheiten der Leukozyten"
                },
                {
                    "Name": "D73.0",
                    "Value": "D73.0",
                    "Description": "Krankheiten der Milz"
                },
                {
                    "Name": "D74.0",
                    "Value": "D74.0",
                    "Description": "Methämoglobinämie"
                },
                {
                    "Name": "D75.0",
                    "Value": "D75.0",
                    "Description": "Sonstige Krankheiten des Blutes und der blutbildenden Organe"
                },
                {
                    "Name": "D76.0",
                    "Value": "D76.0",
                    "Description": "Bestimmte Krankheiten mit Beteiligung des lymphoretikulären Gewebes und des retikulohistiozytären Systems"
                },
                {
                    "Name": "D77.0",
                    "Value": "D77.0",
                    "Description": "nbsp; Sonstige Krankheiten des Blutes und der blutbildenden Organe bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "D80.0",
                    "Value": "D80.0",
                    "Description": "Bestimmte Störungen mit Beteiligung des Immunsystems"
                },
                {
                    "Name": "D81.0",
                    "Value": "D81.0",
                    "Description": "Kombinierte Immundefekte"
                },
                {
                    "Name": "D82.0",
                    "Value": "D82.0",
                    "Description": "Immundefekt in Verbindung mit anderen schweren Defekten"
                },
                {
                    "Name": "D83.0",
                    "Value": "D83.0",
                    "Description": "Variabler Immundefekt [common variable immunodeficiency]"
                },
                {
                    "Name": "D84.0",
                    "Value": "D84.0",
                    "Description": "Sonstige Immundefekte"
                },
                {
                    "Name": "D86.0",
                    "Value": "D86.0",
                    "Description": "Sarkoidose"
                },
                {
                    "Name": "D89.0",
                    "Value": "D89.0",
                    "Description": "Sonstige Störungen mit Beteiligung des Immunsystems, anderenorts nicht klassifiziert"
                },
                {
                    "Name": "D90.0",
                    "Value": "D90.0",
                    "Description": "Immunkompromittierung nach Bestrahlung, Chemotherapie und sonstigen immunsuppressiven Maßnahmen"
                },
                {
                    "Name": "E00.0",
                    "Value": "E00.0",
                    "Description": "Krankheiten der Schilddrüse"
                },
                {
                    "Name": "E10.0",
                    "Value": "E10.0",
                    "Description": "Diabetes mellitus"
                },
                {
                    "Name": "E15.0",
                    "Value": "E15.0",
                    "Description": "nbsp;Sonstige Störungen der Blutglukose-Regulation und der inneren Sekretion des Pankreas"
                },
                {
                    "Name": "E20.0",
                    "Value": "E20.0",
                    "Description": "Krankheiten sonstiger endokriner Drüsen"
                },
                {
                    "Name": "E24.0",
                    "Value": "E24.0",
                    "Description": ".0."
                },
                {
                    "Name": "E27.0",
                    "Value": "E27.0",
                    "Description": "ein basophiles Adenom der Hypophyse mit Cushing-Syndrom erhält die"
                },
                {
                    "Name": "E35.0",
                    "Value": "E35.0",
                    "Description": "nbsp; Störungen der endokrinen Drüsen bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "E40.0",
                    "Value": "E40.0",
                    "Description": "Mangelernährung"
                },
                {
                    "Name": "E50.0",
                    "Value": "E50.0",
                    "Description": "Sonstige alimentäre Mangelzustände"
                },
                {
                    "Name": "E65.0",
                    "Value": "E65.0",
                    "Description": "Adipositas und sonstige überernährung"
                },
                {
                    "Name": "E70.0",
                    "Value": "E70.0",
                    "Description": "Stoffwechselstörungen"
                },
                {
                    "Name": "E90.0",
                    "Value": "E90.0",
                    "Description": "nbsp; Ernährungs- und Stoffwechselstörungen bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "F00.0",
                    "Value": "F00.0",
                    "Description": "Organische, einschließlich symptomatischer psychischer Störungen"
                },
                {
                    "Name": "F01.0",
                    "Value": "F01.0",
                    "Description": "Vaskuläre Demenz"
                },
                {
                    "Name": "F02.0",
                    "Value": "F02.0",
                    "Description": "Demenz bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "F03.0",
                    "Value": "F03.0",
                    "Description": "Nicht näher bezeichnete Demenz"
                },
                {
                    "Name": "F04.0",
                    "Value": "F04.0",
                    "Description": "Organisches amnestisches Syndrom, nicht durch Alkohol oder andere psychotrope Substanzen bedingt"
                },
                {
                    "Name": "F05.0",
                    "Value": "F05.0",
                    "Description": "Delir, nicht durch Alkohol oder andere psychotrope Substanzen bedingt"
                },
                {
                    "Name": "F06.0",
                    "Value": "F06.0",
                    "Description": "Andere psychische Störungen aufgrund einer Schädigung oder Funktionsstörung des Gehirns oder einer körperlichen Krankheit"
                },
                {
                    "Name": "F07.0",
                    "Value": "F07.0",
                    "Description": "Persönlichkeits- und Verhaltensstörung aufgrund einer Krankheit, Schädigung oder Funktionsstörung des Gehirns"
                },
                {
                    "Name": "F09.0",
                    "Value": "F09.0",
                    "Description": "Nicht näher bezeichnete organische oder symptomatische psychische Störung"
                },
                {
                    "Name": "F10.0",
                    "Value": "F10.0",
                    "Description": "Psychische und Verhaltensstörungen durch psychotrope Substanzen"
                },
                {
                    "Name": "F11.0",
                    "Value": "F11.0",
                    "Description": "Psychische und Verhaltensstörungen durch Opioide"
                },
                {
                    "Name": "F12.0",
                    "Value": "F12.0",
                    "Description": "Psychische und Verhaltensstörungen durch Cannabinoide"
                },
                {
                    "Name": "F13.0",
                    "Value": "F13.0",
                    "Description": "Psychische und Verhaltensstörungen durch Sedativa oder Hypnotika"
                },
                {
                    "Name": "F14.0",
                    "Value": "F14.0",
                    "Description": "Psychische und Verhaltensstörungen durch Kokain"
                },
                {
                    "Name": "F15.0",
                    "Value": "F15.0",
                    "Description": "Psychische und Verhaltensstörungen durch andere Stimulanzien, einschließlich Koffein"
                },
                {
                    "Name": "F16.0",
                    "Value": "F16.0",
                    "Description": "Psychische und Verhaltensstörungen durch Halluzinogene"
                },
                {
                    "Name": "F17.0",
                    "Value": "F17.0",
                    "Description": "Psychische und Verhaltensstörungen durch Tabak"
                },
                {
                    "Name": "F18.0",
                    "Value": "F18.0",
                    "Description": "Psychische und Verhaltensstörungen durch flüchtige Lösungsmittel"
                },
                {
                    "Name": "F19.0",
                    "Value": "F19.0",
                    "Description": "Psychische und Verhaltensstörungen durch multiplen Substanzgebrauch und Konsum anderer psychotroper Substanzen"
                },
                {
                    "Name": "F20.0",
                    "Value": "F20.0",
                    "Description": "Schizophrenie, schizotype und wahnhafte Störungen"
                },
                {
                    "Name": "F21.0",
                    "Value": "F21.0",
                    "Description": "Schizotype Störung"
                },
                {
                    "Name": "F22.0",
                    "Value": "F22.0",
                    "Description": "Anhaltende wahnhafte Störungen"
                },
                {
                    "Name": "F23.0",
                    "Value": "F23.0",
                    "Description": "Akute vorübergehende psychotische Störungen"
                },
                {
                    "Name": "F24.0",
                    "Value": "F24.0",
                    "Description": "Induzierte wahnhafte Störung"
                },
                {
                    "Name": "F25.0",
                    "Value": "F25.0",
                    "Description": "Schizoaffektive Störungen"
                },
                {
                    "Name": "F28.0",
                    "Value": "F28.0",
                    "Description": "Sonstige nichtorganische psychotische Störungen"
                },
                {
                    "Name": "F29.0",
                    "Value": "F29.0",
                    "Description": "Nicht näher bezeichnete nichtorganische Psychose"
                },
                {
                    "Name": "F30.0",
                    "Value": "F30.0",
                    "Description": "Affektive Störungen"
                },
                {
                    "Name": "F31.0",
                    "Value": "F31.0",
                    "Description": "Bipolare affektive Störung"
                },
                {
                    "Name": "F32.0",
                    "Value": "F32.0",
                    "Description": "Depressive Episode"
                },
                {
                    "Name": "F33.0",
                    "Value": "F33.0",
                    "Description": "Rezidivierende depressive Störung"
                },
                {
                    "Name": "F34.0",
                    "Value": "F34.0",
                    "Description": "Anhaltende affektive Störungen"
                },
                {
                    "Name": "F38.0",
                    "Value": "F38.0",
                    "Description": "Andere affektive Störungen"
                },
                {
                    "Name": "F39.0",
                    "Value": "F39.0",
                    "Description": "Nicht näher bezeichnete affektive Störung"
                },
                {
                    "Name": "F40.0",
                    "Value": "F40.0",
                    "Description": "Neurotische, Belastungs- und somatoforme Störungen"
                },
                {
                    "Name": "F41.0",
                    "Value": "F41.0",
                    "Description": "Andere Angststörungen"
                },
                {
                    "Name": "F42.0",
                    "Value": "F42.0",
                    "Description": "Zwangsstörung"
                },
                {
                    "Name": "F43.0",
                    "Value": "F43.0",
                    "Description": "Reaktionen auf schwere Belastungen und Anpassungsstörungen"
                },
                {
                    "Name": "F44.0",
                    "Value": "F44.0",
                    "Description": "Dissoziative Störungen [Konversionsstörungen]"
                },
                {
                    "Name": "F45.0",
                    "Value": "F45.0",
                    "Description": "Somatoforme Störungen"
                },
                {
                    "Name": "F48.0",
                    "Value": "F48.0",
                    "Description": "Andere neurotische Störungen"
                },
                {
                    "Name": "F50.0",
                    "Value": "F50.0",
                    "Description": "Verhaltensauffälligkeiten mit körperlichen Störungen und Faktoren"
                },
                {
                    "Name": "F51.0",
                    "Value": "F51.0",
                    "Description": "Nichtorganische Schlafstörungen"
                },
                {
                    "Name": "F52.0",
                    "Value": "F52.0",
                    "Description": "Sexuelle Funktionsstörungen, nicht verursacht durch eine organische Störung oder Krankheit"
                },
                {
                    "Name": "F53.0",
                    "Value": "F53.0",
                    "Description": "Psychische oder Verhaltensstörungen im Wochenbett, anderenorts nicht klassifiziert"
                },
                {
                    "Name": "F54.0",
                    "Value": "F54.0",
                    "Description": "Psychologische Faktoren oder Verhaltensfaktoren bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "F55.0",
                    "Value": "F55.0",
                    "Description": "Schädlicher Gebrauch von nichtabhängigkeitserzeugenden Substanzen"
                },
                {
                    "Name": "F59.0",
                    "Value": "F59.0",
                    "Description": "Nicht näher bezeichnete Verhaltensauffälligkeiten bei körperlichen Störungen und Faktoren"
                },
                {
                    "Name": "F60.0",
                    "Value": "F60.0",
                    "Description": "Persönlichkeits- und Verhaltensstörungen"
                },
                {
                    "Name": "F61.0",
                    "Value": "F61.0",
                    "Description": "Kombinierte und andere Persönlichkeitsstörungen"
                },
                {
                    "Name": "F62.0",
                    "Value": "F62.0",
                    "Description": "Andauernde Persönlichkeitsänderungen, nicht Folge einer Schädigung oder Krankheit des Gehirns"
                },
                {
                    "Name": "F63.0",
                    "Value": "F63.0",
                    "Description": "Abnorme Gewohnheiten und Störungen der Impulskontrolle"
                },
                {
                    "Name": "F64.0",
                    "Value": "F64.0",
                    "Description": "Störungen der Geschlechtsidentität"
                },
                {
                    "Name": "F65.0",
                    "Value": "F65.0",
                    "Description": "Störungen der Sexualpräferenz"
                },
                {
                    "Name": "F66.0",
                    "Value": "F66.0",
                    "Description": "Psychische und Verhaltensstörungen in Verbindung mit der sexuellen Entwicklung und Orientierung"
                },
                {
                    "Name": "F68.0",
                    "Value": "F68.0",
                    "Description": "Andere Persönlichkeits- und Verhaltensstörungen"
                },
                {
                    "Name": "F69.0",
                    "Value": "F69.0",
                    "Description": "Nicht näher bezeichnete Persönlichkeits- und Verhaltensstörung"
                },
                {
                    "Name": "F70.0",
                    "Value": "F70.0",
                    "Description": "Intelligenzstörung"
                },
                {
                    "Name": "F71.0",
                    "Value": "F71.0",
                    "Description": "Mittelgradige Intelligenzminderung"
                },
                {
                    "Name": "F72.0",
                    "Value": "F72.0",
                    "Description": "Schwere Intelligenzminderung"
                },
                {
                    "Name": "F73.0",
                    "Value": "F73.0",
                    "Description": "Schwerste Intelligenzminderung"
                },
                {
                    "Name": "F74.0",
                    "Value": "F74.0",
                    "Description": "Dissoziierte Intelligenz"
                },
                {
                    "Name": "F78.0",
                    "Value": "F78.0",
                    "Description": "Andere Intelligenzminderung"
                },
                {
                    "Name": "F79.0",
                    "Value": "F79.0",
                    "Description": "Nicht näher bezeichnete Intelligenzminderung"
                },
                {
                    "Name": "F80.0",
                    "Value": "F80.0",
                    "Description": "Entwicklungsstörungen"
                },
                {
                    "Name": "F81.0",
                    "Value": "F81.0",
                    "Description": "Umschriebene Entwicklungsstörungen schulischer Fertigkeiten"
                },
                {
                    "Name": "F82.0",
                    "Value": "F82.0",
                    "Description": "Umschriebene Entwicklungsstörung der motorischen Funktionen"
                },
                {
                    "Name": "F83.0",
                    "Value": "F83.0",
                    "Description": "Kombinierte umschriebene Entwicklungsstörungen"
                },
                {
                    "Name": "F84.0",
                    "Value": "F84.0",
                    "Description": "Tief greifende Entwicklungsstörungen"
                },
                {
                    "Name": "F88.0",
                    "Value": "F88.0",
                    "Description": "Andere Entwicklungsstörungen"
                },
                {
                    "Name": "F89.0",
                    "Value": "F89.0",
                    "Description": "Nicht näher bezeichnete Entwicklungsstörung"
                },
                {
                    "Name": "F90.0",
                    "Value": "F90.0",
                    "Description": "nbsp;Verhaltens- und emotionale Störungen mit Beginn in der Kindheit und Jugend"
                },
                {
                    "Name": "F91.0",
                    "Value": "F91.0",
                    "Description": "Störungen des Sozialverhaltens"
                },
                {
                    "Name": "F92.0",
                    "Value": "F92.0",
                    "Description": "Kombinierte Störung des Sozialverhaltens und der Emotionen"
                },
                {
                    "Name": "F93.0",
                    "Value": "F93.0",
                    "Description": "Emotionale Störungen des Kindesalters"
                },
                {
                    "Name": "F94.0",
                    "Value": "F94.0",
                    "Description": "Störungen sozialer Funktionen mit Beginn in der Kindheit und Jugend"
                },
                {
                    "Name": "F95.0",
                    "Value": "F95.0",
                    "Description": "Ticstörungen"
                },
                {
                    "Name": "F98.0",
                    "Value": "F98.0",
                    "Description": "Andere Verhaltens- und emotionale Störungen mit Beginn in der Kindheit und Jugend"
                },
                {
                    "Name": "F99.0",
                    "Value": "F99.0",
                    "Description": "Nicht näher bezeichnete psychische Störungen"
                },
                {
                    "Name": "G00.0",
                    "Value": "G00.0",
                    "Description": "Entzündliche Krankheiten des Zentralnervensystems"
                },
                {
                    "Name": "G01.0",
                    "Value": "G01.0",
                    "Description": "nbsp; Meningitis bei anderenorts klassifizierten bakteriellen Krankheiten"
                },
                {
                    "Name": "G02.0",
                    "Value": "G02.0",
                    "Description": "nbsp; Meningitis bei sonstigen anderenorts klassifizierten infektiösen und parasitären Krankheiten"
                },
                {
                    "Name": "G03.0",
                    "Value": "G03.0",
                    "Description": "Meningitis durch sonstige und nicht näher bezeichnete Ursachen"
                },
                {
                    "Name": "G04.0",
                    "Value": "G04.0",
                    "Description": "Enzephalitis, Myelitis und Enzephalomyelitis"
                },
                {
                    "Name": "G05.0",
                    "Value": "G05.0",
                    "Description": "nbsp; Enzephalitis, Myelitis und Enzephalomyelitis bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "G06.0",
                    "Value": "G06.0",
                    "Description": "Intrakranielle und intraspinale Abszesse und Granulome"
                },
                {
                    "Name": "G07.0",
                    "Value": "G07.0",
                    "Description": "nbsp; Intrakranielle und intraspinale Abszesse und Granulome bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "G08.0",
                    "Value": "G08.0",
                    "Description": "Intrakranielle und intraspinale Phlebitis und Thrombophlebitis"
                },
                {
                    "Name": "G09.0",
                    "Value": "G09.0",
                    "Description": "Folgen entzündlicher Krankheiten des Zentralnervensystems"
                },
                {
                    "Name": "G10.0",
                    "Value": "G10.0",
                    "Description": "Systematrophien, die vorwiegend das Zentralnervensystem betreffen"
                },
                {
                    "Name": "G11.0",
                    "Value": "G11.0",
                    "Description": "Hereditäre Ataxie"
                },
                {
                    "Name": "G12.0",
                    "Value": "G12.0",
                    "Description": "Spinale Muskelatrophie und verwandte Syndrome"
                },
                {
                    "Name": "G13.0",
                    "Value": "G13.0",
                    "Description": "nbsp; Systematrophien, vorwiegend das Zentralnervensystem betreffend, bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "G14.0",
                    "Value": "G14.0",
                    "Description": "Postpolio-Syndrom"
                },
                {
                    "Name": "G20.0",
                    "Value": "G20.0",
                    "Description": "Extrapyramidale Krankheiten und Bewegungsstörungen"
                },
                {
                    "Name": "G21.0",
                    "Value": "G21.0",
                    "Description": "Sekundäres Parkinson-Syndrom"
                },
                {
                    "Name": "G22.0",
                    "Value": "G22.0",
                    "Description": "Parkinson-Syndrom bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "G23.0",
                    "Value": "G23.0",
                    "Description": "Sonstige degenerative Krankheiten der Basalganglien"
                },
                {
                    "Name": "G24.0",
                    "Value": "G24.0",
                    "Description": "Dystonie"
                },
                {
                    "Name": "G25.0",
                    "Value": "G25.0",
                    "Description": "Sonstige extrapyramidale Krankheiten und Bewegungsstörungen"
                },
                {
                    "Name": "G26.0",
                    "Value": "G26.0",
                    "Description": "nbsp; Extrapyramidale Krankheiten und Bewegungsstörungen bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "G30.0",
                    "Value": "G30.0",
                    "Description": ")"
                },
                {
                    "Name": "G31.0",
                    "Value": "G31.0",
                    "Description": "Sonstige degenerative Krankheiten des Nervensystems, anderenorts nicht klassifiziert"
                },
                {
                    "Name": "G32.0",
                    "Value": "G32.0",
                    "Description": "nbsp; Sonstige degenerative Krankheiten des Nervensystems bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "G35.0",
                    "Value": "G35.0",
                    "Description": "Demyelinisierende Krankheiten des Zentralnervensystems"
                },
                {
                    "Name": "G36.0",
                    "Value": "G36.0",
                    "Description": "Sonstige akute disseminierte Demyelinisation"
                },
                {
                    "Name": "G37.0",
                    "Value": "G37.0",
                    "Description": "Sonstige demyelinisierende Krankheiten des Zentralnervensystems"
                },
                {
                    "Name": "G40.0",
                    "Value": "G40.0",
                    "Description": "Episodische und paroxysmale Krankheiten des Nervensystems"
                },
                {
                    "Name": "G41.0",
                    "Value": "G41.0",
                    "Description": "Status epilepticus"
                },
                {
                    "Name": "G43.0",
                    "Value": "G43.0",
                    "Description": "Migräne"
                },
                {
                    "Name": "G44.0",
                    "Value": "G44.0",
                    "Description": "Sonstige Kopfschmerzsyndrome"
                },
                {
                    "Name": "G45.0",
                    "Value": "G45.0",
                    "Description": "Zerebrale transitorische Ischämie und verwandte Syndrome"
                },
                {
                    "Name": "G46.0",
                    "Value": "G46.0",
                    "Description": "Zerebrale Gefäßsyndrome bei zerebrovaskulären Krankheiten"
                },
                {
                    "Name": "G47.0",
                    "Value": "G47.0",
                    "Description": "Schlafstörungen"
                },
                {
                    "Name": "G50.0",
                    "Value": "G50.0",
                    "Description": "Krankheiten von Nerven, Nervenwurzeln und Nervenplexus"
                },
                {
                    "Name": "G51.0",
                    "Value": "G51.0",
                    "Description": "Krankheiten des N. facialis [VII. Hirnnerv]"
                },
                {
                    "Name": "G52.0",
                    "Value": "G52.0",
                    "Description": "Krankheiten sonstiger Hirnnerven"
                },
                {
                    "Name": "G53.0",
                    "Value": "G53.0",
                    "Description": "nbsp; Krankheiten der Hirnnerven bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "G54.0",
                    "Value": "G54.0",
                    "Description": "Krankheiten von Nervenwurzeln und Nervenplexus"
                },
                {
                    "Name": "G55.0",
                    "Value": "G55.0",
                    "Description": "nbsp; Kompression von Nervenwurzeln und Nervenplexus bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "G56.0",
                    "Value": "G56.0",
                    "Description": "Mononeuropathien der oberen Extremität"
                },
                {
                    "Name": "G57.0",
                    "Value": "G57.0",
                    "Description": "Mononeuropathien der unteren Extremität"
                },
                {
                    "Name": "G58.0",
                    "Value": "G58.0",
                    "Description": "Sonstige Mononeuropathien"
                },
                {
                    "Name": "G59.0",
                    "Value": "G59.0",
                    "Description": "Mononeuropathie bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "G60.0",
                    "Value": "G60.0",
                    "Description": "nbsp;Polyneuropathien und sonstige Krankheiten des peripheren Nervensystems"
                },
                {
                    "Name": "G61.0",
                    "Value": "G61.0",
                    "Description": "Polyneuritis"
                },
                {
                    "Name": "G62.0",
                    "Value": "G62.0",
                    "Description": "Sonstige Polyneuropathien"
                },
                {
                    "Name": "G63.0",
                    "Value": "G63.0",
                    "Description": "Polyneuropathie bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "G64.0",
                    "Value": "G64.0",
                    "Description": "Sonstige Krankheiten des peripheren Nervensystems"
                },
                {
                    "Name": "G70.0",
                    "Value": "G70.0",
                    "Description": "Krankheiten im Bereich der neuromuskulären Synapse und des Muskels"
                },
                {
                    "Name": "G71.0",
                    "Value": "G71.0",
                    "Description": "Primäre Myopathien"
                },
                {
                    "Name": "G72.0",
                    "Value": "G72.0",
                    "Description": "Sonstige Myopathien"
                },
                {
                    "Name": "G73.0",
                    "Value": "G73.0",
                    "Description": "nbsp; Krankheiten im Bereich der neuromuskulären Synapse und des Muskels bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "G80.0",
                    "Value": "G80.0",
                    "Description": "Zerebrale Lähmung und sonstige Lähmungssyndrome"
                },
                {
                    "Name": "G81.0",
                    "Value": "G81.0",
                    "Description": "Hemiparese und Hemiplegie"
                },
                {
                    "Name": "G82.0",
                    "Value": "G82.0",
                    "Description": "Paraparese und Paraplegie, Tetraparese und Tetraplegie"
                },
                {
                    "Name": "G83.0",
                    "Value": "G83.0",
                    "Description": "Sonstige Lähmungssyndrome"
                },
                {
                    "Name": "G90.0",
                    "Value": "G90.0",
                    "Description": "Sonstige Krankheiten des Nervensystems"
                },
                {
                    "Name": "G91.0",
                    "Value": "G91.0",
                    "Description": "Hydrozephalus"
                },
                {
                    "Name": "G92.0",
                    "Value": "G92.0",
                    "Description": "Toxische Enzephalopathie"
                },
                {
                    "Name": "G93.0",
                    "Value": "G93.0",
                    "Description": "Sonstige Krankheiten des Gehirns"
                },
                {
                    "Name": "G94.0",
                    "Value": "G94.0",
                    "Description": "nbsp; Sonstige Krankheiten des Gehirns bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "G95.0",
                    "Value": "G95.0",
                    "Description": "Sonstige Krankheiten des Rückenmarkes"
                },
                {
                    "Name": "G96.0",
                    "Value": "G96.0",
                    "Description": "Sonstige Krankheiten des Zentralnervensystems"
                },
                {
                    "Name": "G97.0",
                    "Value": "G97.0",
                    "Description": "Krankheiten des Nervensystems nach medizinischen Maßnahmen, anderenorts nicht klassifiziert"
                },
                {
                    "Name": "G98.0",
                    "Value": "G98.0",
                    "Description": "Sonstige Krankheiten des Nervensystems, anderenorts nicht klassifiziert"
                },
                {
                    "Name": "G99.0",
                    "Value": "G99.0",
                    "Description": "nbsp; Sonstige Krankheiten des Nervensystems bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "H00.0",
                    "Value": "H00.0",
                    "Description": "Affektionen des Augenlides, des Tränenapparates und der Orbita"
                },
                {
                    "Name": "H01.0",
                    "Value": "H01.0",
                    "Description": "Sonstige Entzündung des Augenlides"
                },
                {
                    "Name": "H02.0",
                    "Value": "H02.0",
                    "Description": "Sonstige Affektionen des Augenlides"
                },
                {
                    "Name": "H03.0",
                    "Value": "H03.0",
                    "Description": "nbsp; Affektionen des Augenlides bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "H04.0",
                    "Value": "H04.0",
                    "Description": "Affektionen des Tränenapparates"
                },
                {
                    "Name": "H05.0",
                    "Value": "H05.0",
                    "Description": "Affektionen der Orbita"
                },
                {
                    "Name": "H06.0",
                    "Value": "H06.0",
                    "Description": "nbsp; Affektionen des Tränenapparates und der Orbita bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "H10.0",
                    "Value": "H10.0",
                    "Description": "Affektionen der Konjunktiva"
                },
                {
                    "Name": "H11.0",
                    "Value": "H11.0",
                    "Description": "Sonstige Affektionen der Konjunktiva"
                },
                {
                    "Name": "H13.0",
                    "Value": "H13.0",
                    "Description": "nbsp; Affektionen der Konjunktiva bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "H15.0",
                    "Value": "H15.0",
                    "Description": "nbsp;Affektionen der Sklera, der Hornhaut, der Iris und des Ziliarkörpers"
                },
                {
                    "Name": "H16.0",
                    "Value": "H16.0",
                    "Description": "Keratitis"
                },
                {
                    "Name": "H17.0",
                    "Value": "H17.0",
                    "Description": "Hornhautnarben und -trübungen"
                },
                {
                    "Name": "H18.0",
                    "Value": "H18.0",
                    "Description": "Sonstige Affektionen der Hornhaut"
                },
                {
                    "Name": "H19.0",
                    "Value": "H19.0",
                    "Description": "nbsp; Affektionen der Sklera und der Hornhaut bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "H20.0",
                    "Value": "H20.0",
                    "Description": "Iridozyklitis"
                },
                {
                    "Name": "H21.0",
                    "Value": "H21.0",
                    "Description": "Sonstige Affektionen der Iris und des Ziliarkörpers"
                },
                {
                    "Name": "H22.0",
                    "Value": "H22.0",
                    "Description": "nbsp; Affektionen der Iris und des Ziliarkörpers bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "H25.0",
                    "Value": "H25.0",
                    "Description": "Affektionen der Linse"
                },
                {
                    "Name": "H26.0",
                    "Value": "H26.0",
                    "Description": "Sonstige Kataraktformen"
                },
                {
                    "Name": "H27.0",
                    "Value": "H27.0",
                    "Description": "Sonstige Affektionen der Linse"
                },
                {
                    "Name": "H28.0",
                    "Value": "H28.0",
                    "Description": "nbsp; Katarakt und sonstige Affektionen der Linse bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "H30.0",
                    "Value": "H30.0",
                    "Description": "Affektionen der Aderhaut und der Netzhaut"
                },
                {
                    "Name": "H31.0",
                    "Value": "H31.0",
                    "Description": "Sonstige Affektionen der Aderhaut"
                },
                {
                    "Name": "H32.0",
                    "Value": "H32.0",
                    "Description": "nbsp; Chorioretinale Affektionen bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "H33.0",
                    "Value": "H33.0",
                    "Description": "Netzhautablösung und Netzhautriss"
                },
                {
                    "Name": "H34.0",
                    "Value": "H34.0",
                    "Description": "Netzhautgefäßverschluss"
                },
                {
                    "Name": "H35.0",
                    "Value": "H35.0",
                    "Description": "Sonstige Affektionen der Netzhaut"
                },
                {
                    "Name": "H36.0",
                    "Value": "H36.0",
                    "Description": "nbsp; Affektionen der Netzhaut bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "H40.0",
                    "Value": "H40.0",
                    "Description": "Glaukom"
                },
                {
                    "Name": "H42.0",
                    "Value": "H42.0",
                    "Description": "Glaukom bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "H43.0",
                    "Value": "H43.0",
                    "Description": "Affektionen des Glaskörpers und des Augapfels"
                },
                {
                    "Name": "H44.0",
                    "Value": "H44.0",
                    "Description": "Affektionen des Augapfels"
                },
                {
                    "Name": "H45.0",
                    "Value": "H45.0",
                    "Description": "nbsp; Affektionen des Glaskörpers und des Augapfels bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "H46.0",
                    "Value": "H46.0",
                    "Description": "Affektionen des N. opticus und der Sehbahn"
                },
                {
                    "Name": "H47.0",
                    "Value": "H47.0",
                    "Description": "Sonstige Affektionen des N. opticus [II. Hirnnerv] und der Sehbahn"
                },
                {
                    "Name": "H48.0",
                    "Value": "H48.0",
                    "Description": "nbsp; Affektionen des N. opticus [II. Hirnnerv] und der Sehbahn bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "H49.0",
                    "Value": "H49.0",
                    "Description": "nbsp;Affektionen der Augenmuskeln, Störungen der Blickbewegungen sowie Akkommodationsstörungen und Refraktionsfehler"
                },
                {
                    "Name": "H50.0",
                    "Value": "H50.0",
                    "Description": "Sonstiger Strabismus"
                },
                {
                    "Name": "H51.0",
                    "Value": "H51.0",
                    "Description": "Sonstige Störungen der Blickbewegungen"
                },
                {
                    "Name": "H52.0",
                    "Value": "H52.0",
                    "Description": "Akkommodationsstörungen und Refraktionsfehler"
                },
                {
                    "Name": "H53.0",
                    "Value": "H53.0",
                    "Description": "Sehstörungen und Blindheit"
                },
                {
                    "Name": "H54.0",
                    "Value": "H54.0",
                    "Description": "Blindheit und Sehbeeinträchtigung"
                },
                {
                    "Name": "H55.0",
                    "Value": "H55.0",
                    "Description": "Sonstige Affektionen des Auges und der Augenanhangsgebilde"
                },
                {
                    "Name": "H57.0",
                    "Value": "H57.0",
                    "Description": "Sonstige Affektionen des Auges und der Augenanhangsgebilde"
                },
                {
                    "Name": "H58.0",
                    "Value": "H58.0",
                    "Description": "nbsp; Sonstige Affektionen des Auges und der Augenanhangsgebilde bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "H59.0",
                    "Value": "H59.0",
                    "Description": "Affektionen des Auges und der Augenanhangsgebilde nach medizinischen Maßnahmen, anderenorts nicht klassifiziert"
                },
                {
                    "Name": "H60.0",
                    "Value": "H60.0",
                    "Description": "Krankheiten des äußeren Ohres"
                },
                {
                    "Name": "H61.0",
                    "Value": "H61.0",
                    "Description": "Sonstige Krankheiten des äußeren Ohres"
                },
                {
                    "Name": "H62.0",
                    "Value": "H62.0",
                    "Description": "nbsp; Krankheiten des äußeren Ohres bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "H65.0",
                    "Value": "H65.0",
                    "Description": "Krankheiten des Mittelohres und des Warzenfortsatzes"
                },
                {
                    "Name": "H66.0",
                    "Value": "H66.0",
                    "Description": "Eitrige und nicht näher bezeichnete Otitis media"
                },
                {
                    "Name": "H67.0",
                    "Value": "H67.0",
                    "Description": "Otitis media bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "H68.0",
                    "Value": "H68.0",
                    "Description": "Entzündung und Verschluss der Tuba auditiva"
                },
                {
                    "Name": "H69.0",
                    "Value": "H69.0",
                    "Description": "Sonstige Krankheiten der Tuba auditiva"
                },
                {
                    "Name": "H70.0",
                    "Value": "H70.0",
                    "Description": "Mastoiditis und verwandte Zustände"
                },
                {
                    "Name": "H71.0",
                    "Value": "H71.0",
                    "Description": "Cholesteatom des Mittelohres"
                },
                {
                    "Name": "H72.0",
                    "Value": "H72.0",
                    "Description": "Trommelfellperforation"
                },
                {
                    "Name": "H73.0",
                    "Value": "H73.0",
                    "Description": "Sonstige Krankheiten des Trommelfells"
                },
                {
                    "Name": "H74.0",
                    "Value": "H74.0",
                    "Description": "Sonstige Krankheiten des Mittelohres und des Warzenfortsatzes"
                },
                {
                    "Name": "H75.0",
                    "Value": "H75.0",
                    "Description": "nbsp; Sonstige Krankheiten des Mittelohres und des Warzenfortsatzes bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "H80.0",
                    "Value": "H80.0",
                    "Description": "Krankheiten des Innenohres"
                },
                {
                    "Name": "H81.0",
                    "Value": "H81.0",
                    "Description": "Störungen der Vestibularfunktion"
                },
                {
                    "Name": "H82.0",
                    "Value": "H82.0",
                    "Description": "Schwindelsyndrome bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "H83.0",
                    "Value": "H83.0",
                    "Description": "Sonstige Krankheiten des Innenohres"
                },
                {
                    "Name": "H90.0",
                    "Value": "H90.0",
                    "Description": "Sonstige Krankheiten des Ohres"
                },
                {
                    "Name": "H91.0",
                    "Value": "H91.0",
                    "Description": "Sonstiger Hörverlust"
                },
                {
                    "Name": "H92.0",
                    "Value": "H92.0",
                    "Description": "Otalgie und Ohrenfluss"
                },
                {
                    "Name": "H93.0",
                    "Value": "H93.0",
                    "Description": "Sonstige Krankheiten des Ohres, anderenorts nicht klassifiziert"
                },
                {
                    "Name": "H94.0",
                    "Value": "H94.0",
                    "Description": "nbsp; Sonstige Krankheiten des Ohres bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "H95.0",
                    "Value": "H95.0",
                    "Description": "Krankheiten des Ohres und des Warzenfortsatzes nach medizinischen Maßnahmen, anderenorts nicht klassifiziert"
                },
                {
                    "Name": "I00.0",
                    "Value": "I00.0",
                    "Description": "Akutes rheumatisches Fieber"
                },
                {
                    "Name": "I01.0",
                    "Value": "I01.0",
                    "Description": "Rheumatisches Fieber mit Herzbeteiligung"
                },
                {
                    "Name": "I02.0",
                    "Value": "I02.0",
                    "Description": "Rheumatische Chorea"
                },
                {
                    "Name": "I05.0",
                    "Value": "I05.0",
                    "Description": "Chronische rheumatische Herzkrankheiten"
                },
                {
                    "Name": "I06.0",
                    "Value": "I06.0",
                    "Description": "Rheumatische Aortenklappenkrankheiten"
                },
                {
                    "Name": "I07.0",
                    "Value": "I07.0",
                    "Description": "Rheumatische Trikuspidalklappenkrankheiten"
                },
                {
                    "Name": "I08.0",
                    "Value": "I08.0",
                    "Description": "Krankheiten mehrerer Herzklappen"
                },
                {
                    "Name": "I09.0",
                    "Value": "I09.0",
                    "Description": "Sonstige rheumatische Herzkrankheiten"
                },
                {
                    "Name": "I10.0",
                    "Value": "I10.0",
                    "Description": "Hypertonie [Hochdruckkrankheit]"
                },
                {
                    "Name": "I11.0",
                    "Value": "I11.0",
                    "Description": "Hypertensive Herzkrankheit"
                },
                {
                    "Name": "I12.0",
                    "Value": "I12.0",
                    "Description": "Hypertensive Nierenkrankheit"
                },
                {
                    "Name": "I13.0",
                    "Value": "I13.0",
                    "Description": "Hypertensive Herz- und Nierenkrankheit"
                },
                {
                    "Name": "I15.0",
                    "Value": "I15.0",
                    "Description": "Sekundäre Hypertonie"
                },
                {
                    "Name": "I20.0",
                    "Value": "I20.0",
                    "Description": "Ischämische Herzkrankheiten"
                },
                {
                    "Name": "I21.0",
                    "Value": "I21.0",
                    "Description": "Akuter Myokardinfarkt"
                },
                {
                    "Name": "I22.0",
                    "Value": "I22.0",
                    "Description": "Rezidivierender Myokardinfarkt"
                },
                {
                    "Name": "I23.0",
                    "Value": "I23.0",
                    "Description": "Bestimmte akute Komplikationen nach akutem Myokardinfarkt"
                },
                {
                    "Name": "I24.0",
                    "Value": "I24.0",
                    "Description": "Sonstige akute ischämische Herzkrankheit"
                },
                {
                    "Name": "I25.0",
                    "Value": "I25.0",
                    "Description": "Chronische ischämische Herzkrankheit"
                },
                {
                    "Name": "I26.0",
                    "Value": "I26.0",
                    "Description": "Pulmonale Herzkrankheit und Krankheiten des Lungenkreislaufes"
                },
                {
                    "Name": "I27.0",
                    "Value": "I27.0",
                    "Description": "Sonstige pulmonale Herzkrankheiten"
                },
                {
                    "Name": "I28.0",
                    "Value": "I28.0",
                    "Description": "Sonstige Krankheiten der Lungengefäße"
                },
                {
                    "Name": "I30.0",
                    "Value": "I30.0",
                    "Description": "Sonstige Formen der Herzkrankheit"
                },
                {
                    "Name": "I31.0",
                    "Value": "I31.0",
                    "Description": "Sonstige Krankheiten des Perikards"
                },
                {
                    "Name": "I32.0",
                    "Value": "I32.0",
                    "Description": "Perikarditis bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "I33.0",
                    "Value": "I33.0",
                    "Description": "Akute und subakute Endokarditis"
                },
                {
                    "Name": "I34.0",
                    "Value": "I34.0",
                    "Description": "Nichtrheumatische Mitralklappenkrankheiten"
                },
                {
                    "Name": "I35.0",
                    "Value": "I35.0",
                    "Description": "Nichtrheumatische Aortenklappenkrankheiten"
                },
                {
                    "Name": "I36.0",
                    "Value": "I36.0",
                    "Description": "Nichtrheumatische Trikuspidalklappenkrankheiten"
                },
                {
                    "Name": "I37.0",
                    "Value": "I37.0",
                    "Description": "Pulmonalklappenkrankheiten"
                },
                {
                    "Name": "I38.0",
                    "Value": "I38.0",
                    "Description": "Endokarditis, Herzklappe nicht näher bezeichnet"
                },
                {
                    "Name": "I39.0",
                    "Value": "I39.0",
                    "Description": "nbsp; Endokarditis und Herzklappenkrankheiten bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "I40.0",
                    "Value": "I40.0",
                    "Description": "Akute Myokarditis"
                },
                {
                    "Name": "I41.0",
                    "Value": "I41.0",
                    "Description": "Myokarditis bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "I42.0",
                    "Value": "I42.0",
                    "Description": "Kardiomyopathie"
                },
                {
                    "Name": "I43.0",
                    "Value": "I43.0",
                    "Description": "Kardiomyopathie bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "I44.0",
                    "Value": "I44.0",
                    "Description": "Atrioventrikulärer Block und Linksschenkelblock"
                },
                {
                    "Name": "I45.0",
                    "Value": "I45.0",
                    "Description": "Sonstige kardiale Erregungsleitungsstörungen"
                },
                {
                    "Name": "I46.0",
                    "Value": "I46.0",
                    "Description": "Herzstillstand"
                },
                {
                    "Name": "I47.0",
                    "Value": "I47.0",
                    "Description": "Paroxysmale Tachykardie"
                },
                {
                    "Name": "I48.0",
                    "Value": "I48.0",
                    "Description": "Vorhofflimmern und Vorhofflattern"
                },
                {
                    "Name": "I49.0",
                    "Value": "I49.0",
                    "Description": "Sonstige kardiale Arrhythmien"
                },
                {
                    "Name": "I50.0",
                    "Value": "I50.0",
                    "Description": "Herzinsuffizienz"
                },
                {
                    "Name": "I51.0",
                    "Value": "I51.0",
                    "Description": "Komplikationen einer Herzkrankheit und ungenau beschriebene Herzkrankheit"
                },
                {
                    "Name": "I52.0",
                    "Value": "I52.0",
                    "Description": "nbsp; Sonstige Herzkrankheiten bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "I60.0",
                    "Value": "I60.0",
                    "Description": "-"
                },
                {
                    "Name": "I61.0",
                    "Value": "I61.0",
                    "Description": "Intrazerebrale Blutung"
                },
                {
                    "Name": "I62.0",
                    "Value": "I62.0",
                    "Description": "Sonstige nichttraumatische intrakranielle Blutung"
                },
                {
                    "Name": "I63.0",
                    "Value": "I63.0",
                    "Description": "Hirninfarkt"
                },
                {
                    "Name": "I64.0",
                    "Value": "I64.0",
                    "Description": "Schlaganfall, nicht als Blutung oder Infarkt bezeichnet"
                },
                {
                    "Name": "I65.0",
                    "Value": "I65.0",
                    "Description": "Verschluss und Stenose präzerebraler Arterien ohne resultierenden Hirninfarkt"
                },
                {
                    "Name": "I66.0",
                    "Value": "I66.0",
                    "Description": "Verschluss und Stenose zerebraler Arterien ohne resultierenden Hirninfarkt"
                },
                {
                    "Name": "I67.0",
                    "Value": "I67.0",
                    "Description": "+)"
                },
                {
                    "Name": "I68.0",
                    "Value": "I68.0",
                    "Description": "nbsp; Zerebrovaskuläre Störungen bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "I69.0",
                    "Value": "I69.0",
                    "Description": "Folgen einer zerebrovaskulären Krankheit"
                },
                {
                    "Name": "I70.0",
                    "Value": "I70.0",
                    "Description": "Krankheiten der Arterien, Arteriolen und Kapillaren"
                },
                {
                    "Name": "I71.0",
                    "Value": "I71.0",
                    "Description": "Aortenaneurysma und -dissektion"
                },
                {
                    "Name": "I72.0",
                    "Value": "I72.0",
                    "Description": "Sonstiges Aneurysma und sonstige Dissektion"
                },
                {
                    "Name": "I73.0",
                    "Value": "I73.0",
                    "Description": "Sonstige periphere Gefäßkrankheiten"
                },
                {
                    "Name": "I74.0",
                    "Value": "I74.0",
                    "Description": "Arterielle Embolie und Thrombose"
                },
                {
                    "Name": "I77.0",
                    "Value": "I77.0",
                    "Description": "Sonstige Krankheiten der Arterien und Arteriolen"
                },
                {
                    "Name": "I78.0",
                    "Value": "I78.0",
                    "Description": "Krankheiten der Kapillaren"
                },
                {
                    "Name": "I79.0",
                    "Value": "I79.0",
                    "Description": "nbsp; Krankheiten der Arterien, Arteriolen und Kapillaren bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "I80.0",
                    "Value": "I80.0",
                    "Description": "nbsp;Krankheiten der Venen, der Lymphgefäße und der Lymphknoten, anderenorts nicht klassifiziert"
                },
                {
                    "Name": "I81.0",
                    "Value": "I81.0",
                    "Description": "Pfortaderthrombose"
                },
                {
                    "Name": "I82.0",
                    "Value": "I82.0",
                    "Description": "Sonstige venöse Embolie und Thrombose"
                },
                {
                    "Name": "I83.0",
                    "Value": "I83.0",
                    "Description": "Varizen der unteren Extremitäten"
                },
                {
                    "Name": "I85.0",
                    "Value": "I85.0",
                    "Description": "ösophagusvarizen"
                },
                {
                    "Name": "I86.0",
                    "Value": "I86.0",
                    "Description": "Varizen sonstiger Lokalisationen"
                },
                {
                    "Name": "I87.0",
                    "Value": "I87.0",
                    "Description": "Sonstige Venenkrankheiten"
                },
                {
                    "Name": "I88.0",
                    "Value": "I88.0",
                    "Description": "Unspezifische Lymphadenitis"
                },
                {
                    "Name": "I89.0",
                    "Value": "I89.0",
                    "Description": "Sonstige nichtinfektiöse Krankheiten der Lymphgefäße und Lymphknoten"
                },
                {
                    "Name": "I95.0",
                    "Value": "I95.0",
                    "Description": "nbsp;Sonstige und nicht näher bezeichnete Krankheiten des Kreislaufsystems"
                },
                {
                    "Name": "I97.0",
                    "Value": "I97.0",
                    "Description": "Kreislaufkomplikationen nach medizinischen Maßnahmen, anderenorts nicht klassifiziert"
                },
                {
                    "Name": "I98.0",
                    "Value": "I98.0",
                    "Description": "nbsp; Sonstige Störungen des Kreislaufsystems bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "I99.0",
                    "Value": "I99.0",
                    "Description": "Sonstige und nicht näher bezeichnete Krankheiten des Kreislaufsystems"
                },
                {
                    "Name": "J00.0",
                    "Value": "J00.0",
                    "Description": "Akute Infektionen der oberen Atemwege"
                },
                {
                    "Name": "J01.0",
                    "Value": "J01.0",
                    "Description": "Akute Sinusitis"
                },
                {
                    "Name": "J02.0",
                    "Value": "J02.0",
                    "Description": "Akute Pharyngitis"
                },
                {
                    "Name": "J03.0",
                    "Value": "J03.0",
                    "Description": "Akute Tonsillitis"
                },
                {
                    "Name": "J04.0",
                    "Value": "J04.0",
                    "Description": "Akute Laryngitis und Tracheitis"
                },
                {
                    "Name": "J05.0",
                    "Value": "J05.0",
                    "Description": "Akute obstruktive Laryngitis [Krupp] und Epiglottitis"
                },
                {
                    "Name": "J06.0",
                    "Value": "J06.0",
                    "Description": "Akute Infektionen an mehreren oder nicht näher bezeichneten Lokalisationen der oberen Atemwege"
                },
                {
                    "Name": "J09.0",
                    "Value": "J09.0",
                    "Description": "Grippe und Pneumonie"
                },
                {
                    "Name": "J10.0",
                    "Value": "J10.0",
                    "Description": "Grippe durch sonstige nachgewiesene Influenzaviren"
                },
                {
                    "Name": "J11.0",
                    "Value": "J11.0",
                    "Description": "Grippe, Viren nicht nachgewiesen"
                },
                {
                    "Name": "J12.0",
                    "Value": "J12.0",
                    "Description": "Viruspneumonie, anderenorts nicht klassifiziert"
                },
                {
                    "Name": "J13.0",
                    "Value": "J13.0",
                    "Description": "Pneumonie durch Streptococcus pneumoniae"
                },
                {
                    "Name": "J14.0",
                    "Value": "J14.0",
                    "Description": "Pneumonie durch Haemophilus influenzae"
                },
                {
                    "Name": "J15.0",
                    "Value": "J15.0",
                    "Description": "Pneumonie durch Bakterien, anderenorts nicht klassifiziert"
                },
                {
                    "Name": "J16.0",
                    "Value": "J16.0",
                    "Description": "Pneumonie durch sonstige Infektionserreger, anderenorts nicht klassifiziert"
                },
                {
                    "Name": "J17.0",
                    "Value": "J17.0",
                    "Description": ")"
                },
                {
                    "Name": "J18.0",
                    "Value": "J18.0",
                    "Description": "Pneumonie, Erreger nicht näher bezeichnet"
                },
                {
                    "Name": "J20.0",
                    "Value": "J20.0",
                    "Description": "Sonstige akute Infektionen der unteren Atemwege"
                },
                {
                    "Name": "J21.0",
                    "Value": "J21.0",
                    "Description": "Akute Bronchiolitis"
                },
                {
                    "Name": "J22.0",
                    "Value": "J22.0",
                    "Description": "Akute Infektion der unteren Atemwege, nicht näher bezeichnet"
                },
                {
                    "Name": "J30.0",
                    "Value": "J30.0",
                    "Description": "Sonstige Krankheiten der oberen Atemwege"
                },
                {
                    "Name": "J31.0",
                    "Value": "J31.0",
                    "Description": "Chronische Rhinitis, Rhinopharyngitis und Pharyngitis"
                },
                {
                    "Name": "J32.0",
                    "Value": "J32.0",
                    "Description": "Chronische Sinusitis"
                },
                {
                    "Name": "J33.0",
                    "Value": "J33.0",
                    "Description": "Nasenpolyp"
                },
                {
                    "Name": "J34.0",
                    "Value": "J34.0",
                    "Description": "Sonstige Krankheiten der Nase und der Nasennebenhöhlen"
                },
                {
                    "Name": "J35.0",
                    "Value": "J35.0",
                    "Description": "Chronische Krankheiten der Gaumenmandeln und der Rachenmandel"
                },
                {
                    "Name": "J36.0",
                    "Value": "J36.0",
                    "Description": "Peritonsillarabszess"
                },
                {
                    "Name": "J37.0",
                    "Value": "J37.0",
                    "Description": "Chronische Laryngitis und Laryngotracheitis"
                },
                {
                    "Name": "J38.0",
                    "Value": "J38.0",
                    "Description": "Krankheiten der Stimmlippen und des Kehlkopfes, anderenorts nicht klassifiziert"
                },
                {
                    "Name": "J39.0",
                    "Value": "J39.0",
                    "Description": "Sonstige Krankheiten der oberen Atemwege"
                },
                {
                    "Name": "J40.0",
                    "Value": "J40.0",
                    "Description": "Chronische Krankheiten der unteren Atemwege"
                },
                {
                    "Name": "J41.0",
                    "Value": "J41.0",
                    "Description": "Einfache und schleimig-eitrige chronische Bronchitis"
                },
                {
                    "Name": "J42.0",
                    "Value": "J42.0",
                    "Description": "Nicht näher bezeichnete chronische Bronchitis"
                },
                {
                    "Name": "J43.0",
                    "Value": "J43.0",
                    "Description": "Emphysem"
                },
                {
                    "Name": "J44.0",
                    "Value": "J44.0",
                    "Description": "Sonstige chronische obstruktive Lungenkrankheit"
                },
                {
                    "Name": "J45.0",
                    "Value": "J45.0",
                    "Description": "Asthma bronchiale"
                },
                {
                    "Name": "J46.0",
                    "Value": "J46.0",
                    "Description": "Status asthmaticus"
                },
                {
                    "Name": "J47.0",
                    "Value": "J47.0",
                    "Description": "Bronchiektasen"
                },
                {
                    "Name": "J60.0",
                    "Value": "J60.0",
                    "Description": "Lungenkrankheiten durch exogene Substanzen"
                },
                {
                    "Name": "J61.0",
                    "Value": "J61.0",
                    "Description": "Pneumokoniose durch Asbest und sonstige anorganische Fasern"
                },
                {
                    "Name": "J62.0",
                    "Value": "J62.0",
                    "Description": "Pneumokoniose durch Quarzstaub"
                },
                {
                    "Name": "J63.0",
                    "Value": "J63.0",
                    "Description": "Pneumokoniose durch sonstige anorganische Stäube"
                },
                {
                    "Name": "J64.0",
                    "Value": "J64.0",
                    "Description": "Nicht näher bezeichnete Pneumokoniose"
                },
                {
                    "Name": "J65.0",
                    "Value": "J65.0",
                    "Description": "Pneumokoniose in Verbindung mit Tuberkulose"
                },
                {
                    "Name": "J66.0",
                    "Value": "J66.0",
                    "Description": "Krankheit der Atemwege durch spezifischen organischen Staub"
                },
                {
                    "Name": "J67.0",
                    "Value": "J67.0",
                    "Description": "Allergische Alveolitis durch organischen Staub"
                },
                {
                    "Name": "J68.0",
                    "Value": "J68.0",
                    "Description": "Krankheiten der Atmungsorgane durch Einatmen von chemischen Substanzen, Gasen, Rauch und Dämpfen"
                },
                {
                    "Name": "J69.0",
                    "Value": "J69.0",
                    "Description": "Pneumonie durch feste und flüssige Substanzen"
                },
                {
                    "Name": "J70.0",
                    "Value": "J70.0",
                    "Description": "Krankheiten der Atmungsorgane durch sonstige exogene Substanzen"
                },
                {
                    "Name": "J80.0",
                    "Value": "J80.0",
                    "Description": "nbsp;Sonstige Krankheiten der Atmungsorgane, die hauptsächlich das Interstitium betreffen"
                },
                {
                    "Name": "J81.0",
                    "Value": "J81.0",
                    "Description": "Lungenödem"
                },
                {
                    "Name": "J82.0",
                    "Value": "J82.0",
                    "Description": "Eosinophiles Lungeninfiltrat, anderenorts nicht klassifiziert"
                },
                {
                    "Name": "J84.0",
                    "Value": "J84.0",
                    "Description": "Sonstige interstitielle Lungenkrankheiten"
                },
                {
                    "Name": "J85.0",
                    "Value": "J85.0",
                    "Description": "nbsp;Purulente und nekrotisierende Krankheitszustände der unteren Atemwege"
                },
                {
                    "Name": "J86.0",
                    "Value": "J86.0",
                    "Description": "Pyothorax"
                },
                {
                    "Name": "J90.0",
                    "Value": "J90.0",
                    "Description": "Sonstige Krankheiten der Pleura"
                },
                {
                    "Name": "J91.0",
                    "Value": "J91.0",
                    "Description": "Pleuraerguss bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "J92.0",
                    "Value": "J92.0",
                    "Description": "Pleuraplaques"
                },
                {
                    "Name": "J93.0",
                    "Value": "J93.0",
                    "Description": "Pneumothorax"
                },
                {
                    "Name": "J94.0",
                    "Value": "J94.0",
                    "Description": "Sonstige Krankheitszustände der Pleura"
                },
                {
                    "Name": "J95.0",
                    "Value": "J95.0",
                    "Description": "Sonstige Krankheiten des Atmungssystems"
                },
                {
                    "Name": "J96.0",
                    "Value": "J96.0",
                    "Description": "Respiratorische Insuffizienz, anderenorts nicht klassifiziert"
                },
                {
                    "Name": "J98.0",
                    "Value": "J98.0",
                    "Description": "Sonstige Krankheiten der Atemwege"
                },
                {
                    "Name": "J99.0",
                    "Value": "J99.0",
                    "Description": "nbsp; Krankheiten der Atemwege bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "K00.0",
                    "Value": "K00.0",
                    "Description": "Krankheiten der Mundhöhle, der Speicheldrüsen und der Kiefer"
                },
                {
                    "Name": "K01.0",
                    "Value": "K01.0",
                    "Description": "Retinierte und impaktierte Zähne"
                },
                {
                    "Name": "K02.0",
                    "Value": "K02.0",
                    "Description": "Zahnkaries"
                },
                {
                    "Name": "K03.0",
                    "Value": "K03.0",
                    "Description": "Sonstige Krankheiten der Zahnhartsubstanzen"
                },
                {
                    "Name": "K04.0",
                    "Value": "K04.0",
                    "Description": "Krankheiten der Pulpa und des periapikalen Gewebes"
                },
                {
                    "Name": "K05.0",
                    "Value": "K05.0",
                    "Description": "Gingivitis und Krankheiten des Parodonts"
                },
                {
                    "Name": "K06.0",
                    "Value": "K06.0",
                    "Description": "Sonstige Krankheiten der Gingiva und des zahnlosen Alveolarkammes"
                },
                {
                    "Name": "K07.0",
                    "Value": "K07.0",
                    "Description": "Dentofaziale Anomalien [einschließlich fehlerhafter Okklusion]"
                },
                {
                    "Name": "K08.0",
                    "Value": "K08.0",
                    "Description": "Sonstige Krankheiten der Zähne und des Zahnhalteapparates"
                },
                {
                    "Name": "K09.0",
                    "Value": "K09.0",
                    "Description": "Zysten der Mundregion, anderenorts nicht klassifiziert"
                },
                {
                    "Name": "K10.0",
                    "Value": "K10.0",
                    "Description": "Sonstige Krankheiten der Kiefer"
                },
                {
                    "Name": "K11.0",
                    "Value": "K11.0",
                    "Description": "Krankheiten der Speicheldrüsen"
                },
                {
                    "Name": "K12.0",
                    "Value": "K12.0",
                    "Description": "Stomatitis und verwandte Krankheiten"
                },
                {
                    "Name": "K13.0",
                    "Value": "K13.0",
                    "Description": "Sonstige Krankheiten der Lippe und der Mundschleimhaut"
                },
                {
                    "Name": "K14.0",
                    "Value": "K14.0",
                    "Description": "Krankheiten der Zunge"
                },
                {
                    "Name": "K20.0",
                    "Value": "K20.0",
                    "Description": "Krankheiten des ösophagus, des Magens und des Duodenums"
                },
                {
                    "Name": "K21.0",
                    "Value": "K21.0",
                    "Description": "Gastroösophageale Refluxkrankheit"
                },
                {
                    "Name": "K22.0",
                    "Value": "K22.0",
                    "Description": "Sonstige Krankheiten des ösophagus"
                },
                {
                    "Name": "K23.0",
                    "Value": "K23.0",
                    "Description": "nbsp; Krankheiten des ösophagus bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "K25.0",
                    "Value": "K25.0",
                    "Description": "Ulcus ventriculi"
                },
                {
                    "Name": "K26.0",
                    "Value": "K26.0",
                    "Description": "Ulcus duodeni"
                },
                {
                    "Name": "K27.0",
                    "Value": "K27.0",
                    "Description": "Ulcus pepticum, Lokalisation nicht näher bezeichnet"
                },
                {
                    "Name": "K28.0",
                    "Value": "K28.0",
                    "Description": "Ulcus pepticum jejuni"
                },
                {
                    "Name": "K29.0",
                    "Value": "K29.0",
                    "Description": "Gastritis und Duodenitis"
                },
                {
                    "Name": "K30.0",
                    "Value": "K30.0",
                    "Description": "Funktionelle Dyspepsie"
                },
                {
                    "Name": "K31.0",
                    "Value": "K31.0",
                    "Description": "Sonstige Krankheiten des Magens und des Duodenums"
                },
                {
                    "Name": "K35.0",
                    "Value": "K35.0",
                    "Description": "Krankheiten der Appendix"
                },
                {
                    "Name": "K36.0",
                    "Value": "K36.0",
                    "Description": "Sonstige Appendizitis"
                },
                {
                    "Name": "K37.0",
                    "Value": "K37.0",
                    "Description": "Nicht näher bezeichnete Appendizitis"
                },
                {
                    "Name": "K38.0",
                    "Value": "K38.0",
                    "Description": "Sonstige Krankheiten der Appendix"
                },
                {
                    "Name": "K40.0",
                    "Value": "K40.0",
                    "Description": "Hernien"
                },
                {
                    "Name": "K41.0",
                    "Value": "K41.0",
                    "Description": "Hernia femoralis"
                },
                {
                    "Name": "K42.0",
                    "Value": "K42.0",
                    "Description": "Hernia umbilicalis"
                },
                {
                    "Name": "K43.0",
                    "Value": "K43.0",
                    "Description": "Hernia ventralis"
                },
                {
                    "Name": "K44.0",
                    "Value": "K44.0",
                    "Description": "Hernia diaphragmatica"
                },
                {
                    "Name": "K45.0",
                    "Value": "K45.0",
                    "Description": "Sonstige abdominale Hernien"
                },
                {
                    "Name": "K46.0",
                    "Value": "K46.0",
                    "Description": "Nicht näher bezeichnete abdominale Hernie"
                },
                {
                    "Name": "K50.0",
                    "Value": "K50.0",
                    "Description": "Nichtinfektiöse Enteritis und Kolitis"
                },
                {
                    "Name": "K51.0",
                    "Value": "K51.0",
                    "Description": "Colitis ulcerosa"
                },
                {
                    "Name": "K52.0",
                    "Value": "K52.0",
                    "Description": "Sonstige nichtinfektiöse Gastroenteritis und Kolitis"
                },
                {
                    "Name": "K55.0",
                    "Value": "K55.0",
                    "Description": "Sonstige Krankheiten des Darmes"
                },
                {
                    "Name": "K56.0",
                    "Value": "K56.0",
                    "Description": "Paralytischer Ileus und intestinale Obstruktion ohne Hernie"
                },
                {
                    "Name": "K57.0",
                    "Value": "K57.0",
                    "Description": "Divertikulose des Darmes"
                },
                {
                    "Name": "K58.0",
                    "Value": "K58.0",
                    "Description": "Reizdarmsyndrom"
                },
                {
                    "Name": "K59.0",
                    "Value": "K59.0",
                    "Description": "Sonstige funktionelle Darmstörungen"
                },
                {
                    "Name": "K60.0",
                    "Value": "K60.0",
                    "Description": "Fissur und Fistel in der Anal- und Rektalregion"
                },
                {
                    "Name": "K61.0",
                    "Value": "K61.0",
                    "Description": "Abszess in der Anal- und Rektalregion"
                },
                {
                    "Name": "K62.0",
                    "Value": "K62.0",
                    "Description": "Sonstige Krankheiten des Anus und des Rektums"
                },
                {
                    "Name": "K63.0",
                    "Value": "K63.0",
                    "Description": "Sonstige Krankheiten des Darmes"
                },
                {
                    "Name": "K64.0",
                    "Value": "K64.0",
                    "Description": "Hämorrhoiden und Perianalvenenthrombose"
                },
                {
                    "Name": "K65.0",
                    "Value": "K65.0",
                    "Description": "Krankheiten des Peritoneums"
                },
                {
                    "Name": "K66.0",
                    "Value": "K66.0",
                    "Description": "Sonstige Krankheiten des Peritoneums"
                },
                {
                    "Name": "K67.0",
                    "Value": "K67.0",
                    "Description": "nbsp; Krankheiten des Peritoneums bei anderenorts klassifizierten Infektionskrankheiten"
                },
                {
                    "Name": "K70.0",
                    "Value": "K70.0",
                    "Description": "Krankheiten der Leber"
                },
                {
                    "Name": "K71.0",
                    "Value": "K71.0",
                    "Description": "Toxische Leberkrankheit"
                },
                {
                    "Name": "K72.0",
                    "Value": "K72.0",
                    "Description": "Leberversagen, anderenorts nicht klassifiziert"
                },
                {
                    "Name": "K73.0",
                    "Value": "K73.0",
                    "Description": "Chronische Hepatitis, anderenorts nicht klassifiziert"
                },
                {
                    "Name": "K74.0",
                    "Value": "K74.0",
                    "Description": "Fibrose und Zirrhose der Leber"
                },
                {
                    "Name": "K75.0",
                    "Value": "K75.0",
                    "Description": "Sonstige entzündliche Leberkrankheiten"
                },
                {
                    "Name": "K76.0",
                    "Value": "K76.0",
                    "Description": "Sonstige Krankheiten der Leber"
                },
                {
                    "Name": "K77.0",
                    "Value": "K77.0",
                    "Description": "Leberkrankheiten bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "K80.0",
                    "Value": "K80.0",
                    "Description": "Krankheiten der Gallenblase, der Gallenwege und des Pankreas"
                },
                {
                    "Name": "K81.0",
                    "Value": "K81.0",
                    "Description": "Cholezystitis"
                },
                {
                    "Name": "K82.0",
                    "Value": "K82.0",
                    "Description": "Sonstige Krankheiten der Gallenblase"
                },
                {
                    "Name": "K83.0",
                    "Value": "K83.0",
                    "Description": "Sonstige Krankheiten der Gallenwege"
                },
                {
                    "Name": "K85.0",
                    "Value": "K85.0",
                    "Description": "Akute Pankreatitis"
                },
                {
                    "Name": "K86.0",
                    "Value": "K86.0",
                    "Description": "Sonstige Krankheiten des Pankreas"
                },
                {
                    "Name": "K87.0",
                    "Value": "K87.0",
                    "Description": "nbsp; Krankheiten der Gallenblase, der Gallenwege und des Pankreas bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "K90.0",
                    "Value": "K90.0",
                    "Description": "Sonstige Krankheiten des Verdauungssystems"
                },
                {
                    "Name": "K91.0",
                    "Value": "K91.0",
                    "Description": "Krankheiten des Verdauungssystems nach medizinischen Maßnahmen, anderenorts nicht klassifiziert"
                },
                {
                    "Name": "K92.0",
                    "Value": "K92.0",
                    "Description": "Sonstige Krankheiten des Verdauungssystems"
                },
                {
                    "Name": "K93.0",
                    "Value": "K93.0",
                    "Description": "nbsp; Krankheiten sonstiger Verdauungsorgane bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "L00.0",
                    "Value": "L00.0",
                    "Description": "Infektionen der Haut und der Unterhaut"
                },
                {
                    "Name": "L01.0",
                    "Value": "L01.0",
                    "Description": "Impetigo"
                },
                {
                    "Name": "L02.0",
                    "Value": "L02.0",
                    "Description": "Hautabszess, Furunkel und Karbunkel"
                },
                {
                    "Name": "L03.0",
                    "Value": "L03.0",
                    "Description": "Phlegmone"
                },
                {
                    "Name": "L04.0",
                    "Value": "L04.0",
                    "Description": "Akute Lymphadenitis"
                },
                {
                    "Name": "L05.0",
                    "Value": "L05.0",
                    "Description": "Pilonidalzyste"
                },
                {
                    "Name": "L08.0",
                    "Value": "L08.0",
                    "Description": "Sonstige lokale Infektionen der Haut und der Unterhaut"
                },
                {
                    "Name": "L10.0",
                    "Value": "L10.0",
                    "Description": "Bullöse Dermatosen"
                },
                {
                    "Name": "L11.0",
                    "Value": "L11.0",
                    "Description": "Sonstige akantholytische Dermatosen"
                },
                {
                    "Name": "L12.0",
                    "Value": "L12.0",
                    "Description": "Pemphigoidkrankheiten"
                },
                {
                    "Name": "L13.0",
                    "Value": "L13.0",
                    "Description": "Sonstige bullöse Dermatosen"
                },
                {
                    "Name": "L14.0",
                    "Value": "L14.0",
                    "Description": "Bullöse Dermatosen bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "L20.0",
                    "Value": "L20.0",
                    "Description": "Dermatitis und Ekzem"
                },
                {
                    "Name": "L21.0",
                    "Value": "L21.0",
                    "Description": "Seborrhoisches Ekzem"
                },
                {
                    "Name": "L22.0",
                    "Value": "L22.0",
                    "Description": "Windeldermatitis"
                },
                {
                    "Name": "L23.0",
                    "Value": "L23.0",
                    "Description": "Allergische Kontaktdermatitis"
                },
                {
                    "Name": "L24.0",
                    "Value": "L24.0",
                    "Description": "Toxische Kontaktdermatitis"
                },
                {
                    "Name": "L25.0",
                    "Value": "L25.0",
                    "Description": "Nicht näher bezeichnete Kontaktdermatitis"
                },
                {
                    "Name": "L26.0",
                    "Value": "L26.0",
                    "Description": "Exfoliative Dermatitis"
                },
                {
                    "Name": "L27.0",
                    "Value": "L27.0",
                    "Description": "Dermatitis durch oral, enteral oder parenteral aufgenommene Substanzen"
                },
                {
                    "Name": "L28.0",
                    "Value": "L28.0",
                    "Description": "Lichen simplex chronicus und Prurigo"
                },
                {
                    "Name": "L29.0",
                    "Value": "L29.0",
                    "Description": "Pruritus"
                },
                {
                    "Name": "L30.0",
                    "Value": "L30.0",
                    "Description": "Sonstige Dermatitis"
                },
                {
                    "Name": "L40.0",
                    "Value": "L40.0",
                    "Description": "Papulosquamöse Hautkrankheiten"
                },
                {
                    "Name": "L41.0",
                    "Value": "L41.0",
                    "Description": "Parapsoriasis"
                },
                {
                    "Name": "L42.0",
                    "Value": "L42.0",
                    "Description": "Pityriasis rosea"
                },
                {
                    "Name": "L43.0",
                    "Value": "L43.0",
                    "Description": "Lichen ruber planus"
                },
                {
                    "Name": "L44.0",
                    "Value": "L44.0",
                    "Description": "Sonstige papulosquamöse Hautkrankheiten"
                },
                {
                    "Name": "L45.0",
                    "Value": "L45.0",
                    "Description": "nbsp; Papulosquamöse Hautkrankheiten bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "L50.0",
                    "Value": "L50.0",
                    "Description": "Urtikaria und Erythem"
                },
                {
                    "Name": "L51.0",
                    "Value": "L51.0",
                    "Description": "Erythema exsudativum multiforme"
                },
                {
                    "Name": "L52.0",
                    "Value": "L52.0",
                    "Description": "Erythema nodosum"
                },
                {
                    "Name": "L53.0",
                    "Value": "L53.0",
                    "Description": "Sonstige erythematöse Krankheiten"
                },
                {
                    "Name": "L54.0",
                    "Value": "L54.0",
                    "Description": "Erythem bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "L55.0",
                    "Value": "L55.0",
                    "Description": "Krankheiten der Haut und der Unterhaut durch Strahleneinwirkung"
                },
                {
                    "Name": "L56.0",
                    "Value": "L56.0",
                    "Description": "Sonstige akute Hautveränderungen durch Ultraviolettstrahlen"
                },
                {
                    "Name": "L57.0",
                    "Value": "L57.0",
                    "Description": "Hautveränderungen durch chronische Exposition gegenüber nichtionisierender Strahlung"
                },
                {
                    "Name": "L58.0",
                    "Value": "L58.0",
                    "Description": "Radiodermatitis"
                },
                {
                    "Name": "L59.0",
                    "Value": "L59.0",
                    "Description": "Sonstige Krankheiten der Haut und der Unterhaut durch Strahleneinwirkung"
                },
                {
                    "Name": "L60.0",
                    "Value": "L60.0",
                    "Description": "Krankheiten der Hautanhangsgebilde"
                },
                {
                    "Name": "L62.0",
                    "Value": "L62.0",
                    "Description": "Krankheiten der Nägel bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "L63.0",
                    "Value": "L63.0",
                    "Description": "Alopecia areata"
                },
                {
                    "Name": "L64.0",
                    "Value": "L64.0",
                    "Description": "Alopecia androgenetica"
                },
                {
                    "Name": "L65.0",
                    "Value": "L65.0",
                    "Description": "Sonstiger Haarausfall ohne Narbenbildung"
                },
                {
                    "Name": "L66.0",
                    "Value": "L66.0",
                    "Description": "Narbige Alopezie [Haarausfall mit Narbenbildung]"
                },
                {
                    "Name": "L67.0",
                    "Value": "L67.0",
                    "Description": "Anomalien der Haarfarbe und des Haarschaftes"
                },
                {
                    "Name": "L68.0",
                    "Value": "L68.0",
                    "Description": "Hypertrichose"
                },
                {
                    "Name": "L70.0",
                    "Value": "L70.0",
                    "Description": "Akne"
                },
                {
                    "Name": "L71.0",
                    "Value": "L71.0",
                    "Description": "Rosazea"
                },
                {
                    "Name": "L72.0",
                    "Value": "L72.0",
                    "Description": "Follikuläre Zysten der Haut und der Unterhaut"
                },
                {
                    "Name": "L73.0",
                    "Value": "L73.0",
                    "Description": "Sonstige Krankheiten der Haarfollikel"
                },
                {
                    "Name": "L74.0",
                    "Value": "L74.0",
                    "Description": "Krankheiten der ekkrinen Schweißdrüsen"
                },
                {
                    "Name": "L75.0",
                    "Value": "L75.0",
                    "Description": "Krankheiten der apokrinen Schweißdrüsen"
                },
                {
                    "Name": "L80.0",
                    "Value": "L80.0",
                    "Description": "Sonstige Krankheiten der Haut und der Unterhaut"
                },
                {
                    "Name": "L81.0",
                    "Value": "L81.0",
                    "Description": "Sonstige Störungen der Hautpigmentierung"
                },
                {
                    "Name": "L82.0",
                    "Value": "L82.0",
                    "Description": "Seborrhoische Keratose"
                },
                {
                    "Name": "L83.0",
                    "Value": "L83.0",
                    "Description": "Acanthosis nigricans"
                },
                {
                    "Name": "L84.0",
                    "Value": "L84.0",
                    "Description": "Hühneraugen und Horn- (Haut-) Schwielen"
                },
                {
                    "Name": "L85.0",
                    "Value": "L85.0",
                    "Description": "Sonstige Epidermisverdickung"
                },
                {
                    "Name": "L86.0",
                    "Value": "L86.0",
                    "Description": "Keratom bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "L87.0",
                    "Value": "L87.0",
                    "Description": "Störungen der transepidermalen Elimination"
                },
                {
                    "Name": "L88.0",
                    "Value": "L88.0",
                    "Description": "Pyoderma gangraenosum"
                },
                {
                    "Name": "L89.0",
                    "Value": "L89.0",
                    "Description": "Dekubitalgeschwür und Druckzone"
                },
                {
                    "Name": "L90.0",
                    "Value": "L90.0",
                    "Description": "Atrophische Hautkrankheiten"
                },
                {
                    "Name": "L91.0",
                    "Value": "L91.0",
                    "Description": "Hypertrophe Hautkrankheiten"
                },
                {
                    "Name": "L92.0",
                    "Value": "L92.0",
                    "Description": "Granulomatöse Krankheiten der Haut und der Unterhaut"
                },
                {
                    "Name": "L93.0",
                    "Value": "L93.0",
                    "Description": "Lupus erythematodes"
                },
                {
                    "Name": "L94.0",
                    "Value": "L94.0",
                    "Description": "Sonstige lokalisierte Krankheiten des Bindegewebes"
                },
                {
                    "Name": "L95.0",
                    "Value": "L95.0",
                    "Description": "Anderenorts nicht klassifizierte Vaskulitis, die auf die Haut begrenzt ist"
                },
                {
                    "Name": "L97.0",
                    "Value": "L97.0",
                    "Description": "Ulcus cruris, anderenorts nicht klassifiziert"
                },
                {
                    "Name": "L98.0",
                    "Value": "L98.0",
                    "Description": "Sonstige Krankheiten der Haut und der Unterhaut, anderenorts nicht klassifiziert"
                },
                {
                    "Name": "L99.0",
                    "Value": "L99.0",
                    "Description": "nbsp; Sonstige Krankheiten der Haut und der Unterhaut bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "M00.0",
                    "Value": "M00.0",
                    "Description": "Arthropathien"
                },
                {
                    "Name": "M01.0",
                    "Value": "M01.0",
                    "Description": "nbsp; Direkte Gelenkinfektionen bei anderenorts klassifizierten infektiösen und parasitären Krankheiten"
                },
                {
                    "Name": "M02.0",
                    "Value": "M02.0",
                    "Description": "Reaktive Arthritiden"
                },
                {
                    "Name": "M03.0",
                    "Value": "M03.0",
                    "Description": "nbsp; Postinfektiöse und reaktive Arthritiden bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "M05.0",
                    "Value": "M05.0",
                    "Description": "Entzündliche Polyarthropathien"
                },
                {
                    "Name": "M06.0",
                    "Value": "M06.0",
                    "Description": "Sonstige chronische Polyarthritis"
                },
                {
                    "Name": "M07.0",
                    "Value": "M07.0",
                    "Description": "nbsp; Arthritis psoriatica und Arthritiden bei gastrointestinalen Grundkrankheiten"
                },
                {
                    "Name": "M08.0",
                    "Value": "M08.0",
                    "Description": "Juvenile Arthritis"
                },
                {
                    "Name": "M09.0",
                    "Value": "M09.0",
                    "Description": "Juvenile Arthritis bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "M10.0",
                    "Value": "M10.0",
                    "Description": "Gicht"
                },
                {
                    "Name": "M11.0",
                    "Value": "M11.0",
                    "Description": "Sonstige Kristall-Arthropathien"
                },
                {
                    "Name": "M12.0",
                    "Value": "M12.0",
                    "Description": "Sonstige näher bezeichnete Arthropathien"
                },
                {
                    "Name": "M13.0",
                    "Value": "M13.0",
                    "Description": "Sonstige Arthritis"
                },
                {
                    "Name": "M14.0",
                    "Value": "M14.0",
                    "Description": "nbsp; Arthropathien bei sonstigen anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "M15.0",
                    "Value": "M15.0",
                    "Description": "Arthrose"
                },
                {
                    "Name": "M16.0",
                    "Value": "M16.0",
                    "Description": "Koxarthrose [Arthrose des Hüftgelenkes]"
                },
                {
                    "Name": "M17.0",
                    "Value": "M17.0",
                    "Description": "Gonarthrose [Arthrose des Kniegelenkes]"
                },
                {
                    "Name": "M18.0",
                    "Value": "M18.0",
                    "Description": "Rhizarthrose [Arthrose des Daumensattelgelenkes]"
                },
                {
                    "Name": "M19.0",
                    "Value": "M19.0",
                    "Description": "Sonstige Arthrose"
                },
                {
                    "Name": "M20.0",
                    "Value": "M20.0",
                    "Description": "Sonstige Gelenkkrankheiten"
                },
                {
                    "Name": "M21.0",
                    "Value": "M21.0",
                    "Description": "Sonstige erworbene Deformitäten der Extremitäten"
                },
                {
                    "Name": "M22.0",
                    "Value": "M22.0",
                    "Description": "Krankheiten der Patella"
                },
                {
                    "Name": "M23.0",
                    "Value": "M23.0",
                    "Description": ", unter der Krankheitsgruppe"
                },
                {
                    "Name": "M24.0",
                    "Value": "M24.0",
                    "Description": "Sonstige näher bezeichnete Gelenkschädigungen"
                },
                {
                    "Name": "M25.0",
                    "Value": "M25.0",
                    "Description": "Sonstige Gelenkkrankheiten, anderenorts nicht klassifiziert"
                },
                {
                    "Name": "M30.0",
                    "Value": "M30.0",
                    "Description": "Panarteriitis nodosa und verwandte Zustände"
                },
                {
                    "Name": "M31.0",
                    "Value": "M31.0",
                    "Description": "Sonstige nekrotisierende Vaskulopathien"
                },
                {
                    "Name": "M32.0",
                    "Value": "M32.0",
                    "Description": "Systemischer Lupus erythematodes"
                },
                {
                    "Name": "M33.0",
                    "Value": "M33.0",
                    "Description": "Dermatomyositis-Polymyositis"
                },
                {
                    "Name": "M34.0",
                    "Value": "M34.0",
                    "Description": "Systemische Sklerose"
                },
                {
                    "Name": "M35.0",
                    "Value": "M35.0",
                    "Description": "Sonstige Krankheiten mit Systembeteiligung des Bindegewebes"
                },
                {
                    "Name": "M36.0",
                    "Value": "M36.0",
                    "Description": "Systemkrankheiten des Bindegewebes bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "M40.0",
                    "Value": "M40.0",
                    "Description": "Krankheiten der Wirbelsäule und des Rückens"
                },
                {
                    "Name": "M41.0",
                    "Value": "M41.0",
                    "Description": "Skoliose"
                },
                {
                    "Name": "M42.0",
                    "Value": "M42.0",
                    "Description": "Osteochondrose der Wirbelsäule"
                },
                {
                    "Name": "M43.0",
                    "Value": "M43.0",
                    "Description": "Sonstige Deformitäten der Wirbelsäule und des Rückens"
                },
                {
                    "Name": "M45.0",
                    "Value": "M45.0",
                    "Description": "Spondylopathien"
                },
                {
                    "Name": "M46.0",
                    "Value": "M46.0",
                    "Description": "Sonstige entzündliche Spondylopathien"
                },
                {
                    "Name": "M47.0",
                    "Value": "M47.0",
                    "Description": "Spondylose"
                },
                {
                    "Name": "M48.0",
                    "Value": "M48.0",
                    "Description": "Sonstige Spondylopathien"
                },
                {
                    "Name": "M49.0",
                    "Value": "M49.0",
                    "Description": "Spondylopathien bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "M50.0",
                    "Value": "M50.0",
                    "Description": "Sonstige Krankheiten der Wirbelsäule und des Rückens"
                },
                {
                    "Name": "M51.0",
                    "Value": "M51.0",
                    "Description": "Sonstige Bandscheibenschäden"
                },
                {
                    "Name": "M53.0",
                    "Value": "M53.0",
                    "Description": "Sonstige Krankheiten der Wirbelsäule und des Rückens, anderenorts nicht klassifiziert"
                },
                {
                    "Name": "M54.0",
                    "Value": "M54.0",
                    "Description": "Rückenschmerzen"
                },
                {
                    "Name": "M60.0",
                    "Value": "M60.0",
                    "Description": "Krankheiten der Weichteilgewebe"
                },
                {
                    "Name": "M61.0",
                    "Value": "M61.0",
                    "Description": "Kalzifikation und Ossifikation von Muskeln"
                },
                {
                    "Name": "M62.0",
                    "Value": "M62.0",
                    "Description": "Sonstige Muskelkrankheiten"
                },
                {
                    "Name": "M63.0",
                    "Value": "M63.0",
                    "Description": "Muskelkrankheiten bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "M65.0",
                    "Value": "M65.0",
                    "Description": "Krankheiten der Synovialis und der Sehnen"
                },
                {
                    "Name": "M66.0",
                    "Value": "M66.0",
                    "Description": "Spontanruptur der Synovialis und von Sehnen"
                },
                {
                    "Name": "M67.0",
                    "Value": "M67.0",
                    "Description": "Sonstige Krankheiten der Synovialis und der Sehnen"
                },
                {
                    "Name": "M68.0",
                    "Value": "M68.0",
                    "Description": "nbsp; Krankheiten der Synovialis und der Sehnen bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "M70.0",
                    "Value": "M70.0",
                    "Description": "Sonstige Krankheiten des Weichteilgewebes"
                },
                {
                    "Name": "M71.0",
                    "Value": "M71.0",
                    "Description": "Sonstige Bursopathien"
                },
                {
                    "Name": "M72.0",
                    "Value": "M72.0",
                    "Description": "Fibromatosen"
                },
                {
                    "Name": "M73.0",
                    "Value": "M73.0",
                    "Description": "nbsp; Krankheiten des Weichteilgewebes bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "M75.0",
                    "Value": "M75.0",
                    "Description": "Schulterläsionen"
                },
                {
                    "Name": "M76.0",
                    "Value": "M76.0",
                    "Description": "Enthesopathien der unteren Extremität mit Ausnahme des Fußes"
                },
                {
                    "Name": "M77.0",
                    "Value": "M77.0",
                    "Description": "Sonstige Enthesopathien"
                },
                {
                    "Name": "M79.0",
                    "Value": "M79.0",
                    "Description": "Sonstige Krankheiten des Weichteilgewebes, anderenorts nicht klassifiziert"
                },
                {
                    "Name": "M80.0",
                    "Value": "M80.0",
                    "Description": ")"
                },
                {
                    "Name": "M81.0",
                    "Value": "M81.0",
                    "Description": "Osteoporose ohne pathologische Fraktur"
                },
                {
                    "Name": "M82.0",
                    "Value": "M82.0",
                    "Description": "Osteoporose bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "M83.0",
                    "Value": "M83.0",
                    "Description": "Osteomalazie im Erwachsenenalter"
                },
                {
                    "Name": "M84.0",
                    "Value": "M84.0",
                    "Description": ")"
                },
                {
                    "Name": "M85.0",
                    "Value": "M85.0",
                    "Description": "Sonstige Veränderungen der Knochendichte und -struktur"
                },
                {
                    "Name": "M86.0",
                    "Value": "M86.0",
                    "Description": "Sonstige Osteopathien"
                },
                {
                    "Name": "M87.0",
                    "Value": "M87.0",
                    "Description": "Knochennekrose"
                },
                {
                    "Name": "M88.0",
                    "Value": "M88.0",
                    "Description": "Osteodystrophia deformans [Paget-Krankheit]"
                },
                {
                    "Name": "M89.0",
                    "Value": "M89.0",
                    "Description": "Sonstige Knochenkrankheiten"
                },
                {
                    "Name": "M90.0",
                    "Value": "M90.0",
                    "Description": "Osteopathien bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "M91.0",
                    "Value": "M91.0",
                    "Description": "Chondropathien"
                },
                {
                    "Name": "M92.0",
                    "Value": "M92.0",
                    "Description": "Sonstige juvenile Osteochondrosen"
                },
                {
                    "Name": "M93.0",
                    "Value": "M93.0",
                    "Description": "Sonstige Osteochondropathien"
                },
                {
                    "Name": "M94.0",
                    "Value": "M94.0",
                    "Description": "Sonstige Knorpelkrankheiten"
                },
                {
                    "Name": "M95.0",
                    "Value": "M95.0",
                    "Description": "nbsp;Sonstige Krankheiten des Muskel-Skelett-Systems und des Bindegewebes"
                },
                {
                    "Name": "M96.0",
                    "Value": "M96.0",
                    "Description": "Krankheiten des Muskel-Skelett-Systems nach medizinischen Maßnahmen, anderenorts nicht klassifiziert"
                },
                {
                    "Name": "M99.0",
                    "Value": "M99.0",
                    "Description": "Biomechanische Funktionsstörungen, anderenorts nicht klassifiziert"
                },
                {
                    "Name": "N00.0",
                    "Value": "N00.0",
                    "Description": "Glomeruläre Krankheiten"
                },
                {
                    "Name": "N01.0",
                    "Value": "N01.0",
                    "Description": "Rapid-progressives nephritisches Syndrom"
                },
                {
                    "Name": "N02.0",
                    "Value": "N02.0",
                    "Description": "Rezidivierende und persistierende Hämaturie"
                },
                {
                    "Name": "N03.0",
                    "Value": "N03.0",
                    "Description": "Chronisches nephritisches Syndrom"
                },
                {
                    "Name": "N04.0",
                    "Value": "N04.0",
                    "Description": "Nephrotisches Syndrom"
                },
                {
                    "Name": "N05.0",
                    "Value": "N05.0",
                    "Description": "Nicht näher bezeichnetes nephritisches Syndrom"
                },
                {
                    "Name": "N06.0",
                    "Value": "N06.0",
                    "Description": "Isolierte Proteinurie mit Angabe morphologischer Veränderungen"
                },
                {
                    "Name": "N07.0",
                    "Value": "N07.0",
                    "Description": "Hereditäre Nephropathie, anderenorts nicht klassifiziert"
                },
                {
                    "Name": "N08.0",
                    "Value": "N08.0",
                    "Description": "nbsp; Glomeruläre Krankheiten bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "N10.0",
                    "Value": "N10.0",
                    "Description": "Tubulointerstitielle Nierenkrankheiten"
                },
                {
                    "Name": "N11.0",
                    "Value": "N11.0",
                    "Description": "Chronische tubulointerstitielle Nephritis"
                },
                {
                    "Name": "N12.0",
                    "Value": "N12.0",
                    "Description": "Tubulointerstitielle Nephritis, nicht als akut oder chronisch bezeichnet"
                },
                {
                    "Name": "N13.0",
                    "Value": "N13.0",
                    "Description": "Obstruktive Uropathie und Refluxuropathie"
                },
                {
                    "Name": "N14.0",
                    "Value": "N14.0",
                    "Description": "Arzneimittel- und schwermetallinduzierte tubulointerstitielle und tubuläre Krankheitszustände"
                },
                {
                    "Name": "N15.0",
                    "Value": "N15.0",
                    "Description": "Sonstige tubulointerstitielle Nierenkrankheiten"
                },
                {
                    "Name": "N16.0",
                    "Value": "N16.0",
                    "Description": "nbsp; Tubulointerstitielle Nierenkrankheiten bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "N17.0",
                    "Value": "N17.0",
                    "Description": "Niereninsuffizienz"
                },
                {
                    "Name": "N18.0",
                    "Value": "N18.0",
                    "Description": "Chronische Nierenkrankheit"
                },
                {
                    "Name": "N19.0",
                    "Value": "N19.0",
                    "Description": "Nicht näher bezeichnete Niereninsuffizienz"
                },
                {
                    "Name": "N20.0",
                    "Value": "N20.0",
                    "Description": "Urolithiasis"
                },
                {
                    "Name": "N21.0",
                    "Value": "N21.0",
                    "Description": "Stein in den unteren Harnwegen"
                },
                {
                    "Name": "N22.0",
                    "Value": "N22.0",
                    "Description": "Harnstein bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "N23.0",
                    "Value": "N23.0",
                    "Description": "Nicht näher bezeichnete Nierenkolik"
                },
                {
                    "Name": "N25.0",
                    "Value": "N25.0",
                    "Description": "Sonstige Krankheiten der Niere und des Ureters"
                },
                {
                    "Name": "N26.0",
                    "Value": "N26.0",
                    "Description": "Schrumpfniere, nicht näher bezeichnet"
                },
                {
                    "Name": "N27.0",
                    "Value": "N27.0",
                    "Description": "Kleine Niere unbekannter Ursache"
                },
                {
                    "Name": "N28.0",
                    "Value": "N28.0",
                    "Description": "Sonstige Krankheiten der Niere und des Ureters, anderenorts nicht klassifiziert"
                },
                {
                    "Name": "N29.0",
                    "Value": "N29.0",
                    "Description": "nbsp; Sonstige Krankheiten der Niere und des Ureters bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "N30.0",
                    "Value": "N30.0",
                    "Description": "Sonstige Krankheiten des Harnsystems"
                },
                {
                    "Name": "N31.0",
                    "Value": "N31.0",
                    "Description": "Neuromuskuläre Dysfunktion der Harnblase, anderenorts nicht klassifiziert"
                },
                {
                    "Name": "N32.0",
                    "Value": "N32.0",
                    "Description": "Sonstige Krankheiten der Harnblase"
                },
                {
                    "Name": "N33.0",
                    "Value": "N33.0",
                    "Description": "nbsp; Krankheiten der Harnblase bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "N34.0",
                    "Value": "N34.0",
                    "Description": "Urethritis und urethrales Syndrom"
                },
                {
                    "Name": "N35.0",
                    "Value": "N35.0",
                    "Description": "Harnröhrenstriktur"
                },
                {
                    "Name": "N36.0",
                    "Value": "N36.0",
                    "Description": "Sonstige Krankheiten der Harnröhre"
                },
                {
                    "Name": "N37.0",
                    "Value": "N37.0",
                    "Description": "nbsp; Krankheiten der Harnröhre bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "N39.0",
                    "Value": "N39.0",
                    "Description": "Sonstige Krankheiten des Harnsystems"
                },
                {
                    "Name": "N40.0",
                    "Value": "N40.0",
                    "Description": "Krankheiten der männlichen Genitalorgane"
                },
                {
                    "Name": "N41.0",
                    "Value": "N41.0",
                    "Description": "Entzündliche Krankheiten der Prostata"
                },
                {
                    "Name": "N42.0",
                    "Value": "N42.0",
                    "Description": "Sonstige Krankheiten der Prostata"
                },
                {
                    "Name": "N43.0",
                    "Value": "N43.0",
                    "Description": "Hydrozele und Spermatozele"
                },
                {
                    "Name": "N44.0",
                    "Value": "N44.0",
                    "Description": "Hodentorsion und Hydatidentorsion"
                },
                {
                    "Name": "N45.0",
                    "Value": "N45.0",
                    "Description": "Orchitis und Epididymitis"
                },
                {
                    "Name": "N46.0",
                    "Value": "N46.0",
                    "Description": "Sterilität beim Mann"
                },
                {
                    "Name": "N47.0",
                    "Value": "N47.0",
                    "Description": "Vorhauthypertrophie, Phimose und Paraphimose"
                },
                {
                    "Name": "N48.0",
                    "Value": "N48.0",
                    "Description": "Sonstige Krankheiten des Penis"
                },
                {
                    "Name": "N49.0",
                    "Value": "N49.0",
                    "Description": "Entzündliche Krankheiten der männlichen Genitalorgane, anderenorts nicht klassifiziert"
                },
                {
                    "Name": "N50.0",
                    "Value": "N50.0",
                    "Description": "Sonstige Krankheiten der männlichen Genitalorgane"
                },
                {
                    "Name": "N51.0",
                    "Value": "N51.0",
                    "Description": "nbsp; Krankheiten der männlichen Genitalorgane bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "N60.0",
                    "Value": "N60.0",
                    "Description": "Krankheiten der Mamma [Brustdrüse]"
                },
                {
                    "Name": "N61.0",
                    "Value": "N61.0",
                    "Description": "Entzündliche Krankheiten der Mamma [Brustdrüse]"
                },
                {
                    "Name": "N62.0",
                    "Value": "N62.0",
                    "Description": "Hypertrophie der Mamma [Brustdrüse]"
                },
                {
                    "Name": "N63.0",
                    "Value": "N63.0",
                    "Description": "Nicht näher bezeichnete Knoten in der Mamma [Brustdrüse]"
                },
                {
                    "Name": "N64.0",
                    "Value": "N64.0",
                    "Description": "Sonstige Krankheiten der Mamma [Brustdrüse]"
                },
                {
                    "Name": "N70.0",
                    "Value": "N70.0",
                    "Description": "Entzündliche Krankheiten der weiblichen Beckenorgane"
                },
                {
                    "Name": "N71.0",
                    "Value": "N71.0",
                    "Description": "Entzündliche Krankheit des Uterus, ausgenommen der Zervix"
                },
                {
                    "Name": "N72.0",
                    "Value": "N72.0",
                    "Description": "Entzündliche Krankheit der Cervix uteri"
                },
                {
                    "Name": "N73.0",
                    "Value": "N73.0",
                    "Description": "Sonstige entzündliche Krankheiten im weiblichen Becken"
                },
                {
                    "Name": "N74.0",
                    "Value": "N74.0",
                    "Description": "nbsp; Entzündung im weiblichen Becken bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "N75.0",
                    "Value": "N75.0",
                    "Description": "Krankheiten der Bartholin-Drüsen"
                },
                {
                    "Name": "N76.0",
                    "Value": "N76.0",
                    "Description": "Sonstige entzündliche Krankheit der Vagina und Vulva"
                },
                {
                    "Name": "N77.0",
                    "Value": "N77.0",
                    "Description": "nbsp; Vulvovaginale Ulzeration und Entzündung bei anderenorts klassifizierten Krankheiten"
                },
                {
                    "Name": "N80.0",
                    "Value": "N80.0",
                    "Description": "Nichtentzündliche Krankheiten des weiblichen Genitaltraktes"
                },
                {
                    "Name": "N81.0",
                    "Value": "N81.0",
                    "Description": "Genitalprolaps bei der Frau"
                },
                {
                    "Name": "N82.0",
                    "Value": "N82.0",
                    "Description": "Fisteln mit Beteiligung des weiblichen Genitaltraktes"
                },
                {
                    "Name": "N83.0",
                    "Value": "N83.0",
                    "Description": "Nichtentzündliche Krankheiten des Ovars, der Tuba uterina und des Lig. latum uteri"
                },
                {
                    "Name": "N84.0",
                    "Value": "N84.0",
                    "Description": "Polyp des weiblichen Genitaltraktes"
                },
                {
                    "Name": "N85.0",
                    "Value": "N85.0",
                    "Description": "Sonstige nichtentzündliche Krankheiten des Uterus, ausgenommen der Zervix"
                },
                {
                    "Name": "N86.0",
                    "Value": "N86.0",
                    "Description": "Erosion und Ektropium der Cervix uteri"
                },
                {
                    "Name": "N87.0",
                    "Value": "N87.0",
                    "Description": "Dysplasie der Cervix uteri"
                },
                {
                    "Name": "N88.0",
                    "Value": "N88.0",
                    "Description": "Sonstige nichtentzündliche Krankheiten der Cervix uteri"
                },
                {
                    "Name": "N89.0",
                    "Value": "N89.0",
                    "Description": "Sonstige nichtentzündliche Krankheiten der Vagina"
                },
                {
                    "Name": "N90.0",
                    "Value": "N90.0",
                    "Description": "Sonstige nichtentzündliche Krankheiten der Vulva und des Perineums"
                },
                {
                    "Name": "N91.0",
                    "Value": "N91.0",
                    "Description": "Ausgebliebene, zu schwache oder zu seltene Menstruation"
                },
                {
                    "Name": "N92.0",
                    "Value": "N92.0",
                    "Description": "Zu starke, zu häufige oder unregelmäßige Menstruation"
                },
                {
                    "Name": "N93.0",
                    "Value": "N93.0",
                    "Description": "Sonstige abnorme Uterus- oder Vaginalblutung"
                },
                {
                    "Name": "N94.0",
                    "Value": "N94.0",
                    "Description": "Schmerz und andere Zustände im Zusammenhang mit den weiblichen Genitalorganen und dem Menstruationszyklus"
                },
                {
                    "Name": "N95.0",
                    "Value": "N95.0",
                    "Description": "Klimakterische Störungen"
                },
                {
                    "Name": "N96.0",
                    "Value": "N96.0",
                    "Description": "Neigung zu habituellem Abort"
                },
                {
                    "Name": "N97.0",
                    "Value": "N97.0",
                    "Description": "Sterilität der Frau"
                },
                {
                    "Name": "N98.0",
                    "Value": "N98.0",
                    "Description": "Komplikationen im Zusammenhang mit künstlicher Befruchtung"
                },
                {
                    "Name": "N99.0",
                    "Value": "N99.0",
                    "Description": "Sonstige Krankheiten des Urogenitalsystems"
                },
                {
                    "Name": "O00.0",
                    "Value": "O00.0",
                    "Description": "Schwangerschaft mit abortivem Ausgang"
                },
                {
                    "Name": "O09.0",
                    "Value": "O09.0",
                    "Description": "Schwangerschaftsdauer"
                },
                {
                    "Name": "O10.0",
                    "Value": "O10.0",
                    "Description": "nbsp;ödeme, Proteinurie und Hypertonie während der Schwangerschaft, der Geburt und des Wochenbettes"
                },
                {
                    "Name": "O20.0",
                    "Value": "O20.0",
                    "Description": "nbsp;Sonstige Krankheiten der Mutter, die vorwiegend mit der Schwangerschaft verbunden sind"
                },
                {
                    "Name": "O30.0",
                    "Value": "O30.0",
                    "Description": "nbsp;Betreuung der Mutter im Hinblick auf den Feten und die Amnionhöhle sowie mögliche Entbindungskomplikationen"
                },
                {
                    "Name": "O60.0",
                    "Value": "O60.0",
                    "Description": "Komplikationen bei Wehentätigkeit und Entbindung"
                },
                {
                    "Name": "O80.0",
                    "Value": "O80.0",
                    "Description": "Entbindung"
                },
                {
                    "Name": "O85.0",
                    "Value": "O85.0",
                    "Description": "Komplikationen, die vorwiegend im Wochenbett auftreten"
                },
                {
                    "Name": "O94.0",
                    "Value": "O94.0",
                    "Description": "nbsp;Sonstige Krankheitszustände während der Gestationsperiode, die anderenorts nicht klassifiziert sind"
                },
                {
                    "Name": "P00.0",
                    "Value": "P00.0",
                    "Description": "nbsp;Schädigung des Feten und Neugeborenen durch mütterliche Faktoren und durch Komplikationen bei Schwangerschaft, Wehentätigkeit und"
                },
                {
                    "Name": "P05.0",
                    "Value": "P05.0",
                    "Description": "nbsp;Störungen im Zusammenhang mit der Schwangerschaftsdauer und dem fetalen Wachstum"
                },
                {
                    "Name": "P10.0",
                    "Value": "P10.0",
                    "Description": "Geburtstrauma"
                },
                {
                    "Name": "P20.0",
                    "Value": "P20.0",
                    "Description": "nbsp;Krankheiten des Atmungs- und Herz-Kreislaufsystems, die für die Perinatalperiode spezifisch sind"
                },
                {
                    "Name": "P35.0",
                    "Value": "P35.0",
                    "Description": "Angeborene Viruskrankheiten"
                },
                {
                    "Name": "P36.0",
                    "Value": "P36.0",
                    "Description": "Bakterielle Sepsis beim Neugeborenen"
                },
                {
                    "Name": "P37.0",
                    "Value": "P37.0",
                    "Description": "Sonstige angeborene infektiöse und parasitäre Krankheiten"
                },
                {
                    "Name": "P38.0",
                    "Value": "P38.0",
                    "Description": "Omphalitis beim Neugeborenen mit oder ohne leichte Blutung"
                },
                {
                    "Name": "P39.0",
                    "Value": "P39.0",
                    "Description": "Sonstige Infektionen, die für die Perinatalperiode spezifisch sind"
                },
                {
                    "Name": "P50.0",
                    "Value": "P50.0",
                    "Description": "nbsp;Hämorrhagische und hämatologische Krankheiten beim Feten und Neugeborenen"
                },
                {
                    "Name": "P70.0",
                    "Value": "P70.0",
                    "Description": "nbsp;Transitorische endokrine und Stoffwechselstörungen, die für den Feten und das Neugeborene spezifisch sind"
                },
                {
                    "Name": "P75.0",
                    "Value": "P75.0",
                    "Description": "Krankheiten des Verdauungssystems beim Feten und Neugeborenen"
                },
                {
                    "Name": "P80.0",
                    "Value": "P80.0",
                    "Description": "nbsp;Krankheitszustände mit Beteiligung der Haut und der Temperaturregulation beim Feten und Neugeborenen"
                },
                {
                    "Name": "P90.0",
                    "Value": "P90.0",
                    "Description": "nbsp;Sonstige Störungen, die ihren Ursprung in der Perinatalperiode haben"
                },
                {
                    "Name": "Q00.0",
                    "Value": "Q00.0",
                    "Description": "Angeborene Fehlbildungen des Nervensystems"
                },
                {
                    "Name": "Q10.0",
                    "Value": "Q10.0",
                    "Description": "nbsp;Angeborene Fehlbildungen des Auges, des Ohres, des Gesichtes und des Halses"
                },
                {
                    "Name": "Q20.0",
                    "Value": "Q20.0",
                    "Description": "Angeborene Fehlbildungen des Kreislaufsystems"
                },
                {
                    "Name": "Q30.0",
                    "Value": "Q30.0",
                    "Description": "Angeborene Fehlbildungen des Atmungssystems"
                },
                {
                    "Name": "Q35.0",
                    "Value": "Q35.0",
                    "Description": "Lippen-, Kiefer- und Gaumenspalte"
                },
                {
                    "Name": "Q38.0",
                    "Value": "Q38.0",
                    "Description": "Sonstige angeborene Fehlbildungen des Verdauungssystems"
                },
                {
                    "Name": "Q50.0",
                    "Value": "Q50.0",
                    "Description": "Angeborene Fehlbildungen der Genitalorgane"
                },
                {
                    "Name": "Q60.0",
                    "Value": "Q60.0",
                    "Description": "Angeborene Fehlbildungen des Harnsystems"
                },
                {
                    "Name": "Q65.0",
                    "Value": "Q65.0",
                    "Description": "nbsp;Angeborene Fehlbildungen und Deformitäten des Muskel-Skelett-Systems"
                },
                {
                    "Name": "Q80.0",
                    "Value": "Q80.0",
                    "Description": "Sonstige angeborene Fehlbildungen"
                },
                {
                    "Name": "Q90.0",
                    "Value": "Q90.0",
                    "Description": "Chromosomenanomalien, anderenorts nicht klassifiziert"
                },
                {
                    "Name": "R00.0",
                    "Value": "R00.0",
                    "Description": "Symptome, die das Kreislaufsystem und das Atmungssystem betreffen"
                },
                {
                    "Name": "R10.0",
                    "Value": "R10.0",
                    "Description": "Symptome, die das Verdauungssystem und das Abdomen betreffen"
                },
                {
                    "Name": "R20.0",
                    "Value": "R20.0",
                    "Description": "Symptome, die die Haut und das Unterhautgewebe betreffen"
                },
                {
                    "Name": "R25.0",
                    "Value": "R25.0",
                    "Description": "nbsp;Symptome, die das Nervensystem und das Muskel-Skelett-System betreffen"
                },
                {
                    "Name": "R30.0",
                    "Value": "R30.0",
                    "Description": "Symptome, die das Harnsystem betreffen"
                },
                {
                    "Name": "R40.0",
                    "Value": "R40.0",
                    "Description": "nbsp;Symptome, die das Erkennungs- und Wahrnehmungsvermögen, die Stimmung und das Verhalten betreffen"
                },
                {
                    "Name": "R47.0",
                    "Value": "R47.0",
                    "Description": "Symptome, die die Sprache und die Stimme betreffen"
                },
                {
                    "Name": "R50.0",
                    "Value": "R50.0",
                    "Description": "Allgemeinsymptome"
                },
                {
                    "Name": "R70.0",
                    "Value": "R70.0",
                    "Description": "Abnorme Blutuntersuchungsbefunde ohne Vorliegen einer Diagnose"
                },
                {
                    "Name": "R80.0",
                    "Value": "R80.0",
                    "Description": "Abnorme Urinuntersuchungsbefunde ohne Vorliegen einer Diagnose"
                },
                {
                    "Name": "R83.0",
                    "Value": "R83.0",
                    "Description": "nbsp;Abnorme Befunde ohne Vorliegen einer Diagnose bei der Untersuchung anderer Körperflüssigkeiten, Substanzen und Gewebe"
                },
                {
                    "Name": "R90.0",
                    "Value": "R90.0",
                    "Description": "nbsp;Abnorme Befunde ohne Vorliegen einer Diagnose bei bildgebender Diagnostik und Funktionsprüfungen"
                },
                {
                    "Name": "R95.0",
                    "Value": "R95.0",
                    "Description": "Ungenau bezeichnete und unbekannte Todesursachen"
                },
                {
                    "Name": "S00.0",
                    "Value": "S00.0",
                    "Description": "Verletzungen des Kopfes"
                },
                {
                    "Name": "S10.0",
                    "Value": "S10.0",
                    "Description": "Verletzungen des Halses"
                },
                {
                    "Name": "S20.0",
                    "Value": "S20.0",
                    "Description": "Verletzungen des Thorax"
                },
                {
                    "Name": "S30.0",
                    "Value": "S30.0",
                    "Description": "nbsp;Verletzungen des Abdomens, der Lumbosakralgegend, der Lendenwirbelsäule und des Beckens"
                },
                {
                    "Name": "S40.0",
                    "Value": "S40.0",
                    "Description": "Verletzungen der Schulter und des Oberarmes"
                },
                {
                    "Name": "S50.0",
                    "Value": "S50.0",
                    "Description": "Verletzungen des Ellenbogens und des Unterarmes"
                },
                {
                    "Name": "S60.0",
                    "Value": "S60.0",
                    "Description": "Verletzungen des Handgelenkes und der Hand"
                },
                {
                    "Name": "S70.0",
                    "Value": "S70.0",
                    "Description": "Verletzungen der Hüfte und des Oberschenkels"
                },
                {
                    "Name": "S80.0",
                    "Value": "S80.0",
                    "Description": "Verletzungen des Knies und des Unterschenkels"
                },
                {
                    "Name": "S90.0",
                    "Value": "S90.0",
                    "Description": "Verletzungen der Knöchelregion und des Fußes"
                },
                {
                    "Name": "T00.0",
                    "Value": "T00.0",
                    "Description": "Verletzungen mit Beteiligung mehrerer Körperregionen"
                },
                {
                    "Name": "T08.0",
                    "Value": "T08.0",
                    "Description": "nbsp;Verletzungen nicht näher bezeichneter Teile des Rumpfes, der Extremitäten oder anderer Körperregionen"
                },
                {
                    "Name": "T14.0",
                    "Value": "T14.0",
                    "Description": "sowie"
                },
                {
                    "Name": "T15.0",
                    "Value": "T15.0",
                    "Description": "nbsp;Folgen des Eindringens eines Fremdkörpers durch eine natürliche Körperöffnung"
                },
                {
                    "Name": "T20.0",
                    "Value": "T20.0",
                    "Description": "Verbrennungen oder Verätzungen"
                },
                {
                    "Name": "T26.0",
                    "Value": "T26.0",
                    "Description": "nbsp;Verbrennungen oder Verätzungen, die auf das Auge und auf innere Organe begrenzt sind"
                },
                {
                    "Name": "T29.0",
                    "Value": "T29.0",
                    "Description": "nbsp;Verbrennungen oder Verätzungen mehrerer und nicht näher bezeichneter Körperregionen"
                },
                {
                    "Name": "T33.0",
                    "Value": "T33.0",
                    "Description": "Erfrierungen"
                },
                {
                    "Name": "T36.0",
                    "Value": "T36.0",
                    "Description": "nbsp;Vergiftungen durch Arzneimittel, Drogen und biologisch aktive Substanzen"
                },
                {
                    "Name": "T51.0",
                    "Value": "T51.0",
                    "Description": "nbsp;Toxische Wirkungen von vorwiegend nicht medizinisch verwendeten Substanzen"
                },
                {
                    "Name": "T66.0",
                    "Value": "T66.0",
                    "Description": "Sonstige und nicht näher bezeichnete Schäden durch äußere Ursachen"
                },
                {
                    "Name": "T79.0",
                    "Value": "T79.0",
                    "Description": "Bestimmte Frühkomplikationen eines Traumas"
                },
                {
                    "Name": "T80.0",
                    "Value": "T80.0",
                    "Description": "nbsp;Komplikationen bei chirurgischen Eingriffen und medizinischer Behandlung, anderenorts nicht klassifiziert"
                },
                {
                    "Name": "T89.0",
                    "Value": "T89.0",
                    "Description": "nbsp;Sonstige Komplikationen eines Traumas, anderenorts nicht klassifiziert"
                },
                {
                    "Name": "T90.0",
                    "Value": "T90.0",
                    "Description": "nbsp;Folgen von Verletzungen, Vergiftungen und sonstigen Auswirkungen äußerer Ursachen"
                },
                {
                    "Name": "U00.0",
                    "Value": "U00.0",
                    "Description": "nbsp;Vorläufige Zuordnungen für Krankheiten mit unklarer ätiologie und nicht belegte Schlüsselnummern"
                },
                {
                    "Name": "U04.0",
                    "Value": "U04.0",
                    "Description": "Schweres akutes respiratorisches Syndrom [SARS]"
                },
                {
                    "Name": "U06.0",
                    "Value": "U06.0",
                    "Description": "Nicht belegte Schlüsselnummer"
                },
                {
                    "Name": "U50.0",
                    "Value": "U50.0",
                    "Description": "Funktionseinschränkung"
                },
                {
                    "Name": "U51.0",
                    "Value": "U51.0",
                    "Description": "Kognitive Funktionseinschränkung"
                },
                {
                    "Name": "U52.0",
                    "Value": "U52.0",
                    "Description": "Frührehabilitations-Barthel-Index [FRB]"
                },
                {
                    "Name": "U55.0",
                    "Value": "U55.0",
                    "Description": "Erfolgte Registrierung zur Organtransplantation"
                },
                {
                    "Name": "U60.0",
                    "Value": "U60.0",
                    "Description": "Stadieneinteilung der HIV-Infektion"
                },
                {
                    "Name": "U61.0",
                    "Value": "U61.0",
                    "Description": "Anzahl der T-Helferzellen bei HIV-Krankheit"
                },
                {
                    "Name": "U69.0",
                    "Value": "U69.0",
                    "Description": "Sonstige sekundäre Schlüsselnummern für besondere Zwecke"
                },
                {
                    "Name": "U80.0",
                    "Value": "U80.0",
                    "Description": "nbsp;Infektionserreger mit Resistenzen gegen bestimmte Antibiotika oder Chemotherapeutika"
                },
                {
                    "Name": "U81.0",
                    "Value": "U81.0",
                    "Description": "Bakterien mit Multiresistenz gegen Antibiotika"
                },
                {
                    "Name": "U82.0",
                    "Value": "U82.0",
                    "Description": "Mykobakterien mit Resistenz gegen Antituberkulotika (Erstrangmedikamente)"
                },
                {
                    "Name": "U83.0",
                    "Value": "U83.0",
                    "Description": "Candida mit Resistenz gegen Fluconazol oder Voriconazol"
                },
                {
                    "Name": "U84.0",
                    "Value": "U84.0",
                    "Description": "Herpesviren mit Resistenz gegen Virustatika"
                },
                {
                    "Name": "U85.0",
                    "Value": "U85.0",
                    "Description": "Humanes Immundefizienz-Virus mit Resistenz gegen Virustatika oder Proteinaseinhibitoren"
                },
                {
                    "Name": "U99.0",
                    "Value": "U99.0",
                    "Description": "Nicht belegte Schlüsselnummern"
                },
                {
                    "Name": "V01.0",
                    "Value": "V01.0",
                    "Description": "Unfälle"
                },
                {
                    "Name": "V99.0",
                    "Value": "V99.0",
                    "Description": "Transportmittelunfall"
                },
                {
                    "Name": "W49.0",
                    "Value": "W49.0",
                    "Description": "Exposition gegenüber mechanischen Kräften unbelebter Objekte"
                },
                {
                    "Name": "W64.0",
                    "Value": "W64.0",
                    "Description": "Exposition gegenüber mechanischen Kräften belebter Objekte"
                },
                {
                    "Name": "W87.0",
                    "Value": "W87.0",
                    "Description": "Exposition gegenüber elektrischem Strom"
                },
                {
                    "Name": "W91.0",
                    "Value": "W91.0",
                    "Description": "Exposition gegenüber Strahlung"
                },
                {
                    "Name": "W92.0",
                    "Value": "W92.0",
                    "Description": "Exposition gegenüber übermäßiger, künstlich erzeugter Hitze"
                },
                {
                    "Name": "W93.0",
                    "Value": "W93.0",
                    "Description": "Exposition gegenüber übermäßiger, künstlich erzeugter Kälte"
                },
                {
                    "Name": "W94.0",
                    "Value": "W94.0",
                    "Description": "Exposition gegenüber hohem oder niedrigem Luftdruck oder Luftdruckwechsel"
                },
                {
                    "Name": "X19.0",
                    "Value": "X19.0",
                    "Description": "Verbrennung oder Verbrühung durch Hitze oder heiße Substanzen"
                },
                {
                    "Name": "X29.0",
                    "Value": "X29.0",
                    "Description": "Kontakt mit giftigen Tieren und Pflanzen"
                },
                {
                    "Name": "X49.0",
                    "Value": "X49.0",
                    "Description": "Akzidentelle Vergiftung durch und Exposition gegenüber schädliche(n) Substanzen"
                },
                {
                    "Name": "X59.0",
                    "Value": "X59.0",
                    "Description": "Akzidentelle Exposition gegenüber sonstigen und nicht näher bezeichneten Faktoren"
                },
                {
                    "Name": "X60.0",
                    "Value": "X60.0",
                    "Description": "Vorsätzliche Selbstbeschädigung"
                },
                {
                    "Name": "X84.0",
                    "Value": "X84.0",
                    "Description": "Absichtliche Selbstbeschädigung"
                },
                {
                    "Name": "X85.0",
                    "Value": "X85.0",
                    "Description": "Tätlicher Angriff"
                },
                {
                    "Name": "Y09.0",
                    "Value": "Y09.0",
                    "Description": "Tätlicher Angriff"
                },
                {
                    "Name": "Y10.0",
                    "Value": "Y10.0",
                    "Description": "Ereignis, dessen nähere Umstände unbestimmt sind"
                },
                {
                    "Name": "Y34.0",
                    "Value": "Y34.0",
                    "Description": "Nicht näher bezeichnetes Ereignis, Umstände unbestimmt"
                },
                {
                    "Name": "Y35.0",
                    "Value": "Y35.0",
                    "Description": "Gesetzliche Maßnahmen und Kriegshandlungen"
                },
                {
                    "Name": "Y36.0",
                    "Value": "Y36.0",
                    "Description": "Verletzungen durch Kriegshandlungen"
                },
                {
                    "Name": "Y40.0",
                    "Value": "Y40.0",
                    "Description": "Komplikationen bei der medizinischen und chirurgischen Behandlung"
                },
                {
                    "Name": "Y57.0",
                    "Value": "Y57.0",
                    "Description": "Unerwünschte Nebenwirkungen bei therapeutischer Anwendung von Arzneimitteln und Drogen"
                },
                {
                    "Name": "Y59.0",
                    "Value": "Y59.0",
                    "Description": "Unerwünschte Nebenwirkungen bei therapeutischer Anwendung von Impfstoffen oder biologisch aktiven Substanzen"
                },
                {
                    "Name": "Y69.0",
                    "Value": "Y69.0",
                    "Description": "Zwischenfälle bei chirurgischem Eingriff und medizinischer Behandlung"
                },
                {
                    "Name": "Y82.0",
                    "Value": "Y82.0",
                    "Description": "Medizintechnische Geräte und Produkte im Zusammenhang mit Zwischenfällen bei diagnostischer und therapeutischer Anwendung"
                },
                {
                    "Name": "Y84.0",
                    "Value": "Y84.0",
                    "Description": "Chirurgische und sonstige medizinische Maßnahmen als Ursache einer abnormen Reaktion eines Patienten oder einer späteren Komplikation,"
                },
                {
                    "Name": "Z00.0",
                    "Value": "Z00.0",
                    "Description": "nbsp;Personen, die das Gesundheitswesen zur Untersuchung und Abklärung in Anspruch nehmen"
                },
                {
                    "Name": "Z01.0",
                    "Value": "Z01.0",
                    "Description": "Sonstige spezielle Untersuchungen und Abklärungen bei Personen ohne Beschwerden oder angegebene Diagnose"
                },
                {
                    "Name": "Z02.0",
                    "Value": "Z02.0",
                    "Description": "Untersuchung und Konsultation aus administrativen Gründen"
                },
                {
                    "Name": "Z03.0",
                    "Value": "Z03.0",
                    "Description": "ärztliche Beobachtung und Beurteilung von Verdachtsfällen"
                },
                {
                    "Name": "Z04.0",
                    "Value": "Z04.0",
                    "Description": "Untersuchung und Beobachtung aus sonstigen Gründen"
                },
                {
                    "Name": "Z08.0",
                    "Value": "Z08.0",
                    "Description": "Nachuntersuchung nach Behandlung wegen bösartiger Neubildung"
                },
                {
                    "Name": "Z09.0",
                    "Value": "Z09.0",
                    "Description": "Nachuntersuchung nach Behandlung wegen anderer Krankheitszustände außer bösartigen Neubildungen"
                },
                {
                    "Name": "Z10.0",
                    "Value": "Z10.0",
                    "Description": "Allgemeine Reihenuntersuchung bestimmter Bevölkerungsgruppen"
                },
                {
                    "Name": "Z11.0",
                    "Value": "Z11.0",
                    "Description": "Spezielle Verfahren zur Untersuchung auf infektiöse und parasitäre Krankheiten"
                },
                {
                    "Name": "Z12.0",
                    "Value": "Z12.0",
                    "Description": "Spezielle Verfahren zur Untersuchung auf Neubildungen"
                },
                {
                    "Name": "Z13.0",
                    "Value": "Z13.0",
                    "Description": "Spezielle Verfahren zur Untersuchung auf sonstige Krankheiten oder Störungen"
                },
                {
                    "Name": "Z20.0",
                    "Value": "Z20.0",
                    "Description": "nbsp;Personen mit potentiellen Gesundheitsrisiken hinsichtlich übertragbarer Krankheiten"
                },
                {
                    "Name": "Z21.0",
                    "Value": "Z21.0",
                    "Description": "Asymptomatische HIV-Infektion [Humane Immundefizienz-Virusinfektion]"
                },
                {
                    "Name": "Z22.0",
                    "Value": "Z22.0",
                    "Description": "Keimträger von Infektionskrankheiten"
                },
                {
                    "Name": "Z23.0",
                    "Value": "Z23.0",
                    "Description": "Notwendigkeit der Impfung [Immunisierung] gegen einzelne bakterielle Krankheiten"
                },
                {
                    "Name": "Z24.0",
                    "Value": "Z24.0",
                    "Description": "Notwendigkeit der Impfung [Immunisierung] gegen bestimmte einzelne Viruskrankheiten"
                },
                {
                    "Name": "Z25.0",
                    "Value": "Z25.0",
                    "Description": "Notwendigkeit der Impfung [Immunisierung] gegen andere einzelne Viruskrankheiten"
                },
                {
                    "Name": "Z26.0",
                    "Value": "Z26.0",
                    "Description": "Notwendigkeit der Impfung [Immunisierung] gegen andere einzelne Infektionskrankheiten"
                },
                {
                    "Name": "Z27.0",
                    "Value": "Z27.0",
                    "Description": "Notwendigkeit der Impfung [Immunisierung] gegen Kombinationen von Infektionskrankheiten"
                },
                {
                    "Name": "Z28.0",
                    "Value": "Z28.0",
                    "Description": "Nicht durchgeführte Impfung [Immunisierung]"
                },
                {
                    "Name": "Z29.0",
                    "Value": "Z29.0",
                    "Description": "Notwendigkeit von anderen prophylaktischen Maßnahmen"
                },
                {
                    "Name": "Z30.0",
                    "Value": "Z30.0",
                    "Description": "nbsp;Personen, die das Gesundheitswesen im Zusammenhang mit Problemen der Reproduktion in Anspruch nehmen"
                },
                {
                    "Name": "Z31.0",
                    "Value": "Z31.0",
                    "Description": "Fertilisationsfördernde Maßnahmen"
                },
                {
                    "Name": "Z32.0",
                    "Value": "Z32.0",
                    "Description": "Untersuchung und Test zur Feststellung einer Schwangerschaft"
                },
                {
                    "Name": "Z33.0",
                    "Value": "Z33.0",
                    "Description": "Schwangerschaftsfeststellung als Nebenbefund"
                },
                {
                    "Name": "Z34.0",
                    "Value": "Z34.0",
                    "Description": "überwachung einer normalen Schwangerschaft"
                },
                {
                    "Name": "Z35.0",
                    "Value": "Z35.0",
                    "Description": "überwachung einer Risikoschwangerschaft"
                },
                {
                    "Name": "Z36.0",
                    "Value": "Z36.0",
                    "Description": "Pränatales Screening"
                },
                {
                    "Name": "Z37.0",
                    "Value": "Z37.0",
                    "Description": "Resultat der Entbindung"
                },
                {
                    "Name": "Z38.0",
                    "Value": "Z38.0",
                    "Description": "Lebendgeborene nach dem Geburtsort"
                },
                {
                    "Name": "Z39.0",
                    "Value": "Z39.0",
                    "Description": "Postpartale Betreuung und Untersuchung der Mutter"
                },
                {
                    "Name": "Z40.0",
                    "Value": "Z40.0",
                    "Description": "nbsp;Personen, die das Gesundheitswesen zum Zwecke spezifischer Maßnahmen und zur medizinischen Betreuung in Anspruch nehmen"
                },
                {
                    "Name": "Z41.0",
                    "Value": "Z41.0",
                    "Description": "Maßnahmen aus anderen Gründen als der Wiederherstellung des Gesundheitszustandes"
                },
                {
                    "Name": "Z42.0",
                    "Value": "Z42.0",
                    "Description": "Nachbehandlung unter Anwendung plastischer Chirurgie"
                },
                {
                    "Name": "Z43.0",
                    "Value": "Z43.0",
                    "Description": "Versorgung künstlicher Körperöffnungen"
                },
                {
                    "Name": "Z44.0",
                    "Value": "Z44.0",
                    "Description": "Versorgen mit und Anpassen einer Ektoprothese"
                },
                {
                    "Name": "Z45.0",
                    "Value": "Z45.0",
                    "Description": "Anpassung und Handhabung eines implantierten medizinischen Gerätes"
                },
                {
                    "Name": "Z46.0",
                    "Value": "Z46.0",
                    "Description": "Versorgen mit und Anpassen von anderen medizinischen Geräten oder Hilfsmitteln"
                },
                {
                    "Name": "Z47.0",
                    "Value": "Z47.0",
                    "Description": "Andere orthopädische Nachbehandlung"
                },
                {
                    "Name": "Z48.0",
                    "Value": "Z48.0",
                    "Description": "Andere Nachbehandlung nach chirurgischem Eingriff"
                },
                {
                    "Name": "Z49.0",
                    "Value": "Z49.0",
                    "Description": "Dialysebehandlung"
                },
                {
                    "Name": "Z50.0",
                    "Value": "Z50.0",
                    "Description": "Rehabilitationsmaßnahmen"
                },
                {
                    "Name": "Z51.0",
                    "Value": "Z51.0",
                    "Description": "Sonstige medizinische Behandlung"
                },
                {
                    "Name": "Z52.0",
                    "Value": "Z52.0",
                    "Description": "Spender von Organen oder Geweben"
                },
                {
                    "Name": "Z53.0",
                    "Value": "Z53.0",
                    "Description": "Personen, die Einrichtungen des Gesundheitswesens wegen spezifischer Maßnahmen aufgesucht haben, die aber nicht durchgeführt wurden"
                },
                {
                    "Name": "Z54.0",
                    "Value": "Z54.0",
                    "Description": "Rekonvaleszenz"
                },
                {
                    "Name": "Z55.0",
                    "Value": "Z55.0",
                    "Description": "nbsp;Personen mit potentiellen Gesundheitsrisiken aufgrund sozioökonomischer oder psychosozialer Umstände"
                },
                {
                    "Name": "Z56.0",
                    "Value": "Z56.0",
                    "Description": "Kontaktanlässe mit Bezug auf das Berufsleben"
                },
                {
                    "Name": "Z57.0",
                    "Value": "Z57.0",
                    "Description": "Berufliche Exposition gegenüber Risikofaktoren"
                },
                {
                    "Name": "Z58.0",
                    "Value": "Z58.0",
                    "Description": "Kontaktanlässe mit Bezug auf die physikalische Umwelt"
                },
                {
                    "Name": "Z59.0",
                    "Value": "Z59.0",
                    "Description": "Kontaktanlässe mit Bezug auf das Wohnumfeld oder die wirtschaftliche Lage"
                },
                {
                    "Name": "Z60.0",
                    "Value": "Z60.0",
                    "Description": "Kontaktanlässe mit Bezug auf die soziale Umgebung"
                },
                {
                    "Name": "Z61.0",
                    "Value": "Z61.0",
                    "Description": "Kontaktanlässe mit Bezug auf Kindheitserlebnisse"
                },
                {
                    "Name": "Z62.0",
                    "Value": "Z62.0",
                    "Description": "Andere Kontaktanlässe mit Bezug auf die Erziehung"
                },
                {
                    "Name": "Z63.0",
                    "Value": "Z63.0",
                    "Description": "Andere Kontaktanlässe mit Bezug auf den engeren Familienkreis"
                },
                {
                    "Name": "Z64.0",
                    "Value": "Z64.0",
                    "Description": "Kontaktanlässe mit Bezug auf bestimmte psychosoziale Umstände"
                },
                {
                    "Name": "Z65.0",
                    "Value": "Z65.0",
                    "Description": "Kontaktanlässe mit Bezug auf andere psychosoziale Umstände"
                },
                {
                    "Name": "Z70.0",
                    "Value": "Z70.0",
                    "Description": "nbsp;Personen, die das Gesundheitswesen aus sonstigen Gründen in Anspruch nehmen"
                },
                {
                    "Name": "Z71.0",
                    "Value": "Z71.0",
                    "Description": "Personen, die das Gesundheitswesen zum Zwecke anderer Beratung oder ärztlicher Konsultation in Anspruch nehmen, anderenorts nicht"
                },
                {
                    "Name": "Z72.0",
                    "Value": "Z72.0",
                    "Description": "Probleme mit Bezug auf die Lebensführung"
                },
                {
                    "Name": "Z73.0",
                    "Value": "Z73.0",
                    "Description": "Probleme mit Bezug auf Schwierigkeiten bei der Lebensbewältigung"
                },
                {
                    "Name": "Z74.0",
                    "Value": "Z74.0",
                    "Description": "Probleme mit Bezug auf Pflegebedürftigkeit"
                },
                {
                    "Name": "Z75.0",
                    "Value": "Z75.0",
                    "Description": "Probleme mit Bezug auf medizinische Betreuungsmöglichkeiten oder andere Gesundheitsversorgung"
                },
                {
                    "Name": "Z76.0",
                    "Value": "Z76.0",
                    "Description": "Personen, die das Gesundheitswesen aus sonstigen Gründen in Anspruch nehmen"
                },
                {
                    "Name": "Z80.0",
                    "Value": "Z80.0",
                    "Description": "nbsp;Personen mit potentiellen Gesundheitsrisiken aufgrund der Familien- oder Eigenanamnese und bestimmte Zustände, die den"
                },
                {
                    "Name": "Z81.0",
                    "Value": "Z81.0",
                    "Description": "Psychische Krankheiten oder Verhaltensstörungen in der Familienanamnese"
                },
                {
                    "Name": "Z82.0",
                    "Value": "Z82.0",
                    "Description": "Bestimmte Behinderungen oder chronische Krankheiten in der Familienanamnese, die zu Schädigung oder Behinderung führen"
                },
                {
                    "Name": "Z83.0",
                    "Value": "Z83.0",
                    "Description": "Andere spezifische Krankheiten in der Familienanamnese"
                },
                {
                    "Name": "Z84.0",
                    "Value": "Z84.0",
                    "Description": "Andere Krankheiten oder Zustände in der Familienanamnese"
                },
                {
                    "Name": "Z85.0",
                    "Value": "Z85.0",
                    "Description": "Bösartige Neubildung in der Eigenanamnese"
                },
                {
                    "Name": "Z86.0",
                    "Value": "Z86.0",
                    "Description": "Bestimmte andere Krankheiten in der Eigenanamnese"
                },
                {
                    "Name": "Z87.0",
                    "Value": "Z87.0",
                    "Description": "Andere Krankheiten oder Zustände in der Eigenanamnese"
                },
                {
                    "Name": "Z88.0",
                    "Value": "Z88.0",
                    "Description": "Allergie gegenüber Arzneimitteln, Drogen oder biologisch aktiven Substanzen in der Eigenanamnese"
                },
                {
                    "Name": "Z89.0",
                    "Value": "Z89.0",
                    "Description": "Extremitätenverlust"
                },
                {
                    "Name": "Z90.0",
                    "Value": "Z90.0",
                    "Description": "Verlust von Organen, anderenorts nicht klassifiziert"
                },
                {
                    "Name": "Z91.0",
                    "Value": "Z91.0",
                    "Description": "Risikofaktoren in der Eigenanamnese, anderenorts nicht klassifiziert"
                },
                {
                    "Name": "Z92.0",
                    "Value": "Z92.0",
                    "Description": "Medizinische Behandlung in der Eigenanamnese"
                },
                {
                    "Name": "Z93.0",
                    "Value": "Z93.0",
                    "Description": "Vorhandensein einer künstlichen Körperöffnung"
                },
                {
                    "Name": "Z94.0",
                    "Value": "Z94.0",
                    "Description": "Zustand nach Organ- oder Gewebetransplantation"
                },
                {
                    "Name": "Z95.0",
                    "Value": "Z95.0",
                    "Description": "Vorhandensein von kardialen oder vaskulären Implantaten oder Transplantaten"
                },
                {
                    "Name": "Z96.0",
                    "Value": "Z96.0",
                    "Description": "Vorhandensein von anderen funktionellen Implantaten"
                },
                {
                    "Name": "Z97.0",
                    "Value": "Z97.0",
                    "Description": "Vorhandensein anderer medizinischer Geräte oder Hilfsmittel"
                },
                {
                    "Name": "Z98.0",
                    "Value": "Z98.0",
                    "Description": "Sonstige Zustände nach chirurgischem Eingriff"
                },
                {
                    "Name": "Z99.0",
                    "Value": "Z99.0",
                    "Description": "Langzeitige Abhängigkeit von unterstützenden Apparaten, medizinischen Geräten oder Hilfsmitteln, anderenorts nicht"
                }
            ]
        },
        patientName: {
            "buttonId": "patientName",
            "categoryName": "Patienten",
            "categoryValue": "patientName",
            "inactive" : true,
            "values": [],
            "additionalFields": [
                {fieldName: "firstname", mode: "first"},
                {fieldName: "lastname", mode: "first"},
                {fieldName: "dob", mode: "first"}
            ]
        }
        //smoker: {
        //    "categoryName": "Raucher",
        //    "categoryValue": "smoker",
        //    "inactive" : true,
        //    "map" : {"true": "Raucher", "false": "Nichtraucher", "null": "Unbekannt"},
        //    "values": []
        //},
        //mediCode: {
        //    "buttonId": "mediCode",
        //    "categoryName": "MedisCode",
        //    "categoryValue": "mediCode",
        //    "filter": {
        //        "actType": ["MEDICATION"]
        //    },
        //    "inactive" : true,
        //    "virtualField": true,
        //    "values": []
        //},
        //mediLabel: {
        //    "buttonId": "mediLabel",
        //    "categoryName": "MedisLabel",
        //    "categoryValue": "phNLabel",
        //    "filter": {
        //        "actType": ["MEDICATION"]
        //    },
        //    "inactive": true,
        //    "values": []
        //},
        //employeeType: {
        //    "buttonId": "employeeType",
        //    "categoryName": "employeeType",
        //    "categoryValue": "employeeType",
        //    "inactive" : true,
        //    "values": []
        //},
        //markers: {
        //    "buttonId": "markers",
        //    "categoryName": "Markers",
        //    "categoryValue": "markers",
        //    "inactive" : true,
        //    "values": []
        //},
        //medication: {
        //    "buttonId": "medication",
        //    "categoryName": "Medikament",
        //    "categoryValue": "medication",
        //    "inactive" : true,
        //    "values": []
        //},
        //therapyduration: {
        //    "categoryName": "Behandlungsdauer",
        //    "categoryValue": "therapyduration",
        //    "inactive" : true,
        //    "values": []
        //},
        //therapyend: {
        //    "categoryName": "Behandlungsende",
        //    "categoryValue": "therapyend",
        //    "inactive" : true,
        //    "values": []
        //},
        //therapyprogression: {
        //    "categoryName": "Behandlungsverlauf",
        //    "categoryValue": "therapyprogression",
        //    "inactive" : true,
        //    "values": []
        //}
    };

    Y.namespace( 'doccirrus.insight2' ).analysisCategories = {
        list: list
    };

}, '1.0.0', {
    requires: [
    ]
} );