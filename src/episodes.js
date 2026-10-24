// episodes.js: gerado; registra os episódios narrados. Não edite à mão.
AnimationPlatform.registerProject({
  "id": "sauva-operaria",
  "title": "A vida de uma formiga operária: do ovo ao fim",
  "story": "A vida de uma operária de saúva-limão (Atta sexdens), do ovo ao último dia: a revoada, o ninho, o jardim de fungo, a trilha, a mosca que caça operárias e o fim que alimenta as árvores.",
  "duration": 573.5333333333333,
  "fps": 30,
  "bpm": 60,
  "offset": 0,
  "style": "cartoon",
  "compatibleStyles": [
    "cartoon",
    "watercolor"
  ],
  "audio": "out/episodes/sauva-operaria/mix.m4a",
  "chapters": [
    {
      "id": "c1",
      "title": "A revoada",
      "start": 1,
      "end": 91.33333333333333
    },
    {
      "id": "c2",
      "title": "A cidade",
      "start": 91.33333333333333,
      "end": 148
    },
    {
      "id": "c3",
      "title": "Do ovo à operária",
      "start": 148,
      "end": 223.6
    },
    {
      "id": "c4",
      "title": "Os primeiros trabalhos",
      "start": 223.6,
      "end": 285.46666666666664
    },
    {
      "id": "c5",
      "title": "A trilha",
      "start": 285.46666666666664,
      "end": 352.03333333333336
    },
    {
      "id": "c6",
      "title": "O ataque",
      "start": 352.03333333333336,
      "end": 444.6666666666667
    },
    {
      "id": "c7",
      "title": "Dentes gastos",
      "start": 444.6666666666667,
      "end": 507.1333333333333
    },
    {
      "id": "c8",
      "title": "O fim",
      "start": 507.1333333333333,
      "end": 573.5333333333333
    }
  ],
  "scripts": [
    "src/nature/noise.js",
    "src/nature/path.js",
    "src/nature/gait.js",
    "src/nature/creature.js",
    "src/nature/specs.js",
    "src/nature/env.js",
    "src/episodes/sauva-operaria/c01_revoada.js",
    "src/episodes/sauva-operaria/c02_cidade.js",
    "src/episodes/sauva-operaria/c03_crescimento.js",
    "src/episodes/sauva-operaria/c04_trabalhos.js",
    "src/episodes/sauva-operaria/c05_trilha.js",
    "src/episodes/sauva-operaria/c06_ataque.js",
    "src/episodes/sauva-operaria/c07_dentes.js",
    "src/episodes/sauva-operaria/c08_fim.js",
    "src/episodes/placeholder.js"
  ],
  "reviewTimes": [
    7.033333333333333,
    21.016666666666666,
    32.483333333333334,
    41.46666666666667,
    49.4,
    58.06666666666666,
    67.55,
    76.88333333333333,
    86.63333333333333,
    96.46666666666667,
    107.08333333333333,
    116.85,
    125.41666666666666,
    133.8,
    142.95,
    153.31666666666666,
    163.96666666666667,
    173.68333333333334,
    182.63333333333333,
    191.71666666666664,
    201.89999999999998,
    211.53333333333333,
    219.55,
    230.43333333333334,
    241.68333333333334,
    249.83333333333331,
    258.2166666666667,
    267.25,
    275.01666666666665,
    281.9333333333333,
    290.5,
    299.65,
    307.29999999999995,
    314.76666666666665,
    323.6333333333333,
    332.05,
    340.1,
    348.35,
    356.03333333333336,
    366.1,
    376.45000000000005,
    383.25,
    391.2833333333333,
    400.81666666666666,
    409.1,
    417.06666666666666,
    426.1,
    435.23333333333335,
    441.85,
    449.8833333333333,
    459.70000000000005,
    469.43333333333334,
    478.98333333333335,
    488.1833333333333,
    497.04999999999995,
    504.1333333333333,
    512.1333333333333,
    520.35,
    528.9166666666667,
    538.7333333333333,
    546.4833333333333,
    554.2166666666667,
    566.0999999999999
  ],
  "storyboard": [
    {
      "id": "c1s01",
      "chapter": "c1",
      "start": 0,
      "end": 14.066666666666666,
      "event": "Gramado ao vento. Trilha de formigas (multidão no caminho) carregando pedaços de folha da esquerda para a direita; uma mosca minúscula paira sobre uma carregadora e some. A câmera desce rente ao capim e atravessa o chão para um corte de solo com túneis.",
      "transition": "corte",
      "reads": [
        {
          "start": 1.25,
          "end": 5.425,
          "text": "Existe uma mosca que põe um ovo dentro da cabeça desta formiga."
        },
        {
          "start": 5.7749999999999995,
          "end": 9.674999999999999,
          "text": "Debaixo deste chão, milhões de irmãs dela carregam folhas."
        },
        {
          "start": 10.024999999999999,
          "end": 13.274999999999999,
          "text": "Mas não para comer: as folhas alimentam um fungo."
        }
      ]
    },
    {
      "id": "c1s02",
      "chapter": "c1",
      "start": 14.066666666666666,
      "end": 27.966666666666665,
      "event": "Na trilha, uma operária para, vira para a câmera e varre o ar com as antenas. Texto: \"Saúva-limão (Atta sexdens)\".",
      "transition": "corte",
      "reads": [
        {
          "start": 14.316666666666666,
          "end": 17.541666666666668,
          "text": "Esta é a história dela, do ovo até o último dia."
        },
        {
          "start": 17.89166666666667,
          "end": 21.36666666666667,
          "text": "Ela é uma saúva-limão, a cortadeira Atta sexdens."
        },
        {
          "start": 21.716666666666672,
          "end": 27.16666666666667,
          "text": "Numa variedade dessa espécie, a cabeça esmagada da operária tem cheiro forte de limão."
        }
      ]
    },
    {
      "id": "c1s03",
      "chapter": "c1",
      "start": 27.966666666666665,
      "end": 37,
      "event": "Fim de tarde sobre o monte de terra do ninho. Formigas aladas sobem em espiral para o céu com nuvens; a câmera inclina para cima.",
      "transition": "corte",
      "reads": [
        {
          "start": 28.216666666666665,
          "end": 32.266666666666666,
          "text": "Tudo começa no céu, entre o fim de outubro e meados de dezembro."
        },
        {
          "start": 32.61666666666667,
          "end": 36.19166666666667,
          "text": "É a revoada: formigas aladas saem do ninho para acasalar."
        }
      ]
    },
    {
      "id": "c1s04",
      "chapter": "c1",
      "start": 37,
      "end": 45.93333333333333,
      "event": "Céu aberto: rainha alada maior cruza o quadro entre machos menores que a seguem e se afastam.",
      "transition": "corte",
      "reads": [
        {
          "start": 37.25,
          "end": 39.925,
          "text": "Lá no alto, uma futura rainha acasala."
        },
        {
          "start": 40.275,
          "end": 45.125,
          "text": "Ela guarda mais de trezentos milhões de espermatozoides, para usar a vida toda."
        }
      ]
    },
    {
      "id": "c1s05",
      "chapter": "c1",
      "start": 45.93333333333333,
      "end": 52.86666666666667,
      "event": "Rainhas pousam no chão; um pássaro salta e bica perto delas, e elas se espalham assustadas. Texto: \"1 em 40\".",
      "transition": "corte",
      "reads": [
        {
          "start": 46.18333333333333,
          "end": 47.95833333333333,
          "text": "Mas a aposta é cruel."
        },
        {
          "start": 48.30833333333333,
          "end": 52.08333333333333,
          "text": "Só uma em cada quarenta rainhas consegue fundar uma colônia."
        }
      ]
    },
    {
      "id": "c1s06",
      "chapter": "c1",
      "start": 52.86666666666667,
      "end": 63.266666666666666,
      "event": "Close lateral da rainha: as asas caem e rolam na poeira. Ela anda até um ponto e começa a cavar; poeira sobe a cada passada.",
      "transition": "corte",
      "reads": [
        {
          "start": 53.11666666666667,
          "end": 58.016666666666666,
          "text": "A futura mãe da nossa operária pousa, perde as asas e cava um túnel na terra."
        },
        {
          "start": 58.36666666666667,
          "end": 62.46666666666667,
          "text": "Ela leva consigo um pedacinho do jardim de fungo onde nasceu."
        }
      ]
    },
    {
      "id": "c1s07",
      "chapter": "c1",
      "start": 63.266666666666666,
      "end": 71.83333333333333,
      "event": "Corte do solo: túnel curto que termina numa câmara. A rainha, parada, ao lado de um tufo claro de fungo e de alguns ovos; ela toca os ovos com as antenas.",
      "transition": "corte",
      "reads": [
        {
          "start": 63.516666666666666,
          "end": 67.96666666666667,
          "text": "Lá embaixo, numa câmara, ela cospe o fungo e põe os primeiros ovos."
        },
        {
          "start": 68.31666666666666,
          "end": 71.04166666666666,
          "text": "Sozinha, ela cuida do fungo e das crias."
        }
      ]
    },
    {
      "id": "c1s08",
      "chapter": "c1",
      "start": 71.83333333333333,
      "end": 81.93333333333334,
      "event": "A câmara escurece aos poucos; texto \"CO2 ~20%\". A rainha quase não se move.",
      "transition": "corte",
      "reads": [
        {
          "start": 72.08333333333333,
          "end": 74.38333333333333,
          "text": "O ar da câmara fica pesado."
        },
        {
          "start": 74.73333333333332,
          "end": 81.13333333333333,
          "text": "Em ninhos criados por pesquisadores, depois de quarenta e dois dias, um quinto do ar já era gás carbônico."
        }
      ]
    },
    {
      "id": "c1s09",
      "chapter": "c1",
      "start": 81.93333333333334,
      "end": 91.33333333333333,
      "event": "Três operárias pequenas aparecem e começam a andar em volta da rainha e do fungo. Íris fecha.",
      "transition": "íris",
      "reads": [
        {
          "start": 82.18333333333334,
          "end": 86.70833333333334,
          "text": "As primeiras operárias nascem nove a dez semanas depois da fundação."
        },
        {
          "start": 87.05833333333334,
          "end": 90.53333333333333,
          "text": "A partir daí, a rainha deixa de fazer tudo sozinha."
        }
      ]
    },
    {
      "id": "c2s01",
      "chapter": "c2",
      "start": 91.33333333333333,
      "end": 101.6,
      "event": "Íris abre num corte de solo largo: dezenas de túneis ligando câmaras; formigas pequenas andando dentro dos túneis. Zoom out lento.",
      "transition": "íris",
      "reads": [
        {
          "start": 93.18333333333332,
          "end": 96.45833333333333,
          "text": "Seis anos depois, aquele buraco virou uma cidade."
        },
        {
          "start": 96.80833333333332,
          "end": 100.80833333333332,
          "text": "Um ninho dessa idade já passou de mil novecentas e vinte câmaras."
        }
      ]
    },
    {
      "id": "c2s02",
      "chapter": "c2",
      "start": 101.6,
      "end": 112.56666666666666,
      "event": "Algumas câmaras se enchem de massa clara de fungo. Uma régua de texto na lateral marca \"6 m\".",
      "transition": "corte",
      "reads": [
        {
          "start": 101.85,
          "end": 105.19999999999999,
          "text": "Em duzentas e quarenta e oito delas cresce o fungo."
        },
        {
          "start": 105.54999999999998,
          "end": 111.77499999999998,
          "text": "Uma colônia madura pode ter de cinco a oito milhões de formigas, a até seis metros de profundidade."
        }
      ]
    },
    {
      "id": "c2s02b",
      "chapter": "c2",
      "start": 112.56666666666666,
      "end": 121.13333333333334,
      "event": "Câmara real: a rainha enorme ao lado de operárias minúsculas; a câmera passa por ela devagar.",
      "transition": "corte",
      "reads": [
        {
          "start": 112.81666666666666,
          "end": 115.16666666666666,
          "text": "No centro de tudo está a rainha."
        },
        {
          "start": 115.51666666666665,
          "end": 120.34166666666665,
          "text": "Ela é a maior formiga do ninho, muitas vezes com mais de dois centímetros e meio."
        }
      ]
    },
    {
      "id": "c2s03",
      "chapter": "c2",
      "start": 121.13333333333334,
      "end": 129.7,
      "event": "Close de uma câmara de fungo: operárias tocam o fungo com as antenas (modo tap) e levam bolinhas claras na boca.",
      "transition": "corte",
      "reads": [
        {
          "start": 121.38333333333334,
          "end": 123.60833333333333,
          "text": "Esse fungo é a base de tudo."
        },
        {
          "start": 123.95833333333333,
          "end": 128.90833333333333,
          "text": "As pontas inchadas dele são quase todo o alimento das formigas e das crias."
        }
      ]
    },
    {
      "id": "c2s04",
      "chapter": "c2",
      "start": 129.7,
      "end": 137.9,
      "event": "Uma operária entra na câmara com um pedaço de folha e o deposita sobre o fungo.",
      "transition": "corte",
      "reads": [
        {
          "start": 129.95,
          "end": 133.77499999999998,
          "text": "As folhas cortadas lá fora servem de base para essa horta."
        },
        {
          "start": 134.12499999999997,
          "end": 137.09999999999997,
          "text": "As operárias também bebem seiva das plantas."
        }
      ]
    },
    {
      "id": "c2s05",
      "chapter": "c2",
      "start": 137.9,
      "end": 148,
      "event": "Câmara real: a rainha grande, imóvel, operárias pequenas em volta; um ovo aparece ao lado dela e a câmera dá zoom nele.",
      "transition": "corte",
      "reads": [
        {
          "start": 138.15,
          "end": 143.675,
          "text": "Numa colônia madura de outra saúva, a rainha põe mais de vinte e cinco mil ovos por dia."
        },
        {
          "start": 144.025,
          "end": 147.20000000000002,
          "text": "Num desses ovos começa a vida da nossa operária."
        }
      ]
    },
    {
      "id": "c3s01",
      "chapter": "c3",
      "start": 148,
      "end": 158.63333333333333,
      "event": "Close do ovo, que balança e vira larva. Operárias jardineiras se aproximam e tocam a larva com as antenas.",
      "transition": "corte",
      "reads": [
        {
          "start": 149.85,
          "end": 153.275,
          "text": "Três a quatro semanas depois de posto, o ovo eclode."
        },
        {
          "start": 153.625,
          "end": 157.825,
          "text": "Sai uma larva: é a nossa operária, que passa os dias sendo alimentada."
        }
      ]
    },
    {
      "id": "c3s02",
      "chapter": "c3",
      "start": 158.63333333333333,
      "end": 169.3,
      "event": "Jardineiras pequenas vão e voltam entre o fungo e a larva, cada uma com algo claro na boca.",
      "transition": "corte",
      "reads": [
        {
          "start": 158.88333333333333,
          "end": 163.23333333333332,
          "text": "Quem cuida dela são as jardineiras, as menores operárias da colônia."
        },
        {
          "start": 163.58333333333331,
          "end": 168.50833333333333,
          "text": "Elas alimentam as larvas com secreções e com ovos que servem só de comida."
        }
      ]
    },
    {
      "id": "c3s03",
      "chapter": "c3",
      "start": 169.3,
      "end": 178.06666666666666,
      "event": "Avanço rápido: larva cresce, para e fica pálida como pupa; texto com contagem de semanas no canto.",
      "transition": "corte",
      "reads": [
        {
          "start": 169.55,
          "end": 173.25,
          "text": "Depois de mais três a quatro semanas, a larva vira pupa."
        },
        {
          "start": 173.6,
          "end": 177.25,
          "text": "Mais três a quatro semanas, e dali sai uma formiga adulta."
        }
      ]
    },
    {
      "id": "c3s04",
      "chapter": "c3",
      "start": 178.06666666666666,
      "end": 187.2,
      "event": "A pupa se desfaz e a operária fica de pé; dá os primeiros passos devagar, ainda tremendo as antenas.",
      "transition": "corte",
      "reads": [
        {
          "start": 178.31666666666666,
          "end": 183.89166666666665,
          "text": "Ela nasce como uma operária média, com a cabeça de pouco mais de dois milímetros de largura."
        },
        {
          "start": 184.24166666666665,
          "end": 186.39166666666665,
          "text": "São os primeiros passos dela."
        }
      ]
    },
    {
      "id": "c3s04b",
      "chapter": "c3",
      "start": 187.2,
      "end": 196.23333333333332,
      "event": "Close da cabeça: as mandíbulas abrem e fecham devagar; um brilho percorre os dentes.",
      "transition": "corte",
      "reads": [
        {
          "start": 187.45,
          "end": 193.125,
          "text": "Nos primeiros dias de vida adulta, os dentes das mandíbulas dela ainda estão acumulando zinco."
        },
        {
          "start": 193.475,
          "end": 195.42499999999998,
          "text": "Ela vai precisar deles."
        }
      ]
    },
    {
      "id": "c3s05",
      "chapter": "c3",
      "start": 196.23333333333332,
      "end": 207.56666666666666,
      "event": "Fila lado a lado, de perfil: jardineira pequena, a nossa operária média e uma soldada grande de cabeça larga, que abre as mandíbulas. Texto com os tamanhos.",
      "transition": "corte",
      "reads": [
        {
          "start": 196.48333333333332,
          "end": 199.95833333333331,
          "text": "Nas mesmas câmaras vivem irmãs muito diferentes."
        },
        {
          "start": 200.3083333333333,
          "end": 203.7583333333333,
          "text": "As jardineiras têm a cabeça com cerca de um milímetro."
        },
        {
          "start": 204.1083333333333,
          "end": 206.7833333333333,
          "text": "As soldadas passam de três milímetros."
        }
      ]
    },
    {
      "id": "c3s06",
      "chapter": "c3",
      "start": 207.56666666666666,
      "end": 215.5,
      "event": "A soldada dá um passo à frente; a operária média recua com um susto.",
      "transition": "corte",
      "reads": [
        {
          "start": 207.81666666666666,
          "end": 212.29166666666666,
          "text": "As soldadas são as maiores operárias e têm mandíbulas muito afiadas."
        },
        {
          "start": 212.64166666666665,
          "end": 214.69166666666666,
          "text": "Lá fora, o mundo é perigoso."
        }
      ]
    },
    {
      "id": "c3s07",
      "chapter": "c3",
      "start": 215.5,
      "end": 223.6,
      "event": "A operária anda por um túnel que se divide em três; ela hesita, antenas varrendo, e entra num deles.",
      "transition": "corte",
      "reads": [
        {
          "start": 215.75,
          "end": 218.45,
          "text": "A nossa operária não escolhe a profissão."
        },
        {
          "start": 218.79999999999998,
          "end": 222.79999999999998,
          "text": "Ao longo da vida, é a idade que vai mudando o trabalho que ela faz."
        }
      ]
    },
    {
      "id": "c4s01",
      "chapter": "c4",
      "start": 223.6,
      "end": 237.26666666666668,
      "event": "Corte do solo: a operária carrega uma bolinha escura por um túnel até uma câmara cheia de restos.",
      "transition": "corte",
      "reads": [
        {
          "start": 225.45,
          "end": 230.79999999999998,
          "text": "Pesquisadores acompanharam operárias de saúva-limão como ela, do nascimento até a morte."
        },
        {
          "start": 231.14999999999998,
          "end": 236.47499999999997,
          "text": "Nas duas primeiras semanas, ela trabalha com o lixo mais do que em qualquer outra fase."
        }
      ]
    },
    {
      "id": "c4s02",
      "chapter": "c4",
      "start": 237.26666666666668,
      "end": 246.1,
      "event": "Dentro da câmara de lixo: montes de restos escuros; a operária solta a bolinha e sai rápido.",
      "transition": "corte",
      "reads": [
        {
          "start": 237.51666666666668,
          "end": 240.9416666666667,
          "text": "O lixo da cidade fica em câmaras debaixo da terra."
        },
        {
          "start": 241.29166666666669,
          "end": 245.29166666666669,
          "text": "Ali vão parar formigas mortas, fungo velho e restos de plantas."
        }
      ]
    },
    {
      "id": "c4s02b",
      "chapter": "c4",
      "start": 246.1,
      "end": 253.56666666666666,
      "event": "Zoom out do corte do solo: a câmara de lixo bem funda, abaixo das câmaras de fungo. Texto \"3 a 4 m\".",
      "transition": "corte",
      "reads": [
        {
          "start": 246.35,
          "end": 252.775,
          "text": "Num ninho de outra saúva, no cerrado, essas câmaras de lixo estavam a três ou quatro metros de profundidade."
        }
      ]
    },
    {
      "id": "c4s03",
      "chapter": "c4",
      "start": 253.56666666666666,
      "end": 262.8666666666667,
      "event": "Câmara de fungo: a operária, entre jardineiras, toca e alisa o fungo com as antenas.",
      "transition": "corte",
      "reads": [
        {
          "start": 253.81666666666666,
          "end": 257.51666666666665,
          "text": "Cuidar do jardim de fungo também é tarefa das jovens."
        },
        {
          "start": 257.8666666666667,
          "end": 262.06666666666666,
          "text": "Ela só se afasta desse trabalho a partir da nona semana de vida."
        }
      ]
    },
    {
      "id": "c4s03b",
      "chapter": "c4",
      "start": 262.8666666666667,
      "end": 271.6333333333333,
      "event": "Câmara de fungo vista de longe: operárias de dois tamanhos trabalham lado a lado; a luz é baixa e quente.",
      "transition": "corte",
      "reads": [
        {
          "start": 263.1166666666667,
          "end": 268.0416666666667,
          "text": "Tanto as operárias médias quanto as pequenas passam por esse jardim na juventude."
        },
        {
          "start": 268.3916666666667,
          "end": 270.8166666666667,
          "text": "É um trabalho no escuro, longe do céu."
        }
      ]
    },
    {
      "id": "c4s04",
      "chapter": "c4",
      "start": 271.6333333333333,
      "end": 278.4,
      "event": "Uma mancha escura cresce numa borda do fungo claro. A operária para e se assusta.",
      "transition": "corte",
      "reads": [
        {
          "start": 271.8833333333333,
          "end": 277.60833333333335,
          "text": "Mas o jardim tem um inimigo: o Escovopsis, um fungo parasita que ataca a horta das formigas."
        }
      ]
    },
    {
      "id": "c4s05",
      "chapter": "c4",
      "start": 278.4,
      "end": 285.46666666666664,
      "event": "Várias operárias cercam a mancha; ela encolhe aos poucos até sumir.",
      "transition": "corte",
      "reads": [
        {
          "start": 278.65,
          "end": 281.34999999999997,
          "text": "As formigas têm aliadas invisíveis."
        },
        {
          "start": 281.7,
          "end": 284.675,
          "text": "Bactérias ajudam a combater o parasita."
        }
      ]
    },
    {
      "id": "c5s01",
      "chapter": "c5",
      "start": 285.46666666666664,
      "end": 295.53333333333336,
      "event": "Túnel que sobe até a luz: a operária sai do ninho para a superfície, entre o capim.",
      "transition": "corte",
      "reads": [
        {
          "start": 287.31666666666666,
          "end": 289.9166666666667,
          "text": "Aos poucos, ela começa a sair do ninho."
        },
        {
          "start": 290.2666666666667,
          "end": 294.74166666666673,
          "text": "Por volta da quarta semana de vida, buscar folhas vira o trabalho dela."
        }
      ]
    },
    {
      "id": "c5s01b",
      "chapter": "c5",
      "start": 295.53333333333336,
      "end": 303.76666666666665,
      "event": "Superfície: a operária para na saída do ninho; ao fundo, um pássaro pousa e salta pelo capim. Ela se encolhe e segue.",
      "transition": "corte",
      "reads": [
        {
          "start": 295.78333333333336,
          "end": 298.48333333333335,
          "text": "Pela primeira vez, ela vê a luz do dia."
        },
        {
          "start": 298.83333333333337,
          "end": 302.95833333333337,
          "text": "E aqui fora há predadores: aves, tatus e até outras formigas."
        }
      ]
    },
    {
      "id": "c5s02",
      "chapter": "c5",
      "start": 303.76666666666665,
      "end": 310.8333333333333,
      "event": "Plano aberto e baixo: trilha longa curvando entre o capim, multidão de formigas indo e voltando, metade com folhas.",
      "transition": "corte",
      "reads": [
        {
          "start": 304.01666666666665,
          "end": 307.31666666666666,
          "text": "As trilhas podem chegar a sessenta metros do ninho."
        },
        {
          "start": 307.6666666666667,
          "end": 310.0416666666667,
          "text": "Ela segue o vai e vem das irmãs."
        }
      ]
    },
    {
      "id": "c5s03",
      "chapter": "c5",
      "start": 310.8333333333333,
      "end": 318.7,
      "event": "Close: a operária numa folha no chão, corpo vibrando; ondinhas saem do ponto de corte e outras formigas chegam.",
      "transition": "corte",
      "reads": [
        {
          "start": 311.0833333333333,
          "end": 313.4083333333333,
          "text": "Ao cortar, ela vibra o próprio corpo."
        },
        {
          "start": 313.7583333333333,
          "end": 317.8833333333333,
          "text": "Esse chiado viaja pela folha e atrai irmãs para o mesmo lugar."
        }
      ]
    },
    {
      "id": "c5s04",
      "chapter": "c5",
      "start": 318.7,
      "end": 328.56666666666666,
      "event": "Ela recorta um pedaço da folha e o ergue; volta para a trilha carregando.",
      "transition": "corte",
      "reads": [
        {
          "start": 318.95,
          "end": 322.97499999999997,
          "text": "Experimentos mostraram que a vibração deixa o corte mais suave."
        },
        {
          "start": 323.325,
          "end": 327.75,
          "text": "Mas, para os pesquisadores, a função principal é chamar as companheiras."
        }
      ]
    },
    {
      "id": "c5s04b",
      "chapter": "c5",
      "start": 328.56666666666666,
      "end": 335.53333333333336,
      "event": "Ela corta com esforço, pausa, e retoma; o céu escurece aos poucos.",
      "transition": "corte",
      "reads": [
        {
          "start": 328.81666666666666,
          "end": 331.3666666666667,
          "text": "Ela corta, pausa e corta de novo."
        },
        {
          "start": 331.7166666666667,
          "end": 334.7166666666667,
          "text": "E nem sempre esse trabalho acontece de dia."
        }
      ]
    },
    {
      "id": "c5s04c",
      "chapter": "c5",
      "start": 335.53333333333336,
      "end": 344.6666666666667,
      "event": "Noite: a trilha iluminada pela lua, carregadoras passando em silhueta.",
      "transition": "corte",
      "reads": [
        {
          "start": 335.78333333333336,
          "end": 341.33333333333337,
          "text": "Numa colônia de outra saúva, no Panamá, quase não havia colheita de dia na estação seca."
        },
        {
          "start": 341.6833333333334,
          "end": 343.8583333333334,
          "text": "A trilha trabalhava à noite."
        }
      ]
    },
    {
      "id": "c5s05",
      "chapter": "c5",
      "start": 344.6666666666667,
      "end": 352.03333333333336,
      "event": "Plano lateral: ela entra na fila de carregadoras; a câmera acompanha de lado.",
      "transition": "corte",
      "reads": [
        {
          "start": 344.9166666666667,
          "end": 348.7416666666667,
          "text": "Ela ergue o pedaço acima da cabeça e entra na fila de volta."
        },
        {
          "start": 349.0916666666667,
          "end": 351.2416666666667,
          "text": "É a primeira folha de muitas."
        }
      ]
    },
    {
      "id": "c6s01",
      "chapter": "c6",
      "start": 352.03333333333336,
      "end": 360.03333333333336,
      "event": "Trilha vista de lado. Uma mosca pequena entra voando e paira sobre as carregadoras. Texto: \"Neodohrniphora elongata\". Música tensa.",
      "transition": "corte",
      "reads": [
        {
          "start": 353.8833333333334,
          "end": 356.58333333333337,
          "text": "Mas na trilha alguém está de olho nela."
        },
        {
          "start": 356.9333333333334,
          "end": 359.2333333333334,
          "text": "É uma mosquinha que caça saúvas."
        }
      ]
    },
    {
      "id": "c6s02",
      "chapter": "c6",
      "start": 360.03333333333336,
      "end": 372.1666666666667,
      "event": "A mosca mergulha várias vezes sobre a operária média; ela acelera e se assusta.",
      "transition": "corte",
      "reads": [
        {
          "start": 360.28333333333336,
          "end": 363.18333333333334,
          "text": "A mosca persegue as operárias pela trilha."
        },
        {
          "start": 363.53333333333336,
          "end": 368.40833333333336,
          "text": "Ataca as que têm a cabeça com mais de um milímetro e meio, mas prefere as maiores."
        },
        {
          "start": 368.7583333333334,
          "end": 371.3583333333334,
          "text": "Cada ataque dura cerca de um segundo."
        }
      ]
    },
    {
      "id": "c6s03",
      "chapter": "c6",
      "start": 372.1666666666667,
      "end": 380.73333333333335,
      "event": "Câmera lenta: a mosca toca a cabeça de outra formiga grande, logo atrás, e decola. Texto: \"1 segundo\".",
      "transition": "corte",
      "reads": [
        {
          "start": 372.4166666666667,
          "end": 377.06666666666666,
          "text": "Nesse segundo, a mosca põe um ovo dentro da cabeça da formiga atacada."
        },
        {
          "start": 377.4166666666667,
          "end": 379.9166666666667,
          "text": "A larva da mosca cresce ali dentro."
        }
      ]
    },
    {
      "id": "c6s04",
      "chapter": "c6",
      "start": 380.73333333333335,
      "end": 385.76666666666665,
      "event": "Corte seco para o chão: uma formiga caída, imóvel, de lado. Silêncio.",
      "transition": "corte",
      "reads": [
        {
          "start": 380.98333333333335,
          "end": 384.95833333333337,
          "text": "No fim, a larva vira pupa entre as mandíbulas da formiga morta."
        }
      ]
    },
    {
      "id": "c6s05",
      "chapter": "c6",
      "start": 385.76666666666665,
      "end": 396.8,
      "event": "A trilha esvazia: as formigas grandes recuam para o ninho, e pedaços de folha ficam largados no caminho.",
      "transition": "corte",
      "reads": [
        {
          "start": 386.01666666666665,
          "end": 390.39166666666665,
          "text": "Na natureza, só duas a quatro em cada cem coletoras são parasitadas."
        },
        {
          "start": 390.7416666666667,
          "end": 395.9916666666667,
          "text": "Mas basta uma mosca na trilha para haver menos coletoras, e as que ficam são menores."
        }
      ]
    },
    {
      "id": "c6s06",
      "chapter": "c6",
      "start": 396.8,
      "end": 404.8333333333333,
      "event": "Close da folha que a nossa operária carrega: uma formiga minúscula em cima dela, de antenas erguidas.",
      "transition": "corte",
      "reads": [
        {
          "start": 397.05,
          "end": 399.75,
          "text": "A nossa operária tem uma guarda-costas."
        },
        {
          "start": 400.1,
          "end": 404.02500000000003,
          "text": "Uma irmã bem pequena viaja de carona em cima da folha dela."
        }
      ]
    },
    {
      "id": "c6s07",
      "chapter": "c6",
      "start": 404.8333333333333,
      "end": 413.3666666666667,
      "event": "A mosca desce, a caroneira abre as mandíbulas, e a mosca desvia e vai embora.",
      "transition": "corte",
      "reads": [
        {
          "start": 405.0833333333333,
          "end": 412.55833333333334,
          "text": "Num estudo no Panamá, com outra saúva, as caronas reduziram o tempo das moscas sobre as folhas e a chance de elas pousarem."
        }
      ]
    },
    {
      "id": "c6s07b",
      "chapter": "c6",
      "start": 413.3666666666667,
      "end": 420.76666666666665,
      "event": "A trilha ao entardecer: mais caroneiras sobre as folhas; a luz muda do dia para a noite.",
      "transition": "corte",
      "reads": [
        {
          "start": 413.6166666666667,
          "end": 419.9666666666667,
          "text": "As formigas até ajustam o número de caronas à quantidade de moscas, ao longo do dia e das estações."
        }
      ]
    },
    {
      "id": "c6s07c",
      "chapter": "c6",
      "start": 420.76666666666665,
      "end": 431.43333333333334,
      "event": "Noite: a trilha continua, caroneiras em cima das folhas, céu escuro sem moscas. Texto \"?\".",
      "transition": "corte",
      "reads": [
        {
          "start": 421.01666666666665,
          "end": 422.66666666666663,
          "text": "Mas ainda há mistério."
        },
        {
          "start": 423.01666666666665,
          "end": 430.6166666666667,
          "text": "Na Costa Rica, mais de noventa por cento das caronas de outra saúva aconteceram à noite, quando essas moscas, em geral, não voam."
        }
      ]
    },
    {
      "id": "c6s07d",
      "chapter": "c6",
      "start": 431.43333333333334,
      "end": 439.03333333333336,
      "event": "Close de uma caroneira de cabeça baixa, que mexe as antenas sobre a folha.",
      "transition": "corte",
      "reads": [
        {
          "start": 431.68333333333334,
          "end": 438.23333333333335,
          "text": "Para os pesquisadores, a melhor explicação é que as caronas também preparam a folha antes de ela entrar no ninho."
        }
      ]
    },
    {
      "id": "c6s08",
      "chapter": "c6",
      "start": 439.03333333333336,
      "end": 444.6666666666667,
      "event": "A operária volta ao ritmo da trilha e some entre as irmãs.",
      "transition": "corte",
      "reads": [
        {
          "start": 439.28333333333336,
          "end": 441.20833333333337,
          "text": "Hoje, a mosca vai embora."
        },
        {
          "start": 441.5583333333334,
          "end": 443.8583333333334,
          "text": "A nossa operária segue em frente."
        }
      ]
    },
    {
      "id": "c7s01",
      "chapter": "c7",
      "start": 444.6666666666667,
      "end": 455.1,
      "event": "Close de perfil da cabeça da operária, mandíbulas abrindo e fechando; brilho no fio.",
      "transition": "corte",
      "reads": [
        {
          "start": 446.5166666666667,
          "end": 449.6416666666667,
          "text": "As semanas passam, e o trabalho cobra o seu preço."
        },
        {
          "start": 449.99166666666673,
          "end": 454.29166666666674,
          "text": "A mandíbula de uma cortadeira nova tem um fio afiado como uma navalha."
        }
      ]
    },
    {
      "id": "c7s02",
      "chapter": "c7",
      "start": 455.1,
      "end": 464.3,
      "event": "A mesma operária tenta cortar uma folha e quase não avança; pausa, e gota de suor.",
      "transition": "corte",
      "reads": [
        {
          "start": 455.35,
          "end": 457.35,
          "text": "Com o uso, esse fio cega."
        },
        {
          "start": 457.70000000000005,
          "end": 463.50000000000006,
          "text": "Com as mandíbulas gastas, cortar a mesma folha chegou a exigir duas vezes e meia mais força."
        }
      ]
    },
    {
      "id": "c7s02b",
      "chapter": "c7",
      "start": 464.3,
      "end": 474.56666666666666,
      "event": "Texto \"-44%\" ao lado de uma fileira de cortadoras; metade delas corta devagar.",
      "transition": "corte",
      "reads": [
        {
          "start": 464.55,
          "end": 473.75,
          "text": "Os pesquisadores fizeram a conta: se todas tivessem mandíbulas novas, a colônia gastaria quarenta e quatro por cento menos energia e tempo cortando."
        }
      ]
    },
    {
      "id": "c7s03",
      "chapter": "c7",
      "start": 474.56666666666666,
      "end": 483.4,
      "event": "Uma irmã mais nova corta e solta o pedaço; a nossa operária pega e carrega.",
      "transition": "corte",
      "reads": [
        {
          "start": 474.81666666666666,
          "end": 479.8666666666667,
          "text": "Numa outra saúva, as coletoras de mandíbulas mais gastas quase só carregavam."
        },
        {
          "start": 480.2166666666667,
          "end": 482.5916666666667,
          "text": "Deixavam o corte para as irmãs."
        }
      ]
    },
    {
      "id": "c7s04",
      "chapter": "c7",
      "start": 483.4,
      "end": 492.96666666666664,
      "event": "Chuva começa na trilha. A operária anda mais devagar que as outras.",
      "transition": "corte",
      "reads": [
        {
          "start": 483.65,
          "end": 486.5,
          "text": "Trabalhar lá fora também encurta a vida."
        },
        {
          "start": 486.85,
          "end": 492.15000000000003,
          "text": "Em outra saúva, as operárias de fora do ninho morreram antes das que ficavam dentro."
        }
      ]
    },
    {
      "id": "c7s04b",
      "chapter": "c7",
      "start": 492.96666666666664,
      "end": 501.1333333333333,
      "event": "Corte: lá em cima, operárias velhas na chuva; lá embaixo, o ninho seco com jardineiras jovens.",
      "transition": "corte",
      "reads": [
        {
          "start": 493.21666666666664,
          "end": 500.34166666666664,
          "text": "Os pesquisadores sugerem um motivo: com as mais velhas do lado de fora, cai o risco de levar doenças para dentro do ninho."
        }
      ]
    },
    {
      "id": "c7s05",
      "chapter": "c7",
      "start": 501.1333333333333,
      "end": 507.1333333333333,
      "event": "Entrada do ninho: ela fica parada na boca do túnel, enquanto as outras passam por ela.",
      "transition": "corte",
      "reads": [
        {
          "start": 501.3833333333333,
          "end": 506.3333333333333,
          "text": "Nas últimas três semanas de vida, ela sai cada vez menos em busca de folhas."
        }
      ]
    },
    {
      "id": "c8s01",
      "chapter": "c8",
      "start": 507.1333333333333,
      "end": 517.1333333333333,
      "event": "Câmara do ninho, luz baixa: a operária deitada, pernas encolhidas. As antenas param.",
      "transition": "íris",
      "reads": [
        {
          "start": 508.98333333333335,
          "end": 511.23333333333335,
          "text": "Um dia, ela não levanta mais."
        },
        {
          "start": 511.58333333333337,
          "end": 516.3333333333334,
          "text": "Foi uma vida curta: ovo, larva, pupa e trabalho, sem descanso de verdade."
        }
      ]
    },
    {
      "id": "c8s02",
      "chapter": "c8",
      "start": 517.1333333333333,
      "end": 523.5666666666667,
      "event": "Duas irmãs puxam o corpo por um túnel até a câmara de lixo.",
      "transition": "corte",
      "reads": [
        {
          "start": 517.3833333333333,
          "end": 522.7583333333333,
          "text": "O corpo dela acaba nas câmaras de lixo, junto com fungo velho e restos de plantas."
        }
      ]
    },
    {
      "id": "c8s03",
      "chapter": "c8",
      "start": 523.5666666666667,
      "end": 534.2666666666667,
      "event": "Corte do solo: raízes de uma árvore descem até a câmara de lixo. A câmera sobe pela raiz e pelo tronco até a copa.",
      "transition": "corte",
      "reads": [
        {
          "start": 523.8166666666667,
          "end": 526.1166666666667,
          "text": "Mas a história não termina ali."
        },
        {
          "start": 526.4666666666667,
          "end": 533.4666666666667,
          "text": "No cerrado, perto de Brasília, árvores a até onze metros de um ninho de saúva absorveram nutrientes vindos dele."
        }
      ]
    },
    {
      "id": "c8s03b",
      "chapter": "c8",
      "start": 534.2666666666667,
      "end": 543.2,
      "event": "Uma raiz entra numa câmara de fungo e operárias a cortam; outra raiz, na câmara de lixo, se ramifica livre.",
      "transition": "corte",
      "reads": [
        {
          "start": 534.5166666666667,
          "end": 538.7916666666666,
          "text": "As formigas cortam qualquer raiz que invade os túneis e o jardim de fungo."
        },
        {
          "start": 539.1416666666667,
          "end": 542.3916666666667,
          "text": "Mesmo assim, o que estava no ninho chegou às árvores."
        }
      ]
    },
    {
      "id": "c8s04",
      "chapter": "c8",
      "start": 543.2,
      "end": 549.7666666666667,
      "event": "Uma folha se solta da copa e cai rodopiando sobre a trilha; uma operária a pega e a leva.",
      "transition": "corte",
      "reads": [
        {
          "start": 543.45,
          "end": 545.9000000000001,
          "text": "O que foi formiga volta a ser folha."
        },
        {
          "start": 546.2500000000001,
          "end": 548.9750000000001,
          "text": "E as folhas, um dia, voltam para a trilha."
        }
      ]
    },
    {
      "id": "c8s05",
      "chapter": "c8",
      "start": 549.7666666666667,
      "end": 558.6666666666666,
      "event": "Câmara real: a rainha, e um ovo novo ao lado dela.",
      "transition": "corte",
      "reads": [
        {
          "start": 550.0166666666667,
          "end": 552.8416666666667,
          "text": "Lá embaixo, a rainha continua pondo ovos."
        },
        {
          "start": 553.1916666666667,
          "end": 557.8666666666667,
          "text": "Ela pode viver de dez a quinze anos, e a colônia vive quase o mesmo tanto."
        }
      ]
    },
    {
      "id": "c8s06",
      "chapter": "c8",
      "start": 558.6666666666666,
      "end": 573.5333333333333,
      "event": "Zoom out do corte do solo até o gramado ao entardecer, com a trilha ainda em movimento. Íris fecha.",
      "transition": "íris",
      "reads": [
        {
          "start": 558.9166666666666,
          "end": 563.0916666666666,
          "text": "Milhões de irmãs, cada uma com uma vida curta e cheia de trabalho."
        },
        {
          "start": 563.4416666666666,
          "end": 565.5166666666667,
          "text": "Juntas, elas são a cidade."
        },
        {
          "start": 565.8666666666667,
          "end": 570.7166666666667,
          "text": "Na próxima revoada, novas rainhas vão subir ao céu, e tudo começa de novo."
        }
      ]
    }
  ]
});
