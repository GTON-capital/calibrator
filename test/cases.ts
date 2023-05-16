export interface TestCase {
    targetRatioBase: string;
    targetRatioQuote: string;
    reserveBase: string;
    reserveQuote: string;
    liquidityBalance: string;
    requiredBase: string;
    leftoverBase: string;
    requiredQuote: string;
    leftoverQuote: string;
}

export const simpleCases = [
    { targetRatioBase: "4",
      targetRatioQuote: "10",
      targetRatio: "2.5",
      reserveBase: "518159171586236237881",
      reserveQuote: "1295403443699555742264",
      liquidityBalance: "817572681397520125998",
      requiredBase: "0",
      leftoverBase: "0",
      requiredQuote: "0",
      leftoverQuote: "414679593716972499639436",
      outcomeRatio: "2.50001064293419387976"
    },
    { targetRatioBase: "5",
      targetRatioQuote: "10",
      targetRatio: "2",
      reserveBase: "518159171586236237881",
      reserveQuote: "1036318991263126747732",
      liquidityBalance: "731141851390288297559",
      requiredBase: "0",
      leftoverBase: "0",
      requiredQuote: "0",
      leftoverQuote: "259084452436428994532",
      outcomeRatio: "2.00000125075592561254"
    },
    { targetRatioBase: "4",
      targetRatioQuote: "10",
      targetRatio: "2.5",
      reserveBase: "518159171586236237881",
      reserveQuote: "1294987632131439370305",
      liquidityBalance: "817182231628958209830",
      requiredBase: "0",
      leftoverBase: "0",
      requiredQuote: "258668640868312622573",
      leftoverQuote: "0",
      outcomeRatio: "2.49920816448564408074"
    },
    { targetRatioBase: "10",
      targetRatioQuote: "8",
      targetRatio: "0.8",
      reserveBase: "518159171586236237881",
      reserveQuote: "414528174333587352396",
      liquidityBalance: "462040048740598536336",
      requiredBase: "0",
      leftoverBase: "0",
      requiredQuote: "0",
      leftoverQuote: "880459457797852017909",
      outcomeRatio: "0.800001615458423325"
    },
    { targetRatioBase: "1",
      targetRatioQuote: "12",
      targetRatio: "12",
      reserveBase: "518159171586236237881",
      reserveQuote: "6217887447009125121846",
      liquidityBalance: "1787472628097483542754",
      requiredBase: "0",
      leftoverBase: "0",
      requiredQuote: "5803359272675537769450",
      leftoverQuote: "0",
      outcomeRatio: "11.99995636085019877053"
    },
    { targetRatioBase: "16",
      targetRatioQuote: "100",
      targetRatio: "6.25",
      reserveBase: "518159171586236237881",
      reserveQuote: "3238499109750901580363",
      liquidityBalance: "1289460985450098101721",
      requiredBase: "0",
      leftoverBase: "0",
      requiredQuote: "0",
      leftoverQuote: "2979388337258223541483",
      outcomeRatio: "6.25000827416971501019"
    },
]

export const realCases = [
    { targetRatioBase: "100",
      targetRatioQuote: "18704",
      targetRatio: "187.04",
      reserveBase: "518159171586236237881",
      reserveQuote: "96916721568881022780188",
      liquidityBalance: "7076236235630350318638",
      requiredBase: "0",
      leftoverBase: "0",
      requiredQuote: "0",
      leftoverQuote: "319058275591791032601512",
      outcomeRatio: "187.04044410174327783613"
    },
    { targetRatioBase: "100",
      targetRatioQuote: "18431",
      targetRatio: "184.31",
      reserveBase: "518159171586236237881",
      reserveQuote: "95501933004890564945817",
      liquidityBalance: "7024319498101016812588",
      requiredBase: "0",
      leftoverBase: "0",
      requiredQuote: "0",
      leftoverQuote: "1414788563990457834371",
      outcomeRatio: "184.31003105190884624566"
    },
    { targetRatioBase: "100",
      targetRatioQuote: "18059",
      targetRatio: "180.59",
      reserveBase: "518159171586236237881",
      reserveQuote: "93574371654405949229936",
      liquidityBalance: "6952964591393110418234",
      requiredBase: "0",
      leftoverBase: "0",
      requiredQuote: "0",
      leftoverQuote: "1927561350484615715881",
      outcomeRatio: "180.59001323463507562309"
    },
    { targetRatioBase: "100",
      targetRatioQuote: "16299",
      targetRatio: "162.99",
      reserveBase: "518159171586236237881",
      reserveQuote: "84454794772253825232306",
      liquidityBalance: "6604973816902889865359",
      requiredBase: "0",
      leftoverBase: "0",
      requiredQuote: "0",
      leftoverQuote: "9119576882152123997630",
      outcomeRatio: "162.99006059028750704069"
    },
    { targetRatioBase: "100",
      targetRatioQuote: "16255",
      targetRatio: "162.55",
      reserveBase: "518159171586236237881",
      reserveQuote: "84227120133538600226913",
      liquidityBalance: "6596051309157604511967",
      requiredBase: "0",
      leftoverBase: "0",
      requiredQuote: "0",
      leftoverQuote: "227674638715225005393",
      outcomeRatio: "162.55066927734741841464"
    },
    { targetRatioBase: "100",
      targetRatioQuote: "16067",
      targetRatio: "160.67",
      reserveBase: "518159171586236237881",
      reserveQuote: "83252641021504904310032",
      liquidityBalance: "6557726099044385144809",
      requiredBase: "0",
      leftoverBase: "0",
      requiredQuote: "0",
      leftoverQuote: "974479112033695916881",
      outcomeRatio: "160.67001336026593291238"
    },
    { targetRatioBase: "100",
      targetRatioQuote: "15375",
      targetRatio: "153.75",
      reserveBase: "518159171586236237881",
      reserveQuote: "79666986707715537732985",
      liquidityBalance: "6414742636263096059182",
      requiredBase: "0",
      leftoverBase: "0",
      requiredQuote: "0",
      leftoverQuote: "3585654313789366577047",
      outcomeRatio: "153.7500271660379436439"
    },
    { targetRatioBase: "100",
      targetRatioQuote: "16019",
      targetRatio: "160.19",
      reserveBase: "518159171586236237881",
      reserveQuote: "83003904172973023553244",
      liquidityBalance: "6547507836890280268081",
      requiredBase: "0",
      leftoverBase: "0",
      requiredQuote: "3336917465257485820259",
      leftoverQuote: "0",
      outcomeRatio: "160.1899739010194145676"
    },
    { targetRatioBase: "100",
      targetRatioQuote: "16431",
      targetRatio: "164.31",
      reserveBase: "518159171586236237881",
      reserveQuote: "85138722237327137887260",
      liquidityBalance: "6631046066909959873204",
      requiredBase: "0",
      leftoverBase: "0",
      requiredQuote: "2134818064354114334016",
      leftoverQuote: "0",
      outcomeRatio: "164.30997829623028010551"
    },
    { targetRatioBase: "100",
      targetRatioQuote: "16183",
      targetRatio: "161.83",
      reserveBase: "518159171586236237881",
      reserveQuote: "83853705341224117596577",
      liquidityBalance: "6580738847632624730607",
      requiredBase: "0",
      leftoverBase: "0",
      requiredQuote: "0",
      leftoverQuote: "1285016896103020290683",
      outcomeRatio: "161.83001274400583705831"
    },
    { targetRatioBase: "100",
      targetRatioQuote: "16031",
      targetRatio: "160.31",
      reserveBase: "518159171586236237881",
      reserveQuote: "83066105621871373141071",
      liquidityBalance: "6549714632883839028581",
      requiredBase: "0",
      leftoverBase: "0",
      requiredQuote: "0",
      leftoverQuote: "787599719352744455506",
      outcomeRatio: "160.31001703121806149032"
    },
    { targetRatioBase: "100",
      targetRatioQuote: "16061",
      targetRatio: "160.61",
      reserveBase: "518159171586236237881",
      reserveQuote: "83221306986315472498295",
      liquidityBalance: "6555821102108970482227",
      requiredBase: "0",
      leftoverBase: "0",
      requiredQuote: "155201364444099357224",
      leftoverQuote: "0",
      outcomeRatio: "160.60954152669110840826"
    },
    { targetRatioBase: "100",
      targetRatioQuote: "16061",
      targetRatio: "160.61",
      reserveBase: "518159171586236237881",
      reserveQuote: "83221303314093061821657",
      liquidityBalance: "6555820808809893037436",
      requiredBase: "0",
      leftoverBase: "0",
      requiredQuote: "0",
      leftoverQuote: "3672222410676638",
      outcomeRatio: "160.60953443963637301702"
    },
    { targetRatioBase: "100",
      targetRatioQuote: "16120",
      targetRatio: "161.2",
      reserveBase: "518159171586236237881",
      reserveQuote: "83526798285960865578242",
      liquidityBalance: "6567824337984880785828",
      requiredBase: "0",
      leftoverBase: "0",
      requiredQuote: "305494971867803756585",
      leftoverQuote: "0",
      outcomeRatio: "161.19911190660003712326"
    },
    { targetRatioBase: "100",
      targetRatioQuote: "17006",
      targetRatio: "170.06",
      reserveBase: "518159171586236237881",
      reserveQuote: "88118133236240767234948",
      liquidityBalance: "6745653031611372168721",
      requiredBase: "0",
      leftoverBase: "0",
      requiredQuote: "4591334950279901656706",
      leftoverQuote: "0",
      outcomeRatio: "170.05997011784135755248"
    },
    { targetRatioBase: "100",
      targetRatioQuote: "17179",
      targetRatio: "171.79",
      reserveBase: "518159171586236237881",
      reserveQuote: "89013207267630637283422",
      liquidityBalance: "6779774721821016532207",
      requiredBase: "0",
      leftoverBase: "0",
      requiredQuote: "895074031389870048474",
      leftoverQuote: "0",
      outcomeRatio: "171.78738146260205642362"
    },
    { targetRatioBase: "100",
      targetRatioQuote: "16915",
      targetRatio: "169.15",
      reserveBase: "518159171586236237881",
      reserveQuote: "87646643358157104015825",
      liquidityBalance: "6727452625953447695174",
      requiredBase: "0",
      leftoverBase: "0",
      requiredQuote: "0",
      leftoverQuote: "1366563909473533267597",
      outcomeRatio: "169.15003760301141583771"
    },
    { targetRatioBase: "100",
      targetRatioQuote: "16854",
      targetRatio: "168.54",
      reserveBase: "518159171586236237881",
      reserveQuote: "87331028925818250881362",
      liquidityBalance: "6715310776982160917002",
      requiredBase: "0",
      leftoverBase: "0",
      requiredQuote: "0",
      leftoverQuote: "315614432338853134463",
      outcomeRatio: "168.54093049916016994819"
    },
    { targetRatioBase: "100",
      targetRatioQuote: "17208",
      targetRatio: "172.08",
      reserveBase: "518159171586236237881",
      reserveQuote: "89164824555070726128919",
      liquidityBalance: "6785343431066218140475",
      requiredBase: "0",
      leftoverBase: "0",
      requiredQuote: "1833795629252475247557",
      leftoverQuote: "0",
      outcomeRatio: "172.07998901594506517691"
    },
]