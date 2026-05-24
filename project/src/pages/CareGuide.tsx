import React from 'react';
import { ArrowLeft, Droplets, Sun, Thermometer, Scissors, Heart, AlertCircle, Flower2 } from 'lucide-react';

interface CareGuideProps {
  onBack: () => void;
}

const CareGuide: React.FC<CareGuideProps> = ({ onBack }) => {
  const careTopics = [
    {
      id: 1,
      title: "Riego Adecuado",
      icon: <Droplets className="h-8 w-8 text-[#7FAF9B]" />,
      content: [
        "Riega una vez por semana en promedio",
        "Usa agua destilada o de lluvia cuando sea posible",
        "Evita que el agua se acumule en la corona",
        "Riega por la mañana para permitir que se seque durante el día",
        "En invierno reduce la frecuencia de riego"
      ],
      tips: "💡 Tip: Introduce tu dedo en el sustrato. Si está seco a 2cm de profundidad, es hora de regar."
    },
    {
      id: 2,
      title: "Iluminación Perfecta",
      icon: <Sun className="h-8 w-8 text-[#D96C9F]" />,
      content: [
        "Luz brillante pero indirecta es ideal",
        "Evita la luz solar directa que puede quemar las hojas",
        "Las ventanas orientadas al este son perfectas",
        "12-14 horas de luz al día es óptimo",
        "Usa luces LED si no tienes suficiente luz natural"
      ],
      tips: "💡 Tip: Si las hojas se vuelven amarillas, puede ser exceso de luz. Si están muy verdes y oscuras, necesita más luz."
    },
    {
      id: 3,
      title: "Temperatura y Humedad",
      icon: <Thermometer className="h-8 w-8 text-[#D96C9F]" />,
      content: [
        "Temperatura diurna: 20-25°C",
        "Temperatura nocturna: 15-20°C",
        "Humedad relativa: 50-70%",
        "Evita corrientes de aire frío o caliente",
        "Usa bandejas con agua para aumentar la humedad"
      ],
      tips: "💡 Tip: Un higrómetro te ayudará a monitorear las condiciones perfectas."
    },
    {
      id: 4,
      title: "Poda y Mantenimiento",
      icon: <Scissors className="h-8 w-8 text-[#5FAE9B]" />,
      content: [
        "Corta las flores marchitas para estimular nueva floración",
        "Poda raíces muertas o podridas durante el trasplante",
        "Usa herramientas esterilizadas para evitar infecciones",
        "Retira hojas amarillas o dañadas",
        "Trasplanta cada 2-3 años o cuando el sustrato se descomponga"
      ],
      tips: "💡 Tip: Esteriliza las tijeras con alcohol antes de cada corte."
    }
  ];

  const orchidTypes = [
    {
      id: 1,
      name: "Phalaenopsis",
      commonName: "Orquídea Mariposa",
      image: "https://images.pexels.com/photos/1407305/pexels-photo-1407305.jpeg?auto=compress&cs=tinysrgb&w=300",
      difficulty: "Principiante",
      care: {
        light: "Luz brillante indirecta. Evitar sol directo.",
        water: "Regar cada 7-10 días. Dejar secar entre riegos.",
        temperature: "18-25°C durante el día, 15-18°C por la noche.",
        humidity: "50-70%. Usar bandeja con agua.",
        fertilizer: "Fertilizante para orquídeas cada 2 semanas en primavera/verano.",
        repotting: "Cada 2-3 años o cuando el sustrato se descomponga.",
        blooming: "Florece 1-2 veces al año. Las flores duran 2-3 meses."
      },
      tips: [
        "Perfecta para principiantes",
        "Puede reflorecer cortando la vara floral por encima del segundo nudo",
        "Las raíces aéreas son normales y saludables"
      ]
    },
    {
      id: 2,
      name: "Cattleya",
      commonName: "Reina de las Orquídeas",
      image: "https://images.pexels.com/photos/1408221/pexels-photo-1408221.jpeg?auto=compress&cs=tinysrgb&w=300",
      difficulty: "Intermedio",
      care: {
        light: "Luz brillante, puede tolerar algo de sol directo matutino.",
        water: "Regar abundantemente y dejar secar completamente entre riegos.",
        temperature: "20-30°C durante el día, 15-20°C por la noche.",
        humidity: "50-80%. Necesita buena ventilación.",
        fertilizer: "Fertilizante balanceado cada semana en temporada de crecimiento.",
        repotting: "Cada 2 años, preferiblemente después de la floración.",
        blooming: "Florece una vez al año. Necesita diferencia de temperatura para florecer."
      },
      tips: [
        "Necesita período de descanso con menos agua en invierno",
        "Las flores son muy fragantes",
        "Requiere más luz que las Phalaenopsis"
      ]
    },
    {
      id: 3,
      name: "Dendrobium",
      commonName: "Orquídea de Bambú",
      image: "https://images.pexels.com/photos/1408967/pexels-photo-1408967.jpeg?auto=compress&cs=tinysrgb&w=300",
      difficulty: "Intermedio",
      care: {
        light: "Luz brillante, puede tolerar sol directo suave.",
        water: "Regar regularmente en verano, reducir en invierno.",
        temperature: "20-25°C en verano, 15-20°C en invierno.",
        humidity: "40-70%. Tolera menor humedad que otras orquídeas.",
        fertilizer: "Fertilizar cada 2 semanas en primavera/verano, parar en invierno.",
        repotting: "Cada 2-3 años cuando el sustrato se deteriore.",
        blooming: "Florece en invierno/primavera después del período de descanso."
      },
      tips: [
        "Necesita período seco en invierno para florecer",
        "Los pseudobulbos almacenan agua y nutrientes",
        "No cortar las cañas viejas, pueden producir keikis (bebés)"
      ]
    },
    {
      id: 4,
      name: "Oncidium",
      commonName: "Orquídea Danzante",
      image: "https://images.pexels.com/photos/68507/spring-flowers-flowers-collage-floral-68507.jpeg?auto=compress&cs=tinysrgb&w=300",
      difficulty: "Intermedio",
      care: {
        light: "Luz brillante indirecta a semi-directa.",
        water: "Mantener ligeramente húmedo, nunca completamente seco.",
        temperature: "18-24°C durante el día, 13-18°C por la noche.",
        humidity: "40-80%. Buena circulación de aire es esencial.",
        fertilizer: "Fertilizante diluido cada semana durante el crecimiento.",
        repotting: "Cada 2 años o cuando el sustrato se descomponga.",
        blooming: "Florece una vez al año con espigas largas llenas de flores pequeñas."
      },
      tips: [
        "Las flores parecen estar 'danzando' en la brisa",
        "Producen muchas flores pequeñas en lugar de pocas grandes",
        "Les gusta estar ligeramente apretadas en la maceta"
      ]
    },
    {
      id: 5,
      name: "Vanda",
      commonName: "Orquídea Azul",
      image: "https://images.pexels.com/photos/1408221/pexels-photo-1408221.jpeg?auto=compress&cs=tinysrgb&w=300",
      difficulty: "Avanzado",
      care: {
        light: "Luz muy brillante, puede tolerar sol directo.",
        water: "Regar diariamente en verano, cada 2-3 días en invierno.",
        temperature: "20-35°C durante el día, 15-20°C por la noche.",
        humidity: "60-80%. Humedad alta es crucial.",
        fertilizer: "Fertilizar cada riego con fertilizante muy diluido.",
        repotting: "Raramente necesario, crecen bien en cestas sin sustrato.",
        blooming: "Pueden florecer varias veces al año con cuidado adecuado."
      },
      tips: [
        "Mejor cultivada en cestas colgantes sin sustrato",
        "Las raíces aéreas necesitan humedad constante",
        "Requiere mucha luz y humedad para prosperar"
      ]
    }
  ];

  const commonProblems = [
    {
      problem: "Hojas amarillas",
      causes: ["Exceso de riego", "Falta de nutrientes", "Envejecimiento natural"],
      solutions: ["Reduce la frecuencia de riego", "Aplica fertilizante balanceado", "Retira hojas viejas naturalmente"]
    },
    {
      problem: "No florece",
      causes: ["Falta de luz", "Temperatura constante", "Falta de nutrientes"],
      solutions: ["Aumenta la exposición a luz indirecta", "Proporciona variación de temperatura día/noche", "Fertiliza regularmente durante la temporada de crecimiento"]
    },
    {
      problem: "Raíces podridas",
      causes: ["Exceso de riego", "Sustrato muy compacto", "Falta de drenaje"],
      solutions: ["Trasplanta inmediatamente", "Corta raíces dañadas", "Usa sustrato específico para orquídeas"]
    }
  ];

  return (
    <div className="min-h-screen bg-[#FFF8EF] text-[#2F3A35]">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <button
            onClick={onBack}
            className="mb-6 flex items-center space-x-2 text-[#5FAE9B] transition-colors hover:text-[#4D9A88]"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Volver al catálogo</span>
          </button>
          
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-4">
              <Heart className="mr-3 h-12 w-12 text-[#D96C9F]" />
              <h1 className="text-4xl font-semibold text-[#2F3A35]">
                Guía de Cuidados para Orquídeas
              </h1>
            </div>
            <p className="mx-auto max-w-3xl text-xl text-[#6B756F]">
              Todo lo que necesitas saber para mantener tus orquídeas saludables y florecientes. 
              Desde principiantes hasta expertos, aquí encontrarás consejos profesionales.
            </p>
          </div>
        </div>

        {/* Cuidados Básicos */}
        <div className="mb-16">
          <h2 className="mb-8 text-center text-3xl font-semibold text-[#2F3A35]">Cuidados Esenciales</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {careTopics.map((topic) => (
              <div key={topic.id} className="rounded-xl border border-[#EADBC8]/70 bg-white/90 p-6 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex items-center mb-4">
                  {topic.icon}
                  <h3 className="ml-3 text-xl font-semibold text-[#2F3A35]">{topic.title}</h3>
                </div>
                
                <ul className="space-y-2 mb-4">
                  {topic.content.map((item, index) => (
                    <li key={index} className="flex items-start">
                      <span className="mr-2 mt-1 text-[#5FAE9B]">•</span>
                      <span className="text-[#6B756F]">{item}</span>
                    </li>
                  ))}
                </ul>
                
                <div className="rounded-lg border-l-4 border-[#7FAF9B] bg-[#CFE3D4]/45 p-3">
                  <p className="text-sm text-[#2F3A35]">{topic.tips}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cuidados Específicos por Tipo */}
        <div className="mb-16">
          <h2 className="mb-8 text-center text-3xl font-semibold text-[#2F3A35]">Cuidados Específicos por Tipo de Orquídea</h2>
          <div className="space-y-8">
            {orchidTypes.map((orchid) => (
              <div key={orchid.id} className="overflow-hidden rounded-xl border border-[#EADBC8]/70 bg-white/90 shadow-sm">
                <div className="md:flex">
                  <div className="md:w-1/3">
                    <img
                      src={orchid.image}
                      alt={orchid.name}
                      className="w-full h-64 md:h-full object-cover"
                    />
                  </div>
                  <div className="md:w-2/3 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-2xl font-semibold text-[#2F3A35]">{orchid.name}</h3>
                        <p className="font-medium text-[#5FAE9B]">{orchid.commonName}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        orchid.difficulty === 'Principiante' ? 'bg-[#CFE3D4] text-[#2F3A35]' :
                        orchid.difficulty === 'Intermedio' ? 'bg-[#F8DDEB] text-[#2F3A35]' :
                        'bg-red-50 text-red-700'
                      }`}>
                        {orchid.difficulty}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                      <div className="space-y-3">
                        <div>
                          <h4 className="flex items-center font-semibold text-[#2F3A35]">
                            <Sun className="mr-2 h-4 w-4 text-[#D96C9F]" />
                            Iluminación
                          </h4>
                          <p className="text-sm text-[#6B756F]">{orchid.care.light}</p>
                        </div>
                        <div>
                          <h4 className="flex items-center font-semibold text-[#2F3A35]">
                            <Droplets className="mr-2 h-4 w-4 text-[#7FAF9B]" />
                            Riego
                          </h4>
                          <p className="text-sm text-[#6B756F]">{orchid.care.water}</p>
                        </div>
                        <div>
                          <h4 className="flex items-center font-semibold text-[#2F3A35]">
                            <Thermometer className="mr-2 h-4 w-4 text-[#D96C9F]" />
                            Temperatura
                          </h4>
                          <p className="text-sm text-[#6B756F]">{orchid.care.temperature}</p>
                        </div>
                        <div>
                          <h4 className="font-semibold text-[#2F3A35]">💧 Humedad</h4>
                          <p className="text-sm text-[#6B756F]">{orchid.care.humidity}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-semibold text-[#2F3A35]">🌱 Fertilización</h4>
                          <p className="text-sm text-[#6B756F]">{orchid.care.fertilizer}</p>
                        </div>
                        <div>
                          <h4 className="font-semibold text-[#2F3A35]">🪴 Trasplante</h4>
                          <p className="text-sm text-[#6B756F]">{orchid.care.repotting}</p>
                        </div>
                        <div>
                          <h4 className="flex items-center font-semibold text-[#2F3A35]">
                            <Flower2 className="mr-2 h-4 w-4 text-[#D96C9F]" />
                            Floración
                          </h4>
                          <p className="text-sm text-[#6B756F]">{orchid.care.blooming}</p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg bg-[#F8DDEB]/45 p-4">
                      <h4 className="mb-2 font-semibold text-[#2F3A35]">💡 Consejos Especiales</h4>
                      <ul className="space-y-1">
                        {orchid.tips.map((tip, index) => (
                          <li key={index} className="flex items-start text-sm text-[#6B756F]">
                            <span className="mr-2 mt-0.5 text-[#D96C9F]">•</span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Problemas Comunes */}
        <div className="mb-16">
          <h2 className="mb-8 text-center text-3xl font-semibold text-[#2F3A35]">Problemas Comunes y Soluciones</h2>
          <div className="space-y-6">
            {commonProblems.map((item, index) => (
              <div key={index} className="rounded-xl border border-[#EADBC8]/70 bg-white/90 p-6 shadow-sm">
                <div className="flex items-center mb-4">
                  <AlertCircle className="mr-3 h-6 w-6 text-[#D96C9F]" />
                  <h3 className="text-xl font-semibold text-[#2F3A35]">{item.problem}</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="mb-2 font-semibold text-[#D96C9F]">Posibles Causas:</h4>
                    <ul className="space-y-1">
                      {item.causes.map((cause, i) => (
                        <li key={i} className="flex items-start">
                          <span className="mr-2 text-[#D96C9F]">⚠</span>
                          <span className="text-[#6B756F]">{cause}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="mb-2 font-semibold text-[#5FAE9B]">Soluciones:</h4>
                    <ul className="space-y-1">
                      {item.solutions.map((solution, i) => (
                        <li key={i} className="flex items-start">
                          <span className="mr-2 text-[#5FAE9B]">✓</span>
                          <span className="text-[#6B756F]">{solution}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Calendario de Cuidados */}
        <div className="rounded-xl bg-[#CFE3D4] p-8 text-[#2F3A35]">
          <h2 className="mb-6 text-center text-3xl font-semibold">Calendario Anual de Cuidados</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="rounded-lg bg-white/55 p-4">
              <h3 className="mb-2 font-semibold">Primavera (Mar-May)</h3>
              <ul className="text-sm space-y-1">
                <li>• Aumenta el riego</li>
                <li>• Inicia fertilización</li>
                <li>• Trasplanta si es necesario</li>
              </ul>
            </div>
            <div className="rounded-lg bg-white/55 p-4">
              <h3 className="mb-2 font-semibold">Verano (Jun-Ago)</h3>
              <ul className="text-sm space-y-1">
                <li>• Riego regular</li>
                <li>• Fertiliza cada 2 semanas</li>
                <li>• Aumenta la humedad</li>
              </ul>
            </div>
            <div className="rounded-lg bg-white/55 p-4">
              <h3 className="mb-2 font-semibold">Otoño (Sep-Nov)</h3>
              <ul className="text-sm space-y-1">
                <li>• Reduce el riego</li>
                <li>• Disminuye fertilización</li>
                <li>• Prepara para floración</li>
              </ul>
            </div>
            <div className="rounded-lg bg-white/55 p-4">
              <h3 className="mb-2 font-semibold">Invierno (Dec-Feb)</h3>
              <ul className="text-sm space-y-1">
                <li>• Riego mínimo</li>
                <li>• Sin fertilizante</li>
                <li>• Disfruta las flores</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CareGuide;
