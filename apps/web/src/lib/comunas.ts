/**
 * Centro aproximado de cada comuna de Chile (lat, lon) y su región.
 * Fuente: OpenStreetMap, nodo "admin_centre" (cabecera comunal) de cada comuna, cruzado por código
 * CUT con la etiqueta "dpachile:id" (© colaboradores de OpenStreetMap, licencia ODbL). Lista de las 346
 * comunas y regiones: Wikipedia, "Anexo:Comunas de Chile". Cada punto (salvo Antártica) se comprobó dentro
 * del polígono de su comuna (límites BCN, repositorio caracena/chile-geojson). Rengo (sin cabecera en OSM) y
 * Antártica (sin límite en OSM) usan la coordenada de su artículo en Wikipedia. Descargado en septiembre 2026.
 *
 * Claves: nombre normalizado con normalizarLugar ("nunoa", "vina del mar", "concon"). Las entradas
 * "region:<nombre>" apuntan a la capital regional, para avisos que solo traen la región.
 */
export const COMUNAS: Record<string, { lat: number; lon: number; region: string }> = {
  // Arica y Parinacota
  "arica": { lat: -18.4785, lon: -70.3211, region: "Arica y Parinacota" },
  "camarones": { lat: -19.1402, lon: -70.1592, region: "Arica y Parinacota" },
  "putre": { lat: -18.1964, lon: -69.5592, region: "Arica y Parinacota" },
  "general lagos": { lat: -17.5948, lon: -69.4816, region: "Arica y Parinacota" },
  // Tarapacá
  "iquique": { lat: -20.2141, lon: -70.1525, region: "Tarapacá" },
  "alto hospicio": { lat: -20.27, lon: -70.1009, region: "Tarapacá" },
  "pozo almonte": { lat: -20.2597, lon: -69.7861, region: "Tarapacá" },
  "camina": { lat: -19.3131, lon: -69.4267, region: "Tarapacá" },
  "colchane": { lat: -19.2758, lon: -68.6389, region: "Tarapacá" },
  "huara": { lat: -19.9958, lon: -69.7727, region: "Tarapacá" },
  "pica": { lat: -20.4911, lon: -69.3291, region: "Tarapacá" },
  // Antofagasta
  "antofagasta": { lat: -23.6464, lon: -70.398, region: "Antofagasta" },
  "mejillones": { lat: -23.1002, lon: -70.4483, region: "Antofagasta" },
  "sierra gorda": { lat: -23.3338, lon: -69.8435, region: "Antofagasta" },
  "taltal": { lat: -25.4078, lon: -70.4858, region: "Antofagasta" },
  "calama": { lat: -22.4624, lon: -68.9272, region: "Antofagasta" },
  "ollague": { lat: -21.2242, lon: -68.2535, region: "Antofagasta" },
  "san pedro de atacama": { lat: -22.9108, lon: -68.2001, region: "Antofagasta" },
  "tocopilla": { lat: -22.0887, lon: -70.1961, region: "Antofagasta" },
  "maria elena": { lat: -22.3451, lon: -69.6618, region: "Antofagasta" },
  // Atacama
  "copiapo": { lat: -27.3665, lon: -70.3323, region: "Atacama" },
  "caldera": { lat: -27.0676, lon: -70.8222, region: "Atacama" },
  "tierra amarilla": { lat: -27.4681, lon: -70.2649, region: "Atacama" },
  "chanaral": { lat: -26.3479, lon: -70.6224, region: "Atacama" },
  "diego de almagro": { lat: -26.3911, lon: -70.0459, region: "Atacama" },
  "vallenar": { lat: -28.575, lon: -70.7616, region: "Atacama" },
  "alto del carmen": { lat: -28.7597, lon: -70.4861, region: "Atacama" },
  "freirina": { lat: -28.5086, lon: -71.0786, region: "Atacama" },
  "huasco": { lat: -28.4651, lon: -71.2208, region: "Atacama" },
  // Coquimbo
  "la serena": { lat: -29.9027, lon: -71.252, region: "Coquimbo" },
  "coquimbo": { lat: -29.9532, lon: -71.338, region: "Coquimbo" },
  "andacollo": { lat: -30.2322, lon: -71.0848, region: "Coquimbo" },
  "la higuera": { lat: -29.5116, lon: -71.2015, region: "Coquimbo" },
  "paihuano": { lat: -30.029, lon: -70.5164, region: "Coquimbo" },
  "vicuna": { lat: -30.034, lon: -70.7127, region: "Coquimbo" },
  "illapel": { lat: -31.6327, lon: -71.1683, region: "Coquimbo" },
  "canela": { lat: -31.3984, lon: -71.4576, region: "Coquimbo" },
  "los vilos": { lat: -31.9122, lon: -71.5139, region: "Coquimbo" },
  "salamanca": { lat: -31.7805, lon: -70.965, region: "Coquimbo" },
  "ovalle": { lat: -30.6031, lon: -71.203, region: "Coquimbo" },
  "combarbala": { lat: -31.1782, lon: -71.0024, region: "Coquimbo" },
  "monte patria": { lat: -30.6945, lon: -70.958, region: "Coquimbo" },
  "punitaqui": { lat: -30.8338, lon: -71.2574, region: "Coquimbo" },
  "rio hurtado": { lat: -30.4091, lon: -70.9383, region: "Coquimbo" },
  // Valparaíso
  "valparaiso": { lat: -33.0458, lon: -71.6197, region: "Valparaíso" },
  "casablanca": { lat: -33.3206, lon: -71.4101, region: "Valparaíso" },
  "concon": { lat: -32.922, lon: -71.516, region: "Valparaíso" },
  "juan fernandez": { lat: -33.6357, lon: -78.8313, region: "Valparaíso" },
  "puchuncavi": { lat: -32.726, lon: -71.415, region: "Valparaíso" },
  "quintero": { lat: -32.784, lon: -71.5283, region: "Valparaíso" },
  "vina del mar": { lat: -33.0245, lon: -71.5518, region: "Valparaíso" },
  "isla de pascua": { lat: -27.1481, lon: -109.4273, region: "Valparaíso" },
  "los andes": { lat: -32.8337, lon: -70.5982, region: "Valparaíso" },
  "calle larga": { lat: -32.8553, lon: -70.626, region: "Valparaíso" },
  "rinconada": { lat: -32.8394, lon: -70.6872, region: "Valparaíso" },
  "san esteban": { lat: -32.7991, lon: -70.5796, region: "Valparaíso" },
  "la ligua": { lat: -32.4496, lon: -71.2317, region: "Valparaíso" },
  "cabildo": { lat: -32.4266, lon: -71.0663, region: "Valparaíso" },
  "papudo": { lat: -32.5076, lon: -71.4459, region: "Valparaíso" },
  "petorca": { lat: -32.2517, lon: -70.9309, region: "Valparaíso" },
  "zapallar": { lat: -32.5528, lon: -71.4588, region: "Valparaíso" },
  "quillota": { lat: -32.88, lon: -71.2474, region: "Valparaíso" },
  "la calera": { lat: -32.789, lon: -71.2035, region: "Valparaíso" },
  "hijuelas": { lat: -32.8001, lon: -71.1452, region: "Valparaíso" },
  "la cruz": { lat: -32.8279, lon: -71.2272, region: "Valparaíso" },
  "nogales": { lat: -32.7364, lon: -71.2002, region: "Valparaíso" },
  "san antonio": { lat: -33.5809, lon: -71.6132, region: "Valparaíso" },
  "algarrobo": { lat: -33.3692, lon: -71.6681, region: "Valparaíso" },
  "cartagena": { lat: -33.5468, lon: -71.6032, region: "Valparaíso" },
  "el quisco": { lat: -33.4003, lon: -71.694, region: "Valparaíso" },
  "el tabo": { lat: -33.4546, lon: -71.6691, region: "Valparaíso" },
  "santo domingo": { lat: -33.6406, lon: -71.6261, region: "Valparaíso" },
  "san felipe": { lat: -32.7507, lon: -70.7253, region: "Valparaíso" },
  "catemu": { lat: -32.7784, lon: -70.9633, region: "Valparaíso" },
  "llay llay": { lat: -32.843, lon: -70.9525, region: "Valparaíso" },
  "panquehue": { lat: -32.7706, lon: -70.8361, region: "Valparaíso" },
  "putaendo": { lat: -32.6261, lon: -70.7168, region: "Valparaíso" },
  "santa maria": { lat: -32.7479, lon: -70.6567, region: "Valparaíso" },
  "quilpue": { lat: -33.0498, lon: -71.4415, region: "Valparaíso" },
  "limache": { lat: -33.0019, lon: -71.2657, region: "Valparaíso" },
  "olmue": { lat: -32.9956, lon: -71.1862, region: "Valparaíso" },
  "villa alemana": { lat: -33.0442, lon: -71.3725, region: "Valparaíso" },
  // Metropolitana
  "santiago": { lat: -33.4377, lon: -70.6511, region: "Metropolitana" },
  "cerrillos": { lat: -33.488, lon: -70.7031, region: "Metropolitana" },
  "cerro navia": { lat: -33.4293, lon: -70.7306, region: "Metropolitana" },
  "conchali": { lat: -33.396, lon: -70.6708, region: "Metropolitana" },
  "el bosque": { lat: -33.5561, lon: -70.6656, region: "Metropolitana" },
  "estacion central": { lat: -33.4536, lon: -70.6899, region: "Metropolitana" },
  "huechuraba": { lat: -33.3745, lon: -70.6363, region: "Metropolitana" },
  "independencia": { lat: -33.4223, lon: -70.6555, region: "Metropolitana" },
  "la cisterna": { lat: -33.5346, lon: -70.6644, region: "Metropolitana" },
  "la florida": { lat: -33.5204, lon: -70.6006, region: "Metropolitana" },
  "la granja": { lat: -33.5431, lon: -70.6332, region: "Metropolitana" },
  "la pintana": { lat: -33.5834, lon: -70.6298, region: "Metropolitana" },
  "la reina": { lat: -33.4423, lon: -70.5433, region: "Metropolitana" },
  "las condes": { lat: -33.4085, lon: -70.5671, region: "Metropolitana" },
  "lo barnechea": { lat: -33.3616, lon: -70.5052, region: "Metropolitana" },
  "lo espejo": { lat: -33.5251, lon: -70.6945, region: "Metropolitana" },
  "lo prado": { lat: -33.4426, lon: -70.7178, region: "Metropolitana" },
  "macul": { lat: -33.4822, lon: -70.5992, region: "Metropolitana" },
  "maipu": { lat: -33.5094, lon: -70.7562, region: "Metropolitana" },
  "nunoa": { lat: -33.4543, lon: -70.5936, region: "Metropolitana" },
  "pedro aguirre cerda": { lat: -33.4938, lon: -70.6761, region: "Metropolitana" },
  "penalolen": { lat: -33.4766, lon: -70.5418, region: "Metropolitana" },
  "providencia": { lat: -33.4322, lon: -70.6095, region: "Metropolitana" },
  "pudahuel": { lat: -33.4368, lon: -70.7518, region: "Metropolitana" },
  "quilicura": { lat: -33.3678, lon: -70.7315, region: "Metropolitana" },
  "quinta normal": { lat: -33.4226, lon: -70.6945, region: "Metropolitana" },
  "recoleta": { lat: -33.4021, lon: -70.6429, region: "Metropolitana" },
  "renca": { lat: -33.4042, lon: -70.705, region: "Metropolitana" },
  "san joaquin": { lat: -33.4966, lon: -70.6291, region: "Metropolitana" },
  "san miguel": { lat: -33.486, lon: -70.6495, region: "Metropolitana" },
  "san ramon": { lat: -33.5428, lon: -70.6438, region: "Metropolitana" },
  "vitacura": { lat: -33.3871, lon: -70.5765, region: "Metropolitana" },
  "puente alto": { lat: -33.6095, lon: -70.5755, region: "Metropolitana" },
  "pirque": { lat: -33.6349, lon: -70.573, region: "Metropolitana" },
  "san jose de maipo": { lat: -33.6404, lon: -70.3528, region: "Metropolitana" },
  "colina": { lat: -33.2025, lon: -70.6749, region: "Metropolitana" },
  "lampa": { lat: -33.2864, lon: -70.873, region: "Metropolitana" },
  "til til": { lat: -33.0853, lon: -70.9294, region: "Metropolitana" },
  "san bernardo": { lat: -33.5923, lon: -70.7046, region: "Metropolitana" },
  "buin": { lat: -33.732, lon: -70.742, region: "Metropolitana" },
  "calera de tango": { lat: -33.6309, lon: -70.7593, region: "Metropolitana" },
  "paine": { lat: -33.8101, lon: -70.739, region: "Metropolitana" },
  "melipilla": { lat: -33.6855, lon: -71.2146, region: "Metropolitana" },
  "alhue": { lat: -34.0321, lon: -71.0991, region: "Metropolitana" },
  "curacavi": { lat: -33.4022, lon: -71.1294, region: "Metropolitana" },
  "maria pinto": { lat: -33.516, lon: -71.12, region: "Metropolitana" },
  "san pedro": { lat: -33.8944, lon: -71.4563, region: "Metropolitana" },
  "talagante": { lat: -33.6644, lon: -70.9303, region: "Metropolitana" },
  "el monte": { lat: -33.6783, lon: -70.9782, region: "Metropolitana" },
  "isla de maipo": { lat: -33.7537, lon: -70.9039, region: "Metropolitana" },
  "padre hurtado": { lat: -33.5673, lon: -70.802, region: "Metropolitana" },
  "penaflor": { lat: -33.6059, lon: -70.8785, region: "Metropolitana" },
  // O'Higgins
  "rancagua": { lat: -34.1702, lon: -70.7407, region: "O'Higgins" },
  "codegua": { lat: -34.0377, lon: -70.6565, region: "O'Higgins" },
  "coinco": { lat: -34.2699, lon: -70.9516, region: "O'Higgins" },
  "coltauco": { lat: -34.2863, lon: -71.0826, region: "O'Higgins" },
  "donihue": { lat: -34.2261, lon: -70.9649, region: "O'Higgins" },
  "graneros": { lat: -34.0645, lon: -70.7263, region: "O'Higgins" },
  "las cabras": { lat: -34.2917, lon: -71.3098, region: "O'Higgins" },
  "machali": { lat: -34.1825, lon: -70.6512, region: "O'Higgins" },
  "malloa": { lat: -34.4421, lon: -70.9441, region: "O'Higgins" },
  "mostazal": { lat: -33.9799, lon: -70.7122, region: "O'Higgins" },
  "olivar": { lat: -34.2094, lon: -70.8172, region: "O'Higgins" },
  "peumo": { lat: -34.3959, lon: -71.1694, region: "O'Higgins" },
  "pichidegua": { lat: -34.3584, lon: -71.2827, region: "O'Higgins" },
  "quinta de tilcoco": { lat: -34.3546, lon: -70.9639, region: "O'Higgins" },
  "rengo": { lat: -34.4069, lon: -70.8625, region: "O'Higgins" }, // Wikipedia
  "requinoa": { lat: -34.2849, lon: -70.8175, region: "O'Higgins" },
  "san vicente": { lat: -34.4393, lon: -71.0768, region: "O'Higgins" },
  "pichilemu": { lat: -34.3852, lon: -72.0047, region: "O'Higgins" },
  "la estrella": { lat: -34.2053, lon: -71.6546, region: "O'Higgins" },
  "litueche": { lat: -34.1154, lon: -71.7297, region: "O'Higgins" },
  "marchigue": { lat: -34.4001, lon: -71.6183, region: "O'Higgins" },
  "navidad": { lat: -33.9536, lon: -71.8306, region: "O'Higgins" },
  "paredones": { lat: -34.6476, lon: -71.9008, region: "O'Higgins" },
  "san fernando": { lat: -34.5838, lon: -70.9891, region: "O'Higgins" },
  "chepica": { lat: -34.7286, lon: -71.2739, region: "O'Higgins" },
  "chimbarongo": { lat: -34.709, lon: -71.0404, region: "O'Higgins" },
  "lolol": { lat: -34.7278, lon: -71.6441, region: "O'Higgins" },
  "nancagua": { lat: -34.6527, lon: -71.1954, region: "O'Higgins" },
  "palmilla": { lat: -34.5961, lon: -71.3625, region: "O'Higgins" },
  "peralillo": { lat: -34.478, lon: -71.4793, region: "O'Higgins" },
  "placilla": { lat: -34.6386, lon: -71.1174, region: "O'Higgins" },
  "pumanque": { lat: -34.6048, lon: -71.6547, region: "O'Higgins" },
  "santa cruz": { lat: -34.6403, lon: -71.3661, region: "O'Higgins" },
  // Maule
  "talca": { lat: -35.4265, lon: -71.666, region: "Maule" },
  "constitucion": { lat: -35.3318, lon: -72.4119, region: "Maule" },
  "curepto": { lat: -35.0937, lon: -72.0181, region: "Maule" },
  "empedrado": { lat: -35.5908, lon: -72.2776, region: "Maule" },
  "maule": { lat: -35.5213, lon: -71.6919, region: "Maule" },
  "pelarco": { lat: -35.3837, lon: -71.447, region: "Maule" },
  "pencahue": { lat: -35.3962, lon: -71.7994, region: "Maule" },
  "rio claro": { lat: -35.2816, lon: -71.2587, region: "Maule" },
  "san clemente": { lat: -35.5375, lon: -71.4859, region: "Maule" },
  "san rafael": { lat: -35.3051, lon: -71.5157, region: "Maule" },
  "cauquenes": { lat: -35.9671, lon: -72.3154, region: "Maule" },
  "chanco": { lat: -35.7342, lon: -72.5332, region: "Maule" },
  "pelluhue": { lat: -35.8453, lon: -72.6364, region: "Maule" },
  "curico": { lat: -34.9854, lon: -71.2394, region: "Maule" },
  "hualane": { lat: -34.9775, lon: -71.8012, region: "Maule" },
  "licanten": { lat: -34.9857, lon: -71.9846, region: "Maule" },
  "molina": { lat: -35.114, lon: -71.28, region: "Maule" },
  "rauco": { lat: -34.9246, lon: -71.3167, region: "Maule" },
  "romeral": { lat: -34.96, lon: -71.1253, region: "Maule" },
  "sagrada familia": { lat: -34.999, lon: -71.3817, region: "Maule" },
  "teno": { lat: -34.8668, lon: -71.1612, region: "Maule" },
  "vichuquen": { lat: -34.884, lon: -71.9924, region: "Maule" },
  "linares": { lat: -35.8453, lon: -71.5977, region: "Maule" },
  "colbun": { lat: -35.696, lon: -71.4061, region: "Maule" },
  "longavi": { lat: -35.966, lon: -71.6847, region: "Maule" },
  "parral": { lat: -36.1414, lon: -71.8222, region: "Maule" },
  "retiro": { lat: -36.0554, lon: -71.7651, region: "Maule" },
  "san javier": { lat: -35.5924, lon: -71.7353, region: "Maule" },
  "villa alegre": { lat: -35.6752, lon: -71.7447, region: "Maule" },
  "yerbas buenas": { lat: -35.7464, lon: -71.5821, region: "Maule" },
  // Ñuble
  "chillan": { lat: -36.6067, lon: -72.1033, region: "Ñuble" },
  "bulnes": { lat: -36.7423, lon: -72.2987, region: "Ñuble" },
  "chillan viejo": { lat: -36.623, lon: -72.1317, region: "Ñuble" },
  "el carmen": { lat: -36.8979, lon: -72.0246, region: "Ñuble" },
  "pemuco": { lat: -36.9767, lon: -72.0989, region: "Ñuble" },
  "pinto": { lat: -36.7036, lon: -71.8923, region: "Ñuble" },
  "quillon": { lat: -36.7444, lon: -72.4764, region: "Ñuble" },
  "san ignacio": { lat: -36.7998, lon: -72.0304, region: "Ñuble" },
  "yungay": { lat: -37.1194, lon: -72.0189, region: "Ñuble" },
  "quirihue": { lat: -36.2827, lon: -72.5408, region: "Ñuble" },
  "cobquecura": { lat: -36.1318, lon: -72.7915, region: "Ñuble" },
  "coelemu": { lat: -36.4876, lon: -72.7023, region: "Ñuble" },
  "ninhue": { lat: -36.3936, lon: -72.3976, region: "Ñuble" },
  "portezuelo": { lat: -36.5274, lon: -72.4285, region: "Ñuble" },
  "ranquil": { lat: -36.6051, lon: -72.5344, region: "Ñuble" },
  "treguaco": { lat: -36.4307, lon: -72.6658, region: "Ñuble" },
  "san carlos": { lat: -36.4248, lon: -71.9581, region: "Ñuble" },
  "coihueco": { lat: -36.6288, lon: -71.8319, region: "Ñuble" },
  "niquen": { lat: -36.2828, lon: -71.8148, region: "Ñuble" },
  "san fabian": { lat: -36.5566, lon: -71.5499, region: "Ñuble" },
  "san nicolas": { lat: -36.5034, lon: -72.2124, region: "Ñuble" },
  // Biobío
  "concepcion": { lat: -36.8271, lon: -73.0502, region: "Biobío" },
  "coronel": { lat: -37.0165, lon: -73.1562, region: "Biobío" },
  "chiguayante": { lat: -36.9292, lon: -73.0237, region: "Biobío" },
  "florida": { lat: -36.8253, lon: -72.6614, region: "Biobío" },
  "hualqui": { lat: -36.9759, lon: -72.9384, region: "Biobío" },
  "lota": { lat: -37.0945, lon: -73.1564, region: "Biobío" },
  "penco": { lat: -36.7386, lon: -72.9938, region: "Biobío" },
  "san pedro de la paz": { lat: -36.8414, lon: -73.104, region: "Biobío" },
  "santa juana": { lat: -37.1738, lon: -72.9426, region: "Biobío" },
  "talcahuano": { lat: -36.7145, lon: -73.1141, region: "Biobío" },
  "tome": { lat: -36.6171, lon: -72.9575, region: "Biobío" },
  "hualpen": { lat: -36.7928, lon: -73.0943, region: "Biobío" },
  "lebu": { lat: -37.6102, lon: -73.6561, region: "Biobío" },
  "arauco": { lat: -37.2462, lon: -73.3176, region: "Biobío" },
  "canete": { lat: -37.8004, lon: -73.3991, region: "Biobío" },
  "contulmo": { lat: -38.016, lon: -73.2286, region: "Biobío" },
  "curanilahue": { lat: -37.4758, lon: -73.3457, region: "Biobío" },
  "los alamos": { lat: -37.6271, lon: -73.4618, region: "Biobío" },
  "tirua": { lat: -38.3439, lon: -73.4935, region: "Biobío" },
  "los angeles": { lat: -37.4707, lon: -72.3517, region: "Biobío" },
  "antuco": { lat: -37.33, lon: -71.6792, region: "Biobío" },
  "cabrero": { lat: -37.0358, lon: -72.4027, region: "Biobío" },
  "laja": { lat: -37.2795, lon: -72.7149, region: "Biobío" },
  "mulchen": { lat: -37.7201, lon: -72.2441, region: "Biobío" },
  "nacimiento": { lat: -37.5018, lon: -72.6731, region: "Biobío" },
  "negrete": { lat: -37.5857, lon: -72.5293, region: "Biobío" },
  "quilaco": { lat: -37.6841, lon: -72.0055, region: "Biobío" },
  "quilleco": { lat: -37.471, lon: -71.9803, region: "Biobío" },
  "san rosendo": { lat: -37.2631, lon: -72.724, region: "Biobío" },
  "santa barbara": { lat: -37.6681, lon: -72.0214, region: "Biobío" },
  "tucapel": { lat: -37.2402, lon: -71.9419, region: "Biobío" },
  "yumbel": { lat: -37.0979, lon: -72.5623, region: "Biobío" },
  "alto biobio": { lat: -37.882, lon: -71.6374, region: "Biobío" },
  // La Araucanía
  "temuco": { lat: -38.7359, lon: -72.5905, region: "La Araucanía" },
  "carahue": { lat: -38.7116, lon: -73.1652, region: "La Araucanía" },
  "cunco": { lat: -38.933, lon: -72.0321, region: "La Araucanía" },
  "curarrehue": { lat: -39.359, lon: -71.5874, region: "La Araucanía" },
  "freire": { lat: -38.9514, lon: -72.6254, region: "La Araucanía" },
  "galvarino": { lat: -38.4111, lon: -72.7813, region: "La Araucanía" },
  "gorbea": { lat: -39.1032, lon: -72.676, region: "La Araucanía" },
  "lautaro": { lat: -38.5343, lon: -72.4351, region: "La Araucanía" },
  "loncoche": { lat: -39.3706, lon: -72.6301, region: "La Araucanía" },
  "melipeuco": { lat: -38.8532, lon: -71.695, region: "La Araucanía" },
  "nueva imperial": { lat: -38.7453, lon: -72.952, region: "La Araucanía" },
  "padre las casas": { lat: -38.7674, lon: -72.5956, region: "La Araucanía" },
  "perquenco": { lat: -38.4212, lon: -72.3778, region: "La Araucanía" },
  "pitrufquen": { lat: -38.9863, lon: -72.6372, region: "La Araucanía" },
  "pucon": { lat: -39.2731, lon: -71.9778, region: "La Araucanía" },
  "saavedra": { lat: -38.7923, lon: -73.3969, region: "La Araucanía" },
  "teodoro schmidt": { lat: -38.9967, lon: -73.0892, region: "La Araucanía" },
  "tolten": { lat: -39.1782, lon: -73.1639, region: "La Araucanía" },
  "vilcun": { lat: -38.6704, lon: -72.2241, region: "La Araucanía" },
  "villarrica": { lat: -39.2781, lon: -72.2274, region: "La Araucanía" },
  "cholchol": { lat: -38.6026, lon: -72.8477, region: "La Araucanía" },
  "angol": { lat: -37.7988, lon: -72.7086, region: "La Araucanía" },
  "collipulli": { lat: -37.9566, lon: -72.4374, region: "La Araucanía" },
  "curacautin": { lat: -38.4373, lon: -71.8883, region: "La Araucanía" },
  "ercilla": { lat: -38.0609, lon: -72.3755, region: "La Araucanía" },
  "lonquimay": { lat: -38.4548, lon: -71.3706, region: "La Araucanía" },
  "los sauces": { lat: -37.983, lon: -72.8292, region: "La Araucanía" },
  "lumaco": { lat: -38.1653, lon: -72.9064, region: "La Araucanía" },
  "puren": { lat: -38.0333, lon: -73.0726, region: "La Araucanía" },
  "renaico": { lat: -37.6717, lon: -72.5833, region: "La Araucanía" },
  "traiguen": { lat: -38.2508, lon: -72.6669, region: "La Araucanía" },
  "victoria": { lat: -38.2339, lon: -72.3317, region: "La Araucanía" },
  // Los Ríos
  "valdivia": { lat: -39.8141, lon: -73.246, region: "Los Ríos" },
  "corral": { lat: -39.8877, lon: -73.4315, region: "Los Ríos" },
  "lanco": { lat: -39.4522, lon: -72.7754, region: "Los Ríos" },
  "los lagos": { lat: -39.8634, lon: -72.813, region: "Los Ríos" },
  "mafil": { lat: -39.666, lon: -72.9521, region: "Los Ríos" },
  "mariquina": { lat: -39.5395, lon: -72.9611, region: "Los Ríos" },
  "paillaco": { lat: -40.0707, lon: -72.8727, region: "Los Ríos" },
  "panguipulli": { lat: -39.642, lon: -72.3334, region: "Los Ríos" },
  "la union": { lat: -40.2952, lon: -73.082, region: "Los Ríos" },
  "futrono": { lat: -40.1312, lon: -72.3827, region: "Los Ríos" },
  "lago ranco": { lat: -40.3217, lon: -72.4814, region: "Los Ríos" },
  "rio bueno": { lat: -40.3337, lon: -72.9568, region: "Los Ríos" },
  // Los Lagos
  "puerto montt": { lat: -41.4718, lon: -72.9396, region: "Los Lagos" },
  "calbuco": { lat: -41.7712, lon: -73.1275, region: "Los Lagos" },
  "cochamo": { lat: -41.6643, lon: -72.2962, region: "Los Lagos" },
  "fresia": { lat: -41.1531, lon: -73.4223, region: "Los Lagos" },
  "frutillar": { lat: -41.1258, lon: -73.0605, region: "Los Lagos" },
  "los muermos": { lat: -41.3961, lon: -73.4617, region: "Los Lagos" },
  "llanquihue": { lat: -41.2576, lon: -73.0047, region: "Los Lagos" },
  "maullin": { lat: -41.616, lon: -73.5951, region: "Los Lagos" },
  "puerto varas": { lat: -41.3178, lon: -72.9829, region: "Los Lagos" },
  "castro": { lat: -42.4824, lon: -73.7643, region: "Los Lagos" },
  "ancud": { lat: -41.8682, lon: -73.8287, region: "Los Lagos" },
  "chonchi": { lat: -42.624, lon: -73.7724, region: "Los Lagos" },
  "curaco de velez": { lat: -42.4397, lon: -73.6028, region: "Los Lagos" },
  "dalcahue": { lat: -42.3796, lon: -73.6473, region: "Los Lagos" },
  "puqueldon": { lat: -42.5993, lon: -73.6763, region: "Los Lagos" },
  "queilen": { lat: -42.8899, lon: -73.4721, region: "Los Lagos" },
  "quellon": { lat: -43.12, lon: -73.6203, region: "Los Lagos" },
  "quemchi": { lat: -42.1445, lon: -73.4736, region: "Los Lagos" },
  "quinchao": { lat: -42.471, lon: -73.4881, region: "Los Lagos" },
  "osorno": { lat: -40.5737, lon: -73.1358, region: "Los Lagos" },
  "puerto octay": { lat: -40.9728, lon: -72.8842, region: "Los Lagos" },
  "purranque": { lat: -40.9128, lon: -73.1582, region: "Los Lagos" },
  "puyehue": { lat: -40.6836, lon: -72.604, region: "Los Lagos" },
  "rio negro": { lat: -40.7962, lon: -73.2164, region: "Los Lagos" },
  "san juan de la costa": { lat: -40.6047, lon: -73.4705, region: "Los Lagos" },
  "san pablo": { lat: -40.4128, lon: -73.0116, region: "Los Lagos" },
  "chaiten": { lat: -42.9165, lon: -72.7084, region: "Los Lagos" },
  "futaleufu": { lat: -43.1858, lon: -71.8667, region: "Los Lagos" },
  "hualaihue": { lat: -41.9661, lon: -72.4707, region: "Los Lagos" },
  "palena": { lat: -43.6178, lon: -71.804, region: "Los Lagos" },
  // Aysén
  "coyhaique": { lat: -45.5712, lon: -72.0685, region: "Aysén" },
  "lago verde": { lat: -44.2402, lon: -71.8493, region: "Aysén" },
  "aysen": { lat: -45.4068, lon: -72.6977, region: "Aysén" },
  "cisnes": { lat: -44.7273, lon: -72.6805, region: "Aysén" },
  "guaitecas": { lat: -43.8975, lon: -73.7464, region: "Aysén" },
  "cochrane": { lat: -47.2542, lon: -72.5732, region: "Aysén" },
  "ohiggins": { lat: -48.4685, lon: -72.5592, region: "Aysén" },
  "tortel": { lat: -47.8037, lon: -73.5375, region: "Aysén" },
  "chile chico": { lat: -46.5397, lon: -71.7246, region: "Aysén" },
  "rio ibanez": { lat: -46.2919, lon: -71.9375, region: "Aysén" },
  // Magallanes
  "punta arenas": { lat: -53.1626, lon: -70.9078, region: "Magallanes" },
  "laguna blanca": { lat: -52.427, lon: -71.4142, region: "Magallanes" },
  "rio verde": { lat: -52.6507, lon: -71.4634, region: "Magallanes" },
  "san gregorio": { lat: -52.3159, lon: -69.6906, region: "Magallanes" },
  "cabo de hornos": { lat: -54.9358, lon: -67.6063, region: "Magallanes" },
  "antartica": { lat: -75, lon: -71.5, region: "Magallanes" }, // Punto genérico del Territorio Chileno Antártico (Wikipedia)
  "porvenir": { lat: -53.2957, lon: -70.3687, region: "Magallanes" },
  "primavera": { lat: -52.7765, lon: -69.2909, region: "Magallanes" },
  "timaukel": { lat: -53.6397, lon: -69.6463, region: "Magallanes" },
  "natales": { lat: -51.7262, lon: -72.506, region: "Magallanes" },
  "torres del paine": { lat: -51.2562, lon: -72.3447, region: "Magallanes" },
  // Regiones: centro de la capital regional
  "region:arica y parinacota": { lat: -18.4785, lon: -70.3211, region: "Arica y Parinacota" }, // Arica
  "region:tarapaca": { lat: -20.2141, lon: -70.1525, region: "Tarapacá" }, // Iquique
  "region:antofagasta": { lat: -23.6464, lon: -70.398, region: "Antofagasta" }, // Antofagasta
  "region:atacama": { lat: -27.3665, lon: -70.3323, region: "Atacama" }, // Copiapó
  "region:coquimbo": { lat: -29.9027, lon: -71.252, region: "Coquimbo" }, // La Serena
  "region:valparaiso": { lat: -33.0458, lon: -71.6197, region: "Valparaíso" }, // Valparaíso
  "region:metropolitana": { lat: -33.4377, lon: -70.6511, region: "Metropolitana" }, // Santiago
  "region:ohiggins": { lat: -34.1702, lon: -70.7407, region: "O'Higgins" }, // Rancagua
  "region:maule": { lat: -35.4265, lon: -71.666, region: "Maule" }, // Talca
  "region:nuble": { lat: -36.6067, lon: -72.1033, region: "Ñuble" }, // Chillán
  "region:biobio": { lat: -36.8271, lon: -73.0502, region: "Biobío" }, // Concepción
  "region:la araucania": { lat: -38.7359, lon: -72.5905, region: "La Araucanía" }, // Temuco
  "region:los rios": { lat: -39.8141, lon: -73.246, region: "Los Ríos" }, // Valdivia
  "region:los lagos": { lat: -41.4718, lon: -72.9396, region: "Los Lagos" }, // Puerto Montt
  "region:aysen": { lat: -45.5712, lon: -72.0685, region: "Aysén" }, // Coyhaique
  "region:magallanes": { lat: -53.1626, lon: -70.9078, region: "Magallanes" }, // Punta Arenas
};

/** Otras formas de escribir algunas comunas (o su localidad cabecera) que apuntan a la clave de COMUNAS. */
const ALIAS: Record<string, string> = {
  "aisen": "aysen",
  "alto bio bio": "alto biobio",
  "archipielago juan fernandez": "juan fernandez",
  "calera": "la calera",
  "coihaique": "coyhaique",
  "hanga roa": "isla de pascua",
  "isla robinson crusoe": "juan fernandez",
  "llaillay": "llay llay",
  "marchihue": "marchigue",
  "melinka": "guaitecas",
  "pac": "pedro aguirre cerda",
  "paiguano": "paihuano",
  "puerto aisen": "aysen",
  "puerto aysen": "aysen",
  "puerto cisnes": "cisnes",
  "puerto natales": "natales",
  "puerto saavedra": "saavedra",
  "puerto williams": "cabo de hornos",
  "rapa nui": "isla de pascua",
  "san jose de la mariquina": "mariquina",
  "san vicente de tagua tagua": "san vicente",
  "san vicente tagua tagua": "san vicente",
  "santiago centro": "santiago",
  "tiltil": "til til",
  "trehuaco": "treguaco",
  "villa ohiggins": "ohiggins",
  "vina": "vina del mar",
};

type Lugar = { lat: number; lon: number; region: string };

/** Regiones: clave en COMUNAS, palabras que la identifican y códigos (número, romano, ISO 3166-2 sin "CL-"). */
const REGIONES: { clave: string; palabras: string[]; codigos: string[] }[] = [
  { clave: "region:arica y parinacota", palabras: ["arica", "parinacota"], codigos: ["15", "xv", "ap"] },
  { clave: "region:tarapaca", palabras: ["tarapaca"], codigos: ["1", "i", "ta"] },
  { clave: "region:antofagasta", palabras: ["antofagasta"], codigos: ["2", "ii", "an"] },
  { clave: "region:atacama", palabras: ["atacama"], codigos: ["3", "iii", "at"] },
  { clave: "region:coquimbo", palabras: ["coquimbo"], codigos: ["4", "iv", "co"] },
  { clave: "region:valparaiso", palabras: ["valparaiso"], codigos: ["5", "v", "vs"] },
  { clave: "region:metropolitana", palabras: ["metropolitana", "santiago"], codigos: ["13", "xiii", "rm"] },
  { clave: "region:ohiggins", palabras: ["ohiggins", "o higgins", "libertador"], codigos: ["6", "vi", "li"] },
  { clave: "region:maule", palabras: ["maule"], codigos: ["7", "vii", "ml"] },
  { clave: "region:nuble", palabras: ["nuble"], codigos: ["16", "xvi", "nb"] },
  { clave: "region:biobio", palabras: ["biobio", "bio bio"], codigos: ["8", "viii", "bi"] },
  { clave: "region:la araucania", palabras: ["araucania"], codigos: ["9", "ix", "ar"] },
  { clave: "region:los rios", palabras: ["los rios"], codigos: ["14", "xiv", "lr"] },
  { clave: "region:los lagos", palabras: ["los lagos"], codigos: ["10", "x", "ll"] },
  { clave: "region:aysen", palabras: ["aysen", "aisen", "ibanez del campo"], codigos: ["11", "xi", "ai"] },
  { clave: "region:magallanes", palabras: ["magallanes", "antartica chilena"], codigos: ["12", "xii", "ma"] },
];

const CODIGOS_REGION = new Set(REGIONES.flatMap((r) => r.codigos));

/** Minúsculas, sin tildes ni diéresis, "ñ" pasa a "n", sin puntuación y con espacios simples. */
export function normalizarLugar(s: string): string {
  return s
    .toLowerCase()
    .replace(/ñ/g, "n")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’`´]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function entrada(clave: string): Lugar | null {
  return Object.prototype.hasOwnProperty.call(COMUNAS, clave) ? COMUNAS[clave] : null;
}

/** Busca una comuna ya normalizada: directo, por alias, sin "comuna de" y, si no, quitando palabras del final
 * ("las condes rm" pasa a "las condes"). */
function comunaDe(n: string): Lugar | null {
  const limpio = n.replace(/^(comuna|municipalidad)( de)? /, "");
  const palabras = limpio.split(" ");
  for (let largo = palabras.length; largo >= 1; largo--) {
    const clave = palabras.slice(0, largo).join(" ");
    const lugar = entrada(clave) ?? (Object.prototype.hasOwnProperty.call(ALIAS, clave) ? entrada(ALIAS[clave]) : null);
    if (lugar) return lugar;
  }
  return null;
}

/** Texto que nombra una región y no una comuna: "Región ...", "RM", "V", "XIII". */
function pareceRegion(n: string): boolean {
  return /^(region|reg)\b/.test(n) || /\bregion$/.test(n) || CODIGOS_REGION.has(n.replace(/^cl /, ""));
}

/** Encuentra la región en textos como "RM", "Metropolitana de Santiago", "Región de Valparaíso", "VS", "Bío Bío",
 * "XIII Región", "CL-RM" o "Región 13". */
function regionDe(s: string): Lugar | null {
  const n = normalizarLugar(s);
  if (!n) return null;
  const conEspacios = ` ${n} `;
  for (const r of REGIONES) {
    if (r.palabras.some((p) => conEspacios.includes(` ${p} `))) return entrada(r.clave);
  }
  const resto = n
    .split(" ")
    .filter((p) => !["cl", "region", "reg", "de", "del", "la"].includes(p))
    .join(" ");
  for (const r of REGIONES) {
    if (r.codigos.includes(resto)) return entrada(r.clave);
  }
  return null;
}

/** Centro de la comuna del aviso y, si no se reconoce, el de la capital de su región. Acepta la comuna con
 * cola ("Las Condes, RM", "Providencia, Región Metropolitana": vale lo que va antes de la coma). */
export function buscarLugar(comuna: string | null, region: string | null): Lugar | null {
  const partes = comuna ? comuna.split(/[,;/()]| - /).map(normalizarLugar).filter(Boolean) : [];
  for (const parte of partes) {
    if (pareceRegion(parte)) continue;
    const lugar = comunaDe(parte);
    if (lugar) return lugar;
  }
  if (region) {
    const lugar = regionDe(region);
    if (lugar) return lugar;
  }
  // A veces la región viene en el campo de la comuna ("Región Metropolitana").
  for (const parte of partes) {
    const lugar = regionDe(parte);
    if (lugar) return lugar;
  }
  return null;
}

/** Distancia en km entre dos puntos, por la fórmula del haversine. */
export function distanciaKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371.0088;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
