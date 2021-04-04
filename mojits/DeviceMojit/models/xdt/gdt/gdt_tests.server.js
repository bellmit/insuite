/**
 * User: jm
 * Date: 15-06-17  16:42
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/**
 * xDT specs
 */

/*global YUI */



YUI.add( 'gdt_tests', function( Y ) {
        //gdt templates to use

        var gdt_tests= {
            exampleStammdaten21 :
                "01380006301[CR][LF]" +
                "014810000183[CR][LF]" +
                "01092063[CR][LF]" +
                "0178315EKG_TYP1[CR][LF]" +
                "0178316PRAX_EDV[CR][LF]" +
                "014921802.00[CR][LF]" +
                "014300002345[CR][LF]" +
                "0193101Mustermann[CR][LF]" +
                "0143102Franz[CR][LF]" +
                "017310301101945[CR][LF]" +
                "01031101[CR][LF]" +
                "0123622178[CR][LF]" +
                "0123623079[CR][LF]" +
                "01380006301[CR][LF]" +
                "014810000183[CR][LF]" +
                "01092063[CR][LF]" +
                "0178315EKG_TYP1[CR][LF]" +
                "0178316PRAY_EDV[CR][LF]" +
                "014921802.00[CR][LF]" +
                "014300002345[CR][LF]" +
                "0193101Muxtermann[CR][LF]" +
                "0143102Frunz[CR][LF]" +
                "017310301101955[CR][LF]" +
                "01031101[CR][LF]" +
                "0123622178[CR][LF]" +
                "0123623079[CR][LF]",

            exampleStammdaten30 :
                "01380006301[CR][LF]" +
                "01681000000292[CR][LF]" +
                "0228200Obj_Kopfdaten[CR][LF]" +
                "0178315EKG_TYP1[CR][LF]" +
                "0178316PRAX_PVS[CR][LF]" +
                "014921803.01[CR][LF]" +
                "01082015[CR][LF]" +
                "0208200Obj_Patient[CR][LF]" +
                "014300002345[CR][LF]" +
                "0193101Mustermann[CR][LF]" +
                "0143102Franz[CR][LF]" +
                "017310301101945[CR][LF]" +
                "01031101[CR][LF]" +
                "01082017[CR][LF]" +
                "0288200Obj_Basisdiagnostik[CR][LF]" +
                "0153622178.00[CR][LF]" +
                "0153623079.00[CR][LF]" +
                "01082014[CR][LF]" +
                "011820219[CR][LF]",

            exampleUntersuchungsdaten21 :
                "01380006310[CR][LF]" +
                "014810000958[CR][LF]" +
                "0178315PRAX_EDV[CR][LF]" +
                "0178316LZBD_SYS[CR][LF]" +
                "014921802.10[CR][LF]" +
                "014300002345[CR][LF]" +
                "0193101Mustermann[CR][LF]" +
                "0143102Franz[CR][LF]" +
                "017310301101945[CR][LF]" +
                "01031101[CR][LF]" +
                "0123622178[CR][LF]" +
                "0123623079[CR][LF]" +
                "0148402BDM01[CR][LF]" +
                "017620023101998[CR][LF]" +
                "0346220Dies ist ein zweizeiliger[CR][LF]" +
                "0416220Befund zur 24h-Blutdruckmessung.[CR][LF]" +
                "0566227Anmerkungen zu einer Langzeit-Blutdruckmessung.[CR][LF]" +
                "0506228Kurzzusammenfassung 24 h Blutdruckmessung[CR][LF]" +
                "0596228--------------------------------------------------[CR][LF]" +
                "0606228          Tagphase       Nachtphase    proz. Abfall[CR][LF]" +
                "0596228         06:00-22:00     22:00-06:00      Tag/Nacht[CR][LF]" +
                "0616228Ps/[mmHg]     143            134                -6 %[CR][LF]" +
                "0616228Pd/[mmHg]      92             92                 0 %[CR][LF]" +
                "0616228HF/[P/min]     71             70                -1 % [CR][LF]" +
                "0168410SYSMXTG[CR][LF]" +
                "0298411Systole max Tagphase[CR][LF]" +
                "0128420142[CR][LF]" +
                "0138421mmHg[CR][LF]" +
                "017843223101998[CR][LF]" +
                "0158439163400[CR][LF]" +
                "0128462140[CR][LF]" +
                "0168410SYSMNTG[CR][LF]" +
                "0298411Systole min Tagphase[CR][LF]" +
                "0128420112[CR][LF]" +
                "0138421mmHg[CR][LF]" +
                "017843224101998[CR][LF]" +
                "014843903120[CR][LF]",

            exampleUntersuchungsdaten30 :
                "01380006310[CR][LF]"+
                "01681000001173[CR][LF]"+
                "0228200Obj_Kopfdaten[CR][LF]"+
                "0178315PRAX_PVS[CR][LF]"+
                "0178316LZBD_SYS[CR][LF]"+
                "014921803.01[CR][LF]"+
                "01082015[CR][LF]"+
                "0208200Obj_Patient[CR][LF]"+
                "014300002345[CR][LF]"+
                "0193101Mustermann[CR][LF]"+
                "0143102Franz[CR][LF]"+
                "017310301101945[CR][LF]"+
                "01031101[CR][LF]"+
                "01082017[CR][LF]"+
                "0288200Obj_Basisdiagnostik[CR][LF]"+
                "0153622178.00[CR][LF]"+
                "0153623079.00[CR][LF]"+
                "01082014[CR][LF]"+
                "0148402BDM01[CR][LF]"+
                "0346220Dies ist ein zweizeiliger[CR][LF]"+
                "0416220Befund zur 24h-Blutdruckmessung.[CR][LF]"+
                "0566227Anmerkungen zu einer Langzeit-Blutdruckmessung.[CR][LF]"+
                "01062267[CR][LF]"+
                "0506228Kurzzusammenfassung 24 h Blutdruckmessung[CR][LF]"+
                "0596228--------------------------------------------------[CR][LF]"+
                "0596228          Tagphase       Nachtphase   proz. Abfall[CR][LF]"+
                "0596228         06:00-22:00     22:00-06:00      Tag/Nacht[CR][LF]"+
                "0596228Ps/[mmHg]    143             134              -6 %[CR][LF]"+
                "0596228Pd/[mmHg]     92              92               0 %[CR][LF]"+
                "0596228HF/[P/min]     71              70              -1 %[CR][LF]"+
                "0126330asd[CR][LF]"+
                "0126331qwe[CR][LF]"+
                "0126331klp[CR][LF]"+
                "0126332zxc[CR][LF]"+
                "0126333rty[CR][LF]"+
                "0126334fgh[CR][LF]"+
                "0126335vbn[CR][LF]"+
                "0268200Obj_Laborergebnis[CR][LF]"+
                "0168410SYSMXTG[CR][LF]"+
                "0298411Systole max Tagphase[CR][LF]"+
                "0128420142[CR][LF]"+
                "0138421mmHg[CR][LF]"+
                "017843223101998[CR][LF]"+
                "0158439163400[CR][LF]"+
                "0128462140[CR][LF]"+
                "0168410SYSMNTG[CR][LF]"+
                "0298411Systole min Tagphase[CR][LF]"+
                "0128420112[CR][LF]"+
                "0138421mmHg[CR][LF]"+
                "017843224101998[CR][LF]"+
                "0158439031200[CR][LF]"+
                "011820115[CR][LF]"+
                "011820252[CR][LF]"
        };

        Y.namespace( 'doccirrus.api.xdtTests' ).gdt = gdt_tests;

    },
    '0.0.1', {requires: [
        'inport-schema'
    ]}
);
